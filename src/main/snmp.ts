import { BrowserWindow } from 'electron';
import { SnmpDataUpdate, LogMessage, AlarmState, ThresholdState } from '../shared/types';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import {
  OIDS_UPS1,
  OIDS_UPS2,
  BATTERY_STATUS_MAP,
  UPS_STATUS_MAP,
  UPS1_THRESHOLD_MAP,
  UPS2_THRESHOLD_MAP,
} from '../shared/constants';
import { getUps1Settings, getUps2Settings } from './settings';
import { checkThresholds, checkStatusChanges, getThresholdStates } from './threshold';
import { sendUdpMessage } from './udp';
import { triggerAlarm, stopAlarm } from './alarm';
import logger from './logger';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const snmp = require('net-snmp');

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

/** Number of consecutive abnormal polls required before triggering an alarm */
const ABNORMAL_THRESHOLD_COUNT = 5;

interface UpsState {
  loopCount: number;
  abnormalCount: number;
  running: boolean;
  timeoutHandle: ReturnType<typeof setTimeout> | null;
}

const upsState: Record<1 | 2, UpsState> = {
  1: {
    loopCount: 0,
    abnormalCount: 0,
    running: false,
    timeoutHandle: null,
  },
  2: {
    loopCount: 0,
    abnormalCount: 0,
    running: false,
    timeoutHandle: null,
  },
};

// ---------------------------------------------------------------------------
// SNMP helpers
// ---------------------------------------------------------------------------

/**
 * Query a set of OIDs from a single SNMP v2c GET and return a name→raw-value
 * map.  A fresh session is created and closed for every call so that
 * long-running processes do not accumulate open sockets (the caller recreates
 * the session every 1 000 iterations via the loop counter instead).
 */
export function getSnmpData(
  ip: string,
  community: string,
  oids: string[],
): Promise<Record<string, string>> {
  return new Promise((resolve) => {
    const result: Record<string, string> = {};

    const session = snmp.createSession(ip, community, {
      timeout: 2000,
      retries: 1,
      version: snmp.Version2c,
    });

    session.get(oids, (error: Error | null, varbinds: unknown[]) => {
      // Always close the session after each poll cycle to prevent memory leaks.
      try {
        session.close();
      } catch {
        // ignore close errors
      }

      if (error) {
        // Return "No Data" for every OID on transport-level errors.
        for (const oid of oids) {
          result[oid] = 'No Data';
        }
        resolve(result);
        return;
      }

      if (!Array.isArray(varbinds)) {
        for (const oid of oids) {
          result[oid] = 'No Data';
        }
        resolve(result);
        return;
      }

      for (const vb of varbinds as Array<{ oid: string; type: number; value: unknown }>) {
        if (!vb || typeof vb !== 'object' || !('oid' in vb)) {
          continue;
        }
        if (snmp.isVarbindError(vb)) {
          result[vb.oid] = 'No Data';
        } else {
          const raw = vb.value;
          result[vb.oid] =
            raw === null || raw === undefined ? 'No Data' : String(raw);
        }
      }

      resolve(result);
    });
  });
}

// ---------------------------------------------------------------------------
// Value formatting – exact replication of Python format_snmp_value()
// (lines 173-202 of snmpups.py)
// ---------------------------------------------------------------------------

/**
 * Convert a raw SNMP integer string to a human-readable display string,
 * applying the same scaling rules as the Python implementation.
 *
 * Rules (in priority order):
 *  1. 배터리 전압 (V) on UPS#2  → value / 100, two decimal places, "X.XX V"
 *  2. Hz fields                 → value / 10, one decimal place, "X.X Hz"
 *     EXCEPT: UPS#1 입력 주파수 (Hz) → no division, "X Hz"
 *  3. kW fields                 → value / 1000, one decimal place, "X.X kW"
 *  4. V fields (입력/출력 전압) → no division, "X V"
 *     Other V fields            → value / 10, no decimals, "X V"
 *  5. A fields                  → value / 10, one decimal place, "X.X A"
 *  6. % fields                  → one decimal place, "X.X %"
 *  7. °C fields                 → raw string, "X°C"
 *  8. 출력 상태                  → UPS_STATUS_MAP lookup
 *  9. 배터리 상태                → BATTERY_STATUS_MAP lookup
 */
export function formatSnmpValue(name: string, value: string, upsId: 1 | 2): string {
  if (value === 'No Data') {
    return value;
  }

  try {
    // 8. Output status (non-numeric, check before parseFloat)
    if (name === '출력 상태' || name === '출력상태') {
      return UPS_STATUS_MAP[value] ?? `알 수 없음 (${value})`;
    }

    // 9. Battery status (non-numeric, check before parseFloat)
    if (name === '배터리 상태' || name === '배터리상태') {
      return BATTERY_STATUS_MAP[value] ?? `알 수 없음 (${value})`;
    }

    // 7. Temperature fields
    if (name.includes('°C')) {
      return `${value}°C`;
    }

    const parsed = parseFloat(value);
    if (!isFinite(parsed)) {
      return 'No Data';
    }

    // 1. Battery voltage for UPS#2 – divide by 100 (e.g. 1234 → "12.34 V")
    if (name === '배터리 전압 (V)' && upsId === 2) {
      return `${(parsed / 100).toFixed(2)} V`;
    }

    // 2. Hz fields
    if (name.includes('Hz')) {
      // UPS#1 입력 주파수 (Hz): raw value, no division
      if (name === '입력 주파수 (Hz)' && upsId === 1) {
        return `${parsed.toFixed(0)} Hz`;
      }
      return `${(parsed / 10).toFixed(1)} Hz`;
    }

    // 3. kW fields
    if (name.includes('kW')) {
      return `${(parsed / 1000).toFixed(1)} kW`;
    }

    // 4. Voltage fields
    if (name.includes('V')) {
      if (name.includes('출력 전압') || name.includes('입력 전압')) {
        // Input / output voltages: no division
        return `${parsed.toFixed(0)} V`;
      }
      // All other V fields (e.g. 배터리 전압(V) for UPS#1): divide by 10
      return `${(parsed / 10).toFixed(0)} V`;
    }

    // 5. Current fields
    if (name.includes('(A)')) {
      return `${(parsed / 10).toFixed(1)} A`;
    }

    // 6. Percentage fields
    if (name.includes('%')) {
      return `${parsed.toFixed(1)} %`;
    }
  } catch {
    return 'No Data';
  }

  return value;
}

// ---------------------------------------------------------------------------
// Single UPS polling loop
// ---------------------------------------------------------------------------

/**
 * Run one complete polling iteration for the given UPS and schedule the next
 * one after the configured interval.  Uses recursive setTimeout so that the
 * interval is measured *after* the async work completes (matching the Python
 * asyncio.sleep() behaviour).
 */
async function pollUps(upsId: 1 | 2, mainWindow: BrowserWindow): Promise<void> {
  const state = upsState[upsId];

  if (!state.running) {
    return;
  }

  let intervalSeconds = 5;

  try {
    const settings = upsId === 1 ? getUps1Settings() : getUps2Settings();
    const ip = upsId === 1
      ? (settings as { ups_ip: string }).ups_ip
      : (settings as { ups2_ip: string }).ups2_ip;
    const community = upsId === 1
      ? (settings as { community: string }).community
      : (settings as { ups2_community: string }).ups2_community;
    intervalSeconds =
      upsId === 1
        ? ((settings as { interval?: number }).interval ?? 5)
        : ((settings as { ups2_interval?: number }).ups2_interval ?? 5);

    const oids = upsId === 1 ? OIDS_UPS1 : OIDS_UPS2;
    const thresholdMap = upsId === 1 ? UPS1_THRESHOLD_MAP : UPS2_THRESHOLD_MAP;
    state.loopCount += 1;

    // Every 1 000 iterations log a session-recycle notice (session is already
    // closed per-request in getSnmpData, so this is purely informational).
    if (state.loopCount % 1000 === 0) {
      logger.info(`UPS#${upsId} SNMP 세션 재생성 완료 (loop ${state.loopCount})`);
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Build OID list and reverse-lookup map (oid → label name)
    const oidList = Object.values(oids);
    const oidToName: Record<string, string> = {};
    for (const [name, oid] of Object.entries(oids)) {
      oidToName[oid] = name;
    }

    // Fetch raw SNMP values
    const rawByOid = await getSnmpData(ip, community, oidList);

    // Map back to label names and apply formatting
    const snmpData: Record<string, string> = {};
    for (const [name, oid] of Object.entries(oids)) {
      const raw = rawByOid[oid] ?? 'No Data';
      snmpData[name] = formatSnmpValue(name, raw, upsId);
    }

    // --- Send SNMP data to renderer ---
    const dataUpdate: SnmpDataUpdate = {
      upsId,
      data: snmpData,
      timestamp: now,
    };
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.SNMP_DATA, dataUpdate);
    }

    // --- Send UDP message to remote server ---
    const serverIp = upsId === 1
      ? (settings as { server_ip: string }).server_ip
      : (settings as { ups2_server_ip: string }).ups2_server_ip;
    const serverPort = upsId === 1
      ? (settings as { server_port: number }).server_port
      : (settings as { ups2_server_port: number }).ups2_server_port;
    const udpPayload = JSON.stringify({ UPS: upsId, Data: snmpData });
    sendUdpMessage(udpPayload, serverIp, serverPort);

    // --- Threshold checking ---
    for (const [label, settingKey] of Object.entries(thresholdMap)) {
      if (!(label in snmpData)) {
        continue;
      }

      const formatted = snmpData[label];
      const rawNumber = formatted ? formatted.split(' ')[0] : '';
      const numValue = parseFloat(rawNumber);
      if (!isFinite(numValue)) {
        continue;
      }

      const result = checkThresholds({
        label,
        keyPrefix: settingKey,
        value: numValue,
        timestamp: now,
        settings: settings as Record<string, any>,
        upsId,
      });

      if (result) {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send(IPC_CHANNELS.SNMP_LOG, result);
        }
      }
    }

    // Send threshold state to renderer
    const thresholdState: ThresholdState = { upsId, states: getThresholdStates(upsId) };
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.THRESHOLD_STATE, thresholdState);
    }

    // --- Status change detection ---
    const statusResults = checkStatusChanges({ snmpData, upsId, timestamp: now });

    for (const logMsg of statusResults) {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.SNMP_LOG, logMsg);
      }
    }

    // Determine overall alarm state based on current status values
    const outputStatus = snmpData['출력 상태'];
    const batteryStatus = snmpData['배터리 상태'];

    const abnormalOutputStatuses = ['배터리', '바이패스', '부스터', '리듀서', '기타', '없음'];
    const abnormalBatteryStatuses = ['배터리 부족', '배터리 소진', '알 수 없음'];

    const isAbnormal =
      (outputStatus !== undefined && abnormalOutputStatuses.some((s) => outputStatus.includes(s))) ||
      (batteryStatus !== undefined && abnormalBatteryStatuses.some((s) => batteryStatus.includes(s)));

    // Consecutive abnormal counter: only alarm after ABNORMAL_THRESHOLD_COUNT consecutive abnormal polls
    if (isAbnormal) {
      state.abnormalCount += 1;
    } else {
      state.abnormalCount = 0;
    }

    if (state.abnormalCount >= ABNORMAL_THRESHOLD_COUNT) {
      triggerAlarm(upsId, mainWindow);
    } else {
      stopAlarm(upsId, mainWindow);
    }

    // Send alarm state to renderer
    const alarmActive = state.abnormalCount >= ABNORMAL_THRESHOLD_COUNT;
    const alarmState: AlarmState = { upsId, active: alarmActive };
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.ALARM_STATE, alarmState);
    }

  } catch (err) {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const message = `${now} - UPS#${upsId} 루프 예외 발생: ${err}`;
    logger.error(message);

    // Brief pause before retrying, matching the Python "await asyncio.sleep(1)"
    await new Promise<void>((res) => setTimeout(res, 1000));
  }

  if (!state.running) {
    return;
  }

  // Schedule the next poll after the configured interval
  state.timeoutHandle = setTimeout(
    () => { void pollUps(upsId, mainWindow); },
    intervalSeconds * 1000,
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start independent polling loops for both UPS units.  Safe to call only once;
 * calling again while already running is a no-op.
 */
export function startSnmpMonitoring(mainWindow: BrowserWindow): void {
  for (const id of [1, 2] as const) {
    if (upsState[id].running) {
      logger.warn(`UPS#${id} SNMP monitoring already running – ignoring duplicate start`);
      continue;
    }

    upsState[id].running = true;
    upsState[id].loopCount = 0;
    upsState[id].abnormalCount = 0;

    logger.info(`UPS#${id} SNMP monitoring started`);

    // Kick off the first poll immediately (no initial delay)
    void pollUps(id, mainWindow);
  }
}

/**
 * Stop all polling loops and cancel any pending timeouts.
 */
export function stopSnmpMonitoring(): void {
  for (const id of [1, 2] as const) {
    upsState[id].running = false;

    if (upsState[id].timeoutHandle !== null) {
      clearTimeout(upsState[id].timeoutHandle!);
      upsState[id].timeoutHandle = null;
    }

    logger.info(`UPS#${id} SNMP monitoring stopped`);
  }
}

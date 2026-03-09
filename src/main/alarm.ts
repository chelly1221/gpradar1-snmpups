import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import logger from './logger'

// --- State ---

let ups1AlarmActive = false
let ups2AlarmActive = false
let ups1MuteState = false
let ups2MuteState = false
let ups1AlarmTimer: NodeJS.Timeout | null = null
let ups2AlarmTimer: NodeJS.Timeout | null = null

// --- Helpers ---

function getAlarmActive(upsId: 1 | 2): boolean {
  return upsId === 1 ? ups1AlarmActive : ups2AlarmActive
}

function setAlarmActive(upsId: 1 | 2, value: boolean): void {
  if (upsId === 1) {
    ups1AlarmActive = value
  } else {
    ups2AlarmActive = value
  }
}

function getAlarmTimer(upsId: 1 | 2): NodeJS.Timeout | null {
  return upsId === 1 ? ups1AlarmTimer : ups2AlarmTimer
}

function setAlarmTimer(upsId: 1 | 2, timer: NodeJS.Timeout | null): void {
  if (upsId === 1) {
    ups1AlarmTimer = timer
  } else {
    ups2AlarmTimer = timer
  }
}

function sendAlarmState(upsId: 1 | 2, active: boolean, mainWindow: BrowserWindow): void {
  if (mainWindow.isDestroyed()) {
    return
  }
  mainWindow.webContents.send(IPC_CHANNELS.ALARM_STATE, { upsId, active })
}

// --- Exported functions ---

/**
 * Trigger an alarm for the given UPS. If an alarm is already active for that
 * UPS this is a no-op. The timer fires every 4000 ms and sends an ALARM_STATE
 * IPC message to the renderer on each tick so the renderer can play the
 * configured WAV file via HTML5 Audio.
 */
export function triggerAlarm(upsId: 1 | 2, mainWindow: BrowserWindow): void {
  if (getAlarmActive(upsId)) {
    return
  }

  setAlarmActive(upsId, true)

  // Clear any orphaned timer before creating a new one
  const existingTimer = getAlarmTimer(upsId)
  if (existingTimer !== null) {
    clearInterval(existingTimer)
    setAlarmTimer(upsId, null)
  }

  logger.info(`[UPS#${upsId}] Alarm triggered`)

  // Send the initial active notification immediately so the renderer reacts
  // without waiting for the first timer tick.
  sendAlarmState(upsId, true, mainWindow)

  const timer = setInterval(() => {
    if (mainWindow.isDestroyed()) {
      clearInterval(timer)
      setAlarmTimer(upsId, null)
      return
    }
    sendAlarmState(upsId, true, mainWindow)
  }, 4000)

  setAlarmTimer(upsId, timer)
}

/**
 * Stop an active alarm for the given UPS. If no alarm is active this is a
 * no-op. Clears the repeat timer and notifies the renderer so it can stop
 * audio playback.
 */
export function stopAlarm(upsId: 1 | 2, mainWindow: BrowserWindow): void {
  if (!getAlarmActive(upsId)) {
    return
  }

  setAlarmActive(upsId, false)
  logger.info(`[UPS#${upsId}] Alarm stopped`)

  const timer = getAlarmTimer(upsId)
  if (timer !== null) {
    clearInterval(timer)
    setAlarmTimer(upsId, null)
  }

  sendAlarmState(upsId, false, mainWindow)
}

/**
 * Update the mute state for a given UPS. The mute flag is consulted by the
 * renderer when it receives an ALARM_STATE message; the main process preserves
 * it here so other parts of the main process can query it if needed.
 */
export function setMuteState(upsId: 1 | 2, muted: boolean): void {
  if (upsId === 1) {
    ups1MuteState = muted
  } else {
    ups2MuteState = muted
  }
  logger.info(`[UPS#${upsId}] Mute state set to ${muted}`)
}

/**
 * Return the current mute state for the given UPS.
 */
export function isMuted(upsId: 1 | 2): boolean {
  return upsId === 1 ? ups1MuteState : ups2MuteState
}

/**
 * Return whether an alarm is currently active for the given UPS.
 */
export function isAlarmActive(upsId: 1 | 2): boolean {
  return getAlarmActive(upsId)
}

/**
 * Forcefully stop all alarm timers without sending IPC.
 * Call this during app shutdown when the window may already be destroyed.
 */
export function clearAllAlarmTimers(): void {
  for (const upsId of [1, 2] as const) {
    const timer = getAlarmTimer(upsId)
    if (timer !== null) {
      clearInterval(timer)
      setAlarmTimer(upsId, null)
    }
    setAlarmActive(upsId, false)
  }
}

import React, { useState, useEffect, useCallback } from 'react';
import type { UpsSettings, Ups2Settings } from '../../shared/types';

interface SettingsDialogProps {
  upsId: 1 | 2;
  isOpen?: boolean;
  onClose: () => void;
}

// UPS#1 event threshold rows (key is null for display-only rows with no spinboxes)
const UPS1_LIMITS: Array<{ label: string; key: string; minDef: number; maxDef: number }> = [
  { label: '입력 전압 R (V)',  key: 'input_voltage_R', minDef: 300, maxDef: 700 },
  { label: '입력 전압 S (V)',  key: 'input_voltage_S', minDef: 300, maxDef: 700 },
  { label: '입력 전압 T (V)',  key: 'input_voltage_T', minDef: 300, maxDef: 700 },
  { label: '입력 전류 R (A)',  key: 'input_current_R', minDef: 0,   maxDef: 50  },
  { label: '입력 전류 S (A)',  key: 'input_current_S', minDef: 0,   maxDef: 50  },
  { label: '입력 전류 T (A)',  key: 'input_current_T', minDef: 0,   maxDef: 50  },
  { label: '입력 전력 R (kW)', key: 'input_power_R',   minDef: 0,   maxDef: 100 },
  { label: '입력 전력 S (kW)', key: 'input_power_S',   minDef: 0,   maxDef: 100 },
  { label: '입력 전력 T (kW)', key: 'input_power_T',   minDef: 0,   maxDef: 100 },
  { label: '입력 주파수 (Hz)', key: 'input_freq',       minDef: 50,  maxDef: 70  },
  { label: '출력 전압 R (V)',  key: 'voltage_R',        minDef: 200, maxDef: 250 },
  { label: '출력 전압 S (V)',  key: 'voltage_S',        minDef: 200, maxDef: 250 },
  { label: '출력 전압 T (V)',  key: 'voltage_T',        minDef: 200, maxDef: 250 },
  { label: '출력 전류 R (A)',  key: 'current_R',        minDef: 0,   maxDef: 50  },
  { label: '출력 전류 S (A)',  key: 'current_S',        minDef: 0,   maxDef: 50  },
  { label: '출력 전류 T (A)',  key: 'current_T',        minDef: 0,   maxDef: 50  },
  { label: '출력 주파수(Hz)',  key: 'frequency',        minDef: 50,  maxDef: 70  },
  { label: '출력 R (%)',       key: 'output_R',         minDef: 0,   maxDef: 100 },
  { label: '출력 S (%)',       key: 'output_S',         minDef: 0,   maxDef: 100 },
  { label: '출력 T (%)',       key: 'output_T',         minDef: 0,   maxDef: 100 },
  { label: '배터리 전압(V)',   key: 'voltage',          minDef: 200, maxDef: 250 },
  { label: '배터리 잔량(%)',   key: 'battery',          minDef: 0,   maxDef: 100 },
];

// UPS#2 event threshold rows
const UPS2_LIMITS: Array<{ label: string; key: string; minDef: number; maxDef: number }> = [
  { label: '입력 전압 (V)',    key: 'ups2_input_voltage',   minDef: 180, maxDef: 250 },
  { label: '출력 전압 (V)',    key: 'ups2_output_voltage',  minDef: 180, maxDef: 250 },
  { label: '입력 주파수 (Hz)', key: 'ups2_input_freq',      minDef: 50,  maxDef: 70  },
  { label: '출력 주파수 (Hz)', key: 'ups2_output_freq',     minDef: 50,  maxDef: 70  },
  { label: '배터리 전압 (V)',  key: 'ups2_battery_voltage', minDef: 0,   maxDef: 20  },
  { label: '배터리 잔량 (%)',  key: 'ups2_battery_capacity',minDef: 0,   maxDef: 100 },
  { label: '배터리 온도 (°C)', key: 'ups2_temp',            minDef: 0,   maxDef: 60  },
];

type ThresholdMap = Record<string, { min: number; max: number }>;

// Build an initial threshold map from a flat settings object
function buildThresholdMap(
  limits: typeof UPS1_LIMITS,
  settings: Record<string, string | number>
): ThresholdMap {
  const map: ThresholdMap = {};
  for (const { key, minDef, maxDef } of limits) {
    map[key] = {
      min: typeof settings[`${key}_min`] === 'number'
        ? (settings[`${key}_min`] as number)
        : minDef,
      max: typeof settings[`${key}_max`] === 'number'
        ? (settings[`${key}_max`] as number)
        : maxDef,
    };
  }
  return map;
}

// Flatten threshold map back into a flat key/value object
function flattenThresholds(map: ThresholdMap): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, { min, max }] of Object.entries(map)) {
    result[`${key}_min`] = min;
    result[`${key}_max`] = max;
  }
  return result;
}

// ---- Sub-components ----

interface SpinBoxProps {
  value: number;
  onChange: (value: number) => void;
}

const SpinBox: React.FC<SpinBoxProps> = ({ value, onChange }) => (
  <input
    type="number"
    min={-9999}
    max={9999}
    value={value}
    onChange={(e) => {
      const raw = e.target.value;
      if (raw === '' || raw === '-') return;
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed)) onChange(Math.min(9999, Math.max(-9999, parsed)));
    }}
    onBlur={(e) => {
      if (e.target.value === '' || e.target.value === '-') onChange(0);
    }}
    className="w-20 px-1 py-0.5 text-sm border border-gray-400 rounded bg-white text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
  />
);

interface SectionLabelProps {
  text: string;
  topPad?: boolean;
}

const SectionLabel: React.FC<SectionLabelProps> = ({ text, topPad }) => (
  <div className={`font-bold text-sm ${topPad ? 'mt-4 mb-1' : 'mb-1'}`}>{text}</div>
);

interface FormRowProps {
  label: string;
  children: React.ReactNode;
}

const FormRow: React.FC<FormRowProps> = ({ label, children }) => (
  <div className="flex items-center gap-2 mb-1.5">
    <label className="w-32 text-right text-sm flex-shrink-0">{label}</label>
    <div className="flex-1 flex items-center gap-1">{children}</div>
  </div>
);

// ---- Main component ----

const SettingsDialog: React.FC<SettingsDialogProps> = ({ upsId, isOpen = true, onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'event'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // UPS#1 general fields
  const [upsIp, setUpsIp] = useState('');
  const [community, setCommunity] = useState('public');
  const [serverIp, setServerIp] = useState('');
  const [serverPort, setServerPort] = useState(5000);
  const [pollInterval, setPollInterval] = useState(5);
  const [alarmSound, setAlarmSound] = useState('alarm.wav');

  // UPS#2 general fields (ups2_ prefixed)
  const [ups2Ip, setUps2Ip] = useState('');
  const [ups2Community, setUps2Community] = useState('public');
  const [ups2ServerIp, setUps2ServerIp] = useState('');
  const [ups2ServerPort, setUps2ServerPort] = useState(5000);
  const [ups2Interval, setUps2Interval] = useState(5);
  const [ups2AlarmSound, setUps2AlarmSound] = useState('alarm2.wav');

  // Threshold spinbox state (keyed by limit key)
  const limits = upsId === 1 ? UPS1_LIMITS : UPS2_LIMITS;
  const [thresholds, setThresholds] = useState<ThresholdMap>(() =>
    buildThresholdMap(limits, {})
  );

  // Escape key to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load settings when dialog opens
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setActiveTab('general');

    const load = async () => {
      try {
        if (upsId === 1) {
          const s = await window.electronAPI.getUps1Settings();
          if (cancelled) return;
          setUpsIp(String(s.ups_ip ?? ''));
          setCommunity(String(s.community ?? 'public'));
          setServerIp(String(s.server_ip ?? ''));
          setServerPort(Number(s.server_port ?? 5000));
          setPollInterval(Number(s.interval ?? 5));
          setAlarmSound(String(s.alarm_sound ?? 'alarm.wav'));
          setThresholds(buildThresholdMap(UPS1_LIMITS, s as Record<string, string | number>));
        } else {
          const s = await window.electronAPI.getUps2Settings();
          if (cancelled) return;
          setUps2Ip(String(s.ups2_ip ?? ''));
          setUps2Community(String(s.ups2_community ?? 'public'));
          setUps2ServerIp(String(s.ups2_server_ip ?? ''));
          setUps2ServerPort(Number(s.ups2_server_port ?? 5000));
          setUps2Interval(Number(s.ups2_interval ?? 5));
          setUps2AlarmSound(String(s.ups2_alarm_sound ?? 'alarm2.wav'));
          setThresholds(buildThresholdMap(UPS2_LIMITS, s as Record<string, string | number>));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isOpen, upsId]);

  const handleSelectFile = useCallback(async () => {
    const file = await window.electronAPI.selectFile();
    if (file) {
      if (upsId === 1) setAlarmSound(file);
      else setUps2AlarmSound(file);
    }
  }, [upsId]);

  const handleThresholdChange = useCallback(
    (key: string, field: 'min' | 'max', value: number) => {
      setThresholds((prev) => ({
        ...prev,
        [key]: { ...prev[key], [field]: value },
      }));
    },
    []
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const thresholdFlat = flattenThresholds(thresholds);
      if (upsId === 1) {
        const settings: UpsSettings = {
          ups_ip: upsIp,
          community,
          server_ip: serverIp,
          server_port: serverPort,
          interval: pollInterval,
          alarm_sound: alarmSound,
          ...thresholdFlat,
        };
        await window.electronAPI.saveUps1Settings(settings);
      } else {
        const settings: Ups2Settings = {
          ups2_ip: ups2Ip,
          ups2_community: ups2Community,
          ups2_server_ip: ups2ServerIp,
          ups2_server_port: ups2ServerPort,
          ups2_interval: ups2Interval,
          ups2_alarm_sound: ups2AlarmSound,
          ...thresholdFlat,
        };
        await window.electronAPI.saveUps2Settings(settings);
      }
      onClose();
    } catch (err) {
      console.error('설정 저장 실패:', err);
      alert('설정 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const title = upsId === 1 ? 'UPS#1 설정' : 'UPS#2 설정';

  return (
    /* Backdrop overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Dialog panel */}
      <div className="bg-white rounded-lg shadow-2xl flex flex-col w-full max-w-[480px] max-h-[90vh] overflow-hidden">

        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <span className="font-bold text-base">{title}</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none px-1"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          {(['general', 'event'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'px-6 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ].join(' ')}
            >
              {tab === 'general' ? '일반' : '이벤트'}
            </button>
          ))}
        </div>

        {/* Tab content — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
              불러오는 중...
            </div>
          ) : (
            <>
              {/* ===== 일반 탭 ===== */}
              {activeTab === 'general' && (
                <div>
                  <SectionLabel text="※ SNMP" />
                  <FormRow label="UPS 주소:">
                    <input
                      type="text"
                      value={upsId === 1 ? upsIp : ups2Ip}
                      onChange={(e) => upsId === 1 ? setUpsIp(e.target.value) : setUps2Ip(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </FormRow>
                  <FormRow label="Community:">
                    <input
                      type="text"
                      value={upsId === 1 ? community : ups2Community}
                      onChange={(e) => upsId === 1 ? setCommunity(e.target.value) : setUps2Community(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </FormRow>

                  <SectionLabel text="※ 통합감시 서버" topPad />
                  <FormRow label="UDP IP:">
                    <input
                      type="text"
                      value={upsId === 1 ? serverIp : ups2ServerIp}
                      onChange={(e) => upsId === 1 ? setServerIp(e.target.value) : setUps2ServerIp(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </FormRow>
                  <FormRow label="UDP 포트:">
                    <input
                      type="number"
                      min={1}
                      max={65535}
                      value={upsId === 1 ? serverPort : ups2ServerPort}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v)) upsId === 1 ? setServerPort(v) : setUps2ServerPort(v);
                      }}
                      className="w-28 px-2 py-1 text-sm border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </FormRow>

                  <SectionLabel text="※ 기타" topPad />
                  <FormRow label="갱신 간격 (초):">
                    <input
                      type="number"
                      min={1}
                      value={upsId === 1 ? pollInterval : ups2Interval}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 1) upsId === 1 ? setPollInterval(v) : setUps2Interval(v);
                      }}
                      className="w-28 px-2 py-1 text-sm border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </FormRow>
                  <FormRow label="알람 소리:">
                    <input
                      type="text"
                      value={upsId === 1 ? alarmSound : ups2AlarmSound}
                      onChange={(e) => upsId === 1 ? setAlarmSound(e.target.value) : setUps2AlarmSound(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <button
                      onClick={handleSelectFile}
                      className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-400 rounded whitespace-nowrap"
                    >
                      파일 선택
                    </button>
                  </FormRow>
                </div>
              )}

              {/* ===== 이벤트 탭 ===== */}
              {activeTab === 'event' && (
                <div>
                  <div className="font-bold text-sm mb-3">※ 값 범위 설정 (최소 / 최대)</div>
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-1 text-xs text-gray-500 font-medium">
                    <span className="flex-1 text-right pr-2">항목</span>
                    <span className="w-20 text-center">최소</span>
                    <span className="w-20 text-center">최대</span>
                  </div>
                  {limits.map(({ label, key }) => (
                    <div key={key} className="flex items-center gap-2 mb-1.5">
                      <span className="flex-1 text-right text-sm pr-2 text-gray-700">{label}</span>
                      <SpinBox
                        value={thresholds[key]?.min ?? 0}
                        onChange={(v) => handleThresholdChange(key, 'min', v)}
                      />
                      <SpinBox
                        value={thresholds[key]?.max ?? 0}
                        onChange={(v) => handleThresholdChange(key, 'max', v)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with save button */}
        <div className="flex justify-end px-4 py-3 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="px-6 py-1.5 text-sm font-medium bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded shadow-sm transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;

/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    onSnmpData: (callback: (data: import('../shared/types').SnmpDataUpdate) => void) => () => void;
    onSnmpLog: (callback: (data: import('../shared/types').LogMessage) => void) => () => void;
    onAlarmState: (callback: (data: import('../shared/types').AlarmState) => void) => () => void;
    onThresholdState: (callback: (data: import('../shared/types').ThresholdState) => void) => () => void;
    getUps1Settings: () => Promise<import('../shared/types').UpsSettings>;
    getUps2Settings: () => Promise<import('../shared/types').Ups2Settings>;
    saveUps1Settings: (settings: import('../shared/types').UpsSettings) => Promise<{ success: boolean }>;
    saveUps2Settings: (settings: import('../shared/types').Ups2Settings) => Promise<{ success: boolean }>;
    setAlarmMute: (upsId: number, muted: boolean) => void;
    clearLog: (upsId: number) => void;
    selectFile: () => Promise<string | null>;
    getMemoryUsage: () => Promise<number>;
  };
}

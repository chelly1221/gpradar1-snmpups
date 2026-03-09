import { useState, useEffect, useCallback, useRef } from 'react';
import { SnmpDataUpdate, LogMessage, AlarmState, ThresholdState } from '../../shared/types';

interface UseSnmpDataReturn {
  ups1Data: Record<string, string>;
  ups2Data: Record<string, string>;
  ups1Logs: string[];
  ups2Logs: string[];
  ups1Alarm: boolean;
  ups2Alarm: boolean;
  ups1Thresholds: Record<string, 'low' | 'high' | 'normal' | undefined>;
  ups2Thresholds: Record<string, 'low' | 'high' | 'normal' | undefined>;
  clearLogs: (upsId: 1 | 2) => void;
}

export function useSnmpData(): UseSnmpDataReturn {
  const [ups1Data, setUps1Data] = useState<Record<string, string>>({});
  const [ups2Data, setUps2Data] = useState<Record<string, string>>({});
  const [ups1Logs, setUps1Logs] = useState<string[]>([]);
  const [ups2Logs, setUps2Logs] = useState<string[]>([]);
  const [ups1Alarm, setUps1Alarm] = useState<boolean>(false);
  const [ups2Alarm, setUps2Alarm] = useState<boolean>(false);
  const [ups1Thresholds, setUps1Thresholds] = useState<Record<string, 'low' | 'high' | 'normal' | undefined>>({});
  const [ups2Thresholds, setUps2Thresholds] = useState<Record<string, 'low' | 'high' | 'normal' | undefined>>({});

  useEffect(() => {
    const unsubSnmpData = window.electronAPI.onSnmpData((update: SnmpDataUpdate) => {
      if (update.upsId === 1) {
        setUps1Data(update.data);
      } else {
        setUps2Data(update.data);
      }
    });

    const unsubSnmpLog = window.electronAPI.onSnmpLog((log: LogMessage) => {
      if (log.upsId === 1) {
        setUps1Logs(prev => [...prev.slice(-499), log.message]);
      } else {
        setUps2Logs(prev => [...prev.slice(-499), log.message]);
      }
    });

    const unsubAlarmState = window.electronAPI.onAlarmState((state: AlarmState) => {
      if (state.upsId === 1) {
        setUps1Alarm(state.active);
      } else {
        setUps2Alarm(state.active);
      }
    });

    const unsubThresholdState = window.electronAPI.onThresholdState((state: ThresholdState) => {
      if (state.upsId === 1) {
        setUps1Thresholds(state.states);
      } else {
        setUps2Thresholds(state.states);
      }
    });

    return () => {
      unsubSnmpData();
      unsubSnmpLog();
      unsubAlarmState();
      unsubThresholdState();
    };
  }, []);

  const clearLogs = useCallback((upsId: 1 | 2) => {
    if (upsId === 1) {
      setUps1Logs([]);
    } else {
      setUps2Logs([]);
    }
  }, []);

  return {
    ups1Data,
    ups2Data,
    ups1Logs,
    ups2Logs,
    ups1Alarm,
    ups2Alarm,
    ups1Thresholds,
    ups2Thresholds,
    clearLogs,
  };
}

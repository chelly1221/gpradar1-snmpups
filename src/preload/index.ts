import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';

const api = {
  // Receive data from main process
  onSnmpData: (callback: (data: any) => void) => {
    const sub = (_event: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.SNMP_DATA, sub);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SNMP_DATA, sub);
  },
  onSnmpLog: (callback: (data: any) => void) => {
    const sub = (_event: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.SNMP_LOG, sub);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SNMP_LOG, sub);
  },
  onAlarmState: (callback: (data: any) => void) => {
    const sub = (_event: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.ALARM_STATE, sub);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.ALARM_STATE, sub);
  },
  onThresholdState: (callback: (data: any) => void) => {
    const sub = (_event: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.THRESHOLD_STATE, sub);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.THRESHOLD_STATE, sub);
  },

  // Send to main process
  getUps1Settings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_UPS1),
  getUps2Settings: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_UPS2),
  saveUps1Settings: (settings: any) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE_UPS1, settings),
  saveUps2Settings: (settings: any) => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SAVE_UPS2, settings),
  setAlarmMute: (upsId: number, muted: boolean) => ipcRenderer.send(IPC_CHANNELS.ALARM_MUTE, { upsId, muted }),
  clearLog: (upsId: number) => ipcRenderer.send(IPC_CHANNELS.LOG_CLEAR, { upsId }),
  selectFile: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_FILE),
  getMemoryUsage: () => ipcRenderer.invoke(IPC_CHANNELS.GET_MEMORY_USAGE),
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;

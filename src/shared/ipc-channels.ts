export const IPC_CHANNELS = {
  SNMP_DATA: 'snmp:data',
  SNMP_LOG: 'snmp:log',
  ALARM_STATE: 'snmp:alarm-state',
  THRESHOLD_STATE: 'snmp:threshold-state',
  SETTINGS_GET_UPS1: 'settings:get:ups1',
  SETTINGS_GET_UPS2: 'settings:get:ups2',
  SETTINGS_SAVE_UPS1: 'settings:save:ups1',
  SETTINGS_SAVE_UPS2: 'settings:save:ups2',
  ALARM_MUTE: 'alarm:mute',
  LOG_CLEAR: 'log:clear',
  SELECT_FILE: 'dialog:select-file',
  GET_MEMORY_USAGE: 'system:memory',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

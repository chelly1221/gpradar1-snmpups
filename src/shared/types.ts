export interface UpsSettings {
  ups_ip: string;
  community: string;
  server_ip: string;
  server_port: number;
  interval: number;
  alarm_sound: string;
  [key: string]: string | number;
}

export interface Ups2Settings {
  ups2_ip: string;
  ups2_community: string;
  ups2_server_ip: string;
  ups2_server_port: number;
  ups2_interval: number;
  ups2_alarm_sound: string;
  [key: string]: string | number;
}

export interface SnmpDataUpdate {
  upsId: 1 | 2;
  data: Record<string, string>;
  timestamp: string;
}

export interface LogMessage {
  upsId: 1 | 2;
  message: string;
  timestamp: string;
}

export interface AlarmState {
  upsId: 1 | 2;
  active: boolean;
}

export interface ThresholdState {
  upsId: 1 | 2;
  states: Record<string, 'low' | 'high' | 'normal' | undefined>;
}

export interface SettingsPayload {
  type: 'ups1' | 'ups2';
  settings: UpsSettings | Ups2Settings;
}

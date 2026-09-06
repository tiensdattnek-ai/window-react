export type AppId =
  | 'explorer'
  | 'browser'
  | 'notes'
  | 'music'
  | 'terminal'
  | 'photos'
  | 'settings'
  | 'calculator'
  | 'calendar'
  | 'weather'
  | 'focus';
export type FileKind = 'folder' | 'text' | 'image' | 'audio' | 'code';
export interface WorkspaceFile {
  id: string;
  name: string;
  kind: FileKind;
  parentId: string;
  content?: string;
  url?: string;
  modified: number;
  size: number;
  favorite?: boolean;
  trashed?: boolean;
  color?: string;
}
export interface WindowState {
  id: AppId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  z: number;
  data?: string;
  launchKey?: number;
  restore?: { x: number; y: number; width: number; height: number };
}
export interface Preferences {
  name: string;
  theme: 'light' | 'dark';
  wallpaper: string;
  accent: string;
  transparency: boolean;
  animations: boolean;
  brightness: number;
  volume: number;
  wifi: boolean;
  bluetooth: boolean;
  airplane: boolean;
  focus: boolean;
  largeIcons: boolean;
  city: string;
}
export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  time: string;
  color: string;
}
export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: number;
  app?: AppId;
}
export interface DialogOptions {
  title: string;
  message?: string;
  input?: boolean;
  initialValue?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: (value: string) => void;
}
export interface WeatherData {
  city: string;
  country: string;
  timezone: string;
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    precipitation_probability_max: number[];
  };
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[] };
}

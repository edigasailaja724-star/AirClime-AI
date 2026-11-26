export type ModuleId =
  | 'discover'
  | 'air-intelligence'
  | 'sunlight'
  | 'weather-intelligence'
  | 'earthscope'
  | 'radar'
  | 'atmos-ai'
  | 'lifesync'
  | 'compare'
  | 'ecosmart'
  | 'daily-report'
  | 'alert-center'
  | 'data-lab';

export type UnitSystem = 'metric' | 'imperial';
export type ThemeMode = 'light' | 'dark';
export type ChatLanguage = 'en' | 'te' | 'hi';

export type EarthScopeLayer =
  | 'aqi'
  | 'pm2_5'
  | 'temperature'
  | 'wind'
  | 'precipitation'
  | 'uv'
  | 'cloud';

export interface LocationInfo {
  name: string;
  admin1?: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  elevation?: number;
  sourceLabel?: string;
}

export interface WeatherCurrent {
  time: string;
  temperature_2m: number | null;
  relative_humidity_2m: number | null;
  apparent_temperature: number | null;
  is_day: number | null;
  precipitation: number | null;
  rain: number | null;
  showers: number | null;
  snowfall: number | null;
  weather_code: number | null;
  cloud_cover: number | null;
  pressure_msl: number | null;
  surface_pressure: number | null;
  wind_speed_10m: number | null;
  wind_direction_10m: number | null;
  wind_gusts_10m: number | null;
}

export interface WeatherHourly {
  time: string[];
  temperature_2m: Array<number | null>;
  relative_humidity_2m: Array<number | null>;
  apparent_temperature: Array<number | null>;
  precipitation_probability: Array<number | null>;
  precipitation: Array<number | null>;
  rain: Array<number | null>;
  snowfall: Array<number | null>;
  weather_code: Array<number | null>;
  cloud_cover: Array<number | null>;
  visibility: Array<number | null>;
  wind_speed_10m: Array<number | null>;
  wind_gusts_10m: Array<number | null>;
  uv_index: Array<number | null>;
  cape: Array<number | null>;
  shortwave_radiation: Array<number | null>;
  direct_radiation: Array<number | null>;
  diffuse_radiation: Array<number | null>;
}

export interface WeatherDaily {
  time: string[];
  weather_code: Array<number | null>;
  temperature_2m_max: Array<number | null>;
  temperature_2m_min: Array<number | null>;
  sunrise: string[];
  sunset: string[];
  daylight_duration: Array<number | null>;
  sunshine_duration: Array<number | null>;
  uv_index_max: Array<number | null>;
  precipitation_sum: Array<number | null>;
  rain_sum: Array<number | null>;
  snowfall_sum: Array<number | null>;
  precipitation_probability_max: Array<number | null>;
  wind_speed_10m_max: Array<number | null>;
  wind_gusts_10m_max: Array<number | null>;
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current: WeatherCurrent;
  hourly: WeatherHourly;
  daily: WeatherDaily;
  fetchedAt: string;
  source: string;
}

export interface AirQualityCurrent {
  time: string;
  european_aqi: number | null;
  us_aqi: number | null;
  pm10: number | null;
  pm2_5: number | null;
  carbon_monoxide: number | null;
  nitrogen_dioxide: number | null;
  sulphur_dioxide: number | null;
  ozone: number | null;
  dust: number | null;
  uv_index: number | null;
}

export interface AirQualityHourly {
  time: string[];
  pm10: Array<number | null>;
  pm2_5: Array<number | null>;
  carbon_monoxide: Array<number | null>;
  nitrogen_dioxide: Array<number | null>;
  sulphur_dioxide: Array<number | null>;
  ozone: Array<number | null>;
  us_aqi: Array<number | null>;
  european_aqi: Array<number | null>;
}

export interface AirQualityData {
  latitude: number;
  longitude: number;
  timezone: string;
  current: AirQualityCurrent;
  hourly: AirQualityHourly;
  fetchedAt: string;
  source: string;
}

export type AlertCategory =
  | 'air-quality'
  | 'uv'
  | 'heat'
  | 'rain'
  | 'wind'
  | 'severe-weather';

export interface WeatherAlert {
  id: string;
  category: AlertCategory;
  title: string;
  severity: 'severe' | 'moderate' | 'advisory';
  headline: string;
  description: string;
  instruction?: string;
  effective: string | null;
  expires: string | null;
  source: string;
  kind: 'official-bulletin' | 'telemetry-advisory';
}

export interface RadarFrame {
  time: number;
  path: string;
  kind: 'observed' | 'forecast';
}

export interface RadarData {
  host: string;
  generated: number;
  past: RadarFrame[];
  nowcast: RadarFrame[];
  fetchedAt: string;
  source: string;
}

export interface SpatialGridPoint {
  latitude: number;
  longitude: number;
  us_aqi: number | null;
  pm2_5: number | null;
  uv_index: number | null;
  temperature_2m: number | null;
  wind_speed_10m: number | null;
  precipitation: number | null;
  cloud_cover: number | null;
  weather_code: number | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  language?: ChatLanguage;
  error?: boolean;
}

export interface ComparisonSnapshot {
  location: LocationInfo;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  loading: boolean;
  error: string | null;
}

export interface SessionChangeNotice {
  id: string;
  message: string;
  timestamp: string;
}

export type AqiStandard = 'us_aqi' | 'european_aqi';

export type AqiAlertTier =
  | 'good'
  | 'moderate'
  | 'sensitive'
  | 'unhealthy'
  | 'very-unhealthy'
  | 'unavailable';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface AirQualityAlertRecord {
  id: string;
  locationName: string;
  areaLabel: string;
  standard: AqiStandard;
  standardLabel: string;
  aqiValue: number;
  category: string;
  tier: AqiAlertTier;
  severityRank: number;
  title: string;
  message: string;
  mainPollutant: string;
  pm2_5: number | null;
  pm10: number | null;
  precautions: string[];
  updatedAt: string;
  triggeredAt: string;
  deliveredVia: 'browser-notification' | 'in-app-banner';
}

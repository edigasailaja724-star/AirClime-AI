import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AirQualityData,
  LocationInfo,
  RadarData,
  SessionChangeNotice,
  WeatherAlert,
  WeatherData,
} from '../types/environment';
import {
  fetchAirQualityData,
  fetchOfficialAlerts,
  fetchRadarManifest,
  fetchWeatherData,
  reverseGeocode,
} from '../services/api';
import { deriveTelemetryAdvisories, describeWmoCode } from '../utils/weather';

const DEFAULT_REFERENCE_LOCATION: LocationInfo = {
  name: 'London',
  admin1: 'England',
  country: 'United Kingdom',
  latitude: 51.5085,
  longitude: -0.1257,
  timezone: 'Europe/London',
  sourceLabel: 'Default reference city (no automatic tracking)',
};

export type GeoPermissionState = 'idle' | 'explaining' | 'requesting' | 'granted' | 'denied' | 'unsupported';

export function useEnvironment() {
  const [location, setLocation] = useState<LocationInfo>(DEFAULT_REFERENCE_LOCATION);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [officialAlerts, setOfficialAlerts] = useState<WeatherAlert[]>([]);
  const [alertsSource, setAlertsSource] = useState<string>('Open-Meteo WMO Advisory Engine');
  const [officialFeedAvailable, setOfficialFeedAvailable] = useState<boolean>(false);
  const [radar, setRadar] = useState<RadarData | null>(null);
  const [sessionNotices, setSessionNotices] = useState<SessionChangeNotice[]>([]);

  const [weatherLoading, setWeatherLoading] = useState<boolean>(true);
  const [aqLoading, setAqLoading] = useState<boolean>(true);
  const [radarLoading, setRadarLoading] = useState<boolean>(true);

  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [aqError, setAqError] = useState<string | null>(null);
  const [radarError, setRadarError] = useState<string | null>(null);

  const [geoState, setGeoState] = useState<GeoPermissionState>('idle');
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  const prevSnapshotRef = useRef<{
    locKey: string;
    weatherCode: number | null;
    temp: number | null;
    usAqi: number | null;
  } | null>(null);

  const loadForLocation = useCallback(async (target: LocationInfo) => {
    setWeatherLoading(true);
    setAqLoading(true);
    setWeatherError(null);
    setAqError(null);

    const [weatherRes, aqRes, alertsRes] = await Promise.allSettled([
      fetchWeatherData(target.latitude, target.longitude),
      fetchAirQualityData(target.latitude, target.longitude),
      fetchOfficialAlerts(target.latitude, target.longitude),
    ]);

    let nextWeather: WeatherData | null = null;
    let nextAq: AirQualityData | null = null;

    if (weatherRes.status === 'fulfilled') {
      nextWeather = weatherRes.value;
      setWeather(nextWeather);
    } else {
      setWeather(null);
      setWeatherError(weatherRes.reason instanceof Error ? weatherRes.reason.message : 'Unable to load weather data.');
    }
    setWeatherLoading(false);

    if (aqRes.status === 'fulfilled') {
      nextAq = aqRes.value;
      setAirQuality(nextAq);
    } else {
      setAirQuality(null);
      setAqError(aqRes.reason instanceof Error ? aqRes.reason.message : 'Unable to load air quality data.');
    }
    setAqLoading(false);

    if (alertsRes.status === 'fulfilled') {
      setOfficialAlerts(alertsRes.value.alerts);
      setAlertsSource(alertsRes.value.source);
      setOfficialFeedAvailable(alertsRes.value.officialFeedAvailable);
    } else {
      setOfficialAlerts([]);
      setOfficialFeedAvailable(false);
    }

    // Track real weather/AQI shifts within the same location during this active session
    const locKey = `${target.latitude.toFixed(2)},${target.longitude.toFixed(2)}`;
    const currCode = nextWeather?.current.weather_code ?? null;
    const currTemp = nextWeather?.current.temperature_2m ?? null;
    const currAqi = nextAq?.current.us_aqi ?? null;

    const prev = prevSnapshotRef.current;
    if (prev && prev.locKey === locKey) {
      const updates: SessionChangeNotice[] = [];
      if (prev.weatherCode != null && currCode != null && prev.weatherCode !== currCode) {
        updates.push({
          id: `chg-wmo-${Date.now()}`,
          message: `Weather condition in ${target.name} changed from ${describeWmoCode(prev.weatherCode).label} to ${describeWmoCode(currCode).label}.`,
          timestamp: new Date().toISOString(),
        });
      }
      if (prev.temp != null && currTemp != null && Math.abs(currTemp - prev.temp) >= 2) {
        updates.push({
          id: `chg-temp-${Date.now()}`,
          message: `Temperature in ${target.name} shifted by ${(currTemp - prev.temp > 0 ? '+' : '')}${(currTemp - prev.temp).toFixed(1)}°C.`,
          timestamp: new Date().toISOString(),
        });
      }
      if (prev.usAqi != null && currAqi != null && Math.abs(currAqi - prev.usAqi) >= 15) {
        updates.push({
          id: `chg-aqi-${Date.now()}`,
          message: `US AQI in ${target.name} shifted from ${Math.round(prev.usAqi)} to ${Math.round(currAqi)}.`,
          timestamp: new Date().toISOString(),
        });
      }
      if (updates.length > 0) {
        setSessionNotices((existing) => [...updates, ...existing].slice(0, 6));
      }
    }

    prevSnapshotRef.current = {
      locKey,
      weatherCode: currCode,
      temp: currTemp,
      usAqi: currAqi,
    };
  }, []);

  const loadRadar = useCallback(async () => {
    setRadarLoading(true);
    setRadarError(null);
    try {
      const data = await fetchRadarManifest();
      setRadar(data);
    } catch (err: unknown) {
      setRadarError(err instanceof Error ? err.message : 'Unable to load radar frames.');
    } finally {
      setRadarLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadForLocation(location);
  }, [location, loadForLocation]);

  useEffect(() => {
    void loadRadar();
  }, [loadRadar]);

  const selectLocation = useCallback((next: LocationInfo) => {
    setGeoMessage(null);
    setLocation(next);
  }, []);

  const selectCoordinates = useCallback(async (lat: number, lon: number, customLabel?: string) => {
    const resolved = await reverseGeocode(lat, lon);
    setGeoMessage(null);
    setLocation({
      ...resolved,
      name: customLabel || resolved.name,
    });
  }, []);

  const openLocationPrompt = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeoState('unsupported');
      setGeoMessage('Your browser does not support Geolocation. Please search for your city manually.');
      return;
    }
    setGeoState('explaining');
    setGeoMessage(null);
  }, []);

  const cancelLocationPrompt = useCallback(() => {
    setGeoState('idle');
    setGeoMessage(null);
  }, []);

  const confirmAndRequestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeoState('unsupported');
      setGeoMessage('Geolocation is unavailable in this browser. Please use manual city search.');
      return;
    }

    setGeoState('requesting');
    setGeoMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setGeoState('granted');
        const resolved = await reverseGeocode(latitude, longitude);
        setLocation({
          ...resolved,
          sourceLabel: 'Browser Geolocation (current session only)',
        });
      },
      (error) => {
        setGeoState('denied');
        if (error.code === error.PERMISSION_DENIED) {
          setGeoMessage('Location access was denied. You can search for any city manually above at any time.');
        } else if (error.code === error.TIMEOUT) {
          setGeoMessage('Location request timed out. Please try again or search for your city manually.');
        } else {
          setGeoMessage('Unable to detect your location automatically. Please search for your city manually.');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, []);

  const combinedAlerts = useMemo(() => {
    const telemetry = deriveTelemetryAdvisories(weather, airQuality);
    return [...officialAlerts, ...telemetry];
  }, [officialAlerts, weather, airQuality]);

  const dismissSessionNotice = useCallback((id: string) => {
    setSessionNotices((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const refresh = useCallback(() => {
    void loadForLocation(location);
    void loadRadar();
  }, [loadForLocation, loadRadar, location]);

  // Periodically auto-refresh telemetry every 15 minutes while website tab is open & visible
  useEffect(() => {
    const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
    const interval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void loadForLocation(location);
      }
    }, FIFTEEN_MINUTES_MS);
    return () => clearInterval(interval);
  }, [loadForLocation, location]);

  return {
    location,
    weather,
    airQuality,
    alerts: combinedAlerts,
    officialAlerts,
    alertsSource,
    officialFeedAvailable,
    radar,
    sessionNotices,
    dismissSessionNotice,
    weatherLoading,
    aqLoading,
    radarLoading,
    weatherError,
    aqError,
    radarError,
    geoState,
    geoMessage,
    autoRefreshIntervalMinutes: 15,
    selectLocation,
    selectCoordinates,
    openLocationPrompt,
    cancelLocationPrompt,
    confirmAndRequestLocation,
    refresh,
  };
}

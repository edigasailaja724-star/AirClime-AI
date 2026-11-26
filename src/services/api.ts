import type {
  AirQualityData,
  ChatLanguage,
  ChatMessage,
  LocationInfo,
  RadarData,
  SpatialGridPoint,
  WeatherAlert,
  WeatherData,
} from '../types/environment';

const CACHE_TTL_MS = 3 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value as T;
}

function setCached<T>(key: string, value: T, ttlMs = CACHE_TTL_MS): void {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 10000, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    if (!res.ok) {
      let errMsg = `Request failed (${res.status})`;
      try {
        const body = (await res.json()) as { error?: string; reason?: string };
        if (body.error) errMsg = body.error;
        else if (body.reason) errMsg = body.reason;
      } catch {
        // ignore JSON parse failure
      }
      throw new Error(errMsg);
    }
    return (await res.json()) as T;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchLocations(query: string): Promise<LocationInfo[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cacheKey = `geo:${trimmed.toLowerCase()}`;
  const cached = getCached<LocationInfo[]>(cacheKey);
  if (cached) return cached;

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', trimmed);
  url.searchParams.set('count', '8');
  url.searchParams.set('language', 'en');
  url.searchParams.set('format', 'json');

  const data = await fetchJsonWithTimeout<{
    results?: Array<{
      name: string;
      admin1?: string;
      country?: string;
      latitude: number;
      longitude: number;
      timezone?: string;
      elevation?: number;
    }>;
  }>(url.toString(), 8000);

  const list: LocationInfo[] = (data.results ?? []).map((r) => ({
    name: r.name,
    admin1: r.admin1,
    country: r.country || 'Unknown',
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
    elevation: r.elevation,
    sourceLabel: 'Open-Meteo Geocoding',
  }));

  setCached(cacheKey, list, 10 * 60 * 1000);
  return list;
}

export async function reverseGeocode(lat: number, lon: number): Promise<LocationInfo> {
  const key = `rev:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = getCached<LocationInfo>(key);
  if (cached) return cached;

  try {
    const data = await fetchJsonWithTimeout<{
      name: string;
      admin1?: string;
      country?: string;
      latitude: number;
      longitude: number;
      source?: string;
    }>(`/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, 8000);

    const loc: LocationInfo = {
      name: data.name || `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      admin1: data.admin1 || '',
      country: data.country || 'Coordinates',
      latitude: lat,
      longitude: lon,
      sourceLabel: data.source || 'OpenStreetMap Nominatim',
    };
    setCached(key, loc, 10 * 60 * 1000);
    return loc;
  } catch {
    return {
      name: `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      admin1: '',
      country: 'Selected Coordinates',
      latitude: lat,
      longitude: lon,
      sourceLabel: 'GPS / Map Coordinates',
    };
  }
}

export async function fetchWeatherData(lat: number, lon: number): Promise<WeatherData> {
  const key = `weather:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = getCached<WeatherData>(key);
  if (cached) return cached;

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('longitude', lon.toFixed(4));
  url.searchParams.set(
    'current',
    [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'rain',
      'showers',
      'snowfall',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),
  );
  url.searchParams.set(
    'hourly',
    [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'precipitation_probability',
      'precipitation',
      'rain',
      'snowfall',
      'weather_code',
      'cloud_cover',
      'visibility',
      'wind_speed_10m',
      'wind_gusts_10m',
      'uv_index',
      'cape',
      'shortwave_radiation',
      'direct_radiation',
      'diffuse_radiation',
    ].join(','),
  );
  url.searchParams.set(
    'daily',
    [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'sunrise',
      'sunset',
      'daylight_duration',
      'sunshine_duration',
      'uv_index_max',
      'precipitation_sum',
      'rain_sum',
      'snowfall_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
    ].join(','),
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '7');

  const raw = await fetchJsonWithTimeout<Omit<WeatherData, 'fetchedAt' | 'source'>>(url.toString(), 10000);
  const enriched: WeatherData = {
    ...raw,
    fetchedAt: new Date().toISOString(),
    source: 'Open-Meteo Forecast API (ECMWF / GFS / ICON blend)',
  };

  setCached(key, enriched);
  return enriched;
}

export async function fetchAirQualityData(lat: number, lon: number): Promise<AirQualityData> {
  const key = `aq:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = getCached<AirQualityData>(key);
  if (cached) return cached;

  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('longitude', lon.toFixed(4));
  url.searchParams.set(
    'current',
    [
      'european_aqi',
      'us_aqi',
      'pm10',
      'pm2_5',
      'carbon_monoxide',
      'nitrogen_dioxide',
      'sulphur_dioxide',
      'ozone',
      'dust',
      'uv_index',
    ].join(','),
  );
  url.searchParams.set(
    'hourly',
    [
      'pm10',
      'pm2_5',
      'carbon_monoxide',
      'nitrogen_dioxide',
      'sulphur_dioxide',
      'ozone',
      'us_aqi',
      'european_aqi',
    ].join(','),
  );
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('past_days', '2');
  url.searchParams.set('forecast_days', '5');

  const raw = await fetchJsonWithTimeout<Omit<AirQualityData, 'fetchedAt' | 'source'>>(url.toString(), 10000);
  const enriched: AirQualityData = {
    ...raw,
    fetchedAt: new Date().toISOString(),
    source: 'Open-Meteo Air Quality API (Copernicus CAMS Global & European Models)',
  };

  setCached(key, enriched);
  return enriched;
}

/**
 * Fetches a genuine 3x3 spatial sampling grid around (lat, lon) via Open-Meteo
 * multi-coordinate batch endpoints for EarthScope environmental layers.
 */
export async function fetchSpatialGridData(centerLat: number, centerLon: number): Promise<SpatialGridPoint[]> {
  const key = `grid:${centerLat.toFixed(1)},${centerLon.toFixed(1)}`;
  const cached = getCached<SpatialGridPoint[]>(key);
  if (cached) return cached;

  const offsets = [-0.45, 0, 0.45];
  const coords: Array<{ lat: number; lon: number }> = [];
  for (const dLat of offsets) {
    for (const dLon of offsets) {
      const lat = Math.max(-85, Math.min(85, centerLat + dLat));
      const lon = ((centerLon + dLon + 540) % 360) - 180;
      coords.push({ lat: Number(lat.toFixed(3)), lon: Number(lon.toFixed(3)) });
    }
  }

  const latsParam = coords.map((c) => c.lat).join(',');
  const lonsParam = coords.map((c) => c.lon).join(',');

  const wUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latsParam}&longitude=${lonsParam}&current=temperature_2m,wind_speed_10m,precipitation,cloud_cover,weather_code`;
  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latsParam}&longitude=${lonsParam}&current=us_aqi,pm2_5,uv_index`;

  const [wList, aqList] = await Promise.all([
    fetchJsonWithTimeout<Array<{ current?: Record<string, number | null> }>>(wUrl, 9000),
    fetchJsonWithTimeout<Array<{ current?: Record<string, number | null> }>>(aqUrl, 9000),
  ]);

  const points: SpatialGridPoint[] = coords.map((c, idx) => {
    const wc = wList[idx]?.current ?? {};
    const ac = aqList[idx]?.current ?? {};
    return {
      latitude: c.lat,
      longitude: c.lon,
      us_aqi: ac.us_aqi ?? null,
      pm2_5: ac.pm2_5 ?? null,
      uv_index: ac.uv_index ?? null,
      temperature_2m: wc.temperature_2m ?? null,
      wind_speed_10m: wc.wind_speed_10m ?? null,
      precipitation: wc.precipitation ?? null,
      cloud_cover: wc.cloud_cover ?? null,
      weather_code: wc.weather_code ?? null,
    };
  });

  setCached(key, points, 5 * 60 * 1000);
  return points;
}

export async function fetchOfficialAlerts(lat: number, lon: number): Promise<{
  alerts: WeatherAlert[];
  source: string;
  officialFeedAvailable: boolean;
}> {
  const key = `alerts:${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = getCached<{ alerts: WeatherAlert[]; source: string; officialFeedAvailable: boolean }>(key);
  if (cached) return cached;

  try {
    const res = await fetchJsonWithTimeout<{
      alerts: Array<Omit<WeatherAlert, 'kind' | 'category'>>;
      source: string;
      officialFeedAvailable: boolean;
    }>(`/api/alerts?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`, 7000);

    const formatted = {
      alerts: res.alerts.map((a) => ({
        ...a,
        category: 'severe-weather' as const,
        kind: 'official-bulletin' as const,
      })),
      source: res.source,
      officialFeedAvailable: res.officialFeedAvailable,
    };
    setCached(key, formatted);
    return formatted;
  } catch {
    return {
      alerts: [],
      source: 'Open-Meteo WMO Advisory Engine',
      officialFeedAvailable: false,
    };
  }
}

export async function fetchRadarManifest(): Promise<RadarData> {
  const cached = getCached<RadarData>('radar:rainviewer');
  if (cached) return cached;

  const data = await fetchJsonWithTimeout<{
    host: string;
    generated: number;
    radar?: {
      past?: Array<{ time: number; path: string }>;
      nowcast?: Array<{ time: number; path: string }>;
    };
  }>('https://api.rainviewer.com/public/weather-maps.json', 8000);

  const result: RadarData = {
    host: data.host || 'https://tilecache.rainviewer.com',
    generated: data.generated || Math.floor(Date.now() / 1000),
    past: (data.radar?.past ?? []).map((f) => ({ ...f, kind: 'observed' as const })),
    nowcast: (data.radar?.nowcast ?? []).map((f) => ({ ...f, kind: 'forecast' as const })),
    fetchedAt: new Date().toISOString(),
    source: 'RainViewer Global Composite Radar API',
  };

  setCached('radar:rainviewer', result, 3 * 60 * 1000);
  return result;
}

export async function sendAirClimeAiMessage(payload: {
  messages: ChatMessage[];
  language: ChatLanguage;
  locationContext: unknown;
  comparisonContext?: unknown;
}): Promise<{ reply: string; model: string; timestamp: string }> {
  return fetchJsonWithTimeout<{ reply: string; model: string; timestamp: string }>(
    '/api/airclime-ai',
    45000,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: payload.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        language: payload.language,
        locationContext: payload.locationContext,
        comparisonContext: payload.comparisonContext ?? null,
      }),
    },
  );
}

export async function streamAirClimeAiMessage(
  payload: {
    messages: ChatMessage[];
    language: ChatLanguage;
    locationContext: unknown;
    comparisonContext?: unknown;
  },
  onChunk: (accumulatedText: string) => void,
): Promise<{ reply: string; timestamp: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50000);

  try {
    const res = await fetch('/api/airclime-ai/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        messages: payload.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        language: payload.language,
        locationContext: payload.locationContext,
        comparisonContext: payload.comparisonContext ?? null,
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('text/event-stream') || !res.body) {
      let errMsg = `AirClime-ai request failed (${res.status})`;
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error) errMsg = body.error;
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulated = '';
    let finalTimestamp = new Date().toISOString();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const evt of events) {
        const line = evt.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        const parsed = JSON.parse(jsonStr) as {
          delta?: string;
          done?: boolean;
          error?: string;
          timestamp?: string;
        };
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (parsed.delta) {
          accumulated += parsed.delta;
          onChunk(accumulated);
        }
        if (parsed.done && parsed.timestamp) {
          finalTimestamp = parsed.timestamp;
        }
      }
    }

    if (!accumulated.trim()) {
      const fallback = await sendAirClimeAiMessage(payload);
      onChunk(fallback.reply);
      return { reply: fallback.reply, timestamp: fallback.timestamp };
    }

    return { reply: accumulated.trim(), timestamp: finalTimestamp };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('AirClime-ai timed out waiting for a reply. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

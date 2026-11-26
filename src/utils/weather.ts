import type { UnitSystem, WeatherAlert, WeatherData, AirQualityData } from '../types/environment';

export interface WmoDescription {
  label: string;
  icon: 'sun' | 'partly-cloudy' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';
  severity: 'normal' | 'caution' | 'severe';
}

export function describeWmoCode(code: number | null | undefined): WmoDescription {
  if (code == null) {
    return { label: 'Unavailable', icon: 'cloud', severity: 'normal' };
  }
  if (code === 0) return { label: 'Clear Sky', icon: 'sun', severity: 'normal' };
  if (code === 1) return { label: 'Mainly Clear', icon: 'sun', severity: 'normal' };
  if (code === 2) return { label: 'Partly Cloudy', icon: 'partly-cloudy', severity: 'normal' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud', severity: 'normal' };
  if (code === 45 || code === 48) return { label: 'Fog / Rime Fog', icon: 'fog', severity: 'caution' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: 'drizzle', severity: 'normal' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return {
      label: code >= 65 || code === 82 ? 'Heavy Rain' : 'Rain Showers',
      icon: 'rain',
      severity: code >= 65 || code === 82 ? 'caution' : 'normal',
    };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return {
      label: code === 75 || code === 86 ? 'Heavy Snowfall' : 'Snow',
      icon: 'snow',
      severity: code === 75 || code === 86 ? 'caution' : 'normal',
    };
  }
  if (code >= 95 && code <= 99) {
    return {
      label: code >= 96 ? 'Thunderstorm with Hail' : 'Thunderstorm',
      icon: 'storm',
      severity: 'severe',
    };
  }
  return { label: `Weather Code ${code}`, icon: 'cloud', severity: 'normal' };
}

export function formatTemp(celsius: number | null | undefined, units: UnitSystem, withUnit = true): string {
  if (celsius == null || !Number.isFinite(celsius)) return 'N/A';
  const val = units === 'imperial' ? (celsius * 9) / 5 + 32 : celsius;
  const rounded = Math.round(val);
  return withUnit ? `${rounded}°${units === 'imperial' ? 'F' : 'C'}` : `${rounded}°`;
}

export function formatWindSpeed(kmh: number | null | undefined, units: UnitSystem): string {
  if (kmh == null || !Number.isFinite(kmh)) return 'N/A';
  if (units === 'imperial') {
    return `${Math.round(kmh * 0.621371)} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

export function formatVisibility(meters: number | null | undefined, units: UnitSystem): string {
  if (meters == null || !Number.isFinite(meters)) return 'N/A';
  if (units === 'imperial') {
    return `${(meters / 1609.34).toFixed(1)} mi`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatPrecipitation(mm: number | null | undefined, units: UnitSystem): string {
  if (mm == null || !Number.isFinite(mm)) return 'N/A';
  if (units === 'imperial') {
    return `${(mm / 25.4).toFixed(2)} in`;
  }
  return `${mm.toFixed(1)} mm`;
}

export function formatSnowfall(cm: number | null | undefined, units: UnitSystem): string {
  if (cm == null || !Number.isFinite(cm)) return 'N/A';
  if (units === 'imperial') {
    return `${(cm / 2.54).toFixed(2)} in`;
  }
  return `${cm.toFixed(1)} cm`;
}

export function compassDirection(degrees: number | null | undefined): string {
  if (degrees == null || !Number.isFinite(degrees)) return 'N/A';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16;
  return `${dirs[idx]} (${Math.round(degrees)}°)`;
}

export function describeUvIndex(uv: number | null | undefined): {
  label: string;
  guidance: string;
  textClass: string;
} {
  if (uv == null || !Number.isFinite(uv)) {
    return { label: 'Unavailable', guidance: 'UV data unavailable.', textClass: 'text-slate-500' };
  }
  if (uv < 3) {
    return { label: 'Low', guidance: 'Minimal sun protection required for brief stays.', textClass: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (uv < 6) {
    return { label: 'Moderate', guidance: 'Wear sunglasses and SPF 30+ near midday.', textClass: 'text-amber-600 dark:text-amber-400' };
  }
  if (uv < 8) {
    return { label: 'High', guidance: 'Seek shade during midday hours and apply broad-spectrum sunscreen.', textClass: 'text-orange-600 dark:text-orange-400' };
  }
  if (uv < 11) {
    return { label: 'Very High', guidance: 'Minimize direct sun exposure between 10:00 and 16:00.', textClass: 'text-rose-600 dark:text-rose-400' };
  }
  return { label: 'Extreme', guidance: 'Avoid midday sun; full UV protective clothing and shade advised.', textClass: 'text-purple-600 dark:text-purple-400' };
}

export interface WeatherComfortResult {
  score: number | null;
  label: string;
  explanation: string;
  methodology: string;
}

/**
 * Computes an explicit, transparent Weather Comfort Index (0-100) from current
 * apparent temperature, relative humidity, wind speed, and active precipitation.
 */
export function computeWeatherComfortIndex(weather: WeatherData | null): WeatherComfortResult {
  const c = weather?.current;
  if (!c || c.temperature_2m == null) {
    return {
      score: null,
      label: 'Unavailable',
      explanation: 'Current meteorological readings are unavailable to compute comfort.',
      methodology: 'Requires apparent temperature, humidity, wind, and precipitation.',
    };
  }

  const feelsLike = c.apparent_temperature ?? c.temperature_2m;
  const humidity = c.relative_humidity_2m ?? 50;
  const wind = c.wind_speed_10m ?? 10;
  const precip = c.precipitation ?? 0;

  // Ideal apparent temperature ~21°C
  const tempPenalty = Math.min(55, Math.abs(feelsLike - 21) * 2.4);
  // Ideal humidity 35-65%
  const humPenalty =
    humidity < 35 ? (35 - humidity) * 0.45 : humidity > 65 ? (humidity - 65) * 0.6 : 0;
  // Wind > 20 km/h reduces comfort
  const windPenalty = wind > 20 ? Math.min(20, (wind - 20) * 0.5) : 0;
  // Precipitation penalty
  const precipPenalty = precip > 0 ? Math.min(25, 8 + precip * 4) : 0;

  const score = Math.max(0, Math.min(100, Math.round(100 - tempPenalty - humPenalty - windPenalty - precipPenalty)));

  const label =
    score >= 80
      ? 'Optimal Comfort'
      : score >= 60
        ? 'Comfortable'
        : score >= 40
          ? 'Mild Discomfort'
          : 'Challenging Conditions';

  const explanation = `Calculated at ${score}/100 (${label}) using apparent temperature (${feelsLike.toFixed(1)}°C), humidity (${Math.round(humidity)}%), wind (${Math.round(wind)} km/h), and precipitation (${precip.toFixed(1)} mm).`;

  return {
    score,
    label,
    explanation,
    methodology: 'AirClime Comfort Index: starts at 100 and subtracts penalties for thermal deviation from 21°C, humidity outside 35–65%, wind >20 km/h, and active precipitation.',
  };
}

export function deriveTelemetryAdvisories(
  weather: WeatherData | null,
  airQuality: AirQualityData | null,
): WeatherAlert[] {
  const advisories: WeatherAlert[] = [];

  if (airQuality?.current.us_aqi != null && airQuality.current.us_aqi > 100) {
    const aqi = Math.round(airQuality.current.us_aqi);
    advisories.push({
      id: 'advisory-high-aqi',
      category: 'air-quality',
      title: aqi > 150 ? 'Poor Air Quality Alert' : 'Sensitive-Group Air Quality Advisory',
      severity: aqi > 200 ? 'severe' : aqi > 150 ? 'moderate' : 'advisory',
      headline: `US AQI is currently ${aqi} (PM2.5: ${airQuality.current.pm2_5?.toFixed(1) ?? 'N/A'} µg/m³).`,
      description: 'Elevated fine particulate or ozone concentrations increase respiratory irritation risk during prolonged outdoor exertion.',
      instruction:
        aqi > 150
          ? 'Avoid strenuous outdoor exercise, keep windows closed during peak pollution, and wear an N95/FFP2 respirator outdoors if needed.'
          : 'Children, older adults, and individuals with asthma should reduce prolonged outdoor exertion.',
      effective: airQuality.current.time,
      expires: null,
      source: 'AirClime Telemetry Threshold (Open-Meteo CAMS)',
      kind: 'telemetry-advisory',
    });
  }

  // UV Alert check (current or today's peak)
  const nowIdx = weather?.hourly.time.findIndex((t) => Date.parse(t) >= Date.now() - 3600 * 1000) ?? 0;
  const safeIdx = nowIdx >= 0 ? nowIdx : 0;
  const currentUv = weather?.hourly.uv_index?.[safeIdx] ?? airQuality?.current.uv_index ?? null;
  const peakUvToday = weather?.daily.uv_index_max?.[0] ?? null;
  const checkUv = currentUv ?? peakUvToday;

  if (checkUv != null && checkUv >= 8) {
    advisories.push({
      id: 'advisory-high-uv',
      category: 'uv',
      title: checkUv >= 11 ? 'Extreme UV Radiation Alert' : 'Very High UV Advisory',
      severity: checkUv >= 11 ? 'severe' : 'moderate',
      headline: `${currentUv != null ? 'Current' : 'Peak daily'} UV Index reaches ${checkUv.toFixed(1)}.`,
      description: 'High ultraviolet irradiance can cause sunburn and skin/eye damage within short unprotected exposure windows.',
      instruction: 'Seek shade between 10:00 and 16:00, apply SPF 30+ sunscreen, and wear UV-blocking sunglasses and a wide-brim hat.',
      effective: weather?.current.time ?? null,
      expires: null,
      source: 'AirClime Telemetry Threshold (Open-Meteo UV Model)',
      kind: 'telemetry-advisory',
    });
  }

  if (weather?.current) {
    const c = weather.current;
    if (c.weather_code != null && c.weather_code >= 95) {
      advisories.push({
        id: 'advisory-thunderstorm',
        category: 'severe-weather',
        title: 'Active Thunderstorm Condition',
        severity: 'severe',
        headline: 'Current meteorological observation indicates active thunderstorm activity.',
        description: `WMO code ${c.weather_code} (${describeWmoCode(c.weather_code).label}). Wind gusts up to ${c.wind_gusts_10m ?? 'N/A'} km/h.`,
        instruction: 'Seek sturdy indoor shelter away from open fields, tall trees, and metal structures.',
        effective: c.time,
        expires: null,
        source: 'AirClime Telemetry Threshold (Open-Meteo WMO)',
        kind: 'telemetry-advisory',
      });
    }

    if ((c.rain != null && c.rain >= 7.5) || (c.precipitation != null && c.precipitation >= 10) || c.weather_code === 65 || c.weather_code === 82) {
      advisories.push({
        id: 'advisory-heavy-rain',
        category: 'rain',
        title: 'Heavy Rainfall Advisory',
        severity: 'moderate',
        headline: `Observed rainfall intensity at ${(c.rain ?? c.precipitation ?? 0).toFixed(1)} mm/h.`,
        description: 'Heavy rain reduces visibility and increases localized surface water runoff and slippery roads.',
        instruction: 'Avoid flooded underpasses, allow extra braking distance, and carry waterproof protection.',
        effective: c.time,
        expires: null,
        source: 'AirClime Telemetry Threshold (Open-Meteo)',
        kind: 'telemetry-advisory',
      });
    }

    if (c.wind_gusts_10m != null && c.wind_gusts_10m >= 50) {
      advisories.push({
        id: 'advisory-high-wind',
        category: 'wind',
        title: 'Strong Wind Gust Advisory',
        severity: c.wind_gusts_10m >= 80 ? 'severe' : 'moderate',
        headline: `Surface wind gusts reaching ${Math.round(c.wind_gusts_10m)} km/h.`,
        description: 'Strong gusts can blow loose debris, reduce high-profile vehicle stability, and impact cycling.',
        instruction: 'Secure outdoor items and use caution in exposed coastal or elevated areas.',
        effective: c.time,
        expires: null,
        source: 'AirClime Telemetry Threshold (Open-Meteo)',
        kind: 'telemetry-advisory',
      });
    }

    if ((c.snowfall != null && c.snowfall >= 1.5) || c.weather_code === 75 || c.weather_code === 86) {
      advisories.push({
        id: 'advisory-snow',
        category: 'severe-weather',
        title: 'Heavy Snowfall Advisory',
        severity: 'moderate',
        headline: `Active snowfall observed (${c.snowfall?.toFixed(1) ?? '0'} cm/h).`,
        description: 'Accumulating snow may reduce road traction and visibility.',
        instruction: 'Allow extra travel time and monitor local road conditions.',
        effective: c.time,
        expires: null,
        source: 'AirClime Telemetry Threshold (Open-Meteo)',
        kind: 'telemetry-advisory',
      });
    }

    if (c.temperature_2m != null && c.temperature_2m >= 36) {
      advisories.push({
        id: 'advisory-heat',
        category: 'heat',
        title: c.temperature_2m >= 41 ? 'Extreme Heat Alert' : 'High Heat Advisory',
        severity: c.temperature_2m >= 41 ? 'severe' : 'moderate',
        headline: `Ambient temperature at ${c.temperature_2m.toFixed(1)}°C (feels like ${c.apparent_temperature?.toFixed(1) ?? 'N/A'}°C).`,
        description: 'Elevated thermal stress increases dehydration and heat exhaustion risk outdoors.',
        instruction: 'Stay hydrated, rest in shade, and avoid peak afternoon exertion.',
        effective: c.time,
        expires: null,
        source: 'AirClime Telemetry Threshold (Open-Meteo)',
        kind: 'telemetry-advisory',
      });
    }

    if (c.temperature_2m != null && c.temperature_2m <= -10) {
      advisories.push({
        id: 'advisory-cold',
        category: 'severe-weather',
        title: 'Extreme Cold Advisory',
        severity: 'moderate',
        headline: `Sub-freezing temperature at ${c.temperature_2m.toFixed(1)}°C.`,
        description: 'Low temperatures increase hypothermia and icy surface hazards.',
        instruction: 'Wear insulated windproof layers and limit prolonged exposed skin outdoors.',
        effective: c.time,
        expires: null,
        source: 'AirClime Telemetry Threshold (Open-Meteo)',
        kind: 'telemetry-advisory',
      });
    }
  }

  return advisories;
}

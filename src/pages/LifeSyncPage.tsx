import { useMemo, useState } from 'react';
import {
  Droplet,
  Footprints,
  HeartPulse,
  Home,
  Shirt,
  Shield,
  Sun,
  SunMedium,
  Users,
} from 'lucide-react';
import type { AirQualityData, LocationInfo, UnitSystem, WeatherData } from '../types/environment';
import {
  calculateExposureIntelligence,
  computeBestOutdoorWindow,
  getUsAqiCategory,
} from '../utils/airQuality';
import { describeUvIndex, describeWmoCode, formatTemp, formatWindSpeed } from '../utils/weather';
import { calculateDaylightTimeline, formatMinutesAsHm } from '../utils/solar';

interface LifeSyncPageProps {
  location: LocationInfo;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  units: UnitSystem;
}

type ActivityChoice = 'walking' | 'jogging' | 'cycling' | 'outdoor-work';

export function LifeSyncPage({ location, weather, airQuality, units }: LifeSyncPageProps) {
  const [activityType, setActivityType] = useState<ActivityChoice>('walking');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);

  const usAqi = airQuality?.current.us_aqi ?? null;
  const aqiCat = getUsAqiCategory(usAqi);
  const tempC = weather?.current.temperature_2m ?? null;
  const apparentC = weather?.current.apparent_temperature ?? tempC;
  const humidity = weather?.current.relative_humidity_2m ?? null;
  const windKmh = weather?.current.wind_speed_10m ?? null;
  const rainMm = weather?.current.precipitation ?? 0;
  const wmo = describeWmoCode(weather?.current.weather_code);
  const outdoorWindow = computeBestOutdoorWindow(airQuality?.hourly, weather?.hourly);

  const nowIdx = weather?.hourly.time.findIndex((t) => Date.parse(t) >= Date.now() - 3600 * 1000) ?? 0;
  const safeIdx = nowIdx >= 0 ? nowIdx : 0;
  const currentUv = weather?.hourly.uv_index?.[safeIdx] ?? airQuality?.current.uv_index ?? weather?.daily.uv_index_max?.[0] ?? null;
  const uvInfo = describeUvIndex(currentUv);

  const daylight = calculateDaylightTimeline(
    weather?.daily.sunrise?.[0],
    weather?.daily.sunset?.[0],
    weather?.daily.daylight_duration?.[0],
    weather?.timezone,
  );

  const mappedLevel: 'resting' | 'walking' | 'jogging' | 'cycling' =
    activityType === 'outdoor-work' ? 'walking' : activityType;

  const exposure = useMemo(
    () => calculateExposureIntelligence(airQuality?.current, mappedLevel, durationMinutes),
    [airQuality?.current, mappedLevel, durationMinutes],
  );

  // Outdoor activity suitability derived directly from live AQI + precipitation + thermal + UV conditions
  let suitabilityLabel = 'Favorable for Outdoor Activity';
  let suitabilityDetail = `Clean to moderate air and stable weather support ${durationMinutes} min of ${activityType.replace('-', ' ')}.`;
  let indoorPreference = 'Outdoor activity is suitable; keep indoor spaces naturally ventilated while outdoor AQI stays ≤ 50.';

  if (usAqi != null && usAqi > 150) {
    suitabilityLabel = 'Prefer Indoor Activity';
    suitabilityDetail = `Elevated US AQI (${Math.round(usAqi)}) increases respiratory particulate exposure during a ${durationMinutes}-minute ${activityType.replace('-', ' ')} session.`;
    indoorPreference = 'Choose indoor cardio, yoga, or strength training with closed windows and HEPA filtration where available.';
  } else if ((rainMm != null && rainMm >= 1.5) || wmo.severity === 'severe') {
    suitabilityLabel = 'Caution — Weather Disruption';
    suitabilityDetail = `Current conditions (${wmo.label}) reduce outdoor safety and comfort.`;
    indoorPreference = 'Opt for indoor workouts until rain or storm activity clears.';
  } else if (usAqi != null && usAqi > 100) {
    suitabilityLabel = 'Moderate Caution for Sensitive Groups';
    suitabilityDetail = `US AQI (${Math.round(usAqi)}) is acceptable for brief walks, though ${durationMinutes} min of higher-exertion activity may irritate sensitive airways.`;
    indoorPreference = 'Keep high-intensity intervals indoors; light outdoor walks are fine for most healthy adults.';
  } else if (currentUv != null && currentUv >= 8) {
    suitabilityLabel = 'Sun-Protected Outdoor Timing Advised';
    suitabilityDetail = `Air quality is acceptable, but UV Index (${currentUv.toFixed(1)}) is ${uvInfo.label}. Prefer morning/late-afternoon shade for ${durationMinutes}-minute sessions.`;
  }

  // Clothing suggestions
  const clothingAdvice = (() => {
    if (tempC == null) return 'Weather data is loading; dress in adaptable layers.';
    const layers: string[] = [];
    if (tempC <= 5) layers.push('Insulated thermal base layer, heavy coat, gloves, and warm headwear.');
    else if (tempC <= 14) layers.push('Light sweater or fleece paired with a wind-resistant outer jacket.');
    else if (tempC <= 23) layers.push('Breathable cotton or moisture-wicking shirt with a light layer for evening cooling.');
    else if (tempC <= 31) layers.push('Loose, light-colored breathable fabrics, UV sunglasses, and sun hat.');
    else layers.push('Minimal ultra-lightweight breathable clothing, wide-brim hat, and high-UPF sun protection.');

    if (rainMm != null && rainMm > 0.2) layers.push('Pack a waterproof shell or compact umbrella.');
    if (windKmh != null && windKmh >= 28) layers.push('Add a windbreaker to reduce windchill.');
    if (currentUv != null && currentUv >= 6) layers.push('Apply broad-spectrum SPF 30+ sunscreen before stepping out.');
    return layers.join(' ');
  })();

  // Hydration guidance calibrated to temperature, humidity, and selected duration
  const hydrationAdvice = (() => {
    const baseMlPerHour =
      tempC != null && (tempC >= 30 || (apparentC != null && apparentC >= 32))
        ? 600
        : activityType === 'jogging' || activityType === 'cycling' || activityType === 'outdoor-work'
          ? 450
          : 250;
    const sessionMl = Math.round((baseMlPerHour * durationMinutes) / 60);

    if (tempC == null) return 'Maintain regular water intake throughout the day.';
    if (tempC >= 30 || (apparentC != null && apparentC >= 32)) {
      return `High thermal load increases sweat loss. Aim for ~${sessionMl} mL during your ${durationMinutes}-minute session and replenish electrolytes afterward.`;
    }
    if (humidity != null && humidity < 35) {
      return `Low relative humidity (${Math.round(humidity)}%) speeds respiratory moisture loss. Carry ~${sessionMl} mL of water for your ${durationMinutes}-minute outing.`;
    }
    return `For a ${durationMinutes}-minute ${activityType.replace('-', ' ')} session at ${formatTemp(tempC, units)}, target roughly ~${sessionMl} mL of water alongside regular daily hydration.`;
  })();

  return (
    <div className="space-y-7">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <HeartPulse className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
          <span>LifeSync</span>
          <span aria-hidden="true">·</span>
          <span>{location.name}, {location.country}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Environmental Health &amp; Daily Lifestyle Guidance
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Customize your planned activity and duration to get practical guidance synchronized with live air quality, UV radiation, daylight, and weather telemetry.
        </p>
      </header>

      {/* Activity & Duration Calibration Controls */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Personalize Outdoor Session Parameters
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Calibrates estimated PM2.5 inhalation, hydration target, and exertion suitability.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(
              [
                { id: 'walking', label: 'Walking' },
                { id: 'jogging', label: 'Jogging' },
                { id: 'cycling', label: 'Cycling' },
                { id: 'outdoor-work', label: 'Outdoor Work' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setActivityType(opt.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                  activityType === opt.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            aria-label="Planned activity duration"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
          >
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} minutes
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Current Conditions Snapshot */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 grid grid-cols-1 md:grid-cols-4 gap-5">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Outdoor Suitability</p>
          <p className="text-lg font-bold text-[#0F5132] dark:text-emerald-400 mt-1">{suitabilityLabel}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">{suitabilityDetail}</p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Air &amp; Thermal State</p>
          <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            US AQI {usAqi != null ? Math.round(usAqi) : 'N/A'} · {formatTemp(tempC, units)}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
            {aqiCat.label} air · {wmo.label} · Wind {formatWindSpeed(windKmh, units)}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Estimated PM2.5 Intake</p>
          <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {exposure.estimatedPm25InhaledUg != null ? `${exposure.estimatedPm25InhaledUg} µg` : 'N/A'}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
            {exposure.riskTier} ({durationMinutes}m {activityType.replace('-', ' ')})
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Optimal Timing &amp; Daylight</p>
          <p className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {outdoorWindow.found ? `${outdoorWindow.startLabel} – ${outdoorWindow.endLabel}` : 'Check Hourly Forecast'}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
            Remaining daylight: {formatMinutesAsHm(daylight.remainingDaylightMinutes)} · Morning golden hour: {daylight.morningGoldenHour}
          </p>
        </div>
      </section>

      {/* Guidance Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Footprints className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span>Activity &amp; Exercise Recommendations</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {exposure.suitableActivity} {outdoorWindow.summary}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Home className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span>Indoor vs. Outdoor Guidance</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {indoorPreference} {exposure.indoorVsOutdoor}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Shirt className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span>Weather-Based Clothing Suggestions</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{clothingAdvice}</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Droplet className="w-4 h-4 text-sky-600" aria-hidden="true" />
            <span>Hydration &amp; Microclimate Reminder</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{hydrationAdvice}</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Sun className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span>UV &amp; Sun Exposure Precaution</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Current/Peak UV Index: {currentUv != null ? `${currentUv.toFixed(1)} (${uvInfo.label})` : 'Unavailable'}.{' '}
            {uvInfo.guidance}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Users className="w-4 h-4 text-amber-600" aria-hidden="true" />
            <span>Sensitive-Group &amp; Pollution Precautions</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {aqiCat.sensitiveGuidance} Keep vehicle cabin recirculation active along high-traffic corridors.{' '}
            <Shield className="inline w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> {aqiCat.generalGuidance}
          </p>
        </div>
      </section>

      {/* Wellness Disclaimer */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
        <SunMedium className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          <strong>General Wellness Notice:</strong> LifeSync provides environmental lifestyle guidance based on public air quality, solar, and meteorological models. It does not constitute medical advice, clinical diagnosis, or treatment. Consult a qualified healthcare professional for personal medical conditions.
        </p>
      </div>
    </div>
  );
}

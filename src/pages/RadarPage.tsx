import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CloudLightning,
  CloudRainWind,
  CloudSnow,
  ShieldAlert,
  Wind,
} from 'lucide-react';
import type {
  AirQualityData,
  LocationInfo,
  RadarData,
  ThemeMode,
  UnitSystem,
  WeatherAlert,
  WeatherData,
} from '../types/environment';
import { EarthScopeMap } from '../components/maps/EarthScopeMap';
import {
  describeWmoCode,
  formatPrecipitation,
  formatSnowfall,
  formatWindSpeed,
} from '../utils/weather';
import { ErrorNotice } from '../components/common/Skeletons';

interface RadarPageProps {
  location: LocationInfo;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  radar: RadarData | null;
  alerts: WeatherAlert[];
  radarError: string | null;
  units: UnitSystem;
  theme: ThemeMode;
  onInspectCoordinates: (lat: number, lon: number) => void;
  onUseMyLocation: () => void;
  onRetryRadar: () => void;
}

export function RadarPage({
  location,
  weather,
  airQuality,
  radar,
  alerts,
  radarError,
  units,
  theme,
  onInspectCoordinates,
  onUseMyLocation,
  onRetryRadar,
}: RadarPageProps) {
  const allFrames = useMemo(() => {
    if (!radar) return [];
    return [...radar.past, ...radar.nowcast];
  }, [radar]);

  const [selectedFrameIdx, setSelectedFrameIdx] = useState<number>(-1);

  const effectiveIdx =
    selectedFrameIdx >= 0 && selectedFrameIdx < allFrames.length
      ? selectedFrameIdx
      : Math.max(0, (radar?.past.length ?? 1) - 1);

  const activeFrame = allFrames[effectiveIdx] ?? null;

  // Next 24h severe weather telemetry metrics
  const next24hMetrics = useMemo(() => {
    if (!weather?.hourly.time.length) return null;
    const now = Date.now();
    let startIdx = weather.hourly.time.findIndex((t) => Date.parse(t) >= now - 3600 * 1000);
    if (startIdx < 0) startIdx = 0;
    const endIdx = Math.min(weather.hourly.time.length, startIdx + 24);

    let maxPrecipProb = 0;
    let totalRain = 0;
    let totalSnow = 0;
    let maxGust = 0;
    let maxCape = 0;
    let hasStormCode = false;

    for (let i = startIdx; i < endIdx; i++) {
      maxPrecipProb = Math.max(maxPrecipProb, weather.hourly.precipitation_probability[i] ?? 0);
      totalRain += weather.hourly.rain[i] ?? 0;
      totalSnow += weather.hourly.snowfall[i] ?? 0;
      maxGust = Math.max(maxGust, weather.hourly.wind_gusts_10m[i] ?? 0);
      maxCape = Math.max(maxCape, weather.hourly.cape[i] ?? 0);
      const code = weather.hourly.weather_code[i];
      if (code != null && code >= 95) hasStormCode = true;
    }

    const stormRisk =
      hasStormCode || maxCape >= 1200 ? 'Elevated' : maxCape >= 400 ? 'Moderate' : 'Low';

    return {
      maxPrecipProb: Math.round(maxPrecipProb),
      totalRain,
      totalSnow,
      maxGust,
      maxCape: Math.round(maxCape),
      stormRisk,
    };
  }, [weather]);

  const currentWmo = describeWmoCode(weather?.current.weather_code);

  return (
    <div className="space-y-7">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <CloudRainWind className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
          <span>Snow &amp; Storm Radar</span>
          <span aria-hidden="true">·</span>
          <span>{location.name}, {location.country}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Precipitation Radar &amp; Severe Weather Monitoring
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Distinguishes live RainViewer composite radar observations from model forecast projections for rainfall, snowfall, convective storm energy, and wind gusts.
        </p>
      </header>

      {radarError && <ErrorNotice title="Radar Tile Manifest Unavailable" message={radarError} onRetry={onRetryRadar} />}

      {/* Current Observation vs 24h Forecast Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Observed Rain / Precip</p>
          <p className="text-2xl font-bold font-mono tabular-nums mt-1">
            {formatPrecipitation(weather?.current.rain ?? weather?.current.precipitation, units)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            24h forecast total: {formatPrecipitation(next24hMetrics?.totalRain, units)} (max prob {next24hMetrics?.maxPrecipProb ?? 0}%)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CloudSnow className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
            <span>Observed &amp; Forecast Snowfall</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums mt-1">
            {formatSnowfall(weather?.current.snowfall, units)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            24h forecast snow: {formatSnowfall(next24hMetrics?.totalSnow, units)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CloudLightning className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span>Thunderstorm Potential (CAPE)</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums mt-1">
            {next24hMetrics?.stormRisk ?? 'N/A'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Current: {currentWmo.label} · Peak CAPE {next24hMetrics?.maxCape ?? 0} J/kg
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Wind className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>Wind &amp; Peak Gusts</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums mt-1">
            {formatWindSpeed(weather?.current.wind_gusts_10m, units)}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            24h forecast max gust: {formatWindSpeed(next24hMetrics?.maxGust, units)}
          </p>
        </div>
      </section>

      {/* Radar Frame Timeline & Map */}
      <section className="space-y-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-slate-900 dark:text-slate-100">Radar Timeline Frame:</span>
              {activeFrame ? (
                <span className="font-mono tabular-nums text-[#0F5132] dark:text-emerald-400">
                  {new Date(activeFrame.time * 1000).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  —{' '}
                  {activeFrame.kind === 'observed'
                    ? 'Actual Radar Observation'
                    : 'Short-Range Model Forecast (Nowcast)'}
                </span>
              ) : (
                <span className="text-slate-500">Radar frames unavailable</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Past frames come from composite weather radar stations; future frames are extrapolated model forecasts.
            </p>
          </div>

          {allFrames.length > 0 && (
            <div className="flex items-center gap-3 min-w-[240px]">
              <input
                type="range"
                aria-label="Radar time frame"
                min={0}
                max={allFrames.length - 1}
                value={effectiveIdx}
                onChange={(e) => setSelectedFrameIdx(Number(e.target.value))}
                className="w-full accent-[#0F5132] cursor-pointer"
              />
            </div>
          )}
        </div>

        <EarthScopeMap
          location={location}
          weather={weather}
          airQuality={airQuality}
          radar={radar}
          units={units}
          theme={theme}
          onInspectCoordinates={onInspectCoordinates}
          onUseMyLocation={onUseMyLocation}
          heightClass="h-[460px]"
          defaultShowRadar
          radarFramePath={activeFrame?.path ?? null}
        />
      </section>

      {/* Severe Alerts & Safety Guidance */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Active Severe Weather Alerts &amp; Advisories
            </h2>
          </div>

          {alerts.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              No active NWS bulletins (US coordinates) or severe WMO threshold advisories are currently triggered for {location.name}. Official national alert feeds outside the US require regional agency feeds not covered by NOAA NWS.
            </p>
          ) : (
            <ul className="space-y-3">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5 text-xs space-y-1"
                >
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{a.title}</p>
                  <p className="text-slate-700 dark:text-slate-300">{a.headline}</p>
                  {a.instruction && (
                    <p className="text-slate-600 dark:text-slate-400">{a.instruction}</p>
                  )}
                  <p className="text-[11px] text-slate-500">Source: {a.source}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Storm &amp; Winter Safety Recommendations
            </h2>
          </div>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed list-disc pl-4">
            <li>
              <strong>Thunderstorms:</strong> When lightning or WMO thunderstorm codes occur, move indoors immediately and avoid open water, isolated trees, and corded electronics.
            </li>
            <li>
              <strong>Heavy Rain &amp; Runoff:</strong> Avoid driving or walking through flooded underpasses where water depth cannot be judged.
            </li>
            <li>
              <strong>Snow &amp; Ice:</strong> Sub-zero pavement combined with snowfall reduces braking traction; double following distances and wear insulated waterproof footwear.
            </li>
            <li>
              <strong>High Gusts:</strong> Secure balcony or yard objects when gusts exceed 50 km/h (31 mph).
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

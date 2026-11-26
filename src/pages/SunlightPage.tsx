import { useEffect, useMemo, useState } from 'react';
import { Calendar, CloudSun, Compass, ShieldAlert, Sun, Sunrise, Sunset, Zap } from 'lucide-react';
import type {
  ComparisonSnapshot,
  LocationInfo,
  ThemeMode,
  WeatherData,
} from '../types/environment';
import {
  calculateDaylightTimeline,
  calculateSolarPosition,
  estimateAstronomicalDayLengthMinutes,
  formatMinutesAsHm,
} from '../utils/solar';
import { describeUvIndex } from '../utils/weather';
import { SolarArcVisualizer } from '../components/visualizations/SolarArcVisualizer';
import { HourlyUvSolarChart } from '../components/charts/EnvironmentalCharts';
import { CardSkeleton, ErrorNotice } from '../components/common/Skeletons';

interface SunlightPageProps {
  location: LocationInfo;
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  theme: ThemeMode;
  comparisonSnapshots: ComparisonSnapshot[];
  onRetry: () => void;
}

export function SunlightPage({
  location,
  weather,
  loading,
  error,
  theme,
  comparisonSnapshots,
  onRetry,
}: SunlightPageProps) {
  const [now, setNow] = useState(() => new Date());
  const [compareDate, setCompareDate] = useState(() => {
    const year = new Date().getFullYear();
    return `${year}-06-21`;
  });
  const [chartMode, setChartMode] = useState<'uv' | 'solar'>('uv');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const solarPos = useMemo(
    () => calculateSolarPosition(now, location.latitude, location.longitude),
    [now, location.latitude, location.longitude],
  );

  const sunriseIso = weather?.daily.sunrise?.[0];
  const sunsetIso = weather?.daily.sunset?.[0];
  const daylightSec = weather?.daily.daylight_duration?.[0] ?? null;

  const timeline = useMemo(
    () =>
      calculateDaylightTimeline(
        sunriseIso,
        sunsetIso,
        daylightSec,
        weather?.timezone,
        now.getTime(),
      ),
    [sunriseIso, sunsetIso, daylightSec, weather?.timezone, now],
  );

  const sunriseStr = sunriseIso
    ? new Date(sunriseIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';
  const sunsetStr = sunsetIso
    ? new Date(sunsetIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  // UV & Solar radiation current / peak calculations from Open-Meteo hourly
  const solarTelemetry = useMemo(() => {
    if (!weather?.hourly.time.length) return null;
    const nowMs = Date.now();
    let idx = weather.hourly.time.findIndex((t) => Date.parse(t) >= nowMs - 1800 * 1000);
    if (idx < 0) idx = 0;

    const currentUv = weather.hourly.uv_index?.[idx] ?? null;
    const currentShortwave = weather.hourly.shortwave_radiation?.[idx] ?? null;
    const currentDirect = weather.hourly.direct_radiation?.[idx] ?? null;
    const currentDiffuse = weather.hourly.diffuse_radiation?.[idx] ?? null;
    const cloudCover = weather.current.cloud_cover ?? weather.hourly.cloud_cover?.[idx] ?? null;

    // Peak UV today (next 24h)
    let peakUv = -1;
    let peakUvTime = 'N/A';
    let peakRadiation = 0;
    const end = Math.min(weather.hourly.time.length, idx + 24);
    for (let i = idx; i < end; i++) {
      const uv = weather.hourly.uv_index?.[i];
      if (uv != null && uv > peakUv) {
        peakUv = uv;
        peakUvTime = new Date(weather.hourly.time[i]).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      const rad = weather.hourly.shortwave_radiation?.[i] ?? 0;
      if (rad > peakRadiation) peakRadiation = rad;
    }

    const solarPotential =
      peakRadiation >= 650
        ? 'High Solar Irradiance'
        : peakRadiation >= 350
          ? 'Moderate Solar Irradiance'
          : 'Low Solar Irradiance';

    return {
      currentUv,
      peakUv: peakUv >= 0 ? peakUv : null,
      peakUvTime,
      currentShortwave,
      currentDirect,
      currentDiffuse,
      cloudCover,
      peakRadiation: Math.round(peakRadiation),
      solarPotential,
    };
  }, [weather]);

  const uvInfo = describeUvIndex(solarTelemetry?.currentUv);

  const compareDayLengthMin = useMemo(
    () => estimateAstronomicalDayLengthMinutes(compareDate, location.latitude),
    [compareDate, location.latitude],
  );
  const deltaMin =
    timeline.dayLengthMinutes != null && compareDayLengthMin != null
      ? compareDayLengthMin - timeline.dayLengthMinutes
      : null;

  if (loading && !weather) {
    return (
      <div className="space-y-6">
        <CardSkeleton heightClass="h-44" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Sunrise className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
          <span>Sunlight &amp; Solar Intelligence</span>
          <span aria-hidden="true">·</span>
          <span>{location.name}, {location.country}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Solar Position, UV Intelligence &amp; Irradiance
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Astronomical sun geometry, golden and blue hour windows, UV radiation forecasts, and Open-Meteo shortwave/direct/diffuse solar irradiance.
        </p>
      </header>

      {error && <ErrorNotice title="Solar Telemetry Issue" message={error} onRetry={onRetry} />}

      {/* Sun Position Arc & Key Solar Metrics */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Current Sun Position Arc
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {solarPos.isDaylight ? 'Above Horizon' : 'Below Horizon'}
            </span>
          </div>

          <SolarArcVisualizer
            progressPercent={timeline.progressPercent}
            sunriseLabel={sunriseStr}
            sunsetLabel={sunsetStr}
            solarNoonLabel={timeline.solarNoonLabel}
            elevationDeg={solarPos.elevationDeg}
            isDaylight={solarPos.isDaylight}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400">Day Length</p>
              <p className="font-mono font-bold tabular-nums mt-0.5">
                {formatMinutesAsHm(timeline.dayLengthMinutes)}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Remaining Daylight</p>
              <p className="font-mono font-bold tabular-nums mt-0.5">
                {formatMinutesAsHm(timeline.remainingDaylightMinutes)}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Elevation Angle</p>
              <p className="font-mono font-bold tabular-nums mt-0.5">{solarPos.elevationDeg}°</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Azimuth Angle</p>
              <p className="font-mono font-bold tabular-nums mt-0.5">
                {solarPos.azimuthDeg}° ({solarPos.azimuthCardinal})
              </p>
            </div>
          </div>
        </div>

        {/* Sunlight Timeline: Golden & Blue Hours + Date Comparison */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Compass className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span>Sunlight Timeline</span>
          </div>

          <dl className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400">Morning Blue Hour</dt>
              <dd className="font-mono tabular-nums font-medium">{timeline.morningBlueHour}</dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400">Morning Golden Hour</dt>
              <dd className="font-mono tabular-nums font-medium text-amber-600 dark:text-amber-400">
                {timeline.morningGoldenHour}
              </dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400">Solar Noon</dt>
              <dd className="font-mono tabular-nums font-medium">{timeline.solarNoonLabel}</dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <dt className="text-slate-500 dark:text-slate-400">Evening Golden Hour</dt>
              <dd className="font-mono tabular-nums font-medium text-amber-600 dark:text-amber-400">
                {timeline.eveningGoldenHour}
              </dd>
            </div>
            <div className="flex justify-between py-1.5">
              <dt className="text-slate-500 dark:text-slate-400">Evening Blue Hour</dt>
              <dd className="font-mono tabular-nums font-medium">{timeline.eveningBlueHour}</dd>
            </div>
          </dl>

          {/* Daylight Duration Comparison Between Dates */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <label htmlFor="solar-compare-date" className="flex items-center gap-1.5 text-xs font-semibold">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              Compare Daylight Duration With Date
            </label>
            <input
              id="solar-compare-date"
              type="date"
              value={compareDate}
              onChange={(e) => setCompareDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 font-mono"
            />
            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono tabular-nums">
              {compareDate}: {formatMinutesAsHm(compareDayLengthMin)}
              {deltaMin != null &&
                ` (${deltaMin >= 0 ? '+' : ''}${deltaMin} min vs today)`}
            </p>
          </div>
        </div>
      </section>

      {/* UV Intelligence + Solar Energy Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Sun className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
            <span>Current UV Index</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums mt-1">
            {solarTelemetry?.currentUv != null ? solarTelemetry.currentUv.toFixed(1) : 'N/A'}
          </p>
          <p className={`text-xs font-semibold mt-1 ${uvInfo.textClass}`}>{uvInfo.label}</p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Sunset className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
            <span>24h Peak UV &amp; Time</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums mt-1">
            {solarTelemetry?.peakUv != null ? solarTelemetry.peakUv.toFixed(1) : 'N/A'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Peak around {solarTelemetry?.peakUvTime ?? 'N/A'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Zap className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            <span>Shortwave Irradiance</span>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums mt-1">
            {solarTelemetry?.currentShortwave != null ? `${Math.round(solarTelemetry.currentShortwave)} W/m²` : 'N/A'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Direct: {solarTelemetry?.currentDirect != null ? Math.round(solarTelemetry.currentDirect) : 'N/A'} · Diffuse:{' '}
            {solarTelemetry?.currentDiffuse != null ? Math.round(solarTelemetry.currentDiffuse) : 'N/A'} W/m²
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <CloudSun className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
            <span>Cloud Attenuation &amp; Potential</span>
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            {solarTelemetry?.solarPotential ?? 'Unavailable'}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
            Cloud cover: {solarTelemetry?.cloudCover != null ? `${Math.round(solarTelemetry.cloudCover)}%` : 'N/A'} · Peak {solarTelemetry?.peakRadiation ?? 0} W/m²
          </p>
        </div>
      </section>

      {/* Hourly UV / Solar Irradiance Chart */}
      {weather && (
        <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                24-Hour UV &amp; Solar Radiation Forecast
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Source: Open-Meteo Solar Radiation &amp; UV Model (W/m²)
              </p>
            </div>
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setChartMode('uv')}
                className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                  chartMode === 'uv'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Hourly UV Index
              </button>
              <button
                type="button"
                onClick={() => setChartMode('solar')}
                className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                  chartMode === 'solar'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Direct vs Diffuse Radiation
              </button>
            </div>
          </div>
          <HourlyUvSolarChart hourly={weather.hourly} mode={chartMode} theme={theme} />
        </section>
      )}

      {/* Solar Potential Comparison Across Loaded Cities + Lifestyle Guidance */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Solar Potential Comparison (Active Cities)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compares today&apos;s sunshine duration, daylight length, and peak UV across cities loaded in AtmosCompare.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="text-left py-2 font-medium">City</th>
                  <th className="text-right py-2 font-medium">Day Length</th>
                  <th className="text-right py-2 font-medium">Sunshine</th>
                  <th className="text-right py-2 font-medium">Max UV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono tabular-nums">
                {comparisonSnapshots.map((s) => {
                  const dl = s.weather?.daily.daylight_duration?.[0];
                  const ss = s.weather?.daily.sunshine_duration?.[0];
                  const uvMax = s.weather?.daily.uv_index_max?.[0];
                  return (
                    <tr key={s.location.name}>
                      <td className="py-2 font-sans font-medium">{s.location.name}</td>
                      <td className="py-2 text-right">{dl != null ? formatMinutesAsHm(Math.round(dl / 60)) : 'N/A'}</td>
                      <td className="py-2 text-right">{ss != null ? formatMinutesAsHm(Math.round(ss / 60)) : 'N/A'}</td>
                      <td className="py-2 text-right">{uvMax != null ? uvMax.toFixed(1) : 'N/A'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <ShieldAlert className="w-4 h-4 text-amber-500" aria-hidden="true" />
            <span>Sunlight Lifestyle &amp; UV Science</span>
          </div>
          <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <p>
              <strong>Sun Protection Precaution:</strong> {uvInfo.guidance}
            </p>
            <p>
              <strong>Best Daylight Window:</strong> Morning hours after sunrise or late afternoon offer bright natural daylight with lower UV radiation than solar noon.
            </p>
            <p>
              <strong>Sunlight Duration vs. UV Intensity:</strong> Daylight duration measures how long the sun remains above the horizon, whereas UV intensity depends primarily on solar elevation angle, ozone column thickness, altitude, and cloud attenuation. High-latitude summer days can have long daylight with moderate UV, while tropical noon can produce extreme UV even on short days.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

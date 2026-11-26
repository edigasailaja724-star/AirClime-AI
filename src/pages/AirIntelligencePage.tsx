import { useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  HelpCircle,
  Info,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wind,
} from 'lucide-react';
import type { AirQualityData, LocationInfo, ThemeMode, WeatherData } from '../types/environment';
import {
  POLLUTANT_CATALOG,
  analyzeAqiTrend,
  calculateExposureIntelligence,
  computeBestOutdoorWindow,
  getEuropeanAqiLabel,
  getUsAqiCategory,
  identifyMainPollutant,
} from '../utils/airQuality';
import {
  HourlyAqiChart,
  MultiDayAqiTrendChart,
  Pm25VsPm10Chart,
  PollutantBreakdownChart,
} from '../components/charts/EnvironmentalCharts';
import { AnimatedAqiGauge } from '../components/visualizations/AnimatedAqiGauge';
import { CardSkeleton, ErrorNotice } from '../components/common/Skeletons';

interface AirIntelligencePageProps {
  location: LocationInfo;
  airQuality: AirQualityData | null;
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  theme: ThemeMode;
  onRetry: () => void;
}

const US_AQI_SCALE = [
  { range: '0 – 50', label: 'Good', color: 'bg-emerald-600', note: 'Minimal risk' },
  { range: '51 – 100', label: 'Moderate', color: 'bg-amber-500', note: 'Sensitive caution' },
  { range: '101 – 150', label: 'USG', color: 'bg-orange-500', note: 'Sensitive groups affected' },
  { range: '151 – 200', label: 'Unhealthy', color: 'bg-rose-600', note: 'Limit heavy exertion' },
  { range: '201 – 300', label: 'Very Unhealthy', color: 'bg-purple-600', note: 'Health alert' },
  { range: '301+', label: 'Hazardous', color: 'bg-red-800', note: 'Stay indoors' },
];

export function AirIntelligencePage({
  location,
  airQuality,
  weather,
  loading,
  error,
  theme,
  onRetry,
}: AirIntelligencePageProps) {
  const [chartMetric, setChartMetric] = useState<'us_aqi' | 'european_aqi' | 'pm2_5' | 'pm10'>('us_aqi');
  const [activityLevel, setActivityLevel] = useState<'resting' | 'walking' | 'jogging' | 'cycling'>('walking');
  const [durationMinutes, setDurationMinutes] = useState<number>(45);

  const usAqi = airQuality?.current.us_aqi ?? null;
  const euAqi = airQuality?.current.european_aqi ?? null;
  const cat = getUsAqiCategory(usAqi);
  const mainPollutant = useMemo(
    () => identifyMainPollutant(airQuality?.current),
    [airQuality?.current],
  );
  const trend = useMemo(() => analyzeAqiTrend(airQuality?.hourly), [airQuality?.hourly]);
  const outdoorWindow = useMemo(
    () => computeBestOutdoorWindow(airQuality?.hourly, weather?.hourly),
    [airQuality?.hourly, weather?.hourly],
  );
  const exposure = useMemo(
    () => calculateExposureIntelligence(airQuality?.current, activityLevel, durationMinutes),
    [airQuality?.current, activityLevel, durationMinutes],
  );

  // Compute multi-day AQI summary (past + forecast available from Open-Meteo past_days=2&forecast_days=5)
  const dailySummary = useMemo(() => {
    if (!airQuality?.hourly.time.length) return [];
    const grouped = new Map<string, { us: number[]; eu: number[]; pm25: number[] }>();
    airQuality.hourly.time.forEach((iso, idx) => {
      const dayKey = iso.slice(0, 10);
      if (!grouped.has(dayKey)) grouped.set(dayKey, { us: [], eu: [], pm25: [] });
      const entry = grouped.get(dayKey)!;
      const u = airQuality.hourly.us_aqi[idx];
      const e = airQuality.hourly.european_aqi[idx];
      const p = airQuality.hourly.pm2_5[idx];
      if (u != null) entry.us.push(u);
      if (e != null) entry.eu.push(e);
      if (p != null) entry.pm25.push(p);
    });
    const todayStr = new Date().toISOString().slice(0, 10);
    return Array.from(grouped.entries())
      .slice(0, 7)
      .map(([date, vals]) => ({
        date,
        kind: date < todayStr ? 'Modeled History' : date === todayStr ? 'Today' : 'Forecast',
        label: new Date(`${date}T12:00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
        avgUs: vals.us.length ? Math.round(vals.us.reduce((a, b) => a + b, 0) / vals.us.length) : null,
        maxUs: vals.us.length ? Math.round(Math.max(...vals.us)) : null,
        avgEu: vals.eu.length ? Math.round(vals.eu.reduce((a, b) => a + b, 0) / vals.eu.length) : null,
        avgPm25: vals.pm25.length ? Number((vals.pm25.reduce((a, b) => a + b, 0) / vals.pm25.length).toFixed(1)) : null,
      }));
  }, [airQuality]);

  // Explicit Q&A insights grounded strictly in live metrics (no unsupported source guesses)
  const windKmh = weather?.current.wind_speed_10m ?? null;
  const aqQuestions = [
    {
      q: 'Why is pollution increasing or at its current level?',
      a:
        usAqi == null
          ? 'Live AQI telemetry is unavailable to evaluate concentration drivers.'
          : trend.direction === 'worsening'
            ? `Projected US AQI rises over the next 6 hours (${trend.summary}) with ${mainPollutant.symbol} leading relative to WHO guidelines. ${windKmh != null && windKmh < 10 ? `Light surface wind (${Math.round(windKmh)} km/h) reduces atmospheric dispersion.` : `Current wind speed is ${windKmh != null ? `${Math.round(windKmh)} km/h` : 'unavailable'}.`} Exact local emission sources cannot be directly attributed from satellite/model concentration data alone.`
            : `${mainPollutant.explanation} ${windKmh != null && windKmh < 10 ? `Low wind speed (${Math.round(windKmh)} km/h) can allow surface pollutants to linger.` : `Current dispersion wind is ${windKmh != null ? `${Math.round(windKmh)} km/h` : 'unavailable'}.`} Exact facility or traffic source attribution requires ground-level source apportionment monitoring.`,
    },
    {
      q: 'Which pollutant is dominant right now?',
      a: mainPollutant.explanation,
    },
    {
      q: 'Is the current air quality improving?',
      a: trend.summary,
    },
    {
      q: 'When is air quality expected to be better?',
      a: outdoorWindow.found
        ? outdoorWindow.summary
        : 'Check the 24-hour and 7-day forecast charts below to identify lower-AQI windows.',
    },
    {
      q: 'What precautions should I take today?',
      a: `${cat.generalGuidance} Sensitive groups: ${cat.sensitiveGuidance}`,
    },
  ];

  if (loading && !airQuality) {
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
          <Wind className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
          <span>Air Quality Command Center</span>
          <span aria-hidden="true">·</span>
          <span>{location.name}, {location.country}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Air Quality Telemetry, Trends &amp; Exposure Intelligence
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Live animated AQI gauge, dominant pollutant diagnostics, 24-hour &amp; multi-day CAMS trends, PM2.5 vs PM10 profiling, and activity-calibrated exposure estimates.
        </p>
      </header>

      {error && <ErrorNotice title="Air Quality Service Error" message={error} onRetry={onRetry} />}

      {/* Live Air Quality Overview Command Card */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className={`lg:col-span-2 rounded-xl border ${cat.borderClass} ${cat.surfaceClass} p-6 flex flex-col justify-between gap-5`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <AnimatedAqiGauge
              usAqi={usAqi}
              dominantPollutant={mainPollutant.symbol !== 'Unavailable' ? mainPollutant.symbol : undefined}
            />

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Air Quality Health Category
                  </p>
                  <p className={`text-lg font-bold ${cat.textClass}`}>{cat.label}</p>
                </div>

                <div className="rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 px-3.5 py-2 text-right">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">European AQI (EEA)</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {euAqi != null ? `${Math.round(euAqi)} · ${getEuropeanAqiLabel(euAqi)}` : 'N/A'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {cat.healthSummary}
              </p>

              <div className="rounded-lg bg-white/75 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-700/70 px-3.5 py-2.5 text-xs">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Main Pollutant: {mainPollutant.symbol} ({mainPollutant.name})
                </p>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5">{mainPollutant.explanation}</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <span>
              Standard: US EPA AQI (0–500) · Source: {airQuality?.source || 'Open-Meteo Air Quality API (Copernicus CAMS)'}
            </span>
            {airQuality?.current.time && (
              <span className="font-mono tabular-nums">
                Updated: {new Date(airQuality.current.time).toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Trend & Outdoor Window Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-6 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                {trend.direction === 'improving' ? (
                  <TrendingDown className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                ) : trend.direction === 'worsening' ? (
                  <TrendingUp className="w-4 h-4 text-amber-600" aria-hidden="true" />
                ) : (
                  <Activity className="w-4 h-4 text-slate-500" aria-hidden="true" />
                )}
                <span>6-Hour AQI Trend Direction</span>
              </div>
              <p className="text-sm font-bold text-[#0F5132] dark:text-emerald-400 capitalize">
                {trend.direction === 'unavailable' ? 'Unavailable' : `${trend.direction} Air Quality`}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{trend.summary}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0F5132] dark:text-emerald-400">
                <Clock className="w-4 h-4" aria-hidden="true" />
                <span>Best Outdoor Window</span>
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                {outdoorWindow.found ? `${outdoorWindow.startLabel} – ${outdoorWindow.endLabel}` : 'Unavailable'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{outdoorWindow.summary}</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            CAMS forecast trajectory over next 36 daytime hours.
          </p>
        </div>
      </section>

      {/* Pollution Exposure Intelligence */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Pollution Exposure Intelligence
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select activity intensity and outdoor duration to estimate adult PM2.5 inhalation load from live telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              {(['resting', 'walking', 'jogging', 'cycling'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setActivityLevel(lvl)}
                  className={`px-2.5 py-1 rounded text-xs font-medium capitalize cursor-pointer ${
                    activityLevel === lvl
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <select
              aria-label="Outdoor activity duration"
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4">
            <p className="text-slate-500 dark:text-slate-400">Estimated PM2.5 Intake</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-[#0F5132] dark:text-emerald-400 mt-1">
              {exposure.estimatedPm25InhaledUg != null ? `${exposure.estimatedPm25InhaledUg} µg` : 'N/A'}
            </p>
            <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{exposure.riskTier}</p>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-1">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Suitable Activity Guidance</p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{exposure.suitableActivity}</p>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-1">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Indoor vs. Outdoor &amp; Sensitive Groups</p>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {exposure.indoorVsOutdoor} {cat.sensitiveGuidance}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">{exposure.assumptions}</p>
      </section>

      {/* Pollutant Breakdown Cards */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Pollutant Concentrations (PM2.5, PM10, O₃, CO, NO₂, SO₂)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {POLLUTANT_CATALOG.map((pol) => {
            const val = airQuality?.current[pol.key] ?? null;
            return (
              <div
                key={pol.key}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4 space-y-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{pol.symbol}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5">{pol.name}</span>
                  </div>
                  <span className="text-lg font-bold font-mono tabular-nums text-[#0F5132] dark:text-emerald-400">
                    {val != null ? val.toFixed(1) : 'N/A'}{' '}
                    <span className="text-[11px] font-normal text-slate-500">{pol.unit}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{pol.description}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Reference: {pol.who24hGuideline} · Common sources: {pol.sources}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Charts: 24h Trend, Pollutant Profile, 7-Day Trend, PM2.5 vs PM10 */}
      {airQuality && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  24-Hour Hourly Pollution Forecast
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Copernicus CAMS hourly model</p>
              </div>
              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                {(
                  [
                    { id: 'us_aqi', label: 'US AQI' },
                    { id: 'european_aqi', label: 'EU AQI' },
                    { id: 'pm2_5', label: 'PM2.5' },
                    { id: 'pm10', label: 'PM10' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setChartMetric(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      chartMetric === tab.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <HourlyAqiChart hourly={airQuality.hourly} metric={chartMetric} theme={theme} />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Current Pollutant Comparison Profile
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest concentrations across measured species (µg/m³)
              </p>
            </div>
            <PollutantBreakdownChart current={airQuality.current} theme={theme} />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                7-Day AQI Trajectory (Past 2d Modeled + 5d Forecast)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily mean and daily peak US AQI from Open-Meteo CAMS reanalysis &amp; forecast
              </p>
            </div>
            <MultiDayAqiTrendChart hourly={airQuality.hourly} theme={theme} />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                PM2.5 vs. PM10 Particulate Ratio (24h)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compares fine combustion/aerosol particles (≤2.5 µm) with coarse dust/pollen (≤10 µm)
              </p>
            </div>
            <Pm25VsPm10Chart hourly={airQuality.hourly} theme={theme} />
          </div>
        </section>
      )}

      {/* Air Quality Insights Q&A */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <HelpCircle className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
          <span>Air Quality Insights</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aqQuestions.map((item) => (
            <div
              key={item.q}
              className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-1.5"
            >
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{item.q}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Multi-day Table & Methodology */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Multi-Day Air Quality Summary (CAMS Modeled &amp; Forecast)
          </h3>
          {dailySummary.length === 0 ? (
            <p className="text-xs text-slate-500">Multi-day air quality series unavailable.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="text-left py-2 font-medium">Day</th>
                    <th className="text-left py-2 font-medium">Type</th>
                    <th className="text-right py-2 font-medium">Avg US AQI</th>
                    <th className="text-right py-2 font-medium">Peak US AQI</th>
                    <th className="text-right py-2 font-medium">Avg PM2.5</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono tabular-nums">
                  {dailySummary.map((d) => (
                    <tr key={d.date}>
                      <td className="py-2.5 font-sans font-medium text-slate-900 dark:text-slate-100">{d.label}</td>
                      <td className="py-2.5 font-sans text-[11px] text-slate-500">{d.kind}</td>
                      <td className="py-2.5 text-right">{d.avgUs ?? 'N/A'}</td>
                      <td className="py-2.5 text-right">{d.maxUs ?? 'N/A'}</td>
                      <td className="py-2.5 text-right">{d.avgPm25 != null ? `${d.avgPm25} µg/m³` : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Precautions &amp; Sensitive Group Guidance
            </h3>
          </div>
          <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <p>
              <strong className="text-slate-900 dark:text-slate-100">General Public:</strong> {cat.generalGuidance}
            </p>
            <p>
              <strong className="text-slate-900 dark:text-slate-100">Sensitive Groups:</strong>{' '}
              {cat.sensitiveGuidance}
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" aria-hidden="true" />
              US EPA AQI Scale Methodology (0–500)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {US_AQI_SCALE.map((band) => (
                <div
                  key={band.label}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-2 text-[11px]"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <span className={`w-2 h-2 rounded-full ${band.color}`} aria-hidden="true" />
                    <span>{band.label}</span>
                  </div>
                  <p className="font-mono text-slate-500 dark:text-slate-400 mt-0.5">{band.range}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

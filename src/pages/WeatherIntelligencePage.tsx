import {
  Activity,
  AlertTriangle,
  Cloud,
  Droplets,
  Eye,
  Gauge,
  Smile,
  Sun,
  Sunrise,
  Sunset,
  Wind,
} from 'lucide-react';
import type { LocationInfo, ThemeMode, UnitSystem, WeatherAlert, WeatherData } from '../types/environment';
import {
  compassDirection,
  computeWeatherComfortIndex,
  describeUvIndex,
  describeWmoCode,
  formatPrecipitation,
  formatTemp,
  formatVisibility,
  formatWindSpeed,
} from '../utils/weather';
import { WeatherIcon } from '../components/common/WeatherIcon';
import { AnimatedWeatherScene } from '../components/visualizations/AnimatedWeatherScene';
import { HourlyTempPrecipChart, WeeklyForecastChart } from '../components/charts/EnvironmentalCharts';
import { CardSkeleton, ErrorNotice } from '../components/common/Skeletons';

interface WeatherIntelligencePageProps {
  location: LocationInfo;
  weather: WeatherData | null;
  alerts: WeatherAlert[];
  loading: boolean;
  error: string | null;
  units: UnitSystem;
  theme: ThemeMode;
  onRetry: () => void;
}

export function WeatherIntelligencePage({
  location,
  weather,
  alerts,
  loading,
  error,
  units,
  theme,
  onRetry,
}: WeatherIntelligencePageProps) {
  if (loading && !weather) {
    return (
      <div className="space-y-6">
        <CardSkeleton heightClass="h-44" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const c = weather?.current;
  const wmo = describeWmoCode(c?.weather_code);
  const comfort = computeWeatherComfortIndex(weather);
  const nowIdx = weather?.hourly.time.findIndex((t) => Date.parse(t) >= Date.now() - 3600 * 1000) ?? 0;
  const safeIdx = nowIdx >= 0 ? nowIdx : 0;
  const currentVisibility = weather?.hourly.visibility?.[safeIdx] ?? null;
  const currentUv = weather?.hourly.uv_index?.[safeIdx] ?? weather?.daily.uv_index_max?.[0] ?? null;
  const uvInfo = describeUvIndex(currentUv);

  const sunriseStr = weather?.daily.sunrise?.[0]
    ? new Date(weather.daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';
  const sunsetStr = weather?.daily.sunset?.[0]
    ? new Date(weather.daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const hourlySlice = (weather?.hourly.time ?? [])
    .map((t, i) => ({
      time: t,
      temp: weather?.hourly.temperature_2m[i] ?? null,
      code: weather?.hourly.weather_code[i] ?? null,
      rainProb: weather?.hourly.precipitation_probability[i] ?? null,
      wind: weather?.hourly.wind_speed_10m[i] ?? null,
    }))
    .slice(safeIdx, safeIdx + 12);

  // Summarize upcoming weather condition transitions over the next 24h
  const conditionTimeline = (() => {
    const slice24 = (weather?.hourly.time ?? []).slice(safeIdx, safeIdx + 24);
    const transitions: Array<{ timeLabel: string; condition: string; code: number | null }> = [];
    let lastLabel = '';
    slice24.forEach((iso, offset) => {
      const code = weather?.hourly.weather_code?.[safeIdx + offset] ?? null;
      const label = describeWmoCode(code).label;
      if (label !== lastLabel) {
        transitions.push({
          timeLabel: new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          condition: label,
          code,
        });
        lastLabel = label;
      }
    });
    return transitions.slice(0, 6);
  })();

  return (
    <div className="space-y-7">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Activity className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
          <span>Weather Intelligence</span>
          <span aria-hidden="true">·</span>
          <span>{location.name}, {location.country}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Meteorological Conditions, Comfort Index &amp; 7-Day Outlook
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Live animated sky state, Weather Comfort Index, hourly condition transitions, barometric pressure, visibility, and 7-day forecast.
        </p>
      </header>

      {error && <ErrorNotice title="Weather API Error" message={error} onRetry={onRetry} />}

      {weather && (
        <>
          {/* Current Weather Overview + Animated Scene + Comfort Index */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                      {formatTemp(c?.temperature_2m, units)}
                    </span>
                    <span className="text-base font-semibold text-slate-700 dark:text-slate-200">{wmo.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                    Feels like {formatTemp(c?.apparent_temperature, units)} · Today High{' '}
                    {formatTemp(weather.daily.temperature_2m_max[0], units)} / Low{' '}
                    {formatTemp(weather.daily.temperature_2m_min[0], units)}
                  </p>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <div className="flex items-center gap-2">
                    <Sunrise className="w-4 h-4 text-amber-500" aria-hidden="true" />
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Sunrise</p>
                      <p className="font-mono font-semibold tabular-nums">{sunriseStr}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sunset className="w-4 h-4 text-orange-500" aria-hidden="true" />
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">Sunset</p>
                      <p className="font-mono font-semibold tabular-nums">{sunsetStr}</p>
                    </div>
                  </div>
                </div>
              </div>

              <AnimatedWeatherScene weatherCode={c?.weather_code} isDay={c?.is_day} />
            </div>

            {/* Weather Comfort Index Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-6 flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0F5132] dark:text-emerald-400">
                  <Smile className="w-4 h-4" aria-hidden="true" />
                  <span>Weather Comfort Index</span>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-4xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                    {comfort.score != null ? comfort.score : 'N/A'}
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">/ 100</span>
                  <span className="text-sm font-semibold text-[#0F5132] dark:text-emerald-400">
                    {comfort.label}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {comfort.explanation}
                </p>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                {comfort.methodology}
              </p>
            </div>
          </section>

          {/* Detailed Metric Grid */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <Droplets className="w-3.5 h-3.5 text-sky-500" aria-hidden="true" />
                <span>Humidity</span>
              </div>
              <p className="text-xl font-bold font-mono tabular-nums">
                {c?.relative_humidity_2m != null ? `${Math.round(c.relative_humidity_2m)}%` : 'N/A'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <Wind className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Wind</span>
              </div>
              <p className="text-xl font-bold font-mono tabular-nums">
                {formatWindSpeed(c?.wind_speed_10m, units)}
              </p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">{compassDirection(c?.wind_direction_10m)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <Cloud className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Cloud Cover</span>
              </div>
              <p className="text-xl font-bold font-mono tabular-nums">
                {c?.cloud_cover != null ? `${Math.round(c.cloud_cover)}%` : 'N/A'}
              </p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Precip: {formatPrecipitation(c?.precipitation, units)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                <span>UV Index</span>
              </div>
              <p className="text-xl font-bold font-mono tabular-nums">
                {currentUv != null ? currentUv.toFixed(1) : 'N/A'}
              </p>
              <p className={`text-[11px] font-medium mt-0.5 ${uvInfo.textClass}`}>{uvInfo.label}</p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
                <span>Visibility</span>
              </div>
              <p className="text-xl font-bold font-mono tabular-nums">{formatVisibility(currentVisibility, units)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <Gauge className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                <span>Pressure (MSL)</span>
              </div>
              <p className="text-xl font-bold font-mono tabular-nums">
                {c?.pressure_msl != null ? `${Math.round(c.pressure_msl)} hPa` : 'N/A'}
              </p>
            </div>
          </section>

          {/* Weather Condition Timeline (Next 24h) */}
          {conditionTimeline.length > 0 && (
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                24-Hour Weather Condition Transitions
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {conditionTimeline.map((step, i) => (
                  <div
                    key={`${step.timeLabel}-${i}`}
                    className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3 flex items-center gap-2.5"
                  >
                    <WeatherIcon code={step.code} className="w-4 h-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        From {step.timeLabel}
                      </p>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {step.condition}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Weather Alerts if present */}
          {alerts.length > 0 && (
            <section className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                <span>Active Weather Advisories &amp; Bulletins</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alerts.map((a) => (
                  <div key={a.id} className="text-xs text-slate-800 dark:text-slate-200">
                    <p className="font-semibold">{a.title}</p>
                    <p className="mt-0.5">{a.headline}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Source: {a.source}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Hourly Forecast Strip */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Next 12 Hours Forecast
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2.5">
              {hourlySlice.map((h) => (
                <div
                  key={h.time}
                  className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-2.5 text-center space-y-1.5"
                >
                  <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <div className="flex justify-center">
                    <WeatherIcon code={h.code} className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                    {formatTemp(h.temp, units, false)}
                  </p>
                  <p className="text-[10px] font-mono tabular-nums text-sky-600 dark:text-sky-400">
                    {h.rainProb != null ? `${Math.round(h.rainProb)}%` : '0%'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Charts */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                24-Hour Temperature &amp; Precipitation Probability
              </h3>
              <HourlyTempPrecipChart hourly={weather.hourly} units={units} theme={theme} />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                7-Day Temperature Envelope
              </h3>
              <WeeklyForecastChart daily={weather.daily} units={units} theme={theme} />
            </div>
          </section>

          {/* 7-Day Table */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">7-Day Daily Forecast</h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{weather.source}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="text-left py-2.5 font-medium">Date</th>
                    <th className="text-left py-2.5 font-medium">Condition</th>
                    <th className="text-right py-2.5 font-medium">Low / High</th>
                    <th className="text-right py-2.5 font-medium">Rain Prob</th>
                    <th className="text-right py-2.5 font-medium">Precip Sum</th>
                    <th className="text-right py-2.5 font-medium">Max Wind</th>
                    <th className="text-right py-2.5 font-medium">Max UV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {weather.daily.time.map((day, i) => {
                    const desc = describeWmoCode(weather.daily.weather_code[i]);
                    return (
                      <tr key={day} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {new Date(`${day}T12:00:00`).toLocaleDateString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <WeatherIcon code={weather.daily.weather_code[i]} className="w-4 h-4" />
                            {desc.label}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums">
                          {formatTemp(weather.daily.temperature_2m_min[i], units)} /{' '}
                          <strong>{formatTemp(weather.daily.temperature_2m_max[i], units)}</strong>
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums">
                          {weather.daily.precipitation_probability_max[i] != null
                            ? `${Math.round(weather.daily.precipitation_probability_max[i]!)}%`
                            : 'N/A'}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums">
                          {formatPrecipitation(weather.daily.precipitation_sum[i], units)}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums">
                          {formatWindSpeed(weather.daily.wind_speed_10m_max[i], units)}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums">
                          {weather.daily.uv_index_max[i] != null ? weather.daily.uv_index_max[i]!.toFixed(1) : 'N/A'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

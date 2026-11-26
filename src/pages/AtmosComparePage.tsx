import { useState } from 'react';
import { Award, Bot, GitCompare, Plus, Search, ShieldCheck, Smile, Sun, Trash2 } from 'lucide-react';
import type {
  ChatLanguage,
  ComparisonSnapshot,
  LocationInfo,
  ThemeMode,
  UnitSystem,
} from '../types/environment';
import { searchLocations, sendAirClimeAiMessage } from '../services/api';
import { getUsAqiCategory } from '../utils/airQuality';
import {
  computeWeatherComfortIndex,
  describeUvIndex,
  describeWmoCode,
  formatPrecipitation,
  formatTemp,
  formatWindSpeed,
} from '../utils/weather';
import { formatMinutesAsHm } from '../utils/solar';
import {
  ComparisonBarChart,
  ComparisonHourlyTrendChart,
} from '../components/charts/EnvironmentalCharts';
import { EmptyState } from '../components/common/Skeletons';

interface AtmosComparePageProps {
  snapshots: ComparisonSnapshot[];
  onAddCity: (loc: LocationInfo) => void;
  onRemoveCity: (index: number) => void;
  units: UnitSystem;
  theme: ThemeMode;
  language: ChatLanguage;
}

const PRESET_CITIES: LocationInfo[] = [
  { name: 'Zurich', country: 'Switzerland', latitude: 47.3769, longitude: 8.5417 },
  { name: 'Tokyo', country: 'Japan', latitude: 35.6895, longitude: 139.6917 },
  { name: 'Hyderabad', country: 'India', latitude: 17.385, longitude: 78.4867 },
  { name: 'New Delhi', country: 'India', latitude: 28.6139, longitude: 77.209 },
  { name: 'Vancouver', country: 'Canada', latitude: 49.2827, longitude: -123.1207 },
];

export function AtmosComparePage({
  snapshots,
  onAddCity,
  onRemoveCity,
  units,
  theme,
  language,
}: AtmosComparePageProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [trendMetric, setTrendMetric] = useState<'us_aqi' | 'temperature'>('us_aqi');
  const [aiComparisonText, setAiComparisonText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearchError(null);
    try {
      const list = await searchLocations(query.trim());
      setResults(list);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Search failed.');
    } finally {
      setSearching(false);
    }
  };

  const validWithAqi = snapshots.filter((s) => s.airQuality?.current.us_aqi != null);
  const cleanest =
    validWithAqi.length >= 2
      ? [...validWithAqi].sort(
          (a, b) => (a.airQuality!.current.us_aqi ?? 9999) - (b.airQuality!.current.us_aqi ?? 9999),
        )[0]
      : null;

  const mostPolluted =
    validWithAqi.length >= 2
      ? [...validWithAqi].sort(
          (a, b) => (b.airQuality!.current.us_aqi ?? -1) - (a.airQuality!.current.us_aqi ?? -1),
        )[0]
      : null;

  const validWithUv = snapshots.filter((s) => (s.weather?.daily.uv_index_max?.[0] ?? s.airQuality?.current.uv_index) != null);
  const lowestUvCity =
    validWithUv.length >= 2
      ? [...validWithUv].sort((a, b) => {
          const uvA = a.weather?.daily.uv_index_max?.[0] ?? a.airQuality?.current.uv_index ?? 99;
          const uvB = b.weather?.daily.uv_index_max?.[0] ?? b.airQuality?.current.uv_index ?? 99;
          return uvA - uvB;
        })[0]
      : null;

  const validWithComfort = snapshots
    .map((s) => ({ snap: s, comfort: computeWeatherComfortIndex(s.weather) }))
    .filter((x) => x.comfort.score != null);
  const bestComfort =
    validWithComfort.length >= 2
      ? [...validWithComfort].sort((a, b) => (b.comfort.score ?? -1) - (a.comfort.score ?? -1))[0]
      : null;

  const handleGenerateAiComparison = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const comparisonContext = snapshots
        .filter((s) => !s.loading && (s.airQuality || s.weather))
        .map((s) => ({
          city: `${s.location.name}, ${s.location.country}`,
          usAqi: s.airQuality?.current.us_aqi ?? null,
          pm2_5: s.airQuality?.current.pm2_5 ?? null,
          pm10: s.airQuality?.current.pm10 ?? null,
          temperatureC: s.weather?.current.temperature_2m ?? null,
          humidityPercent: s.weather?.current.relative_humidity_2m ?? null,
          windSpeedKmh: s.weather?.current.wind_speed_10m ?? null,
          uvIndexMax: s.weather?.daily.uv_index_max?.[0] ?? null,
          daylightMinutes:
            s.weather?.daily.daylight_duration?.[0] != null
              ? Math.round(s.weather.daily.daylight_duration[0] / 60)
              : null,
          condition: describeWmoCode(s.weather?.current.weather_code).label,
        }));

      const res = await sendAirClimeAiMessage({
        messages: [
          {
            id: 'cmp-ai',
            role: 'user',
            content:
              'Compare these cities across air quality, UV exposure, daylight duration, and weather comfort. Highlight the best city for outdoor activity right now using exact figures.',
            timestamp: new Date().toISOString(),
          },
        ],
        language,
        locationContext: comparisonContext[0] ?? null,
        comparisonContext,
      });
      setAiComparisonText(res.reply);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Unable to generate AI comparison explanation.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <GitCompare className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
          <span>AtmosCompare</span>
          <span aria-hidden="true">·</span>
          <span>Compare up to 4 cities</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Multi-City Environmental Comparison
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Compare live AQI, PM2.5, PM10, temperature, humidity, wind, UV index, sunrise/sunset, daylight duration, precipitation, and comfort scores across cities worldwide.
        </p>
      </header>

      {/* City Selector Bar */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Add city to compare (e.g. Singapore)..."
                aria-label="Search city to add to comparison"
                disabled={snapshots.length >= 4}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
              />
            </div>
            <button
              type="submit"
              disabled={searching || snapshots.length >= 4 || query.trim().length < 2}
              className="px-3.5 py-2 rounded-lg bg-[#0F5132] hover:bg-[#0c4128] text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
            >
              {searching ? 'Searching...' : 'Find City'}
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">Quick add:</span>
            {PRESET_CITIES.map((city) => {
              const alreadyAdded = snapshots.some(
                (s) => Math.abs(s.location.latitude - city.latitude) < 0.05 && Math.abs(s.location.longitude - city.longitude) < 0.05,
              );
              return (
                <button
                  key={city.name}
                  type="button"
                  disabled={alreadyAdded || snapshots.length >= 4}
                  onClick={() => onAddCity(city)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:border-emerald-500 disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-3 h-3" aria-hidden="true" />
                  {city.name}
                </button>
              );
            })}
          </div>
        </div>

        {searchError && <p className="text-xs text-rose-600">{searchError}</p>}

        {results.length > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex flex-wrap gap-2">
            {results.slice(0, 6).map((r, i) => (
              <button
                key={`${r.name}-${i}`}
                type="button"
                onClick={() => {
                  onAddCity(r);
                  setResults([]);
                  setQuery('');
                }}
                className="px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-xs text-slate-900 dark:text-slate-100 hover:bg-emerald-100 cursor-pointer"
              >
                + {r.name}, {[r.admin1, r.country].filter(Boolean).join(', ')}
              </button>
            ))}
          </div>
        )}
      </section>

      {snapshots.length < 2 ? (
        <EmptyState
          title="Select at least 2 cities to compare"
          description="Use the city search bar or quick-add buttons above to load real-time environmental comparisons."
        />
      ) : (
        <>
          {/* Winner Indicators Row */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cleanest && mostPolluted && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 flex items-start gap-3">
                <Award className="w-5 h-5 text-[#0F5132] dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Best Air Quality</p>
                  <p className="text-sm font-bold text-[#0F5132] dark:text-emerald-300">
                    {cleanest.location.name} ({Math.round(cleanest.airQuality!.current.us_aqi!)} US AQI)
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    {Math.round((mostPolluted.airQuality!.current.us_aqi ?? 0) - (cleanest.airQuality!.current.us_aqi ?? 0))}{' '}
                    points cleaner than {mostPolluted.location.name}.
                  </p>
                </div>
              </div>
            )}

            {lowestUvCity && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4 flex items-start gap-3">
                <Sun className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Lowest UV Risk</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {lowestUvCity.location.name} (UV{' '}
                    {(
                      lowestUvCity.weather?.daily.uv_index_max?.[0] ??
                      lowestUvCity.airQuality?.current.uv_index ??
                      0
                    ).toFixed(1)}
                    )
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {
                      describeUvIndex(
                        lowestUvCity.weather?.daily.uv_index_max?.[0] ??
                          lowestUvCity.airQuality?.current.uv_index,
                      ).label
                    }{' '}
                    peak UV radiation today
                  </p>
                </div>
              </div>
            )}

            {bestComfort && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4 flex items-start gap-3">
                <Smile className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Best Weather Comfort</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {bestComfort.snap.location.name} ({bestComfort.comfort.score}/100)
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">{bestComfort.comfort.label}</p>
                </div>
              </div>
            )}
          </section>

          {/* On-Demand AI Comparison Explanation */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Bot className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
                <span>AirClime-ai Comparison Analysis</span>
              </div>
              <button
                type="button"
                onClick={() => void handleGenerateAiComparison()}
                disabled={aiLoading}
                className="px-3.5 py-1.5 rounded-lg bg-[#0F5132] hover:bg-[#0c4128] text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                {aiLoading ? 'Analyzing...' : aiComparisonText ? 'Refresh AI Comparison' : 'Explain City Differences with AI'}
              </button>
            </div>
            {aiError && <p className="text-xs text-rose-600 dark:text-rose-400">{aiError}</p>}
            {aiComparisonText ? (
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {aiComparisonText}
              </p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Request an on-demand Gemini explanation comparing air quality, UV exposure, daylight, and thermal comfort across your loaded cities.
              </p>
            )}
          </section>

          {/* Side-by-side City Comparison Cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {snapshots.map((snap, idx) => {
              const aqi = snap.airQuality?.current.us_aqi ?? null;
              const cat = getUsAqiCategory(aqi);
              const wmo = describeWmoCode(snap.weather?.current.weather_code);
              const uvVal = snap.weather?.daily.uv_index_max?.[0] ?? snap.airQuality?.current.uv_index ?? null;
              const daylightSec = snap.weather?.daily.daylight_duration?.[0] ?? null;
              const comfort = computeWeatherComfortIndex(snap.weather);

              const sunrise = snap.weather?.daily.sunrise?.[0]
                ? new Date(snap.weather.daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'N/A';
              const sunset = snap.weather?.daily.sunset?.[0]
                ? new Date(snap.weather.daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'N/A';

              return (
                <div
                  key={`${snap.location.name}-${snap.location.latitude}-${idx}`}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {snap.location.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {snap.location.country}
                      </p>
                    </div>
                    {snapshots.length > 2 && (
                      <button
                        type="button"
                        onClick={() => onRemoveCity(idx)}
                        aria-label={`Remove ${snap.location.name}`}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {snap.loading ? (
                    <p className="text-xs text-slate-500 py-4">Loading live telemetry...</p>
                  ) : snap.error ? (
                    <p className="text-xs text-rose-600">{snap.error}</p>
                  ) : (
                    <dl className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-slate-500">US AQI</dt>
                        <dd className={`font-mono font-bold tabular-nums ${cat.textClass}`}>
                          {aqi != null ? `${Math.round(aqi)} (${cat.label})` : 'Unavailable'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">PM2.5 / PM10</dt>
                        <dd className="font-mono tabular-nums">
                          {snap.airQuality?.current.pm2_5?.toFixed(1) ?? 'N/A'} /{' '}
                          {snap.airQuality?.current.pm10?.toFixed(1) ?? 'N/A'} µg/m³
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Temperature</dt>
                        <dd className="font-mono tabular-nums">
                          {formatTemp(snap.weather?.current.temperature_2m, units)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Condition</dt>
                        <dd className="text-right">{wmo.label}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Humidity / Precip</dt>
                        <dd className="font-mono tabular-nums">
                          {snap.weather?.current.relative_humidity_2m != null
                            ? `${Math.round(snap.weather.current.relative_humidity_2m)}%`
                            : 'N/A'}{' '}
                          · {formatPrecipitation(snap.weather?.current.precipitation, units)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Wind Speed</dt>
                        <dd className="font-mono tabular-nums">
                          {formatWindSpeed(snap.weather?.current.wind_speed_10m, units)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Peak UV</dt>
                        <dd className="font-mono tabular-nums">
                          {uvVal != null ? `${uvVal.toFixed(1)} (${describeUvIndex(uvVal).label})` : 'N/A'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Sunrise / Sunset</dt>
                        <dd className="font-mono tabular-nums">
                          {sunrise} / {sunset}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Daylight</dt>
                        <dd className="font-mono tabular-nums">
                          {daylightSec != null ? formatMinutesAsHm(Math.round(daylightSec / 60)) : 'N/A'}
                        </dd>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                        <dt className="text-slate-500 inline-flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" aria-hidden="true" /> Comfort
                        </dt>
                        <dd className="font-mono font-semibold tabular-nums">
                          {comfort.score != null ? `${comfort.score}/100` : 'N/A'}
                        </dd>
                      </div>
                    </dl>
                  )}
                </div>
              );
            })}
          </section>

          {/* Charts */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Current Metric Comparison
              </h3>
              <ComparisonBarChart snapshots={snapshots} theme={theme} />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  24-Hour Forecast Comparison
                </h3>
                <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setTrendMetric('us_aqi')}
                    className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                      trendMetric === 'us_aqi'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    US AQI
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendMetric('temperature')}
                    className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                      trendMetric === 'temperature'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Temp
                  </button>
                </div>
              </div>
              <ComparisonHourlyTrendChart
                snapshots={snapshots}
                metric={trendMetric}
                units={units}
                theme={theme}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

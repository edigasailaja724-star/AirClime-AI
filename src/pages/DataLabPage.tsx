import { useMemo, useState } from 'react';
import { Download, FlaskConical } from 'lucide-react';
import type {
  AirQualityData,
  LocationInfo,
  ThemeMode,
  UnitSystem,
  WeatherData,
} from '../types/environment';
import { DataLabChart } from '../components/charts/EnvironmentalCharts';

interface DataLabPageProps {
  location: LocationInfo;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  units: UnitSystem;
  theme: ThemeMode;
}

type ParamId =
  | 'us_aqi'
  | 'pm2_5'
  | 'pm10'
  | 'nitrogen_dioxide'
  | 'ozone'
  | 'temperature_2m'
  | 'relative_humidity_2m'
  | 'precipitation'
  | 'wind_speed_10m'
  | 'uv_index'
  | 'shortwave_radiation';

interface ParamMeta {
  id: ParamId;
  label: string;
  unit: string;
  source: 'air-quality' | 'weather';
}

const PARAM_OPTIONS: ParamMeta[] = [
  { id: 'us_aqi', label: 'US AQI', unit: 'index', source: 'air-quality' },
  { id: 'pm2_5', label: 'PM2.5', unit: 'µg/m³', source: 'air-quality' },
  { id: 'pm10', label: 'PM10', unit: 'µg/m³', source: 'air-quality' },
  { id: 'nitrogen_dioxide', label: 'NO₂', unit: 'µg/m³', source: 'air-quality' },
  { id: 'ozone', label: 'Ozone (O₃)', unit: 'µg/m³', source: 'air-quality' },
  { id: 'temperature_2m', label: 'Temperature', unit: '°C / °F', source: 'weather' },
  { id: 'relative_humidity_2m', label: 'Humidity', unit: '%', source: 'weather' },
  { id: 'precipitation', label: 'Precipitation', unit: 'mm', source: 'weather' },
  { id: 'wind_speed_10m', label: 'Wind Speed', unit: 'km/h', source: 'weather' },
  { id: 'uv_index', label: 'UV Index', unit: 'index', source: 'weather' },
  { id: 'shortwave_radiation', label: 'Solar Irradiance', unit: 'W/m²', source: 'weather' },
];

export function DataLabPage({
  location,
  weather,
  airQuality,
  units,
  theme,
}: DataLabPageProps) {
  const [primaryParam, setPrimaryParam] = useState<ParamId>('us_aqi');
  const [secondaryParam, setSecondaryParam] = useState<'none' | ParamId>('pm2_5');
  const [horizonHours, setHorizonHours] = useState<24 | 48 | 120>(48);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const extractSeries = (param: ParamId, timesRef: string[]): Array<number | null> => {
    const meta = PARAM_OPTIONS.find((p) => p.id === param)!;
    if (meta.source === 'air-quality') {
      if (!airQuality?.hourly.time.length) return timesRef.map(() => null);
      const map = new Map<string, number | null>();
      airQuality.hourly.time.forEach((t, idx) => {
        const arr = airQuality.hourly[param as keyof typeof airQuality.hourly] as Array<number | null>;
        map.set(t, arr?.[idx] ?? null);
      });
      return timesRef.map((t) => map.get(t) ?? null);
    }

    if (!weather?.hourly.time.length) return timesRef.map(() => null);
    const map = new Map<string, number | null>();
    weather.hourly.time.forEach((t, idx) => {
      const arr = weather.hourly[param as keyof typeof weather.hourly] as Array<number | null>;
      let val = arr?.[idx] ?? null;
      if (val != null && param === 'temperature_2m' && units === 'imperial') {
        val = Number(((val * 9) / 5 + 32).toFixed(1));
      }
      map.set(t, val);
    });
    return timesRef.map((t) => map.get(t) ?? null);
  };

  const dataset = useMemo(() => {
    const baseTimes = weather?.hourly.time?.length
      ? weather.hourly.time
      : airQuality?.hourly.time ?? [];
    if (!baseTimes.length) {
      return { rawTimes: [], labels: [], primary: [], secondary: undefined };
    }

    const nowMs = Date.now();
    let startIdx = baseTimes.findIndex((t) => Date.parse(t) >= nowMs - 3600 * 1000);
    if (startIdx < 0) startIdx = 0;

    // For 120h (5-day view) include past+future available points
    const sliceTimes =
      horizonHours === 120
        ? baseTimes.slice(0, 144)
        : baseTimes.slice(startIdx, startIdx + horizonHours);

    const labels = sliceTimes.map((t) =>
      new Date(t).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    );

    const primary = extractSeries(primaryParam, sliceTimes);
    const secondary = secondaryParam !== 'none' ? extractSeries(secondaryParam, sliceTimes) : undefined;

    return { rawTimes: sliceTimes, labels, primary, secondary };
  }, [weather, airQuality, primaryParam, secondaryParam, horizonHours, units]);

  const primaryMeta = PARAM_OPTIONS.find((p) => p.id === primaryParam)!;
  const secondaryMeta = secondaryParam !== 'none' ? PARAM_OPTIONS.find((p) => p.id === secondaryParam) : undefined;

  const handleExportCsv = () => {
    if (!dataset.rawTimes.length) return;
    const headers = [
      'timestamp_iso',
      'location',
      `${primaryMeta.label} (${primaryMeta.unit})`,
      ...(secondaryMeta ? [`${secondaryMeta.label} (${secondaryMeta.unit})`] : []),
    ];
    const rows = dataset.rawTimes.map((t, i) => [
      t,
      `"${location.name}, ${location.country}"`,
      dataset.primary[i] ?? '',
      ...(dataset.secondary ? [dataset.secondary[i] ?? ''] : []),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airclime-${location.name.toLowerCase().replace(/\s+/g, '-')}-${primaryParam}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-7">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <FlaskConical className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
            <span>Interactive Environmental Data Lab</span>
            <span aria-hidden="true">·</span>
            <span>{location.name}, {location.country}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Environmental Parameter Explorer &amp; CSV Export
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Explore hourly Open-Meteo weather and Copernicus CAMS air quality series, compare parameters side-by-side, and export datasets as CSV.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={dataset.rawTimes.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F5132] hover:bg-[#0c4128] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          Export CSV
        </button>
      </header>

      {/* Controls */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="lab-primary" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Primary Parameter
          </label>
          <select
            id="lab-primary"
            value={primaryParam}
            onChange={(e) => setPrimaryParam(e.target.value as ParamId)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
          >
            {PARAM_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="lab-secondary" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Compare With Parameter
          </label>
          <select
            id="lab-secondary"
            value={secondaryParam}
            onChange={(e) => setSecondaryParam(e.target.value as 'none' | ParamId)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
          >
            <option value="none">None (Single parameter)</option>
            {PARAM_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">Time Window</span>
          <div className="inline-flex w-full p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {([24, 48, 120] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizonHours(h)}
                className={`flex-1 py-1.5 rounded text-xs font-medium cursor-pointer ${
                  horizonHours === h
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {h === 120 ? 'Multi-Day' : `${h}h`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">Chart Type</span>
          <div className="inline-flex w-full p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            {(['line', 'bar'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setChartType(t)}
                className={`flex-1 py-1.5 rounded text-xs font-medium capitalize cursor-pointer ${
                  chartType === t
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Chart Container */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            {primaryMeta.label} ({primaryMeta.unit})
            {secondaryMeta ? ` vs ${secondaryMeta.label} (${secondaryMeta.unit})` : ''}
          </p>
          <p className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {dataset.rawTimes.length} hourly points · Resolution: 1 hour
          </p>
        </div>

        {dataset.labels.length > 0 ? (
          <DataLabChart
            labels={dataset.labels}
            primaryLabel={`${primaryMeta.label} (${primaryMeta.unit})`}
            primaryData={dataset.primary}
            secondaryLabel={secondaryMeta ? `${secondaryMeta.label} (${secondaryMeta.unit})` : undefined}
            secondaryData={dataset.secondary}
            chartType={chartType}
            theme={theme}
          />
        ) : (
          <p className="text-xs text-slate-500 py-12 text-center">Dataset loading or unavailable.</p>
        )}

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          <strong>Sources &amp; Limitations:</strong> Weather metrics use Open-Meteo ECMWF/GFS/ICON 1-hour forecasts; air quality series use Copernicus CAMS 1-hour global/European model runs (2 days past + up to 5 days forecast). Unavailable hours remain null and are never interpolated synthetically.
        </p>
      </section>
    </div>
  );
}

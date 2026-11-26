import { useEffect, useState } from 'react';
import { Globe2, MapPin, Wind, Thermometer, Droplets, Sun } from 'lucide-react';
import type {
  AirQualityData,
  ComparisonSnapshot,
  EarthScopeLayer,
  LocationInfo,
  RadarData,
  SpatialGridPoint,
  ThemeMode,
  UnitSystem,
  WeatherData,
} from '../types/environment';
import { fetchSpatialGridData } from '../services/api';
import { EarthScopeMap } from '../components/maps/EarthScopeMap';
import { getUsAqiCategory } from '../utils/airQuality';
import { describeUvIndex, describeWmoCode, formatTemp, formatWindSpeed } from '../utils/weather';

interface EarthScopePageProps {
  location: LocationInfo;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  radar: RadarData | null;
  comparisonSnapshots: ComparisonSnapshot[];
  units: UnitSystem;
  theme: ThemeMode;
  onInspectCoordinates: (lat: number, lon: number) => void;
  onUseMyLocation: () => void;
}

const REFERENCE_STATIONS: LocationInfo[] = [
  { name: 'Tokyo', country: 'Japan', latitude: 35.6895, longitude: 139.6917 },
  { name: 'New Delhi', country: 'India', latitude: 28.6139, longitude: 77.209 },
  { name: 'Hyderabad', country: 'India', latitude: 17.385, longitude: 78.4867 },
  { name: 'New York', country: 'United States', latitude: 40.7128, longitude: -74.006 },
  { name: 'Zurich', country: 'Switzerland', latitude: 47.3769, longitude: 8.5417 },
];

export function EarthScopePage({
  location,
  weather,
  airQuality,
  radar,
  comparisonSnapshots,
  units,
  theme,
  onInspectCoordinates,
  onUseMyLocation,
}: EarthScopePageProps) {
  const [activeDataLayer, setActiveDataLayer] = useState<EarthScopeLayer>('aqi');
  const [spatialGrid, setSpatialGrid] = useState<SpatialGridPoint[]>([]);
  const [gridLoading, setGridLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setGridLoading(true);
    fetchSpatialGridData(location.latitude, location.longitude)
      .then((pts) => {
        if (!cancelled) setSpatialGrid(pts);
      })
      .catch(() => {
        if (!cancelled) setSpatialGrid([]);
      })
      .finally(() => {
        if (!cancelled) setGridLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location.latitude, location.longitude]);

  const usAqi = airQuality?.current.us_aqi ?? null;
  const cat = getUsAqiCategory(usAqi);
  const wmo = describeWmoCode(weather?.current.weather_code);
  const uv = airQuality?.current.uv_index ?? weather?.daily.uv_index_max?.[0] ?? null;
  const uvInfo = describeUvIndex(uv);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Globe2 className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
            <span>EarthScope</span>
            <span aria-hidden="true">·</span>
            <span>Multi-Layer Environmental Map &amp; RainViewer Radar</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Interactive Earth Telemetry Map
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Switch between Air Quality, PM2.5, Temperature, Wind, Precipitation, UV Index, and Cloud Cover spatial grid layers, toggle live RainViewer radar, or click any coordinate on Earth.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {REFERENCE_STATIONS.map((st) => (
            <button
              key={st.name}
              type="button"
              onClick={() => onInspectCoordinates(st.latitude, st.longitude)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 hover:border-emerald-500 transition-colors cursor-pointer"
            >
              {st.name}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-start">
        <div className="lg:col-span-3">
          <EarthScopeMap
            location={location}
            weather={weather}
            airQuality={airQuality}
            radar={radar}
            spatialGrid={spatialGrid}
            comparisonSnapshots={comparisonSnapshots}
            activeDataLayer={activeDataLayer}
            onChangeDataLayer={setActiveDataLayer}
            units={units}
            theme={theme}
            onInspectCoordinates={onInspectCoordinates}
            onUseMyLocation={onUseMyLocation}
            heightClass="h-[520px]"
          />
        </div>

        {/* Selected Location Inspection Panel */}
        <aside className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                Selected Location
              </span>
              {gridLoading && <span className="text-[10px] font-mono text-slate-400">Syncing grid...</span>}
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              {location.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {[location.admin1, location.country].filter(Boolean).join(', ')}
            </p>
            <p className="text-[11px] font-mono tabular-nums text-slate-400 mt-1">
              {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
            </p>
          </div>

          <div className={`rounded-lg border ${cat.borderClass} ${cat.surfaceClass} p-3.5`}>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">US AQI</p>
            <p className={`text-2xl font-bold font-mono tabular-nums ${cat.textClass}`}>
              {usAqi != null ? Math.round(usAqi) : 'N/A'}{' '}
              <span className="text-xs font-sans font-semibold">{cat.label}</span>
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] font-mono tabular-nums text-slate-700 dark:text-slate-300">
              <span>PM2.5: {airQuality?.current.pm2_5?.toFixed(1) ?? 'N/A'}</span>
              <span>PM10: {airQuality?.current.pm10?.toFixed(1) ?? 'N/A'}</span>
              <span>NO₂: {airQuality?.current.nitrogen_dioxide?.toFixed(1) ?? 'N/A'}</span>
              <span>O₃: {airQuality?.current.ozone?.toFixed(1) ?? 'N/A'}</span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Thermometer className="w-3.5 h-3.5" aria-hidden="true" /> Temperature
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {formatTemp(weather?.current.temperature_2m, units)} · {wmo.label}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Droplets className="w-3.5 h-3.5" aria-hidden="true" /> Humidity
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {weather?.current.relative_humidity_2m != null
                  ? `${Math.round(weather.current.relative_humidity_2m)}%`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Wind className="w-3.5 h-3.5" aria-hidden="true" /> Wind Speed
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {formatWindSpeed(weather?.current.wind_speed_10m, units)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Sun className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" /> UV Index
              </span>
              <span className={`font-mono font-semibold tabular-nums ${uvInfo.textClass}`}>
                {uv != null ? `${uv.toFixed(1)} (${uvInfo.label})` : 'N/A'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Sampling: {spatialGrid.length} live Open-Meteo grid points + {comparisonSnapshots.length} AtmosCompare city markers. Continuous raster heatmaps outside RainViewer precipitation tiles are omitted where unsupported by a real tile API.
          </p>
        </aside>
      </div>
    </div>
  );
}

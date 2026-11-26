import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, LocateFixed, MapPin, Radar as RadarIcon } from 'lucide-react';
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
} from '../../types/environment';
import { getUsAqiCategory } from '../../utils/airQuality';
import { describeWmoCode, formatTemp, formatWindSpeed } from '../../utils/weather';

type BaseLayerKey = 'osm' | 'topo' | 'dark';

interface EarthScopeMapProps {
  location: LocationInfo;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  radar: RadarData | null;
  spatialGrid?: SpatialGridPoint[];
  comparisonSnapshots?: ComparisonSnapshot[];
  activeDataLayer?: EarthScopeLayer;
  onChangeDataLayer?: (layer: EarthScopeLayer) => void;
  units: UnitSystem;
  theme: ThemeMode;
  onInspectCoordinates: (lat: number, lon: number) => void;
  onUseMyLocation: () => void;
  heightClass?: string;
  defaultShowRadar?: boolean;
  radarFramePath?: string | null;
}

const TILE_LAYERS: Record<BaseLayerKey, { url: string; attribution: string; label: string }> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    label: 'Standard',
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap',
    label: 'Terrain',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    label: 'Dark',
  },
};

function getPointColorAndValue(pt: SpatialGridPoint, layer: EarthScopeLayer, units: UnitSystem): { color: string; label: string } {
  switch (layer) {
    case 'aqi': {
      const cat = getUsAqiCategory(pt.us_aqi);
      return { color: cat.accentHex, label: pt.us_aqi != null ? `${Math.round(pt.us_aqi)} AQI` : 'N/A' };
    }
    case 'pm2_5': {
      const v = pt.pm2_5;
      const color = v == null ? '#64748B' : v <= 12 ? '#059669' : v <= 35 ? '#D97706' : '#DC2626';
      return { color, label: v != null ? `${v.toFixed(1)} µg/m³` : 'N/A' };
    }
    case 'temperature': {
      const t = pt.temperature_2m;
      const color = t == null ? '#64748B' : t <= 5 ? '#0284C7' : t <= 22 ? '#059669' : t <= 32 ? '#D97706' : '#DC2626';
      return { color, label: formatTemp(t, units) };
    }
    case 'wind': {
      const w = pt.wind_speed_10m;
      const color = w == null ? '#64748B' : w <= 15 ? '#059669' : w <= 35 ? '#D97706' : '#DC2626';
      return { color, label: formatWindSpeed(w, units) };
    }
    case 'precipitation': {
      const p = pt.precipitation;
      const color = p == null ? '#64748B' : p === 0 ? '#64748B' : p < 2.5 ? '#0EA5E9' : '#1D4ED8';
      return { color, label: p != null ? `${p.toFixed(1)} mm` : 'N/A' };
    }
    case 'uv': {
      const uv = pt.uv_index;
      const color = uv == null ? '#64748B' : uv < 3 ? '#059669' : uv < 6 ? '#D97706' : uv < 8 ? '#EA580C' : '#DC2626';
      return { color, label: uv != null ? `UV ${uv.toFixed(1)}` : 'N/A' };
    }
    case 'cloud': {
      const c = pt.cloud_cover;
      const color = c == null ? '#64748B' : c < 25 ? '#F59E0B' : c < 70 ? '#64748B' : '#334155';
      return { color, label: c != null ? `${Math.round(c)}% cloud` : 'N/A' };
    }
  }
}

export function EarthScopeMap({
  location,
  weather,
  airQuality,
  radar,
  spatialGrid = [],
  comparisonSnapshots = [],
  activeDataLayer = 'aqi',
  onChangeDataLayer,
  units,
  theme,
  onInspectCoordinates,
  onUseMyLocation,
  heightClass = 'h-[480px]',
  defaultShowRadar = false,
  radarFramePath = null,
}: EarthScopeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const overlayGroupRef = useRef<L.LayerGroup | null>(null);
  const onInspectRef = useRef(onInspectCoordinates);
  onInspectRef.current = onInspectCoordinates;

  const [baseLayer, setBaseLayer] = useState<BaseLayerKey>(theme === 'dark' ? 'dark' : 'osm');
  const [showRadarOverlay, setShowRadarOverlay] = useState<boolean>(defaultShowRadar);

  useEffect(() => {
    setBaseLayer((prev) => {
      if (prev === 'topo') return 'topo';
      return theme === 'dark' ? 'dark' : 'osm';
    });
  }, [theme]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [location.latitude, location.longitude],
      zoom: 8,
      zoomControl: true,
    });

    const initialLayer = TILE_LAYERS[baseLayer];
    baseLayerRef.current = L.tileLayer(initialLayer.url, {
      attribution: initialLayer.attribution,
      maxZoom: 18,
    }).addTo(map);

    overlayGroupRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      onInspectRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      baseLayerRef.current = null;
      radarLayerRef.current = null;
      overlayGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (baseLayerRef.current) {
      map.removeLayer(baseLayerRef.current);
    }
    const cfg = TILE_LAYERS[baseLayer];
    baseLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: 18,
    }).addTo(map);
  }, [baseLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current);
      radarLayerRef.current = null;
    }

    const latestPast = radar?.past[radar.past.length - 1]?.path;
    const activePath = radarFramePath || latestPast;

    if (showRadarOverlay && radar?.host && activePath) {
      radarLayerRef.current = L.tileLayer(`${radar.host}${activePath}/256/{z}/{x}/{y}/2/1_1.png`, {
        opacity: 0.65,
        zIndex: 400,
        attribution: 'Radar tiles: RainViewer',
      }).addTo(map);
    }
  }, [showRadarOverlay, radar, radarFramePath]);

  useEffect(() => {
    const map = mapRef.current;
    const group = overlayGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    map.setView([location.latitude, location.longitude], map.getZoom(), { animate: true });

    // 1. Render real Open-Meteo spatial grid points around the active region
    spatialGrid.forEach((pt) => {
      const isCenter =
        Math.abs(pt.latitude - location.latitude) < 0.08 &&
        Math.abs(pt.longitude - location.longitude) < 0.08;
      if (isCenter) return;

      const { color, label } = getPointColorAndValue(pt, activeDataLayer, units);
      const gridDot = L.circleMarker([pt.latitude, pt.longitude], {
        radius: 8,
        color: '#ffffff',
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.85,
      });

      gridDot.bindPopup(
        `<div style="font-family:var(--font-sans);font-size:12px;">
          <div style="font-weight:600;margin-bottom:2px;">Regional Grid Point</div>
          <div>${pt.latitude.toFixed(2)}°, ${pt.longitude.toFixed(2)}°</div>
          <div style="margin-top:4px;"><strong>${activeDataLayer.toUpperCase()}:</strong> ${label}</div>
          <div style="font-size:11px;color:#64748B;margin-top:2px;">Open-Meteo CAMS / Forecast</div>
        </div>`,
      );
      gridDot.addTo(group);
    });

    // 2. Render compared city markers if present
    comparisonSnapshots.forEach((snap) => {
      const sameAsMain =
        Math.abs(snap.location.latitude - location.latitude) < 0.05 &&
        Math.abs(snap.location.longitude - location.longitude) < 0.05;
      if (sameAsMain || (!snap.airQuality && !snap.weather)) return;

      const pt: SpatialGridPoint = {
        latitude: snap.location.latitude,
        longitude: snap.location.longitude,
        us_aqi: snap.airQuality?.current.us_aqi ?? null,
        pm2_5: snap.airQuality?.current.pm2_5 ?? null,
        uv_index: snap.airQuality?.current.uv_index ?? null,
        temperature_2m: snap.weather?.current.temperature_2m ?? null,
        wind_speed_10m: snap.weather?.current.wind_speed_10m ?? null,
        precipitation: snap.weather?.current.precipitation ?? null,
        cloud_cover: snap.weather?.current.cloud_cover ?? null,
        weather_code: snap.weather?.current.weather_code ?? null,
      };
      const { color, label } = getPointColorAndValue(pt, activeDataLayer, units);
      const compMarker = L.circleMarker([pt.latitude, pt.longitude], {
        radius: 9,
        color: '#0F172A',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.92,
      });
      compMarker.bindPopup(
        `<div style="font-family:var(--font-sans);font-size:12px;">
          <div style="font-weight:700;">${snap.location.name} (Compared)</div>
          <div>Layer reading: <strong>${label}</strong></div>
          <div>Temp: ${formatTemp(pt.temperature_2m, units)} · US AQI: ${pt.us_aqi != null ? Math.round(pt.us_aqi) : 'N/A'}</div>
        </div>`,
      );
      compMarker.addTo(group);
    });

    // 3. Render primary selected location marker
    const mainPt: SpatialGridPoint = {
      latitude: location.latitude,
      longitude: location.longitude,
      us_aqi: airQuality?.current.us_aqi ?? null,
      pm2_5: airQuality?.current.pm2_5 ?? null,
      uv_index: airQuality?.current.uv_index ?? null,
      temperature_2m: weather?.current.temperature_2m ?? null,
      wind_speed_10m: weather?.current.wind_speed_10m ?? null,
      precipitation: weather?.current.precipitation ?? null,
      cloud_cover: weather?.current.cloud_cover ?? null,
      weather_code: weather?.current.weather_code ?? null,
    };

    const { color: mainColor } = getPointColorAndValue(mainPt, activeDataLayer, units);
    const wmo = describeWmoCode(weather?.current.weather_code);
    const aqiCat = getUsAqiCategory(mainPt.us_aqi);

    const marker = L.circleMarker([location.latitude, location.longitude], {
      radius: 11,
      color: '#ffffff',
      weight: 3,
      fillColor: mainColor,
      fillOpacity: 0.98,
    }).addTo(group);

    marker.bindPopup(
      `<div style="min-width:200px;font-family:var(--font-sans)">
        <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${location.name}${location.country ? `, ${location.country}` : ''}</div>
        <div style="font-size:12px;margin-bottom:2px;">US AQI: <strong>${mainPt.us_aqi != null ? `${Math.round(mainPt.us_aqi)} (${aqiCat.label})` : 'N/A'}</strong></div>
        <div style="font-size:12px;margin-bottom:2px;">PM2.5: <strong>${mainPt.pm2_5 != null ? `${mainPt.pm2_5.toFixed(1)} µg/m³` : 'N/A'}</strong></div>
        <div style="font-size:12px;margin-bottom:2px;">Temp: <strong>${formatTemp(mainPt.temperature_2m, units)}</strong> · ${wmo.label}</div>
        <div style="font-size:12px;">Wind: <strong>${formatWindSpeed(mainPt.wind_speed_10m, units)}</strong></div>
      </div>`,
    );
  }, [location, weather, airQuality, spatialGrid, comparisonSnapshots, activeDataLayer, units]);

  const latestRadarAvailable = Boolean(radar?.past.length);

  const LAYER_OPTIONS: Array<{ id: EarthScopeLayer; label: string }> = [
    { id: 'aqi', label: 'Air Quality' },
    { id: 'pm2_5', label: 'PM2.5' },
    { id: 'temperature', label: 'Temperature' },
    { id: 'wind', label: 'Wind' },
    { id: 'precipitation', label: 'Precipitation' },
    { id: 'uv', label: 'UV Index' },
    { id: 'cloud', label: 'Cloud Cover' },
  ];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-[#131C21]">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <span>Click anywhere on the map to inspect live air quality and weather telemetry</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
              <Layers className="w-3.5 h-3.5 text-slate-500 ml-1.5" aria-hidden="true" />
              {(Object.keys(TILE_LAYERS) as BaseLayerKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBaseLayer(key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    baseLayer === key
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {TILE_LAYERS[key].label}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={!latestRadarAvailable}
              onClick={() => setShowRadarOverlay((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                showRadarOverlay
                  ? 'bg-[#0F5132] text-white border-[#0F5132]'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <RadarIcon className="w-3.5 h-3.5" aria-hidden="true" />
              {latestRadarAvailable
                ? showRadarOverlay
                  ? 'Live Radar: On'
                  : 'Live Radar: Off'
                : 'Radar Unavailable'}
            </button>

            <button
              type="button"
              onClick={onUseMyLocation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              <LocateFixed className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              My Location
            </button>
          </div>
        </div>

        {onChangeDataLayer && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1">
              Spatial Grid Layer:
            </span>
            {LAYER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeDataLayer(opt.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  activeDataLayer === opt.id
                    ? 'bg-[#0F5132] text-white'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={containerRef} className={`w-full ${heightClass}`} />

      <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Active Layer ({activeDataLayer.toUpperCase()}):
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" aria-hidden="true" /> Low / Good
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600" aria-hidden="true" /> Moderate
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600" aria-hidden="true" /> High / Elevated
          </span>
        </div>
        <span>
          Real 3×3 Open-Meteo grid points + live RainViewer radar tiles. Continuous synthetic pollutant heatmaps are never fabricated.
        </span>
      </div>
    </div>
  );
}

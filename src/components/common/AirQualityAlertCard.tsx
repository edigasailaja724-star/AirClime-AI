import {
  BellOff,
  BellRing,
  CheckCircle2,
  Clock,
  LocateFixed,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  AirQualityData,
  AqiStandard,
  LocationInfo,
  ModuleId,
  NotificationPermissionState,
} from '../../types/environment';
import type { GeoPermissionState } from '../../hooks/useEnvironment';
import { AQI_STANDARD_OPTIONS, identifyMainPollutant, type AqiAlertEvaluation } from '../../utils/airQuality';

interface AirQualityAlertCardProps {
  location: LocationInfo;
  airQuality: AirQualityData | null;
  aqLoading: boolean;
  evaluation: AqiAlertEvaluation;
  alertsEnabled: boolean;
  standard: AqiStandard;
  threshold: number;
  isThresholdBreached: boolean;
  notificationPermission: NotificationPermissionState;
  geoState: GeoPermissionState;
  onEnableAlerts: () => void;
  onDisableAlerts: () => void;
  onChangeStandard: (standard: AqiStandard) => void;
  onUseMyLocation: () => void;
  onNavigate: (id: ModuleId) => void;
}

const FIVE_TIER_LEGEND = [
  { label: 'Good', swatch: 'bg-emerald-600' },
  { label: 'Moderate', swatch: 'bg-yellow-500' },
  { label: 'Sensitive', swatch: 'bg-orange-500' },
  { label: 'Unhealthy', swatch: 'bg-red-600' },
  { label: 'Severe', swatch: 'bg-red-900' },
];

export function AirQualityAlertCard({
  location,
  airQuality,
  aqLoading,
  evaluation,
  alertsEnabled,
  standard,
  threshold,
  isThresholdBreached,
  notificationPermission,
  geoState,
  onEnableAlerts,
  onDisableAlerts,
  onChangeStandard,
  onUseMyLocation,
  onNavigate,
}: AirQualityAlertCardProps) {
  const current = airQuality?.current;
  const mainPol = identifyMainPollutant(current);
  const updatedTimeText = current?.time
    ? new Date(current.time).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unavailable';

  const pollutants = [
    { label: 'PM2.5', value: current?.pm2_5, unit: 'µg/m³' },
    { label: 'PM10', value: current?.pm10, unit: 'µg/m³' },
    { label: 'O₃', value: current?.ozone, unit: 'µg/m³' },
    { label: 'NO₂', value: current?.nitrogen_dioxide, unit: 'µg/m³' },
    { label: 'SO₂', value: current?.sulphur_dioxide, unit: 'µg/m³' },
    { label: 'CO', value: current?.carbon_monoxide, unit: 'µg/m³' },
  ];

  return (
    <section
      aria-label="Live Air Quality Alert Card"
      className={`rounded-2xl border ${evaluation.borderClass} ${evaluation.surfaceClass} p-5 sm:p-6 transition-colors`}
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
        {/* Left: Status, Score, Standard, Precautions */}
        <div className="space-y-3.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${evaluation.labelBadgeClass}`}
            >
              {isThresholdBreached ? (
                <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {evaluation.category}
            </span>

            <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded border border-slate-300/80 dark:border-slate-700 bg-white/75 dark:bg-slate-900/60">
              {evaluation.standardLabel} ({evaluation.standardScale})
            </span>

            <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
              <Clock className="w-3 h-3" aria-hidden="true" />
              Updated: {updatedTimeText}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold font-mono tabular-nums ${evaluation.textClass}`}>
                {aqLoading && evaluation.value == null
                  ? '...'
                  : evaluation.value != null
                    ? evaluation.value
                    : 'N/A'}
              </span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {evaluation.standardLabel}
              </span>
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300">
              Area: <strong>{location.name}</strong>
              {location.admin1 ? `, ${location.admin1}` : ''}
              {' · '}
              Main pollutant:{' '}
              <strong className="font-mono">
                {mainPol.symbol}
                {mainPol.value != null ? ` (${mainPol.value.toFixed(1)} ${mainPol.unit})` : ''}
              </strong>
            </div>
          </div>

          {/* 6 Monitored Pollutants Strip */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {pollutants.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/70 px-2.5 py-2"
              >
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  {item.label}
                </p>
                <p className="text-xs font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                  {item.value != null ? item.value.toFixed(1) : 'N/A'}
                </p>
                <p className="text-[10px] text-slate-400">{item.unit}</p>
              </div>
            ))}
          </div>

          {/* Deterministic Precautions */}
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/65 p-3.5 text-xs space-y-1">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {isThresholdBreached
                ? `Alert Threshold Reached (≥ ${threshold} ${evaluation.standardLabel})`
                : `Alert Monitoring (Threshold: ≥ ${threshold} ${evaluation.standardLabel})`}
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-700 dark:text-slate-300">
              {evaluation.precautions.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Location, Standard Toggle, Enable/Disable Alerts */}
        <div className="w-full lg:w-72 shrink-0 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white/90 dark:bg-slate-900/80 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              Automatic AQI Alerts
            </span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                alertsEnabled
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {alertsEnabled ? 'Active' : 'Off'}
            </span>
          </div>

          {/* Standard selector */}
          <div className="space-y-1">
            <label
              htmlFor="discover-aqi-standard"
              className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block"
            >
              AQI Standard
            </label>
            <select
              id="discover-aqi-standard"
              value={standard}
              onChange={(e) => onChangeStandard(e.target.value as AqiStandard)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer"
            >
              {AQI_STANDARD_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} ({opt.scale})
                </option>
              ))}
            </select>
          </div>

          {/* Primary Controls */}
          <div className="space-y-2">
            {!alertsEnabled ? (
              <button
                type="button"
                onClick={onEnableAlerts}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-[#0F5132] hover:bg-[#0c4128] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
                Enable Alerts
              </button>
            ) : (
              <button
                type="button"
                onClick={onDisableAlerts}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-xs font-semibold transition-colors cursor-pointer"
              >
                <BellOff className="w-3.5 h-3.5" aria-hidden="true" />
                Disable Alerts
              </button>
            )}

            {geoState !== 'granted' && (
              <button
                type="button"
                onClick={onUseMyLocation}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <LocateFixed className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
                Use My Location
              </button>
            )}
          </div>

          {notificationPermission === 'denied' && (
            <p className="text-[11px] leading-snug text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg p-2">
              Browser notifications are blocked. In-website alert banners and session alert logs remain active.
            </p>
          )}

          {notificationPermission === 'unsupported' && (
            <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-400">
              Browser notifications are unsupported here. In-website banners remain active.
            </p>
          )}

          <div className="pt-1 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 dark:text-slate-400">
              {FIVE_TIER_LEGEND.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${item.swatch}`} aria-hidden="true" />
                  {item.label}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">
                Runs while open · 15m auto-refresh
              </span>
              <button
                type="button"
                onClick={() => onNavigate('alert-center')}
                className="inline-flex items-center gap-1 font-semibold text-[#0F5132] dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
              >
                <SlidersHorizontal className="w-3 h-3" aria-hidden="true" />
                Alert Center
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

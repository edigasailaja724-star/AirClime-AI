import { useState } from 'react';
import {
  AlertTriangle,
  BellOff,
  BellRing,
  CheckCircle2,
  Clock,
  LocateFixed,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import type {
  AirQualityAlertRecord,
  AirQualityData,
  AlertCategory,
  AqiStandard,
  LocationInfo,
  NotificationPermissionState,
  WeatherAlert,
} from '../types/environment';
import type { GeoPermissionState } from '../hooks/useEnvironment';
import {
  AQI_STANDARD_OPTIONS,
  identifyMainPollutant,
  type AqiAlertEvaluation,
} from '../utils/airQuality';

interface AlertCenterPageProps {
  location: LocationInfo;
  airQuality: AirQualityData | null;
  alerts: WeatherAlert[];
  officialFeedAvailable: boolean;
  alertsSource: string;
  geoState: GeoPermissionState;
  autoRefreshIntervalMinutes: number;
  aqAlertEvaluation: AqiAlertEvaluation;
  aqAlertsEnabled: boolean;
  aqStandard: AqiStandard;
  aqThreshold: number;
  aqThresholdBreached: boolean;
  notificationPermission: NotificationPermissionState;
  sessionAqAlerts: AirQualityAlertRecord[];
  onEnableAqAlerts: () => void;
  onDisableAqAlerts: () => void;
  onChangeAqStandard: (standard: AqiStandard) => void;
  onChangeAqThreshold: (threshold: number) => void;
  onClearSessionAqAlerts: () => void;
  onUseMyLocation: () => void;
  onRefresh: () => void;
}

const CATEGORY_TABS: Array<{ id: 'all' | AlertCategory; label: string }> = [
  { id: 'all', label: 'All Alerts' },
  { id: 'air-quality', label: 'Poor Air Quality' },
  { id: 'uv', label: 'High UV' },
  { id: 'heat', label: 'Extreme Heat' },
  { id: 'rain', label: 'Heavy Rain' },
  { id: 'wind', label: 'Strong Wind' },
  { id: 'severe-weather', label: 'Severe Weather' },
];

const THRESHOLD_SPEC = [
  { category: 'Poor Air Quality (US EPA)', trigger: 'Moderate ≥ 51 / Sensitive ≥ 101 / Unhealthy ≥ 151 / Very Unhealthy ≥ 201', source: 'Open-Meteo CAMS' },
  { category: 'Poor Air Quality (European EEA)', trigger: 'Fair ≥ 21 / Moderate ≥ 41 / Poor ≥ 61 / Very Poor ≥ 81', source: 'Open-Meteo CAMS' },
  { category: 'High UV Levels', trigger: 'UV Index ≥ 8.0 (Very High) / ≥ 11.0 (Extreme)', source: 'Open-Meteo UV Model' },
  { category: 'Extreme Heat', trigger: 'Ambient Temperature ≥ 36°C (Advisory) / ≥ 41°C (Severe)', source: 'Open-Meteo Surface Temp' },
  { category: 'Heavy Rainfall', trigger: 'Rain ≥ 7.5 mm/h, Precip ≥ 10 mm/h, or WMO 65/82', source: 'Open-Meteo Precipitation' },
  { category: 'Strong Wind', trigger: 'Wind Gusts ≥ 50 km/h (Moderate) / ≥ 80 km/h (Severe)', source: 'Open-Meteo Wind Gusts' },
  { category: 'Severe Weather', trigger: 'WMO Thunderstorm / Heavy Snow / Extreme Cold ≤ -10°C / NOAA NWS (US)', source: 'NOAA NWS / Open-Meteo WMO' },
];

function getTierCardClasses(tier: AirQualityAlertRecord['tier']): string {
  switch (tier) {
    case 'good':
      return 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/75 dark:bg-emerald-950/30';
    case 'moderate':
      return 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/75 dark:bg-yellow-950/30';
    case 'sensitive':
      return 'border-orange-300 dark:border-orange-800 bg-orange-50/75 dark:bg-orange-950/30';
    case 'unhealthy':
      return 'border-red-300 dark:border-red-800 bg-red-50/75 dark:bg-red-950/35';
    case 'very-unhealthy':
      return 'border-red-500 dark:border-red-700 bg-red-100/85 dark:bg-red-950/60';
    default:
      return 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21]';
  }
}

export function AlertCenterPage({
  location,
  airQuality,
  alerts,
  officialFeedAvailable,
  alertsSource,
  geoState,
  autoRefreshIntervalMinutes,
  aqAlertEvaluation,
  aqAlertsEnabled,
  aqStandard,
  aqThreshold,
  aqThresholdBreached,
  notificationPermission,
  sessionAqAlerts,
  onEnableAqAlerts,
  onDisableAqAlerts,
  onChangeAqStandard,
  onChangeAqThreshold,
  onClearSessionAqAlerts,
  onUseMyLocation,
  onRefresh,
}: AlertCenterPageProps) {
  const [filter, setFilter] = useState<'all' | AlertCategory>('all');

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.category === filter);
  const current = airQuality?.current;
  const mainPol = identifyMainPollutant(current);
  const standardConfig =
    AQI_STANDARD_OPTIONS.find((s) => s.id === aqStandard) ?? AQI_STANDARD_OPTIONS[0];

  const permissionLabel =
    notificationPermission === 'granted'
      ? 'Browser Notifications Permitted'
      : notificationPermission === 'denied'
        ? 'Browser Notifications Blocked (In-App Fallback Active)'
        : notificationPermission === 'unsupported'
          ? 'Browser Notifications Unsupported (In-App Fallback Active)'
          : 'Permission Not Yet Requested (Asked on Enable Alerts)';

  const updatedText = current?.time
    ? new Date(current.time).toLocaleString()
    : 'Unavailable';

  return (
    <div className="space-y-7">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <BellRing className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
          <span>Environmental Alert Center</span>
          <span aria-hidden="true">·</span>
          <span>
            {location.name}
            {location.admin1 ? `, ${location.admin1}` : ''}
            {location.country ? `, ${location.country}` : ''}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Automatic Air Quality Alerts &amp; Threshold Monitor
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Configure live location-based AQI notifications alongside official NOAA NWS bulletins and deterministic weather telemetry alerts.
        </p>
      </header>

      {/* Automatic Air Quality Notification Control Panel */}
      <section
        aria-label="Automatic Air Quality Alert Controls"
        className={`rounded-2xl border ${aqAlertEvaluation.borderClass} ${aqAlertEvaluation.surfaceClass} p-5 sm:p-6 space-y-5`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${aqAlertEvaluation.labelBadgeClass}`}>
                {aqAlertEvaluation.category}
              </span>
              <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-100">
                {aqAlertEvaluation.standardLabel} ({aqAlertEvaluation.standardScale}):{' '}
                {aqAlertEvaluation.value != null ? aqAlertEvaluation.value : 'N/A'}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                <Clock className="w-3 h-3" aria-hidden="true" />
                Updated: {updatedText}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Main Pollutant: <strong>{mainPol.symbol}</strong>
              {mainPol.value != null ? ` (${mainPol.value.toFixed(1)} ${mainPol.unit})` : ''} ·{' '}
              PM2.5: <strong>{current?.pm2_5 != null ? `${current.pm2_5.toFixed(1)} µg/m³` : 'N/A'}</strong> ·{' '}
              PM10: <strong>{current?.pm10 != null ? `${current.pm10.toFixed(1)} µg/m³` : 'N/A'}</strong> ·{' '}
              O₃: <strong>{current?.ozone != null ? `${current.ozone.toFixed(1)} µg/m³` : 'N/A'}</strong> ·{' '}
              NO₂: <strong>{current?.nitrogen_dioxide != null ? `${current.nitrogen_dioxide.toFixed(1)} µg/m³` : 'N/A'}</strong> ·{' '}
              SO₂: <strong>{current?.sulphur_dioxide != null ? `${current.sulphur_dioxide.toFixed(1)} µg/m³` : 'N/A'}</strong> ·{' '}
              CO: <strong>{current?.carbon_monoxide != null ? `${current.carbon_monoxide.toFixed(1)} µg/m³` : 'N/A'}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {geoState !== 'granted' && (
              <button
                type="button"
                onClick={onUseMyLocation}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <LocateFixed className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
                Use My Location
              </button>
            )}

            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Refresh Now
            </button>

            {!aqAlertsEnabled ? (
              <button
                type="button"
                onClick={onEnableAqAlerts}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0F5132] hover:bg-[#0c4128] text-white text-xs font-semibold cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5" aria-hidden="true" />
                Enable Alerts
              </button>
            ) : (
              <button
                type="button"
                onClick={onDisableAqAlerts}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 hover:bg-rose-100 text-xs font-semibold cursor-pointer"
              >
                <BellOff className="w-3.5 h-3.5" aria-hidden="true" />
                Disable Alerts
              </button>
            )}
          </div>
        </div>

        {/* Standard, Threshold & Permission Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/75 p-4">
          <div className="space-y-1.5">
            <label
              htmlFor="alert-center-standard"
              className="text-xs font-semibold text-slate-700 dark:text-slate-200 block"
            >
              AQI Standard (Consistent Scale)
            </label>
            <select
              id="alert-center-standard"
              value={aqStandard}
              onChange={(e) => onChangeAqStandard(e.target.value as AqiStandard)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              {AQI_STANDARD_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label} ({opt.scale})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Thresholds automatically adapt to match {standardConfig.label}.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="alert-center-threshold"
              className="text-xs font-semibold text-slate-700 dark:text-slate-200 block"
            >
              Alert Trigger Threshold
            </label>
            <select
              id="alert-center-threshold"
              value={aqThreshold}
              onChange={(e) => onChangeAqThreshold(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              {standardConfig.thresholds.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {aqThresholdBreached
                ? 'Current reading exceeds this threshold.'
                : 'Alerts fire only when live AQI meets or exceeds this value.'}
            </p>
          </div>

          <div className="space-y-1.5 text-xs">
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              Delivery &amp; Monitoring Scope
            </p>
            <p className="text-slate-700 dark:text-slate-300">{permissionLabel}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Auto-refreshes every {autoRefreshIntervalMinutes} minutes while this website stays open. No background Web Push server or location history database is used.
            </p>
          </div>
        </div>

        {/* Deterministic Precautions */}
        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-slate-900/75 p-4 text-xs space-y-1.5">
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            Recommended Precautions for {location.name} ({aqAlertEvaluation.category})
          </p>
          <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
            {aqAlertEvaluation.precautions.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Active Session Air Quality Alert History */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Session Air Quality Alert History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Duplicate alerts for unchanged AQI are automatically suppressed; alerts re-trigger only on severity escalation or worsening (≥ 20 US AQI / ≥ 10 EU AQI).
            </p>
          </div>
          {sessionAqAlerts.length > 0 && (
            <button
              type="button"
              onClick={onClearSessionAqAlerts}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              Clear Session Log
            </button>
          )}
        </div>

        {sessionAqAlerts.length === 0 ? (
          <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 text-xs text-slate-600 dark:text-slate-300">
            {aqAlertsEnabled
              ? `Monitoring is active for ${location.name}. No threshold breaches have fired in this session yet.`
              : 'Click "Enable Alerts" above to start real-time session air quality alerting.'}
          </div>
        ) : (
          <div className="space-y-3">
            {sessionAqAlerts.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 space-y-1.5 text-xs ${getTierCardClasses(item.tier)}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-900 dark:text-slate-100">{item.title}</p>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {new Date(item.triggeredAt).toLocaleTimeString()} ·{' '}
                    {item.deliveredVia === 'browser-notification'
                      ? 'Browser Notification + Banner'
                      : 'In-Website Banner'}
                  </span>
                </div>
                <p className="text-slate-800 dark:text-slate-200">{item.message}</p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                  {item.standardLabel}: {item.aqiValue} ({item.category}) · Main pollutant: {item.mainPollutant} · Observation: {new Date(item.updatedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Source Transparency Banner */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span>
          <strong>Active Feed Status:</strong>{' '}
          {officialFeedAvailable
            ? `Official government bulletins active via ${alertsSource} plus calculated telemetry thresholds.`
            : `Official NOAA NWS feed covers US coordinates only. For ${location.name}, AirClime evaluates live Open-Meteo telemetry thresholds without inventing government warnings.`}
        </span>
        <span className="font-mono tabular-nums text-slate-500 shrink-0">{alerts.length} active</span>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filter === tab.id
                ? 'bg-[#0F5132] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Telemetry & Official Alerts List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/60 dark:bg-emerald-950/30 p-6 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs space-y-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              No Active Alerts in This Category
            </p>
            <p className="text-slate-600 dark:text-slate-300">
              Current live readings for {location.name} do not exceed the alert thresholds for{' '}
              {CATEGORY_TABS.find((t) => t.id === filter)?.label}.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((a) => (
            <div
              key={a.id}
              className={`rounded-xl border p-5 space-y-3 ${
                a.severity === 'severe'
                  ? 'border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30'
                  : a.severity === 'moderate'
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21]'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      a.severity === 'severe' ? 'text-rose-600' : 'text-amber-600'
                    }`}
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{a.title}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Category: {a.category} · Severity: {a.severity.toUpperCase()} · Location: {location.name}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {a.effective ? new Date(a.effective).toLocaleString() : 'Current observation'}
                </span>
              </div>

              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{a.headline}</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{a.description}</p>
              {a.instruction && (
                <div className="rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 p-3 text-xs">
                  <strong>Recommended Precaution:</strong> {a.instruction}
                </div>
              )}
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Source: {a.source} ({a.kind === 'official-bulletin' ? 'Official Government Warning' : 'Calculated Telemetry Threshold'})
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Threshold Specification Table */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
          <ShieldAlert className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
          <span>Alert Threshold Methodology</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="text-left py-2 font-medium">Category</th>
                <th className="text-left py-2 font-medium">Trigger Criteria</th>
                <th className="text-left py-2 font-medium">Data Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {THRESHOLD_SPEC.map((row) => (
                <tr key={row.category}>
                  <td className="py-2 font-medium text-slate-900 dark:text-slate-100">{row.category}</td>
                  <td className="py-2 text-slate-600 dark:text-slate-300">{row.trigger}</td>
                  <td className="py-2 font-mono text-[11px] text-slate-500">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Compass,
  Droplets,
  Gauge,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
} from 'lucide-react';
import type {
  AirQualityData,
  AqiStandard,
  ChatLanguage,
  LocationInfo,
  ModuleId,
  NotificationPermissionState,
  UnitSystem,
  WeatherAlert,
  WeatherData,
} from '../types/environment';
import type { GeoPermissionState } from '../hooks/useEnvironment';
import {
  computeBestOutdoorWindow,
  getEuropeanAqiLabel,
  getUsAqiCategory,
  identifyMainPollutant,
  type AqiAlertEvaluation,
} from '../utils/airQuality';
import {
  compassDirection,
  computeWeatherComfortIndex,
  describeUvIndex,
  describeWmoCode,
  formatTemp,
  formatWindSpeed,
} from '../utils/weather';
import {
  formatLocationClock,
  getGreetingForLanguage,
  getLocalHourInTimezone,
  MODULE_LABELS_I18N,
} from '../utils/i18n';
import { WeatherIcon } from '../components/common/WeatherIcon';
import { AirClimeLogo } from '../components/common/AirClimeLogo';
import { AirQualityAlertCard } from '../components/common/AirQualityAlertCard';
import { CardSkeleton, ErrorNotice } from '../components/common/Skeletons';
import { AnimatedAqiGauge } from '../components/visualizations/AnimatedAqiGauge';
import { AnimatedWeatherScene } from '../components/visualizations/AnimatedWeatherScene';
import { NAV_ITEMS } from '../components/layout/AppShell';

interface DiscoverPageProps {
  location: LocationInfo;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  alerts: WeatherAlert[];
  weatherLoading: boolean;
  aqLoading: boolean;
  weatherError: string | null;
  aqError: string | null;
  units: UnitSystem;
  language: ChatLanguage;
  geoState: GeoPermissionState;
  aqAlertEvaluation: AqiAlertEvaluation;
  aqAlertsEnabled: boolean;
  aqStandard: AqiStandard;
  aqThreshold: number;
  aqThresholdBreached: boolean;
  notificationPermission: NotificationPermissionState;
  onEnableAqAlerts: () => void;
  onDisableAqAlerts: () => void;
  onChangeAqStandard: (standard: AqiStandard) => void;
  onUseMyLocation: () => void;
  onNavigate: (id: ModuleId) => void;
  onRetry: () => void;
}

export function DiscoverPage({
  location,
  weather,
  airQuality,
  alerts,
  weatherLoading,
  aqLoading,
  weatherError,
  aqError,
  units,
  language,
  geoState,
  aqAlertEvaluation,
  aqAlertsEnabled,
  aqStandard,
  aqThreshold,
  aqThresholdBreached,
  notificationPermission,
  onEnableAqAlerts,
  onDisableAqAlerts,
  onChangeAqStandard,
  onUseMyLocation,
  onNavigate,
  onRetry,
}: DiscoverPageProps) {
  const [clockText, setClockText] = useState(() => formatLocationClock(weather?.timezone));

  useEffect(() => {
    setClockText(formatLocationClock(weather?.timezone));
    const timer = setInterval(() => {
      setClockText(formatLocationClock(weather?.timezone));
    }, 1000);
    return () => clearInterval(timer);
  }, [weather?.timezone]);

  const localHour = getLocalHourInTimezone(weather?.timezone);
  const greeting = getGreetingForLanguage(language, localHour);
  const localizedModuleNames = MODULE_LABELS_I18N[language];

  const usAqi = airQuality?.current.us_aqi ?? null;
  const euAqi = airQuality?.current.european_aqi ?? null;
  const aqiInfo = getUsAqiCategory(usAqi);
  const mainPol = identifyMainPollutant(airQuality?.current);
  const wmo = describeWmoCode(weather?.current.weather_code);
  const comfort = computeWeatherComfortIndex(weather);
  const uv = weather?.daily.uv_index_max?.[0] ?? airQuality?.current.uv_index ?? null;
  const uvInfo = describeUvIndex(uv);

  const sunriseRaw = weather?.daily.sunrise?.[0];
  const sunsetRaw = weather?.daily.sunset?.[0];
  const sunriseStr = sunriseRaw
    ? new Date(sunriseRaw).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';
  const sunsetStr = sunsetRaw
    ? new Date(sunsetRaw).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const outdoorWindow = computeBestOutdoorWindow(airQuality?.hourly, weather?.hourly);

  if (weatherLoading && aqLoading && !weather && !airQuality) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-8 text-center space-y-5">
        <AirClimeLogo variant="stacked" size="lg" animated showTagline />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Loading Live Environmental Telemetry
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Fetching real-time air quality, solar, and weather data for {location.name}...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Hero Overview */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 dark:from-[#0F241D] dark:via-[#11191D] dark:to-[#131C21] p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <Compass className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
              <span className="font-semibold text-[#0F5132] dark:text-emerald-400">{greeting}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <Clock className="w-3 h-3" aria-hidden="true" />
                {clockText}
              </span>
              {weather?.timezone && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{weather.timezone}</span>
                </>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
              {location.name}
              {location.admin1 ? `, ${location.admin1}` : ''}
              {location.country ? `, ${location.country}` : ''}
            </h1>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {aqLoading && weatherLoading
                ? 'Loading live atmospheric and meteorological conditions...'
                : `${wmo.label} at ${formatTemp(weather?.current.temperature_2m, units)}. US Air Quality Index is ${usAqi != null ? Math.round(usAqi) : 'unavailable'} (${aqiInfo.label})${comfort.score != null ? ` · Comfort Index ${comfort.score}/100 (${comfort.label})` : ''}.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('air-intelligence')}
              className="px-4 py-2.5 rounded-lg bg-[#0F5132] hover:bg-[#0c4128] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              Air Command Center
            </button>
            <button
              type="button"
              onClick={() => onNavigate('sunlight')}
              className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              Sunlight &amp; Solar
            </button>
            <button
              type="button"
              onClick={() => onNavigate('earthscope')}
              className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              EarthScope Map
            </button>
          </div>
        </div>
      </section>

      {/* Errors if any */}
      {(weatherError || aqError) && (
        <div className="space-y-3">
          {weatherError && <ErrorNotice title="Weather Feed Issue" message={weatherError} onRetry={onRetry} />}
          {aqError && <ErrorNotice title="Air Quality Feed Issue" message={aqError} onRetry={onRetry} />}
        </div>
      )}

      {/* Primary KPI Grid */}
      <section aria-label="Current environmental telemetry" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* AQI Card */}
        {aqLoading ? (
          <CardSkeleton />
        ) : (
          <div className={`rounded-xl border ${aqiInfo.borderClass} ${aqiInfo.surfaceClass} p-5`}>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-2">
              <span className="font-medium">US Air Quality Index</span>
              <Gauge className="w-4 h-4 opacity-70" aria-hidden="true" />
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className={`text-3xl font-bold font-mono tabular-nums ${aqiInfo.textClass}`}>
                {usAqi != null ? Math.round(usAqi) : 'N/A'}
              </span>
              <span className={`text-xs font-semibold ${aqiInfo.textClass}`}>{aqiInfo.label}</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 font-mono tabular-nums">
              EU AQI: {euAqi != null ? `${Math.round(euAqi)} (${getEuropeanAqiLabel(euAqi)})` : 'N/A'} · PM2.5:{' '}
              {airQuality?.current.pm2_5 != null ? `${airQuality.current.pm2_5.toFixed(1)} µg/m³` : 'N/A'}
            </p>
          </div>
        )}

        {/* Temperature Card */}
        {weatherLoading ? (
          <CardSkeleton />
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-medium">Temperature</span>
              <WeatherIcon code={weather?.current.weather_code} className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                {formatTemp(weather?.current.temperature_2m, units)}
              </span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{wmo.label}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono tabular-nums">
              Feels like {formatTemp(weather?.current.apparent_temperature, units)} · H:{' '}
              {formatTemp(weather?.daily.temperature_2m_max?.[0], units)} / L:{' '}
              {formatTemp(weather?.daily.temperature_2m_min?.[0], units)}
            </p>
          </div>
        )}

        {/* Humidity & UV */}
        {weatherLoading ? (
          <CardSkeleton />
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-medium">Humidity &amp; UV</span>
              <Droplets className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                {weather?.current.relative_humidity_2m != null ? `${Math.round(weather.current.relative_humidity_2m)}%` : 'N/A'}
              </span>
              <span className={`text-xs font-medium ${uvInfo.textClass}`}>
                UV {uv != null ? uv.toFixed(1) : 'N/A'} ({uvInfo.label})
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
              {uvInfo.guidance}
            </p>
          </div>
        )}

        {/* Wind & Solar */}
        {weatherLoading ? (
          <CardSkeleton />
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-medium">Wind &amp; Solar</span>
              <Wind className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-50">
                {formatWindSpeed(weather?.current.wind_speed_10m, units)}
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                {compassDirection(weather?.current.wind_direction_10m)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono tabular-nums">
              <span className="inline-flex items-center gap-1">
                <Sunrise className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" /> {sunriseStr}
              </span>
              <span className="inline-flex items-center gap-1">
                <Sunset className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" /> {sunsetStr}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Live Location-Based Air Quality Alert Card */}
      <AirQualityAlertCard
        location={location}
        airQuality={airQuality}
        aqLoading={aqLoading}
        evaluation={aqAlertEvaluation}
        alertsEnabled={aqAlertsEnabled}
        standard={aqStandard}
        threshold={aqThreshold}
        isThresholdBreached={aqThresholdBreached}
        notificationPermission={notificationPermission}
        geoState={geoState}
        onEnableAlerts={onEnableAqAlerts}
        onDisableAlerts={onDisableAqAlerts}
        onChangeStandard={onChangeAqStandard}
        onUseMyLocation={onUseMyLocation}
        onNavigate={onNavigate}
      />

      {/* Live Visualizers: Animated AQI Gauge + Animated Weather Scene */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <AnimatedAqiGauge
            usAqi={usAqi}
            dominantPollutant={mainPol.symbol !== 'Unavailable' ? mainPol.symbol : undefined}
          />
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 max-w-xs">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Live Atmospheric Gauge</p>
            <p className="leading-relaxed">{aqiInfo.healthSummary}</p>
            <button
              type="button"
              onClick={() => onNavigate('air-intelligence')}
              className="text-xs font-semibold text-[#0F5132] dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Open Air Quality Command Center →
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-3">
          <AnimatedWeatherScene
            weatherCode={weather?.current.weather_code}
            isDay={weather?.current.is_day}
          />
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-slate-600 dark:text-slate-300">
              Comfort Index:{' '}
              <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {comfort.score != null ? `${comfort.score}/100 (${comfort.label})` : 'Unavailable'}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigate('weather-intelligence')}
              className="font-semibold text-[#0F5132] dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
            >
              Full Outlook →
            </button>
          </div>
        </div>
      </section>

      {/* Environmental Alerts & Insights */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Active Environmental Alerts
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('alert-center')}
              className="text-xs font-mono tabular-nums text-[#0F5132] dark:text-emerald-400 hover:underline cursor-pointer"
            >
              {alerts.length} active · Open Alert Center
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 p-4 text-xs text-emerald-900 dark:text-emerald-200">
              No severe weather bulletins or high-pollution threshold alerts are currently active for {location.name}.
            </div>
          ) : (
            <ul className="space-y-3">
              {alerts.slice(0, 4).map((alert) => (
                <li
                  key={alert.id}
                  className={`rounded-lg border p-3.5 ${
                    alert.severity === 'severe'
                      ? 'border-rose-200 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30'
                      : 'border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                        alert.severity === 'severe' ? 'text-rose-600' : 'text-amber-600'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{alert.title}</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{alert.headline}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Source: {alert.source}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Today&apos;s Environmental Insights
          </h2>
          <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                Forecasted Outdoor Window
              </p>
              <p>{outdoorWindow.summary}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
              <p className="font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                Health &amp; Exposure Context
              </p>
              <p>{aqiInfo.healthSummary} {aqiInfo.sensitiveGuidance}</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Sources: {weather?.source ?? 'Open-Meteo Weather'} · {airQuality?.source ?? 'Open-Meteo Air Quality (CAMS)'}
          </p>
        </div>
      </section>

      {/* Quick Module Access */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            AirClime Intelligence Modules
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">Select any module to explore live tools</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {NAV_ITEMS.filter((item) => item.id !== 'discover').map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className="group text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] hover:border-emerald-500/70 p-4 transition-colors cursor-pointer flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center mb-2.5">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {localizedModuleNames[item.id] || item.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.shortDesc}</p>
                </div>
                <ArrowRight
                  className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5 shrink-0 mt-1"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

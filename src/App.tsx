import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChatLanguage,
  ChatMessage,
  ComparisonSnapshot,
  LocationInfo,
  ModuleId,
} from './types/environment';
import { usePreferences } from './hooks/usePreferences';
import { useEnvironment } from './hooks/useEnvironment';
import { useAirQualityAlerts } from './hooks/useAirQualityAlerts';
import { fetchAirQualityData, fetchWeatherData, streamAirClimeAiMessage } from './services/api';
import { computeWeatherComfortIndex, describeWmoCode } from './utils/weather';
import { getUsAqiCategory, identifyMainPollutant } from './utils/airQuality';
import { formatMinutesAsHm } from './utils/solar';
import { AppShell } from './components/layout/AppShell';
import { CommandPalette } from './components/common/CommandPalette';
import { FloatingAtmosWidget } from './components/chatbot/AtmosAiWidget';
import { DiscoverPage } from './pages/DiscoverPage';
import { AirIntelligencePage } from './pages/AirIntelligencePage';
import { SunlightPage } from './pages/SunlightPage';
import { WeatherIntelligencePage } from './pages/WeatherIntelligencePage';
import { EarthScopePage } from './pages/EarthScopePage';
import { RadarPage } from './pages/RadarPage';
import { AtmosAiPage } from './pages/AtmosAiPage';
import { LifeSyncPage } from './pages/LifeSyncPage';
import { AtmosComparePage } from './pages/AtmosComparePage';
import { EcoSmartPage } from './pages/EcoSmartPage';
import { DailyReportPage } from './pages/DailyReportPage';
import { AlertCenterPage } from './pages/AlertCenterPage';
import { DataLabPage } from './pages/DataLabPage';

const INITIAL_COMPARE_CITIES: LocationInfo[] = [
  { name: 'London', country: 'United Kingdom', latitude: 51.5085, longitude: -0.1257 },
  { name: 'Hyderabad', country: 'India', latitude: 17.385, longitude: 78.4867 },
];

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('discover');
  const { theme, toggleTheme, units, toggleUnits } = usePreferences();
  const env = useEnvironment();
  const aqAlerts = useAirQualityAlerts(env.location, env.airQuality);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);

  // Global Ctrl/Cmd + K shortcut to open CommandPalette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // AtmosCompare state (managed at App level so AirClime-ai, SunlightPage, and EarthScope share it)
  const [compareSnapshots, setCompareSnapshots] = useState<ComparisonSnapshot[]>(() =>
    INITIAL_COMPARE_CITIES.map((loc) => ({
      location: loc,
      weather: null,
      airQuality: null,
      loading: true,
      error: null,
    })),
  );

  const loadSnapshotForCity = useCallback(async (loc: LocationInfo, index: number) => {
    const [wRes, aqRes] = await Promise.allSettled([
      fetchWeatherData(loc.latitude, loc.longitude),
      fetchAirQualityData(loc.latitude, loc.longitude),
    ]);

    setCompareSnapshots((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const weather = wRes.status === 'fulfilled' ? wRes.value : null;
        const airQuality = aqRes.status === 'fulfilled' ? aqRes.value : null;
        const error =
          !weather && !airQuality ? 'Failed to fetch environmental telemetry for this city.' : null;
        return { ...item, weather, airQuality, loading: false, error };
      }),
    );
  }, []);

  useEffect(() => {
    INITIAL_COMPARE_CITIES.forEach((city, idx) => {
      void loadSnapshotForCity(city, idx);
    });
  }, [loadSnapshotForCity]);

  const handleAddCompareCity = useCallback(
    (loc: LocationInfo) => {
      setCompareSnapshots((prev) => {
        if (prev.length >= 4) return prev;
        const duplicate = prev.some(
          (s) =>
            Math.abs(s.location.latitude - loc.latitude) < 0.05 &&
            Math.abs(s.location.longitude - loc.longitude) < 0.05,
        );
        if (duplicate) return prev;
        const nextIdx = prev.length;
        void loadSnapshotForCity(loc, nextIdx);
        return [...prev, { location: loc, weather: null, airQuality: null, loading: true, error: null }];
      });
    },
    [loadSnapshotForCity],
  );

  const handleRemoveCompareCity = useCallback((index: number) => {
    setCompareSnapshots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // AirClime-ai shared session state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLanguage, setChatLanguage] = useState<ChatLanguage>('en');
  const [chatSending, setChatSending] = useState<boolean>(false);
  const [floatingChatOpen, setFloatingChatOpen] = useState<boolean>(false);
  const chatInFlightRef = useRef<boolean>(false);

  const liveLocationContext = useMemo(() => {
    const tomorrowIdx = env.weather?.daily.time?.[1] ? 1 : 0;
    const nowIdx = env.weather?.hourly.time.findIndex((t) => Date.parse(t) >= Date.now() - 3600 * 1000) ?? 0;
    const safeIdx = nowIdx >= 0 ? nowIdx : 0;
    const mainPol = identifyMainPollutant(env.airQuality?.current);
    const comfort = computeWeatherComfortIndex(env.weather);
    const daylightSec = env.weather?.daily.daylight_duration?.[0] ?? null;

    return {
      location: {
        name: env.location.name,
        admin1: env.location.admin1 || null,
        country: env.location.country,
        latitude: Number(env.location.latitude.toFixed(4)),
        longitude: Number(env.location.longitude.toFixed(4)),
        timezone: env.weather?.timezone ?? env.location.timezone ?? null,
      },
      preferredUnits: units,
      airQuality: env.airQuality
        ? {
            source: env.airQuality.source,
            observationTime: env.airQuality.current.time,
            usAqi: env.airQuality.current.us_aqi,
            usAqiCategory: getUsAqiCategory(env.airQuality.current.us_aqi).label,
            europeanAqi: env.airQuality.current.european_aqi,
            dominantPollutant: mainPol.symbol,
            pm2_5_ugm3: env.airQuality.current.pm2_5,
            pm10_ugm3: env.airQuality.current.pm10,
            no2_ugm3: env.airQuality.current.nitrogen_dioxide,
            o3_ugm3: env.airQuality.current.ozone,
            so2_ugm3: env.airQuality.current.sulphur_dioxide,
            co_ugm3: env.airQuality.current.carbon_monoxide,
          }
        : null,
      weather: env.weather
        ? {
            source: env.weather.source,
            observationTime: env.weather.current.time,
            temperatureC: env.weather.current.temperature_2m,
            apparentTemperatureC: env.weather.current.apparent_temperature,
            humidityPercent: env.weather.current.relative_humidity_2m,
            windSpeedKmh: env.weather.current.wind_speed_10m,
            windGustsKmh: env.weather.current.wind_gusts_10m,
            precipitationMm: env.weather.current.precipitation,
            cloudCoverPercent: env.weather.current.cloud_cover,
            pressureHpa: env.weather.current.pressure_msl,
            condition: describeWmoCode(env.weather.current.weather_code).label,
            comfortIndexScore: comfort.score,
            comfortIndexLabel: comfort.label,
            tomorrowForecast: env.weather.daily.time[tomorrowIdx]
              ? {
                  date: env.weather.daily.time[tomorrowIdx],
                  tempMaxC: env.weather.daily.temperature_2m_max[tomorrowIdx],
                  tempMinC: env.weather.daily.temperature_2m_min[tomorrowIdx],
                  precipProbMaxPercent: env.weather.daily.precipitation_probability_max[tomorrowIdx],
                  condition: describeWmoCode(env.weather.daily.weather_code[tomorrowIdx]).label,
                }
              : null,
          }
        : null,
      sunlight: env.weather
        ? {
            sunrise: env.weather.daily.sunrise?.[0] ?? null,
            sunset: env.weather.daily.sunset?.[0] ?? null,
            daylightDuration: daylightSec != null ? formatMinutesAsHm(Math.round(daylightSec / 60)) : null,
            currentUvIndex: env.weather.hourly.uv_index?.[safeIdx] ?? env.airQuality?.current.uv_index ?? null,
            peakUvToday: env.weather.daily.uv_index_max?.[0] ?? null,
            shortwaveRadiationWm2: env.weather.hourly.shortwave_radiation?.[safeIdx] ?? null,
            directRadiationWm2: env.weather.hourly.direct_radiation?.[safeIdx] ?? null,
            diffuseRadiationWm2: env.weather.hourly.diffuse_radiation?.[safeIdx] ?? null,
          }
        : null,
      activeAlerts: env.alerts.map((a) => ({
        title: a.title,
        category: a.category,
        severity: a.severity,
        headline: a.headline,
        source: a.source,
      })),
    };
  }, [env.location, env.airQuality, env.weather, env.alerts, units]);

  const liveComparisonContext = useMemo(
    () =>
      compareSnapshots
        .filter((s) => !s.loading && (s.airQuality || s.weather))
        .map((s) => ({
          city: `${s.location.name}, ${s.location.country}`,
          usAqi: s.airQuality?.current.us_aqi ?? null,
          pm2_5: s.airQuality?.current.pm2_5 ?? null,
          temperatureC: s.weather?.current.temperature_2m ?? null,
          humidityPercent: s.weather?.current.relative_humidity_2m ?? null,
          windSpeedKmh: s.weather?.current.wind_speed_10m ?? null,
          uvIndexMax: s.weather?.daily.uv_index_max?.[0] ?? null,
        })),
    [compareSnapshots],
  );

  const runAssistantStream = useCallback(
    async (cleanHistory: ChatMessage[], targetModelMsgId: string) => {
      if (chatInFlightRef.current) return;
      chatInFlightRef.current = true;
      setChatSending(true);
      try {
        const res = await streamAirClimeAiMessage(
          {
            messages: cleanHistory,
            language: chatLanguage,
            locationContext: liveLocationContext,
            comparisonContext: liveComparisonContext,
          },
          (accumulated) => {
            setChatMessages((prev) =>
              prev.map((m) =>
                m.id === targetModelMsgId ? { ...m, content: accumulated, error: false } : m,
              ),
            );
          },
        );
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === targetModelMsgId
              ? {
                  ...m,
                  content: res.reply,
                  timestamp: res.timestamp || new Date().toISOString(),
                  error: false,
                }
              : m,
          ),
        );
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'AirClime-ai is temporarily unavailable. Other AirClime modules continue working normally.';
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === targetModelMsgId
              ? {
                  ...m,
                  content: errorMessage,
                  timestamp: new Date().toISOString(),
                  error: true,
                }
              : m,
          ),
        );
      } finally {
        chatInFlightRef.current = false;
        setChatSending(false);
      }
    },
    [chatLanguage, liveLocationContext, liveComparisonContext],
  );

  const handleSendChat = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || chatSending || chatInFlightRef.current) return;
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
        language: chatLanguage,
      };
      const modelMsgId = `m-${Date.now() + 1}`;
      const placeholderModelMsg: ChatMessage = {
        id: modelMsgId,
        role: 'model',
        content: '',
        timestamp: new Date().toISOString(),
        language: chatLanguage,
      };
      const validHistory = chatMessages.filter((m) => !m.error && m.content.trim().length > 0);
      const nextHistory = [...validHistory, userMsg];
      setChatMessages([...chatMessages, userMsg, placeholderModelMsg]);
      await runAssistantStream(nextHistory, modelMsgId);
    },
    [chatLanguage, chatMessages, chatSending, runAssistantStream],
  );

  const handleRetryChat = useCallback(
    async (failedModelMsgId: string) => {
      if (chatSending || chatInFlightRef.current) return;
      const failedIdx = chatMessages.findIndex((m) => m.id === failedModelMsgId);
      if (failedIdx < 0) return;

      const historyUpToPrompt = chatMessages
        .slice(0, failedIdx)
        .filter((m) => !m.error && m.content.trim().length > 0);
      if (historyUpToPrompt.length === 0) return;

      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === failedModelMsgId
            ? { ...m, content: '', error: false, timestamp: new Date().toISOString() }
            : m,
        ),
      );
      await runAssistantStream(historyUpToPrompt, failedModelMsgId);
    },
    [chatMessages, chatSending, runAssistantStream],
  );

  const handleClearChat = useCallback(() => {
    setChatMessages([]);
  }, []);

  const handleTriggerAiFromPalette = useCallback(
    (prompt: string) => {
      setFloatingChatOpen(true);
      void handleSendChat(prompt);
    },
    [handleSendChat],
  );

  const lastUpdated = env.weather?.fetchedAt || env.airQuality?.fetchedAt || null;

  return (
    <>
      <AppShell
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        location={env.location}
        timezone={env.weather?.timezone ?? env.location.timezone}
        onSelectLocation={env.selectLocation}
        geoState={env.geoState}
        geoMessage={env.geoMessage}
        onOpenLocationPrompt={env.openLocationPrompt}
        onConfirmLocation={env.confirmAndRequestLocation}
        onCancelLocation={env.cancelLocationPrompt}
        theme={theme}
        onToggleTheme={toggleTheme}
        units={units}
        onToggleUnits={toggleUnits}
        language={chatLanguage}
        onChangeLanguage={setChatLanguage}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onRefresh={env.refresh}
        lastUpdated={lastUpdated}
        isRefreshing={env.weatherLoading || env.aqLoading}
        alertCount={env.alerts.length + (aqAlerts.isThresholdBreached ? 1 : 0)}
        sessionNotices={env.sessionNotices}
        onDismissSessionNotice={env.dismissSessionNotice}
        activeAqBanner={aqAlerts.activeBanner}
        onDismissAqBanner={aqAlerts.dismissBanner}
      >
        {activeModule === 'discover' && (
          <DiscoverPage
            location={env.location}
            weather={env.weather}
            airQuality={env.airQuality}
            alerts={env.alerts}
            weatherLoading={env.weatherLoading}
            aqLoading={env.aqLoading}
            weatherError={env.weatherError}
            aqError={env.aqError}
            units={units}
            language={chatLanguage}
            geoState={env.geoState}
            aqAlertEvaluation={aqAlerts.evaluation}
            aqAlertsEnabled={aqAlerts.alertsEnabled}
            aqStandard={aqAlerts.standard}
            aqThreshold={aqAlerts.threshold}
            aqThresholdBreached={aqAlerts.isThresholdBreached}
            notificationPermission={aqAlerts.notificationPermission}
            onEnableAqAlerts={() => void aqAlerts.enableAlerts()}
            onDisableAqAlerts={aqAlerts.disableAlerts}
            onChangeAqStandard={aqAlerts.changeStandard}
            onUseMyLocation={env.openLocationPrompt}
            onNavigate={setActiveModule}
            onRetry={env.refresh}
          />
        )}

        {activeModule === 'air-intelligence' && (
          <AirIntelligencePage
            location={env.location}
            airQuality={env.airQuality}
            weather={env.weather}
            loading={env.aqLoading}
            error={env.aqError}
            theme={theme}
            onRetry={env.refresh}
          />
        )}

        {activeModule === 'sunlight' && (
          <SunlightPage
            location={env.location}
            weather={env.weather}
            loading={env.weatherLoading}
            error={env.weatherError}
            theme={theme}
            comparisonSnapshots={compareSnapshots}
            onRetry={env.refresh}
          />
        )}

        {activeModule === 'weather-intelligence' && (
          <WeatherIntelligencePage
            location={env.location}
            weather={env.weather}
            alerts={env.alerts}
            loading={env.weatherLoading}
            error={env.weatherError}
            units={units}
            theme={theme}
            onRetry={env.refresh}
          />
        )}

        {activeModule === 'earthscope' && (
          <EarthScopePage
            location={env.location}
            weather={env.weather}
            airQuality={env.airQuality}
            radar={env.radar}
            comparisonSnapshots={compareSnapshots}
            units={units}
            theme={theme}
            onInspectCoordinates={(lat, lon) => void env.selectCoordinates(lat, lon)}
            onUseMyLocation={env.openLocationPrompt}
          />
        )}

        {activeModule === 'radar' && (
          <RadarPage
            location={env.location}
            weather={env.weather}
            airQuality={env.airQuality}
            radar={env.radar}
            alerts={env.alerts}
            radarError={env.radarError}
            units={units}
            theme={theme}
            onInspectCoordinates={(lat, lon) => void env.selectCoordinates(lat, lon)}
            onUseMyLocation={env.openLocationPrompt}
            onRetryRadar={env.refresh}
          />
        )}

        {activeModule === 'atmos-ai' && (
          <AtmosAiPage
            location={env.location}
            weather={env.weather}
            airQuality={env.airQuality}
            units={units}
            messages={chatMessages}
            language={chatLanguage}
            onChangeLanguage={setChatLanguage}
            onSendMessage={handleSendChat}
            onRetryMessage={handleRetryChat}
            onClearChat={handleClearChat}
            isSending={chatSending}
            comparisonCount={liveComparisonContext.length}
          />
        )}

        {activeModule === 'lifesync' && (
          <LifeSyncPage
            location={env.location}
            weather={env.weather}
            airQuality={env.airQuality}
            units={units}
          />
        )}

        {activeModule === 'compare' && (
          <AtmosComparePage
            snapshots={compareSnapshots}
            onAddCity={handleAddCompareCity}
            onRemoveCity={handleRemoveCompareCity}
            units={units}
            theme={theme}
            language={chatLanguage}
          />
        )}

        {activeModule === 'ecosmart' && (
          <EcoSmartPage
            location={env.location}
            weather={env.weather}
            airQuality={env.airQuality}
            units={units}
          />
        )}

        {activeModule === 'daily-report' && (
          <DailyReportPage
            location={env.location}
            weather={env.weather}
            airQuality={env.airQuality}
            alerts={env.alerts}
            units={units}
            language={chatLanguage}
          />
        )}

        {activeModule === 'alert-center' && (
          <AlertCenterPage
            location={env.location}
            airQuality={env.airQuality}
            alerts={env.alerts}
            officialFeedAvailable={env.officialFeedAvailable}
            alertsSource={env.alertsSource}
            geoState={env.geoState}
            autoRefreshIntervalMinutes={env.autoRefreshIntervalMinutes}
            aqAlertEvaluation={aqAlerts.evaluation}
            aqAlertsEnabled={aqAlerts.alertsEnabled}
            aqStandard={aqAlerts.standard}
            aqThreshold={aqAlerts.threshold}
            aqThresholdBreached={aqAlerts.isThresholdBreached}
            notificationPermission={aqAlerts.notificationPermission}
            sessionAqAlerts={aqAlerts.sessionAlerts}
            onEnableAqAlerts={() => void aqAlerts.enableAlerts()}
            onDisableAqAlerts={aqAlerts.disableAlerts}
            onChangeAqStandard={aqAlerts.changeStandard}
            onChangeAqThreshold={aqAlerts.changeThreshold}
            onClearSessionAqAlerts={aqAlerts.clearSessionAlerts}
            onUseMyLocation={env.openLocationPrompt}
            onRefresh={env.refresh}
          />
        )}

        {activeModule === 'data-lab' && (
          <DataLabPage
            location={env.location}
            weather={env.weather}
            airQuality={env.airQuality}
            units={units}
            theme={theme}
          />
        )}
      </AppShell>

      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectModule={setActiveModule}
        onSelectLocation={env.selectLocation}
        onRequestUserLocation={env.openLocationPrompt}
        onTriggerAiAction={handleTriggerAiFromPalette}
      />

      <FloatingAtmosWidget
        open={floatingChatOpen}
        onToggleOpen={() => setFloatingChatOpen((v) => !v)}
        messages={chatMessages}
        language={chatLanguage}
        onChangeLanguage={setChatLanguage}
        onSendMessage={handleSendChat}
        onRetryMessage={handleRetryChat}
        onClearChat={handleClearChat}
        isSending={chatSending}
        locationLabel={`${env.location.name}${env.location.country ? `, ${env.location.country}` : ''}`}
      />
    </>
  );
}

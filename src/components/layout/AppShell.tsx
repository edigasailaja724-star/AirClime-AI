import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  BellRing,
  Bot,
  CloudRainWind,
  Command,
  Compass,
  FileText,
  FlaskConical,
  GitCompare,
  Globe2,
  HeartPulse,
  Languages,
  Leaf,
  MapPin,
  Menu,
  Moon,
  RefreshCw,
  Sun,
  Sunrise,
  Wind,
  X,
} from 'lucide-react';
import type {
  AirQualityAlertRecord,
  ChatLanguage,
  LocationInfo,
  ModuleId,
  SessionChangeNotice,
  ThemeMode,
  UnitSystem,
} from '../../types/environment';
import type { GeoPermissionState } from '../../hooks/useEnvironment';
import { formatLocationClock, MODULE_LABELS_I18N } from '../../utils/i18n';
import { AirClimeLogo } from '../common/AirClimeLogo';
import { LocationSearch } from '../common/LocationSearch';

export interface NavItem {
  id: ModuleId;
  label: string;
  shortDesc: string;
  icon: typeof Compass;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'discover', label: 'Discover', shortDesc: 'Overview & greeting', icon: Compass },
  { id: 'air-intelligence', label: 'Air Intelligence', shortDesc: 'AQI command center', icon: Wind },
  { id: 'sunlight', label: 'Sunlight & Solar', shortDesc: 'Sun path & UV', icon: Sunrise },
  { id: 'weather-intelligence', label: 'Weather Intelligence', shortDesc: 'Hourly & 7-day', icon: Activity },
  { id: 'earthscope', label: 'EarthScope', shortDesc: 'Multi-layer map', icon: Globe2 },
  { id: 'radar', label: 'Snow & Storm Radar', shortDesc: 'Severe weather', icon: CloudRainWind },
  { id: 'atmos-ai', label: 'AirClime-ai', shortDesc: 'Gemini copilot', icon: Bot },
  { id: 'lifesync', label: 'LifeSync', shortDesc: 'Activity & wellness', icon: HeartPulse },
  { id: 'compare', label: 'AtmosCompare', shortDesc: 'Compare 4 cities', icon: GitCompare },
  { id: 'ecosmart', label: 'EcoSmart', shortDesc: 'Calculators & tips', icon: Leaf },
  { id: 'daily-report', label: 'Daily Report', shortDesc: 'Print / PDF / Share', icon: FileText },
  { id: 'alert-center', label: 'Alert Center', shortDesc: 'Thresholds & feeds', icon: BellRing },
  { id: 'data-lab', label: 'Data Lab', shortDesc: 'Charts & CSV export', icon: FlaskConical },
];

interface AppShellProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  location: LocationInfo;
  timezone?: string;
  onSelectLocation: (loc: LocationInfo) => void;
  geoState: GeoPermissionState;
  geoMessage: string | null;
  onOpenLocationPrompt: () => void;
  onConfirmLocation: () => void;
  onCancelLocation: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  units: UnitSystem;
  onToggleUnits: () => void;
  language: ChatLanguage;
  onChangeLanguage: (lang: ChatLanguage) => void;
  onOpenCommandPalette: () => void;
  onRefresh: () => void;
  lastUpdated: string | null;
  isRefreshing: boolean;
  alertCount: number;
  sessionNotices: SessionChangeNotice[];
  onDismissSessionNotice: (id: string) => void;
  activeAqBanner: AirQualityAlertRecord | null;
  onDismissAqBanner: () => void;
  children: ReactNode;
}

export function AppShell({
  activeModule,
  onSelectModule,
  location,
  timezone,
  onSelectLocation,
  geoState,
  geoMessage,
  onOpenLocationPrompt,
  onConfirmLocation,
  onCancelLocation,
  theme,
  onToggleTheme,
  units,
  onToggleUnits,
  language,
  onChangeLanguage,
  onOpenCommandPalette,
  onRefresh,
  lastUpdated,
  isRefreshing,
  alertCount,
  sessionNotices,
  onDismissSessionNotice,
  activeAqBanner,
  onDismissAqBanner,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clockText, setClockText] = useState(() => formatLocationClock(timezone));

  useEffect(() => {
    setClockText(formatLocationClock(timezone));
    const interval = setInterval(() => {
      setClockText(formatLocationClock(timezone));
    }, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  const handleNavClick = (id: ModuleId) => {
    onSelectModule(id);
    setMobileMenuOpen(false);
  };

  const localizedMap = MODULE_LABELS_I18N[language];

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-[#0E161A]">
        <button
          type="button"
          onClick={() => handleNavClick('discover')}
          aria-label="AirClime Home — Discover"
          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-xl cursor-pointer py-0.5"
        >
          <AirClimeLogo size="md" showTagline />
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav aria-label="Primary modules" className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeModule === item.id;
          const displayLabel = localizedMap[item.id] || item.label;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                active
                  ? 'bg-[#0F5132] text-white dark:bg-emerald-700'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-200' : 'text-slate-500 dark:text-slate-400'}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium leading-tight truncate">{displayLabel}</p>
                  {item.id === 'alert-center' && alertCount > 0 && (
                    <span
                      className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {alertCount}
                    </span>
                  )}
                </div>
                <p
                  className={`text-[11px] truncate ${
                    active ? 'text-emerald-100/90' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {item.shortDesc}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onToggleUnits}
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            {units === 'metric' ? '°C · km/h' : '°F · mph'}
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 bg-white dark:bg-slate-900">
          <Languages className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
          <select
            aria-label="Interface language"
            value={language}
            onChange={(e) => onChangeLanguage(e.target.value as ChatLanguage)}
            className="w-full text-xs bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
          >
            <option value="en" className="bg-white dark:bg-slate-900">English</option>
            <option value="te" className="bg-white dark:bg-slate-900">తెలుగు (Telugu)</option>
            <option value="hi" className="bg-white dark:bg-slate-900">हिन्दी (Hindi)</option>
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-white dark:bg-[#0B1114] text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0E161A] z-30 print:hidden">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex print:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-[#0E161A] border-r border-slate-200 dark:border-slate-800 h-full z-10">
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 print:pl-0 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-[#0B1114]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-2 -ml-1 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => handleNavClick('discover')}
                aria-label="AirClime Home — Discover"
                className="lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-xl cursor-pointer shrink-0"
              >
                <AirClimeLogo compact />
              </button>

              <div className="hidden sm:flex items-center gap-2 min-w-0 text-xs">
                <MapPin className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400 shrink-0" aria-hidden="true" />
                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[160px] md:max-w-[200px]">
                  {location.name}
                </span>
                <span className="hidden xl:inline text-slate-400" aria-hidden="true">·</span>
                <span className="hidden xl:inline font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {clockText}
                </span>
              </div>
            </div>

            <div className="flex-1 max-w-md min-w-0">
              <LocationSearch
                onSelectLocation={onSelectLocation}
                onOpenLocationPrompt={onOpenLocationPrompt}
                geoState={geoState}
                compact
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenCommandPalette}
                title="Open Quick Command Panel (Ctrl/Cmd + K)"
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
              >
                <Command className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Quick</span>
              </button>

              {lastUpdated && (
                <span className="hidden 2xl:inline text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}

              <button
                type="button"
                onClick={onRefresh}
                aria-label="Refresh environmental data"
                title="Refresh live data"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Geolocation Permission Explanation / Denial Recovery Bar */}
          {geoState === 'explaining' && (
            <div className="px-4 sm:px-6 py-3 bg-emerald-50/90 dark:bg-emerald-950/50 border-t border-emerald-200 dark:border-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-800 dark:text-slate-200">
                <span className="font-semibold">Location Permission Notice:</span> AirClime uses your browser coordinates once to load local air quality, sunlight, weather, and radar conditions. Coordinates are never saved to a database or tracked in the background.
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onCancelLocation}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmLocation}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0F5132] hover:bg-[#0c4128] text-white cursor-pointer"
                >
                  Allow Location Check
                </button>
              </div>
            </div>
          )}

          {geoMessage && (
            <div className="px-4 sm:px-6 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
              <span>{geoMessage}</span>
              <button
                type="button"
                onClick={onCancelLocation}
                className="text-xs font-medium underline shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Session Weather Change Notifications */}
          {sessionNotices.length > 0 && (
            <div className="px-4 sm:px-6 py-2 bg-sky-50 dark:bg-sky-950/40 border-t border-sky-200 dark:border-sky-900 flex items-center justify-between gap-3 text-xs text-sky-900 dark:text-sky-200">
              <span>
                <strong>Session Shift:</strong> {sessionNotices[0].message}
              </span>
              <button
                type="button"
                onClick={() => onDismissSessionNotice(sessionNotices[0].id)}
                className="text-xs underline shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Location-Based Air Quality Alert In-Website Banner */}
          {activeAqBanner && (
            <div
              role="alert"
              className={`px-4 sm:px-6 py-2.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                activeAqBanner.tier === 'very-unhealthy'
                  ? 'bg-red-900 text-white border-red-950'
                  : activeAqBanner.tier === 'unhealthy'
                    ? 'bg-red-600 text-white border-red-700'
                    : activeAqBanner.tier === 'sensitive'
                      ? 'bg-orange-500 text-white border-orange-600'
                      : activeAqBanner.tier === 'moderate'
                        ? 'bg-yellow-400 text-slate-950 border-yellow-500'
                        : 'bg-emerald-600 text-white border-emerald-700'
              }`}
            >
              <div className="space-y-0.5">
                <p className="font-bold">
                  {activeAqBanner.title} · {activeAqBanner.areaLabel} ({activeAqBanner.standardLabel}: {activeAqBanner.aqiValue})
                </p>
                <p className="opacity-95">
                  {activeAqBanner.message} Main pollutant: {activeAqBanner.mainPollutant}.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => handleNavClick('alert-center')}
                  className="font-semibold underline cursor-pointer"
                >
                  Alert Center
                </button>
                <button
                  type="button"
                  onClick={onDismissAqBanner}
                  className="font-semibold underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </header>

        {/* Page Viewport */}
        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>

        {/* Clean Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-5 text-xs text-slate-500 dark:text-slate-400 print:hidden">
          <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p>
              AirClime Environmental Intelligence · Weather, Solar &amp; Air Quality via Open-Meteo (CAMS / ECMWF) · Maps via OpenStreetMap &amp; RainViewer
            </p>
            <p className="font-mono tabular-nums">
              {location.name} ({location.latitude.toFixed(2)}, {location.longitude.toFixed(2)})
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

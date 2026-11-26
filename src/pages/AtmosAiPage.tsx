import { Bot, CheckCircle2 } from 'lucide-react';
import type {
  AirQualityData,
  ChatLanguage,
  ChatMessage,
  LocationInfo,
  UnitSystem,
  WeatherData,
} from '../types/environment';
import { AtmosAiPanel } from '../components/chatbot/AtmosAiWidget';
import { getUsAqiCategory } from '../utils/airQuality';
import { describeWmoCode, formatTemp, formatWindSpeed } from '../utils/weather';

interface AtmosAiPageProps {
  location: LocationInfo;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  units: UnitSystem;
  messages: ChatMessage[];
  language: ChatLanguage;
  onChangeLanguage: (lang: ChatLanguage) => void;
  onSendMessage: (text: string) => Promise<void>;
  onRetryMessage: (failedModelMsgId: string) => Promise<void>;
  onClearChat: () => void;
  isSending: boolean;
  comparisonCount: number;
}

export function AtmosAiPage({
  location,
  weather,
  airQuality,
  units,
  messages,
  language,
  onChangeLanguage,
  onSendMessage,
  onRetryMessage,
  onClearChat,
  isSending,
  comparisonCount,
}: AtmosAiPageProps) {
  const usAqi = airQuality?.current.us_aqi ?? null;
  const cat = getUsAqiCategory(usAqi);
  const wmo = describeWmoCode(weather?.current.weather_code);

  return (
    <div className="space-y-6">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Bot className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
          <span>AirClime-ai</span>
          <span aria-hidden="true">·</span>
          <span>English · తెలుగు · हिन्दी</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          AirClime-ai – Your Environmental Intelligence Assistant
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Ask questions about live air quality, pollutant causes, weather shifts, outdoor safety, city comparisons, or sustainable habits.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] overflow-hidden h-[620px] flex flex-col">
          <AtmosAiPanel
            messages={messages}
            language={language}
            onChangeLanguage={onChangeLanguage}
            onSendMessage={onSendMessage}
            onRetryMessage={onRetryMessage}
            onClearChat={onClearChat}
            isSending={isSending}
            locationLabel={`${location.name}${location.country ? `, ${location.country}` : ''}`}
          />
        </div>

        <aside className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Live Context Grounding
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            AirClime-ai automatically receives the verified readings below so it never guesses or fabricates measurements.
          </p>

          <dl className="space-y-2.5 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">Location</dt>
              <dd className="font-medium text-right">{location.name}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">US AQI</dt>
              <dd className="font-mono tabular-nums font-semibold">
                {usAqi != null ? `${Math.round(usAqi)} (${cat.label})` : 'N/A'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">PM2.5</dt>
              <dd className="font-mono tabular-nums">
                {airQuality?.current.pm2_5 != null ? `${airQuality.current.pm2_5.toFixed(1)} µg/m³` : 'N/A'}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">Weather</dt>
              <dd className="font-mono tabular-nums text-right">
                {formatTemp(weather?.current.temperature_2m, units)} · {wmo.label}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">Wind</dt>
              <dd className="font-mono tabular-nums">{formatWindSpeed(weather?.current.wind_speed_10m, units)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500 dark:text-slate-400">Compared Cities</dt>
              <dd className="font-mono tabular-nums">{comparisonCount} loaded</dd>
            </div>
          </dl>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
            <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              Server-side Gemini API integration
            </p>
            <p>
              Session chat history remains active while you browse across AirClime modules and can be cleared at any time.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Bot, Download, FileText, Printer, Share2 } from 'lucide-react';
import type {
  AirQualityData,
  ChatLanguage,
  LocationInfo,
  UnitSystem,
  WeatherAlert,
  WeatherData,
} from '../types/environment';
import { identifyMainPollutant, getUsAqiCategory, computeBestOutdoorWindow } from '../utils/airQuality';
import { describeUvIndex, describeWmoCode, formatTemp, formatWindSpeed } from '../utils/weather';
import { calculateDaylightTimeline, formatMinutesAsHm } from '../utils/solar';
import { sendAirClimeAiMessage } from '../services/api';

interface DailyReportPageProps {
  location: LocationInfo;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  alerts: WeatherAlert[];
  units: UnitSystem;
  language: ChatLanguage;
}

export function DailyReportPage({
  location,
  weather,
  airQuality,
  alerts,
  units,
  language,
}: DailyReportPageProps) {
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const usAqi = airQuality?.current.us_aqi ?? null;
  const aqiCat = getUsAqiCategory(usAqi);
  const mainPol = identifyMainPollutant(airQuality?.current);
  const wmo = describeWmoCode(weather?.current.weather_code);
  const uvMax = weather?.daily.uv_index_max?.[0] ?? airQuality?.current.uv_index ?? null;
  const uvInfo = describeUvIndex(uvMax);
  const outdoorWindow = computeBestOutdoorWindow(airQuality?.hourly, weather?.hourly);

  const timeline = calculateDaylightTimeline(
    weather?.daily.sunrise?.[0],
    weather?.daily.sunset?.[0],
    weather?.daily.daylight_duration?.[0],
    weather?.timezone,
  );

  const sunriseStr = weather?.daily.sunrise?.[0]
    ? new Date(weather.daily.sunrise[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';
  const sunsetStr = weather?.daily.sunset?.[0]
    ? new Date(weather.daily.sunset[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  const sustainabilitySuggestion =
    usAqi != null && usAqi > 100
      ? 'Choose rail/metro or carpooling today and avoid open burning to reduce local particulate load.'
      : 'Use natural ventilation during clean outdoor windows and adjust thermostat setpoints by 1–2°C to save energy.';

  const generateAiExplanation = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await sendAirClimeAiMessage({
        messages: [
          {
            id: 'rep-req',
            role: 'user',
            content:
              'Write a concise 4-sentence Daily Environmental Report summary covering air quality, weather, UV/daylight, and one practical precaution based strictly on the current live data.',
            timestamp: new Date().toISOString(),
          },
        ],
        language,
        locationContext: {
          location,
          usAqi,
          category: aqiCat.label,
          mainPollutant: mainPol.symbol,
          pm2_5: airQuality?.current.pm2_5,
          temperatureC: weather?.current.temperature_2m,
          condition: wmo.label,
          uvMax,
          daylight: formatMinutesAsHm(timeline.dayLengthMinutes),
          alertsCount: alerts.length,
        },
      });
      setAiBrief(res.reply);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Unable to generate AI brief right now.');
    } finally {
      setAiLoading(false);
    }
  };

  const handlePrintOrPdf = () => {
    window.print();
  };

  const handleShare = async () => {
    const summaryText = [
      `AirClime Daily Environmental Report — ${location.name}, ${location.country}`,
      `Date: ${new Date().toLocaleDateString()}`,
      `Air Quality: US AQI ${usAqi != null ? Math.round(usAqi) : 'N/A'} (${aqiCat.label}) · Main Pollutant: ${mainPol.symbol}`,
      `Weather: ${formatTemp(weather?.current.temperature_2m, units)} (${wmo.label}) · Wind ${formatWindSpeed(weather?.current.wind_speed_10m, units)}`,
      `UV Max: ${uvMax != null ? uvMax.toFixed(1) : 'N/A'} (${uvInfo.label}) · Daylight: ${formatMinutesAsHm(timeline.dayLengthMinutes)}`,
      `Outdoor Guidance: ${outdoorWindow.summary}`,
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: `AirClime Report: ${location.name}`,
          text: summaryText,
        });
        setShareStatus('Report shared.');
        return;
      } catch {
        // fallback to clipboard if share cancelled or unsupported in iframe
      }
    }

    try {
      await navigator.clipboard.writeText(summaryText);
      setShareStatus('Report summary copied to clipboard.');
      setTimeout(() => setShareStatus(null), 2500);
    } catch {
      setShareStatus('Sharing is restricted in this browser context; use Print / Save PDF.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <FileText className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
            <span>AirClime Daily Environmental Report</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Daily Environmental Briefing
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Live session summary ready for printing, PDF export, or sharing—with zero server storage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrintOrPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            Print
          </button>
          <button
            type="button"
            onClick={handlePrintOrPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F5132] hover:bg-[#0c4128] text-white text-xs font-medium cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Save as PDF
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
            Share
          </button>
        </div>
      </header>

      {shareStatus && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 px-4 py-2 text-xs text-emerald-900 dark:text-emerald-200 print:hidden">
          {shareStatus}
        </div>
      )}

      {/* Printable Report Sheet */}
      <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131C21] p-6 sm:p-8 space-y-6">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#0F5132] dark:text-emerald-400">
              AirClime Environmental Intelligence Report
            </p>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mt-1">
              {location.name}
              {location.admin1 ? `, ${location.admin1}` : ''}
              {location.country ? `, ${location.country}` : ''}
            </h2>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 sm:text-right">
            <p>Generated: {new Date().toLocaleString()}</p>
            <p>Coordinates: {location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}°</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-slate-500 dark:text-slate-400">Air Quality (US AQI)</p>
            <p className={`text-2xl font-bold font-mono tabular-nums mt-1 ${aqiCat.textClass}`}>
              {usAqi != null ? Math.round(usAqi) : 'N/A'}
            </p>
            <p className="font-semibold mt-0.5">{aqiCat.label}</p>
            <p className="text-slate-500 mt-1">Main pollutant: {mainPol.symbol}</p>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-slate-500 dark:text-slate-400">Weather &amp; Temperature</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1">
              {formatTemp(weather?.current.temperature_2m, units)}
            </p>
            <p className="font-semibold mt-0.5">{wmo.label}</p>
            <p className="text-slate-500 mt-1">
              Wind: {formatWindSpeed(weather?.current.wind_speed_10m, units)} · Humidity:{' '}
              {weather?.current.relative_humidity_2m != null ? `${Math.round(weather.current.relative_humidity_2m)}%` : 'N/A'}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-slate-500 dark:text-slate-400">UV &amp; Solar Radiation</p>
            <p className="text-2xl font-bold font-mono tabular-nums mt-1">
              {uvMax != null ? uvMax.toFixed(1) : 'N/A'}
            </p>
            <p className={`font-semibold mt-0.5 ${uvInfo.textClass}`}>{uvInfo.label} Risk</p>
            <p className="text-slate-500 mt-1">Daylight: {formatMinutesAsHm(timeline.dayLengthMinutes)}</p>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-slate-500 dark:text-slate-400">Solar Timing</p>
            <p className="text-sm font-bold font-mono tabular-nums mt-1">Rise {sunriseStr}</p>
            <p className="text-sm font-bold font-mono tabular-nums">Set {sunsetStr}</p>
            <p className="text-slate-500 mt-1 font-mono">Noon {timeline.solarNoonLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Main Pollutants</h3>
            <dl className="grid grid-cols-2 gap-2 font-mono tabular-nums">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-1">
                <dt>PM2.5</dt>
                <dd>{airQuality?.current.pm2_5?.toFixed(1) ?? 'N/A'} µg/m³</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-1">
                <dt>PM10</dt>
                <dd>{airQuality?.current.pm10?.toFixed(1) ?? 'N/A'} µg/m³</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-1">
                <dt>NO₂</dt>
                <dd>{airQuality?.current.nitrogen_dioxide?.toFixed(1) ?? 'N/A'} µg/m³</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 py-1">
                <dt>O₃</dt>
                <dd>{airQuality?.current.ozone?.toFixed(1) ?? 'N/A'} µg/m³</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Active Alerts ({alerts.length})
            </h3>
            {alerts.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-400">
                No severe threshold alerts or official bulletins active at generation time.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {alerts.map((a) => (
                  <li key={a.id}>
                    <strong>{a.title}:</strong> {a.headline}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Outdoor Activity Recommendation
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {aqiCat.generalGuidance} {outdoorWindow.summary}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Daily Sustainability Suggestion
            </h3>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{sustainabilitySuggestion}</p>
          </div>
        </div>

        {/* AI-Generated Explanation Section */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" aria-hidden="true" />
              AirClime-ai Report Explanation
            </h3>
            <button
              type="button"
              onClick={() => void generateAiExplanation()}
              disabled={aiLoading}
              className="px-3 py-1.5 rounded-lg bg-[#0F5132] hover:bg-[#0c4128] text-white text-xs font-medium disabled:opacity-50 cursor-pointer print:hidden"
            >
              {aiLoading ? 'Generating...' : aiBrief ? 'Regenerate AI Summary' : 'Generate AI Summary'}
            </button>
          </div>
          {aiError && <p className="text-xs text-rose-600 dark:text-rose-400">{aiError}</p>}
          {aiBrief ? (
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {aiBrief}
            </p>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click &ldquo;Generate AI Summary&rdquo; to attach an on-demand Gemini explanation grounded in these readings before printing or saving as PDF.
            </p>
          )}
        </div>
      </article>
    </div>
  );
}

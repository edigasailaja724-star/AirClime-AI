import type {
  AirQualityCurrent,
  AirQualityHourly,
  AqiAlertTier,
  AqiStandard,
  WeatherHourly,
} from '../types/environment';

export interface AqiCategoryInfo {
  label: string;
  range: string;
  textClass: string;
  surfaceClass: string;
  borderClass: string;
  accentHex: string;
  healthSummary: string;
  generalGuidance: string;
  sensitiveGuidance: string;
}

export function getUsAqiCategory(aqi: number | null | undefined): AqiCategoryInfo {
  if (aqi == null || !Number.isFinite(aqi)) {
    return {
      label: 'Unavailable',
      range: 'N/A',
      textClass: 'text-slate-600 dark:text-slate-400',
      surfaceClass: 'bg-slate-100 dark:bg-slate-800/60',
      borderClass: 'border-slate-200 dark:border-slate-700',
      accentHex: '#64748B',
      healthSummary: 'Live US AQI reading is currently unavailable for this location.',
      generalGuidance: 'Check local monitoring stations or try refreshing shortly.',
      sensitiveGuidance: 'Sensitive individuals should monitor local conditions before prolonged outdoor exertion.',
    };
  }

  if (aqi <= 50) {
    return {
      label: 'Good',
      range: '0 – 50',
      textClass: 'text-emerald-700 dark:text-emerald-300',
      surfaceClass: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderClass: 'border-emerald-200 dark:border-emerald-800/60',
      accentHex: '#059669',
      healthSummary: 'Air quality is satisfactory and air pollution poses little or no risk.',
      generalGuidance: 'Ideal conditions for outdoor exercise, walking, and natural ventilation.',
      sensitiveGuidance: 'No restrictions needed for most sensitive groups.',
    };
  }
  if (aqi <= 100) {
    return {
      label: 'Moderate',
      range: '51 – 100',
      textClass: 'text-amber-700 dark:text-amber-300',
      surfaceClass: 'bg-amber-50 dark:bg-amber-950/40',
      borderClass: 'border-amber-200 dark:border-amber-800/60',
      accentHex: '#D97706',
      healthSummary: 'Air quality is acceptable; however, unusually sensitive people may experience mild respiratory irritation.',
      generalGuidance: 'Most people can remain active outdoors without restriction.',
      sensitiveGuidance: 'People with asthma, heart disease, or lung conditions should consider reducing prolonged heavy exertion.',
    };
  }
  if (aqi <= 150) {
    return {
      label: 'Unhealthy for Sensitive Groups',
      range: '101 – 150',
      textClass: 'text-orange-700 dark:text-orange-300',
      surfaceClass: 'bg-orange-50 dark:bg-orange-950/40',
      borderClass: 'border-orange-200 dark:border-orange-800/60',
      accentHex: '#EA580C',
      healthSummary: 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.',
      generalGuidance: 'Moderate outdoor activity is generally acceptable; watch for symptoms like coughing or throat irritation.',
      sensitiveGuidance: 'Children, older adults, and people with respiratory or cardiovascular conditions should limit prolonged outdoor exertion.',
    };
  }
  if (aqi <= 200) {
    return {
      label: 'Unhealthy',
      range: '151 – 200',
      textClass: 'text-rose-700 dark:text-rose-300',
      surfaceClass: 'bg-rose-50 dark:bg-rose-950/40',
      borderClass: 'border-rose-200 dark:border-rose-800/60',
      accentHex: '#DC2626',
      healthSummary: 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious effects.',
      generalGuidance: 'Move intense workouts indoors and shorten prolonged outdoor stays. Consider a well-fitted N95/FFP2 mask near traffic.',
      sensitiveGuidance: 'Avoid prolonged or heavy outdoor exertion and keep indoor air filtered if possible.',
    };
  }
  if (aqi <= 300) {
    return {
      label: 'Very Unhealthy',
      range: '201 – 300',
      textClass: 'text-purple-700 dark:text-purple-300',
      surfaceClass: 'bg-purple-50 dark:bg-purple-950/40',
      borderClass: 'border-purple-200 dark:border-purple-800/60',
      accentHex: '#9333EA',
      healthSummary: 'Health alert: the risk of health effects is increased for everyone.',
      generalGuidance: 'Avoid strenuous outdoor activities. Keep windows closed and run HEPA air purification indoors if available.',
      sensitiveGuidance: 'Remain indoors with filtered air and keep rescue medications accessible if prescribed.',
    };
  }
  return {
    label: 'Hazardous',
    range: '301+',
    textClass: 'text-red-800 dark:text-red-300',
    surfaceClass: 'bg-red-50 dark:bg-red-950/50',
    borderClass: 'border-red-300 dark:border-red-800',
    accentHex: '#991B1B',
    healthSummary: 'Health warning of emergency conditions: everyone is more likely to be affected.',
    generalGuidance: 'Avoid all outdoor physical activity. Stay indoors with clean air filtration and wear N95 protection if stepping out.',
    sensitiveGuidance: 'Strictly remain indoors and monitor for acute respiratory or cardiac symptoms.',
  };
}

export function getEuropeanAqiLabel(eaqi: number | null | undefined): string {
  if (eaqi == null || !Number.isFinite(eaqi)) return 'Unavailable';
  if (eaqi <= 20) return 'Good';
  if (eaqi <= 40) return 'Fair';
  if (eaqi <= 60) return 'Moderate';
  if (eaqi <= 80) return 'Poor';
  if (eaqi <= 100) return 'Very Poor';
  return 'Extremely Poor';
}

export interface PollutantMeta {
  key: 'pm2_5' | 'pm10' | 'carbon_monoxide' | 'nitrogen_dioxide' | 'sulphur_dioxide' | 'ozone';
  symbol: string;
  name: string;
  unit: string;
  who24hGuideline: string;
  whoNumericRef: number;
  description: string;
  sources: string;
}

export const POLLUTANT_CATALOG: PollutantMeta[] = [
  {
    key: 'pm2_5',
    symbol: 'PM2.5',
    name: 'Fine Particulate Matter',
    unit: 'µg/m³',
    who24hGuideline: '15 µg/m³ (WHO 24h)',
    whoNumericRef: 15,
    description: 'Inhalable particles ≤2.5 µm that can penetrate deep into lungs and bloodstream.',
    sources: 'Vehicle exhaust, biomass burning, power plants, secondary atmospheric aerosols.',
  },
  {
    key: 'pm10',
    symbol: 'PM10',
    name: 'Coarse Particulate Matter',
    unit: 'µg/m³',
    who24hGuideline: '45 µg/m³ (WHO 24h)',
    whoNumericRef: 45,
    description: 'Inhalable particles ≤10 µm that irritate upper airways and eyes.',
    sources: 'Road dust, construction activity, windblown soil, pollen fragments.',
  },
  {
    key: 'nitrogen_dioxide',
    symbol: 'NO₂',
    name: 'Nitrogen Dioxide',
    unit: 'µg/m³',
    who24hGuideline: '25 µg/m³ (WHO 24h)',
    whoNumericRef: 25,
    description: 'Reactive gas that inflames airway linings and contributes to smog and ozone formation.',
    sources: 'Diesel & petrol vehicles, industrial combustion, urban traffic corridors.',
  },
  {
    key: 'ozone',
    symbol: 'O₃',
    name: 'Ground-Level Ozone',
    unit: 'µg/m³',
    who24hGuideline: '100 µg/m³ (WHO 8h)',
    whoNumericRef: 100,
    description: 'Photochemical oxidant formed in sunlight that triggers airway constriction.',
    sources: 'Sunlight reacting with NOₓ and volatile organic compounds; peaks in afternoon sun.',
  },
  {
    key: 'sulphur_dioxide',
    symbol: 'SO₂',
    name: 'Sulphur Dioxide',
    unit: 'µg/m³',
    who24hGuideline: '40 µg/m³ (WHO 24h)',
    whoNumericRef: 40,
    description: 'Pungent gas irritating respiratory mucosa and forming sulfate fine particles.',
    sources: 'Coal/heavy-oil combustion, smelting, shipping emissions, volcanic activity.',
  },
  {
    key: 'carbon_monoxide',
    symbol: 'CO',
    name: 'Carbon Monoxide',
    unit: 'µg/m³',
    who24hGuideline: '4,000 µg/m³ (WHO 24h)',
    whoNumericRef: 4000,
    description: 'Colorless, odorless gas that reduces oxygen delivery in blood at elevated levels.',
    sources: 'Incomplete fuel combustion in vehicles, generators, and biomass stoves.',
  },
];

export interface DominantPollutantInfo {
  symbol: string;
  name: string;
  value: number | null;
  unit: string;
  ratioToWho: number | null;
  explanation: string;
}

export function identifyMainPollutant(current: AirQualityCurrent | undefined): DominantPollutantInfo {
  if (!current) {
    return {
      symbol: 'Unavailable',
      name: 'No pollutant data',
      value: null,
      unit: 'µg/m³',
      ratioToWho: null,
      explanation: 'Pollutant measurements are currently unavailable.',
    };
  }

  let best: { meta: PollutantMeta; value: number; ratio: number } | null = null;
  for (const meta of POLLUTANT_CATALOG) {
    const val = current[meta.key];
    if (val != null && Number.isFinite(val)) {
      const ratio = val / meta.whoNumericRef;
      if (!best || ratio > best.ratio) {
        best = { meta, value: val, ratio };
      }
    }
  }

  if (!best) {
    return {
      symbol: 'Unavailable',
      name: 'No pollutant data',
      value: null,
      unit: 'µg/m³',
      ratioToWho: null,
      explanation: 'Pollutant measurements are currently unavailable.',
    };
  }

  return {
    symbol: best.meta.symbol,
    name: best.meta.name,
    value: best.value,
    unit: best.meta.unit,
    ratioToWho: Number(best.ratio.toFixed(2)),
    explanation: `${best.meta.symbol} (${best.value.toFixed(1)} ${best.meta.unit}) currently has the highest concentration relative to WHO guideline (${best.meta.who24hGuideline}).`,
  };
}

export interface AqiTrendAnalysis {
  direction: 'improving' | 'worsening' | 'stable' | 'unavailable';
  delta6h: number | null;
  summary: string;
}

export function analyzeAqiTrend(hourly: AirQualityHourly | undefined): AqiTrendAnalysis {
  if (!hourly?.time.length) {
    return { direction: 'unavailable', delta6h: null, summary: 'Hourly trend data unavailable.' };
  }
  const now = Date.now();
  const currIdx = hourly.time.findIndex((t) => Date.parse(t) >= now - 3600 * 1000);
  if (currIdx < 0) {
    return { direction: 'unavailable', delta6h: null, summary: 'Current index not found in forecast timeline.' };
  }
  const currVal = hourly.us_aqi[currIdx];
  const futureIdx = Math.min(hourly.time.length - 1, currIdx + 6);
  const futureVal = hourly.us_aqi[futureIdx];

  if (currVal == null || futureVal == null) {
    return { direction: 'unavailable', delta6h: null, summary: 'Insufficient forecast hours to determine 6-hour trend.' };
  }

  const delta = Math.round(futureVal - currVal);
  if (delta <= -8) {
    return {
      direction: 'improving',
      delta6h: delta,
      summary: `Air quality is projected to improve over the next 6 hours (US AQI ${Math.round(currVal)} → ${Math.round(futureVal)}).`,
    };
  }
  if (delta >= 8) {
    return {
      direction: 'worsening',
      delta6h: delta,
      summary: `Air quality is projected to worsen over the next 6 hours (US AQI ${Math.round(currVal)} → ${Math.round(futureVal)}).`,
    };
  }
  return {
    direction: 'stable',
    delta6h: delta,
    summary: `Air quality is expected to remain relatively steady over the next 6 hours (around US AQI ${Math.round(currVal)}–${Math.round(futureVal)}).`,
  };
}

export interface ExposureEstimate {
  estimatedPm25InhaledUg: number | null;
  riskTier: string;
  suitableActivity: string;
  indoorVsOutdoor: string;
  assumptions: string;
}

export function calculateExposureIntelligence(
  current: AirQualityCurrent | undefined,
  activityLevel: 'resting' | 'walking' | 'jogging' | 'cycling',
  durationMinutes: number,
): ExposureEstimate {
  const pm25 = current?.pm2_5 ?? null;
  const aqi = current?.us_aqi ?? null;

  // Approximate minute ventilation rates (m³/hour) for healthy adult
  const ventilationRateM3PerHour: Record<typeof activityLevel, number> = {
    resting: 0.45,
    walking: 1.2,
    jogging: 3.0,
    cycling: 2.6,
  };

  if (pm25 == null) {
    return {
      estimatedPm25InhaledUg: null,
      riskTier: 'Unavailable',
      suitableActivity: 'Live PM2.5 readings are required to estimate inhaled exposure.',
      indoorVsOutdoor: 'Check local air monitoring updates before intense outdoor workouts.',
      assumptions: 'Requires live PM2.5 concentration (µg/m³).',
    };
  }

  const hours = Math.max(0.1, durationMinutes / 60);
  const inhaledUg = Number((pm25 * ventilationRateM3PerHour[activityLevel] * hours).toFixed(1));

  const riskTier =
    (aqi != null && aqi > 150) || inhaledUg > 120
      ? 'High Exposure Load'
      : (aqi != null && aqi > 100) || inhaledUg > 50
        ? 'Moderate Exposure Load'
        : 'Low Exposure Load';

  const suitableActivity =
    aqi != null && aqi > 150
      ? 'Move high-ventilation exercise indoors; limit outdoor time to brief essential errands.'
      : aqi != null && aqi > 100
        ? 'Prefer steady walking over sustained high-intensity running; sensitive groups should shorten sessions.'
        : 'All outdoor activities are suitable based on current particulate concentrations.';

  const indoorVsOutdoor =
    aqi != null && aqi > 120
      ? 'Indoor air with closed windows / HEPA filtration reduces exposure substantially compared to outdoor exertion.'
      : 'Outdoor exercise is favorable; natural indoor ventilation is safe when outdoor AQI ≤ 50.';

  return {
    estimatedPm25InhaledUg: inhaledUg,
    riskTier,
    suitableActivity,
    indoorVsOutdoor,
    assumptions: `Estimate = PM2.5 (${pm25.toFixed(1)} µg/m³) × adult ventilation rate (${ventilationRateM3PerHour[activityLevel]} m³/h for ${activityLevel}) × ${(hours).toFixed(2)} h. For educational awareness, not clinical measurement.`,
  };
}

export interface OutdoorWindowResult {
  found: boolean;
  startLabel: string;
  endLabel: string;
  avgUsAqi: number | null;
  maxRainProb: number | null;
  summary: string;
}

export function computeBestOutdoorWindow(
  hourlyAQ: AirQualityHourly | undefined,
  hourlyWeather: WeatherHourly | undefined,
): OutdoorWindowResult {
  if (!hourlyAQ || !hourlyAQ.time.length) {
    return {
      found: false,
      startLabel: 'Unavailable',
      endLabel: 'Unavailable',
      avgUsAqi: null,
      maxRainProb: null,
      summary: 'Hourly air quality forecast data is currently unavailable to compute an optimal outdoor window.',
    };
  }

  const nowMs = Date.now();
  const candidates: Array<{
    idx: number;
    time: string;
    aqi: number;
    rainProb: number;
    score: number;
  }> = [];

  for (let i = 0; i < hourlyAQ.time.length; i++) {
    const tMs = Date.parse(hourlyAQ.time[i]);
    if (!Number.isFinite(tMs) || tMs < nowMs - 30 * 60 * 1000 || tMs > nowMs + 36 * 3600 * 1000) {
      continue;
    }
    const hourOfDay = new Date(tMs).getHours();
    if (hourOfDay < 6 || hourOfDay > 21) continue;

    const aqi = hourlyAQ.us_aqi[i];
    if (aqi == null || !Number.isFinite(aqi)) continue;

    const rainProb = hourlyWeather?.precipitation_probability?.[i] ?? 0;
    const score = aqi + (rainProb ?? 0) * 0.8;
    candidates.push({
      idx: i,
      time: hourlyAQ.time[i],
      aqi,
      rainProb: rainProb ?? 0,
      score,
    });
  }

  if (candidates.length === 0) {
    return {
      found: false,
      startLabel: 'N/A',
      endLabel: 'N/A',
      avgUsAqi: null,
      maxRainProb: null,
      summary: 'No daytime forecast hours available in the current 36-hour window.',
    };
  }

  let bestPair: (typeof candidates)[0][] = [candidates[0]];
  let bestScore = candidates[0].score;

  for (let i = 0; i < candidates.length; i++) {
    const curr = candidates[i];
    const next = candidates[i + 1];
    if (next && next.idx === curr.idx + 1) {
      const avgScore = (curr.score + next.score) / 2;
      if (avgScore < bestScore) {
        bestScore = avgScore;
        bestPair = [curr, next];
      }
    } else if (curr.score < bestScore) {
      bestScore = curr.score;
      bestPair = [curr];
    }
  }

  const formatHour = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });

  const avgUsAqi = Math.round(bestPair.reduce((sum, item) => sum + item.aqi, 0) / bestPair.length);
  const maxRainProb = Math.round(Math.max(...bestPair.map((item) => item.rainProb)));
  const startLabel = formatHour(bestPair[0].time);
  const endDate = new Date(Date.parse(bestPair[bestPair.length - 1].time) + 3600 * 1000);
  const endLabel = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const cat = getUsAqiCategory(avgUsAqi);
  const summary = `Best forecasted daytime window is ${startLabel} – ${endLabel} with projected US AQI around ${avgUsAqi} (${cat.label}) and precipitation probability ≤ ${maxRainProb}%.`;

  return {
    found: true,
    startLabel,
    endLabel,
    avgUsAqi,
    maxRainProb,
    summary,
  };
}

export interface AqiAlertEvaluation {
  standard: AqiStandard;
  standardLabel: string;
  standardScale: string;
  value: number | null;
  category: string;
  tier: AqiAlertTier;
  severityRank: number;
  isHigherSeverity: boolean;
  labelBadgeClass: string;
  surfaceClass: string;
  borderClass: string;
  textClass: string;
  accentHex: string;
  precautions: string[];
}

export const AQI_STANDARD_OPTIONS: Array<{
  id: AqiStandard;
  label: string;
  scale: string;
  defaultThreshold: number;
  thresholds: Array<{ value: number; label: string }>;
}> = [
  {
    id: 'us_aqi',
    label: 'US EPA AQI',
    scale: '0–500',
    defaultThreshold: 101,
    thresholds: [
      { value: 51, label: 'Moderate or worse (≥ 51)' },
      { value: 101, label: 'Unhealthy for Sensitive Groups (≥ 101)' },
      { value: 151, label: 'Unhealthy or worse (≥ 151)' },
      { value: 201, label: 'Very Unhealthy / Hazardous (≥ 201)' },
    ],
  },
  {
    id: 'european_aqi',
    label: 'European AQI (EEA)',
    scale: '0–100+',
    defaultThreshold: 41,
    thresholds: [
      { value: 21, label: 'Fair or worse (≥ 21)' },
      { value: 41, label: 'Moderate or worse (≥ 41)' },
      { value: 61, label: 'Poor or worse (≥ 61)' },
      { value: 81, label: 'Very Poor / Extremely Poor (≥ 81)' },
    ],
  },
];

function getTierVisuals(tier: AqiAlertTier): Pick<
  AqiAlertEvaluation,
  'labelBadgeClass' | 'surfaceClass' | 'borderClass' | 'textClass' | 'accentHex'
> {
  switch (tier) {
    case 'good':
      return {
        labelBadgeClass: 'bg-emerald-600 text-white',
        surfaceClass: 'bg-emerald-50/90 dark:bg-emerald-950/35',
        borderClass: 'border-emerald-300 dark:border-emerald-800',
        textClass: 'text-emerald-800 dark:text-emerald-300',
        accentHex: '#15803D',
      };
    case 'moderate':
      return {
        labelBadgeClass: 'bg-yellow-500 text-slate-950',
        surfaceClass: 'bg-yellow-50/90 dark:bg-yellow-950/30',
        borderClass: 'border-yellow-300 dark:border-yellow-800',
        textClass: 'text-yellow-800 dark:text-yellow-300',
        accentHex: '#CA8A04',
      };
    case 'sensitive':
      return {
        labelBadgeClass: 'bg-orange-500 text-white',
        surfaceClass: 'bg-orange-50/90 dark:bg-orange-950/35',
        borderClass: 'border-orange-300 dark:border-orange-800',
        textClass: 'text-orange-800 dark:text-orange-300',
        accentHex: '#EA580C',
      };
    case 'unhealthy':
      return {
        labelBadgeClass: 'bg-red-600 text-white',
        surfaceClass: 'bg-red-50/90 dark:bg-red-950/40',
        borderClass: 'border-red-300 dark:border-red-800',
        textClass: 'text-red-800 dark:text-red-300',
        accentHex: '#DC2626',
      };
    case 'very-unhealthy':
      return {
        labelBadgeClass: 'bg-red-900 text-white',
        surfaceClass: 'bg-red-100/95 dark:bg-red-950/70',
        borderClass: 'border-red-500 dark:border-red-700',
        textClass: 'text-red-950 dark:text-red-200',
        accentHex: '#7F1D1D',
      };
    default:
      return {
        labelBadgeClass: 'bg-slate-500 text-white',
        surfaceClass: 'bg-slate-50 dark:bg-slate-900/60',
        borderClass: 'border-slate-200 dark:border-slate-700',
        textClass: 'text-slate-700 dark:text-slate-300',
        accentHex: '#64748B',
      };
  }
}

export function evaluateAirQualityForAlerts(
  current: AirQualityCurrent | undefined,
  standard: AqiStandard,
): AqiAlertEvaluation {
  const stdMeta = AQI_STANDARD_OPTIONS.find((s) => s.id === standard) ?? AQI_STANDARD_OPTIONS[0];
  const rawValue = standard === 'european_aqi' ? current?.european_aqi : current?.us_aqi;
  const value = rawValue != null && Number.isFinite(rawValue) ? Math.round(rawValue) : null;

  if (value == null) {
    return {
      standard,
      standardLabel: stdMeta.label,
      standardScale: stdMeta.scale,
      value: null,
      category: 'Unavailable',
      tier: 'unavailable',
      severityRank: 0,
      isHigherSeverity: false,
      ...getTierVisuals('unavailable'),
      precautions: ['Live AQI readings are currently unavailable. Try refreshing shortly.'],
    };
  }

  let tier: AqiAlertTier;
  let category: string;
  let severityRank: number;

  if (standard === 'european_aqi') {
    if (value <= 20) {
      tier = 'good';
      category = 'Good';
      severityRank = 1;
    } else if (value <= 40) {
      tier = 'moderate';
      category = 'Fair';
      severityRank = 2;
    } else if (value <= 60) {
      tier = 'sensitive';
      category = 'Moderate';
      severityRank = 3;
    } else if (value <= 80) {
      tier = 'unhealthy';
      category = 'Poor';
      severityRank = 4;
    } else if (value <= 100) {
      tier = 'very-unhealthy';
      category = 'Very Poor';
      severityRank = 5;
    } else {
      tier = 'very-unhealthy';
      category = 'Extremely Poor';
      severityRank = 6;
    }
  } else {
    if (value <= 50) {
      tier = 'good';
      category = 'Good';
      severityRank = 1;
    } else if (value <= 100) {
      tier = 'moderate';
      category = 'Moderate';
      severityRank = 2;
    } else if (value <= 150) {
      tier = 'sensitive';
      category = 'Unhealthy for Sensitive Groups';
      severityRank = 3;
    } else if (value <= 200) {
      tier = 'unhealthy';
      category = 'Unhealthy';
      severityRank = 4;
    } else if (value <= 300) {
      tier = 'very-unhealthy';
      category = 'Very Unhealthy';
      severityRank = 5;
    } else {
      tier = 'very-unhealthy';
      category = 'Hazardous';
      severityRank = 6;
    }
  }

  const mainPol = identifyMainPollutant(current);
  const precautions: string[] = [];

  if (severityRank <= 1) {
    precautions.push('Air quality is satisfactory. Normal outdoor activities and natural ventilation are safe.');
  } else if (severityRank === 2) {
    precautions.push('Unusually sensitive individuals should watch for mild respiratory symptoms during heavy exertion.');
  } else if (severityRank === 3) {
    precautions.push('Children, older adults, and people with asthma or heart conditions should limit prolonged outdoor exertion.');
    precautions.push('Schedule vigorous workouts for lower-pollution morning/evening windows where available.');
  } else if (severityRank === 4) {
    precautions.push('Limit prolonged outdoor activities and move strenuous exercise indoors.');
    precautions.push('Keep windows closed during peak pollution hours and wear a well-fitted N95/FFP2 mask near busy roads.');
  } else {
    precautions.push('Avoid all strenuous outdoor activities and remain indoors with clean/filtered air.');
    precautions.push('Use HEPA indoor filtration if available, keep windows sealed, and wear an N95/FFP2 respirator if stepping outside.');
  }

  if (mainPol.symbol !== 'Unavailable' && severityRank >= 3) {
    precautions.push(`Primary pollutant driver: ${mainPol.symbol}${mainPol.value != null ? ` (${mainPol.value.toFixed(1)} ${mainPol.unit})` : ''}.`);
  }

  return {
    standard,
    standardLabel: stdMeta.label,
    standardScale: stdMeta.scale,
    value,
    category,
    tier,
    severityRank,
    isHigherSeverity: severityRank >= 5,
    ...getTierVisuals(tier),
    precautions,
  };
}

export function buildAirQualityAlertPayload(params: {
  areaLabel: string;
  locationName: string;
  current: AirQualityCurrent | undefined;
  evaluation: AqiAlertEvaluation;
  deliveredVia: 'browser-notification' | 'in-app-banner';
}): import('../types/environment').AirQualityAlertRecord | null {
  const { areaLabel, locationName, current, evaluation, deliveredVia } = params;
  if (evaluation.value == null) return null;

  const mainPol = identifyMainPollutant(current);
  const isSevere = evaluation.isHigherSeverity;
  const title = isSevere
    ? '🚨 AirClime – Severe Air Quality Alert'
    : '⚠️ AirClime – Air Quality Alert';

  const message = isSevere
    ? `Severe air quality detected in ${areaLabel}. Current ${evaluation.standardLabel}: ${evaluation.value}. Air quality is ${evaluation.category}. Avoid strenuous outdoor activities, keep windows closed, and follow the recommended precautions.`
    : `Poor air quality detected in ${areaLabel}. Current ${evaluation.standardLabel}: ${evaluation.value}. Air quality is ${evaluation.category}. Please limit prolonged outdoor activities and follow the recommended precautions.`;

  return {
    id: `aq-alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    locationName,
    areaLabel,
    standard: evaluation.standard,
    standardLabel: evaluation.standardLabel,
    aqiValue: evaluation.value,
    category: evaluation.category,
    tier: evaluation.tier,
    severityRank: evaluation.severityRank,
    title,
    message,
    mainPollutant:
      mainPol.symbol !== 'Unavailable' && mainPol.value != null
        ? `${mainPol.symbol} (${mainPol.value.toFixed(1)} ${mainPol.unit})`
        : 'Unavailable',
    pm2_5: current?.pm2_5 ?? null,
    pm10: current?.pm10 ?? null,
    precautions: evaluation.precautions,
    updatedAt: current?.time ?? new Date().toISOString(),
    triggeredAt: new Date().toISOString(),
    deliveredVia,
  };
}

export interface PreviousAlertSnapshot {
  locationKey: string;
  standard: AqiStandard;
  aqiValue: number;
  severityRank: number;
}

export function shouldTriggerAirQualityAlert(params: {
  enabled: boolean;
  locationKey: string;
  evaluation: AqiAlertEvaluation;
  threshold: number;
  previous: PreviousAlertSnapshot | null;
}): { trigger: boolean; reason: 'disabled' | 'unavailable' | 'below-threshold' | 'duplicate' | 'initial-breach' | 'severity-escalated' | 'worsened-significantly' } {
  const { enabled, locationKey, evaluation, threshold, previous } = params;

  if (!enabled) {
    return { trigger: false, reason: 'disabled' };
  }
  if (evaluation.value == null || evaluation.tier === 'unavailable') {
    return { trigger: false, reason: 'unavailable' };
  }
  if (evaluation.value < threshold) {
    return { trigger: false, reason: 'below-threshold' };
  }

  if (
    !previous ||
    previous.locationKey !== locationKey ||
    previous.standard !== evaluation.standard
  ) {
    return { trigger: true, reason: 'initial-breach' };
  }

  if (evaluation.severityRank > previous.severityRank) {
    return { trigger: true, reason: 'severity-escalated' };
  }

  const meaningfulDelta = evaluation.standard === 'us_aqi' ? 20 : 10;
  if (evaluation.value - previous.aqiValue >= meaningfulDelta) {
    return { trigger: true, reason: 'worsened-significantly' };
  }

  return { trigger: false, reason: 'duplicate' };
}


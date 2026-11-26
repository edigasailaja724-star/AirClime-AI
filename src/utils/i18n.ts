import type { ChatLanguage, ModuleId } from '../types/environment';

export function getLocalHourInTimezone(timezone?: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone || undefined,
    }).formatToParts(new Date());
    const hr = Number(parts.find((p) => p.type === 'hour')?.value ?? '12');
    return Number.isFinite(hr) ? hr : new Date().getHours();
  } catch {
    return new Date().getHours();
  }
}

export function formatLocationClock(timezone?: string): string {
  try {
    return new Intl.DateTimeFormat([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      timeZone: timezone || undefined,
    }).format(new Date());
  } catch {
    return new Date().toLocaleTimeString();
  }
}

export function getGreetingForLanguage(lang: ChatLanguage, hour: number): string {
  const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  if (lang === 'te') {
    return period === 'morning'
      ? 'శుభోదయం'
      : period === 'afternoon'
        ? 'శుభ మధ్యాహ్నం'
        : 'శుభ సాయంత్రం';
  }
  if (lang === 'hi') {
    return period === 'morning'
      ? 'सुप्रभात'
      : period === 'afternoon'
        ? 'नमस्कार'
        : 'शुभ संध्या';
  }
  return period === 'morning'
    ? 'Good Morning'
    : period === 'afternoon'
      ? 'Good Afternoon'
      : 'Good Evening';
}

export const MODULE_LABELS_I18N: Record<ChatLanguage, Record<ModuleId, string>> = {
  en: {
    discover: 'Discover',
    'air-intelligence': 'Air Intelligence',
    sunlight: 'Sunlight & Solar',
    'weather-intelligence': 'Weather Intelligence',
    earthscope: 'EarthScope',
    radar: 'Snow & Storm Radar',
    'atmos-ai': 'AirClime-ai',
    lifesync: 'LifeSync',
    compare: 'AtmosCompare',
    ecosmart: 'EcoSmart',
    'daily-report': 'Daily Report',
    'alert-center': 'Alert Center',
    'data-lab': 'Data Lab',
  },
  te: {
    discover: 'డిస్కవర్',
    'air-intelligence': 'వాయు నాణ్యత',
    sunlight: 'సూర్యకాంతి & సౌర',
    'weather-intelligence': 'వాతావరణ విశ్లేషణ',
    earthscope: 'ఎర్త్‌స్కోప్ మ్యాప్',
    radar: 'మంచు & తుఫాను రాడార్',
    'atmos-ai': 'AirClime-ai',
    lifesync: 'లైఫ్‌సింక్ ఆరోగ్యం',
    compare: 'నగరాల పోలిక',
    ecosmart: 'ఎకోస్మార్ట్',
    'daily-report': 'రోజువారీ నివేదిక',
    'alert-center': 'హెచ్చరిక కేంద్రం',
    'data-lab': 'డేటా ల్యాబ్',
  },
  hi: {
    discover: 'डिस्कवर',
    'air-intelligence': 'वायु गुणवत्ता',
    sunlight: 'सूर्यप्रकाश व सौर',
    'weather-intelligence': 'मौसम विश्लेषण',
    earthscope: 'अर्थस्कोप मानचित्र',
    radar: 'बर्फ़ व तूफ़ान रडार',
    'atmos-ai': 'AirClime-ai',
    lifesync: 'लाइफ़सिंक स्वास्थ्य',
    compare: 'शहर तुलना',
    ecosmart: 'इकोस्मार्ट',
    'daily-report': 'दैनिक रिपोर्ट',
    'alert-center': 'अलर्ट केंद्र',
    'data-lab': 'डेटा लैब',
  },
};

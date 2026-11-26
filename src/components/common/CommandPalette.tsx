import { useEffect, useState } from 'react';
import { Bot, Command, LocateFixed, MapPin, Search, X } from 'lucide-react';
import type { LocationInfo, ModuleId } from '../../types/environment';
import { searchLocations } from '../../services/api';
import { NAV_ITEMS } from '../layout/AppShell';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelectModule: (id: ModuleId) => void;
  onSelectLocation: (loc: LocationInfo) => void;
  onRequestUserLocation: () => void;
  onTriggerAiAction: (prompt: string) => void;
}

const AI_QUICK_ACTIONS = [
  { label: 'Analyze My Air', prompt: 'Analyze my current air quality, main pollutant, and any health precautions.' },
  { label: "Explain Today's Weather", prompt: "Explain today's weather conditions, comfort level, and tomorrow's outlook." },
  { label: 'Analyze Sunlight & UV', prompt: 'Analyze current sunlight, UV risk, golden hour timing, and solar conditions.' },
  { label: 'Compare Loaded Cities', prompt: 'Compare the air quality and weather across my currently compared cities.' },
  { label: 'Give My Daily Eco Report', prompt: 'Generate a concise daily environmental summary and one practical eco action for today.' },
  { label: 'Explain Environmental Risks', prompt: 'Explain any active environmental risks or alerts at my current location.' },
];

export function CommandPalette({
  open,
  onClose,
  onSelectModule,
  onSelectLocation,
  onRequestUserLocation,
  onTriggerAiAction,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [cities, setCities] = useState<LocationInfo[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose();
      } else if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 2) {
      setCities([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchLocations(q);
        if (!cancelled) setCities(res.slice(0, 5));
      } catch {
        if (!cancelled) setCities([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  if (!open) return null;

  const qLower = query.trim().toLowerCase();
  const filteredModules = NAV_ITEMS.filter(
    (m) =>
      !qLower ||
      m.label.toLowerCase().includes(qLower) ||
      m.shortDesc.toLowerCase().includes(qLower),
  );

  return (
    <div
      role="dialog"
      aria-label="AirClime Quick Command and Search Overlay"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131C21] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cities, jump to modules, or run AirClime-ai actions..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command panel"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
          {/* City Search Results */}
          {(searching || cities.length > 0) && (
            <div className="space-y-1">
              <p className="px-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Locations {searching ? '(searching...)' : ''}
              </p>
              {cities.map((c, idx) => (
                <button
                  key={`${c.name}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectLocation(c);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                    {c.name}, {[c.admin1, c.country].filter(Boolean).join(', ')}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {c.latitude.toFixed(2)}, {c.longitude.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Quick Location Action */}
          <div className="space-y-1">
            <p className="px-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Location Control
            </p>
            <button
              type="button"
              onClick={() => {
                onRequestUserLocation();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs font-medium text-[#0F5132] dark:text-emerald-300 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 cursor-pointer"
            >
              <LocateFixed className="w-3.5 h-3.5" aria-hidden="true" />
              Use My Current Location (asks permission)
            </button>
          </div>

          {/* AI Copilot Actions */}
          <div className="space-y-1">
            <p className="px-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              AirClime-ai Copilot Actions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {AI_QUICK_ACTIONS.map((act) => (
                <button
                  key={act.label}
                  type="button"
                  onClick={() => {
                    onTriggerAiAction(act.prompt);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span className="truncate">{act.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div className="space-y-1">
            <p className="px-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Modules
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {filteredModules.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectModule(m.id);
                      onClose();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-slate-900 dark:text-slate-100">{m.label}</span>
                    <span className="text-[11px] text-slate-400 truncate">· {m.shortDesc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Command className="w-3 h-3" aria-hidden="true" /> Press Ctrl/Cmd + K anytime
          </span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}

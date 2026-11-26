import { useEffect, useRef, useState } from 'react';
import { LocateFixed, MapPin, Search, X } from 'lucide-react';
import type { LocationInfo } from '../../types/environment';
import { searchLocations } from '../../services/api';
import type { GeoPermissionState } from '../../hooks/useEnvironment';

interface LocationSearchProps {
  onSelectLocation: (loc: LocationInfo) => void;
  onOpenLocationPrompt: () => void;
  geoState: GeoPermissionState;
  placeholder?: string;
  compact?: boolean;
  inputId?: string;
}

export function LocationSearch({
  onSelectLocation,
  onOpenLocationPrompt,
  geoState,
  placeholder = 'Search any city worldwide...',
  compact = false,
  inputId = 'airclime-city-search',
}: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const list = await searchLocations(trimmed);
        if (!cancelled) {
          setResults(list);
          setOpen(true);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setSearchError(err instanceof Error ? err.message : 'City search failed.');
          setResults([]);
          setOpen(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const handlePick = (loc: LocationInfo) => {
    onSelectLocation(loc);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex items-center gap-2 w-full">
      <div className="relative flex-1 min-w-0">
        <Search
          className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || searchError) setOpen(true);
          }}
          placeholder={placeholder}
          aria-label="Search city or location"
          className={`w-full pl-9 pr-8 ${compact ? 'py-1.5 text-xs' : 'py-2 text-sm'} rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-colors`}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setOpen(false);
            }}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {open && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131C21] shadow-lg overflow-hidden">
            {loading && (
              <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                Searching Open-Meteo global directory...
              </div>
            )}
            {!loading && searchError && (
              <div className="px-4 py-3 text-xs text-rose-600 dark:text-rose-400">{searchError}</div>
            )}
            {!loading && !searchError && results.length === 0 && query.trim().length >= 2 && (
              <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                No matching locations found for &ldquo;{query.trim()}&rdquo;.
              </div>
            )}
            {!loading && results.length > 0 && (
              <ul role="listbox" className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {results.map((item, idx) => (
                  <li key={`${item.name}-${item.latitude}-${item.longitude}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => handlePick(item)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {[item.admin1, item.country].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                        {item.latitude.toFixed(2)}, {item.longitude.toFixed(2)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenLocationPrompt}
        disabled={geoState === 'requesting'}
        title="Use browser location for current session"
        className={`inline-flex items-center gap-1.5 ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'} font-medium rounded-lg border border-emerald-700/20 dark:border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60`}
      >
        <LocateFixed className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">
          {geoState === 'requesting' ? 'Locating...' : 'Use My Location'}
        </span>
      </button>
    </div>
  );
}

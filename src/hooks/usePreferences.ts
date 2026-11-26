import { useEffect, useState } from 'react';
import type { ThemeMode, UnitSystem } from '../types/environment';

const THEME_STORAGE_KEY = 'airclime_theme_pref';
const UNITS_STORAGE_KEY = 'airclime_units_pref';

export function usePreferences() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore storage access issues
    }
    return 'light';
  });

  const [units, setUnits] = useState<UnitSystem>(() => {
    try {
      const saved = localStorage.getItem(UNITS_STORAGE_KEY);
      if (saved === 'imperial' || saved === 'metric') return saved;
    } catch {
      // ignore storage access issues
    }
    return 'metric';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(UNITS_STORAGE_KEY, units);
    } catch {
      // ignore
    }
  }, [units]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  const toggleUnits = () => setUnits((prev) => (prev === 'metric' ? 'imperial' : 'metric'));

  return { theme, setTheme, toggleTheme, units, setUnits, toggleUnits };
}

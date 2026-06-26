import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light' | 'neon' | 'crimson';

const THEME_KEY = 'linkportal-theme';
const THEME_ORDER: Theme[] = ['dark', 'light', 'neon', 'crimson'];
const VALID_THEMES = new Set<string>(THEME_ORDER);

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored && VALID_THEMES.has(stored)) return stored as Theme;
  return 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme((prev) => {
      const idx = THEME_ORDER.indexOf(prev);
      const nextIdx = idx >= 0 ? (idx + 1) % THEME_ORDER.length : 0;
      return THEME_ORDER[nextIdx];
    });
  }, []);

  return { theme, cycleTheme };
}

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light' | 'neon';

const THEME_KEY = 'linkportal-theme';
const THEME_ORDER: Theme[] = ['dark', 'light', 'neon'];

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'light' || stored === 'neon') return stored;
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
      return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    });
  }, []);

  return { theme, cycleTheme };
}

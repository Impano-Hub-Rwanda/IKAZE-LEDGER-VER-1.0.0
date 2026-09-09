import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
export type Accent = 'teal' | 'blue' | 'indigo' | 'violet' | 'cyan' | 'orange' | 'emerald' | 'rose' | 'amber' | 'fuchsia';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  accent: Accent;
  setAccent: (a: Accent) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'dms-theme';
const ACCENT_KEY = 'ikaze-accent';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

function getInitialAccent(): Accent {
  const stored = localStorage.getItem(ACCENT_KEY);
  return stored === 'blue' || stored === 'indigo' || stored === 'violet' || stored === 'cyan' || stored === 'orange' || stored === 'emerald' || stored === 'rose' || stored === 'amber' || stored === 'fuchsia' || stored === 'teal' ? stored : 'teal';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [accent, setAccentState] = useState<Accent>(getInitialAccent);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  const setAccent = useCallback((a: Accent) => {
    setAccentState(a);
    localStorage.setItem(ACCENT_KEY, a);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme, setTheme, accent, setAccent }),
    [theme, toggleTheme, setTheme, accent, setAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

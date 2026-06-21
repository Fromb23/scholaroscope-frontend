'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ScholaroscopeThemeMode = 'DEFAULT' | 'DARK' | 'CUSTOM';
export type ThemeMode = ScholaroscopeThemeMode;
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  themeMode: ScholaroscopeThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ScholaroscopeThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isCustom: boolean;
}

export const THEME_MODE_STORAGE_KEY = 'scholaroscope_theme_mode';
const LEGACY_THEME_STORAGE_KEY = 'scholaroscope_theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeMode(value: string | null): value is ScholaroscopeThemeMode {
  return value === 'DEFAULT' || value === 'DARK' || value === 'CUSTOM';
}

function legacyThemeToMode(value: string | null): ScholaroscopeThemeMode | null {
  switch (value) {
    case 'light':
      return 'DEFAULT';
    case 'dark':
      return 'DARK';
    default:
      return null;
  }
}

function readStoredThemeMode(): ScholaroscopeThemeMode {
  if (typeof window === 'undefined') {
    return 'DEFAULT';
  }

  const storedMode = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
  if (isThemeMode(storedMode)) {
    return storedMode;
  }

  const legacyMode = legacyThemeToMode(window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY));
  if (legacyMode) {
    window.localStorage.setItem(THEME_MODE_STORAGE_KEY, legacyMode);
    return legacyMode;
  }

  return 'DEFAULT';
}

export function resolveThemeMode(mode: ScholaroscopeThemeMode): ResolvedTheme {
  return mode === 'DARK' ? 'dark' : 'light';
}

function applyTheme(theme: ResolvedTheme, mode: ScholaroscopeThemeMode) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themeMode = mode;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ScholaroscopeThemeMode>('DEFAULT');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initialMode = readStoredThemeMode();
    setThemeModeState(initialMode);
    applyTheme(resolveThemeMode(initialMode), initialMode);
    setMounted(true);
  }, []);

  const resolvedTheme = resolveThemeMode(themeMode);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    applyTheme(resolvedTheme, themeMode);
  }, [mounted, resolvedTheme, themeMode]);

  const setThemeMode = useCallback((mode: ScholaroscopeThemeMode) => {
    setThemeModeState(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode);
    }
    applyTheme(resolveThemeMode(mode), mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode(themeMode === 'DARK' ? 'DEFAULT' : 'DARK');
  }, [setThemeMode, themeMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      resolvedTheme,
      setThemeMode,
      toggleTheme,
      isDark: resolvedTheme === 'dark',
      isCustom: themeMode === 'CUSTOM',
    }),
    [resolvedTheme, setThemeMode, themeMode, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

'use client';

import { resolveErrorMessage } from '@/app/core/errors';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

import { themeAPI } from '@/app/core/api/theme';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/app/context/ThemeContext';
import {
  DEFAULT_EFFECTIVE_THEME,
  applyThemeTokens,
  normalizeEffectiveTheme,
} from '@/app/core/theme/effectiveTheme';
import type { EffectiveThemeResponse } from '@/app/core/types/theme';

interface EffectiveThemeContextValue {
  effectiveTheme: EffectiveThemeResponse;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<EffectiveThemeResponse>;
}

const EffectiveThemeContext = createContext<EffectiveThemeContextValue | null>(null);
const LAST_ORG_THEME_STORAGE_KEY = 'scholaroscope_last_org_theme_snapshot';

function readLastOrgThemeSnapshot(): EffectiveThemeResponse | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(LAST_ORG_THEME_STORAGE_KEY);
    return raw ? JSON.parse(raw) as EffectiveThemeResponse : null;
  } catch {
    return null;
  }
}

function storeLastOrgThemeSnapshot(theme: EffectiveThemeResponse) {
  if (typeof window === 'undefined' || !theme.organization || !theme.is_customized) {
    return;
  }
  window.localStorage.setItem(LAST_ORG_THEME_STORAGE_KEY, JSON.stringify(theme));
}

function shouldUseSystemTheme(pathname: string | null): boolean {
  if (!pathname || pathname === '/') {
    return true;
  }
  return [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function EffectiveThemeProvider({ children }: { children: ReactNode }) {
  const { user, activeOrg, loading: authLoading } = useAuth();
  const { themeMode } = useTheme();
  const pathname = usePathname();
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveThemeResponse>(DEFAULT_EFFECTIVE_THEME);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const themeRequestIdRef = useRef(0);

  const applyResolvedTheme = useCallback((theme: EffectiveThemeResponse) => {
    const normalized = applyThemeTokens(normalizeEffectiveTheme(theme, themeMode), undefined, themeMode);
    setEffectiveTheme(normalized);
    return normalized;
  }, [themeMode]);

  const refetch = useCallback(async () => {
    const requestId = themeRequestIdRef.current + 1;
    themeRequestIdRef.current = requestId;

    if (!user) {
      setError(null);
      if (!shouldUseSystemTheme(pathname)) {
        const storedTheme = readLastOrgThemeSnapshot();
        if (storedTheme) {
          return applyResolvedTheme(storedTheme);
        }
      }
      return applyResolvedTheme(DEFAULT_EFFECTIVE_THEME);
    }

    setLoading(true);
    setError(null);
    try {
      const theme = await themeAPI.getEffectiveTheme();
      if (requestId !== themeRequestIdRef.current) {
        return normalizeEffectiveTheme(theme, themeMode);
      }
      storeLastOrgThemeSnapshot(theme);
      return applyResolvedTheme(theme);
    } catch (err) {
      if (requestId !== themeRequestIdRef.current) {
        return normalizeEffectiveTheme(DEFAULT_EFFECTIVE_THEME, themeMode);
      }
      const fallback = applyResolvedTheme(DEFAULT_EFFECTIVE_THEME);
      setError(resolveErrorMessage(err, 'Theme settings could not be loaded.'));
      return fallback;
    } finally {
      if (requestId === themeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [applyResolvedTheme, pathname, themeMode, user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void refetch();
  }, [activeOrg?.id, authLoading, pathname, refetch]);

  useEffect(() => {
    applyThemeTokens(effectiveTheme, undefined, themeMode);
  }, [effectiveTheme, themeMode]);

  const value = useMemo<EffectiveThemeContextValue>(
    () => ({
      effectiveTheme,
      loading,
      error,
      refetch,
    }),
    [effectiveTheme, error, loading, refetch],
  );

  return (
    <EffectiveThemeContext.Provider value={value}>
      {children}
    </EffectiveThemeContext.Provider>
  );
}

export function useEffectiveTheme() {
  const context = useContext(EffectiveThemeContext);
  if (!context) {
    throw new Error('useEffectiveTheme must be used within EffectiveThemeProvider');
  }
  return context;
}

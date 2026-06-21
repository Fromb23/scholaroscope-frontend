'use client';

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

export function EffectiveThemeProvider({ children }: { children: ReactNode }) {
  const { user, activeOrg, loading: authLoading } = useAuth();
  const { themeMode } = useTheme();
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
      return applyResolvedTheme(DEFAULT_EFFECTIVE_THEME);
    }

    setLoading(true);
    setError(null);
    try {
      const theme = await themeAPI.getEffectiveTheme();
      if (requestId !== themeRequestIdRef.current) {
        return normalizeEffectiveTheme(theme, themeMode);
      }
      return applyResolvedTheme(theme);
    } catch (err) {
      if (requestId !== themeRequestIdRef.current) {
        return normalizeEffectiveTheme(DEFAULT_EFFECTIVE_THEME, themeMode);
      }
      const fallback = applyResolvedTheme(DEFAULT_EFFECTIVE_THEME);
      setError(err instanceof Error ? err.message : 'Theme settings could not be loaded.');
      return fallback;
    } finally {
      if (requestId === themeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [applyResolvedTheme, themeMode, user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void refetch();
  }, [activeOrg?.id, authLoading, refetch]);

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

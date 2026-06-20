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
  appearanceModeToThemeMode,
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
  const { resolvedTheme, setThemeMode } = useTheme();
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveThemeResponse>(DEFAULT_EFFECTIVE_THEME);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const themeRequestIdRef = useRef(0);

  const applyResolvedTheme = useCallback((theme: EffectiveThemeResponse, syncAppearance: boolean) => {
    const normalized = applyThemeTokens(normalizeEffectiveTheme(theme, resolvedTheme), undefined, resolvedTheme);
    setEffectiveTheme(normalized);
    if (syncAppearance) {
      setThemeMode(appearanceModeToThemeMode(normalized.appearance_mode));
    }
    return normalized;
  }, [resolvedTheme, setThemeMode]);

  const refetch = useCallback(async () => {
    const requestId = themeRequestIdRef.current + 1;
    themeRequestIdRef.current = requestId;

    if (!user) {
      setError(null);
      return applyResolvedTheme(DEFAULT_EFFECTIVE_THEME, false);
    }

    setLoading(true);
    setError(null);
    try {
      const theme = await themeAPI.getEffectiveTheme();
      if (requestId !== themeRequestIdRef.current) {
        return normalizeEffectiveTheme(theme);
      }
      return applyResolvedTheme(theme, true);
    } catch (err) {
      if (requestId !== themeRequestIdRef.current) {
        return normalizeEffectiveTheme(DEFAULT_EFFECTIVE_THEME);
      }
      const fallback = applyResolvedTheme(DEFAULT_EFFECTIVE_THEME, false);
      setError(err instanceof Error ? err.message : 'Theme settings could not be loaded.');
      return fallback;
    } finally {
      if (requestId === themeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [applyResolvedTheme, user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void refetch();
  }, [activeOrg?.id, authLoading, refetch]);

  useEffect(() => {
    applyThemeTokens(effectiveTheme, undefined, resolvedTheme);
  }, [effectiveTheme, resolvedTheme]);

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

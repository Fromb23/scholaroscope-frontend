import { createElement, useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EffectiveThemeProvider, useEffectiveTheme } from './EffectiveThemeContext';
import { themeAPI } from '@/app/core/api/theme';
import {
  DEFAULT_EFFECTIVE_THEME,
  DEFAULT_THEME_TOKENS,
} from '@/app/core/theme/effectiveTheme';
import type { EffectiveThemeResponse } from '@/app/core/types/theme';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const authState = vi.hoisted(() => ({
  user: {
    id: 1,
    email: 'teacher@example.com',
  },
  activeOrg: {
    id: 10,
    name: 'Branded Workspace',
  },
  loading: false,
}));

const themeState = vi.hoisted(() => ({
  themeMode: 'DEFAULT',
}));

const navigationState = vi.hoisted(() => ({
  pathname: '/workspaces/new',
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationState.pathname,
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/app/context/ThemeContext', () => ({
  useTheme: () => themeState,
}));

function organizationTheme(): EffectiveThemeResponse {
  return {
    ...DEFAULT_EFFECTIVE_THEME,
    organization: {
      id: 10,
      name: 'Branded Workspace',
      org_type: 'INSTITUTION',
    },
    source: 'organization',
    is_customized: true,
    tokens: {
      ...DEFAULT_THEME_TOKENS,
      primary: '#7C3AED',
      buttonPrimary: '#7C3AED',
    },
  };
}

describe('EffectiveThemeProvider workspace onboarding isolation', () => {
  let renderer: ReactTestRenderer | null = null;
  let storage: Map<string, string>;

  function renderProbe(onTheme: (theme: EffectiveThemeResponse) => void) {
    function Probe() {
      const { effectiveTheme } = useEffectiveTheme();
      useEffect(() => onTheme(effectiveTheme), [effectiveTheme]);
      return createElement('div', {
        'data-testid': 'theme-probe',
        source: effectiveTheme.source,
        primary: effectiveTheme.tokens.primary,
      });
    }

    renderer = create(
      createElement(EffectiveThemeProvider, null, createElement(Probe)),
    );
  }

  beforeEach(() => {
    storage = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });
    vi.stubGlobal('document', {
      documentElement: {
        style: {
          setProperty: vi.fn(),
        },
      },
    });
    navigationState.pathname = '/workspaces/new';
    authState.user = { id: 1, email: 'teacher@example.com' };
    authState.activeOrg = { id: 10, name: 'Branded Workspace' };
    authState.loading = false;
    vi.spyOn(themeAPI, 'getEffectiveTheme').mockResolvedValue(organizationTheme());
  });

  afterEach(async () => {
    await act(async () => {
      renderer?.unmount();
    });
    renderer = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses the default system theme on create-workspace routes without applying the active workspace theme', async () => {
    const observed = vi.fn();

    await act(async () => {
      renderProbe(observed);
      await Promise.resolve();
    });

    expect(themeAPI.getEffectiveTheme).not.toHaveBeenCalled();
    const rendered = renderer!.root.findByProps({ 'data-testid': 'theme-probe' });
    expect(rendered.props).toMatchObject({
      source: 'default',
      primary: DEFAULT_EFFECTIVE_THEME.tokens.primary,
    });
  });

  it('does not mutate stored theme preferences when visiting create-workspace routes', async () => {
    const storedPreference = 'DARK';
    const storedWorkspaceTheme = JSON.stringify(organizationTheme());
    storage.set('scholaroscope_theme_mode', storedPreference);
    storage.set('scholaroscope_last_org_theme_snapshot', storedWorkspaceTheme);

    await act(async () => {
      renderProbe(vi.fn());
      await Promise.resolve();
    });

    expect(storage.get('scholaroscope_theme_mode')).toBe(storedPreference);
    expect(storage.get('scholaroscope_last_org_theme_snapshot')).toBe(storedWorkspaceTheme);
  });

  it('uses the effective workspace theme on ordinary workspace routes', async () => {
    navigationState.pathname = '/dashboard';
    const observed = vi.fn();

    await act(async () => {
      renderProbe(observed);
      await Promise.resolve();
    });

    expect(themeAPI.getEffectiveTheme).toHaveBeenCalledOnce();
    const rendered = renderer!.root.findByProps({ 'data-testid': 'theme-probe' });
    expect(rendered.props).toMatchObject({
      source: 'organization',
      primary: '#7C3AED',
    });
  });
});

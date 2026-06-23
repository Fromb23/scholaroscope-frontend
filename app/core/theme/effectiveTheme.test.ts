import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_THEME_TOKENS,
  SCHOLAROSCOPE_DARK_TOKENS,
  appearanceModeToThemeMode,
  applyThemeTokens,
  canEditOrganizationTheme,
  normalizeEffectiveTheme,
  themeModeToAppearanceMode,
} from './effectiveTheme';
import type { ActiveOrg, Role, User, WorkspaceCapabilities } from '@/app/core/types/auth';
import type { EffectiveThemeResponse } from '@/app/core/types/theme';

function styleTarget() {
  const values = new Map<string, string>();
  return {
    values,
    target: {
      style: {
        setProperty: (name: string, value: string) => values.set(name, value),
      },
    },
  };
}

const baseCapabilities: WorkspaceCapabilities = {
  can_teach: false,
  can_manage_academic_setup: false,
  can_manage_learners: false,
  can_manage_cohorts: false,
  can_manage_subjects: false,
  can_manage_assessments: false,
  can_view_reports: false,
  can_manage_staff: false,
  is_workspace_owner: false,
  workspace_mode: null,
  workspace_behavior: null,
};

const user: User = {
  id: 1,
  email: 'admin@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  full_name: 'Ada Lovelace',
  is_superadmin: false,
  is_active: true,
  phone: '',
  date_joined: '',
  last_login: '',
};

const organization: ActiveOrg = {
  id: 10,
  name: 'Alliance High',
  slug: 'alliance-high',
  org_type: 'INSTITUTION',
};

function theme(overrides: Partial<EffectiveThemeResponse> = {}): EffectiveThemeResponse {
  return {
    organization,
    source: 'organization',
    appearance_mode: 'LIGHT',
    tokens: {
      ...DEFAULT_THEME_TOKENS,
      primary: '#123456',
      primaryForeground: '#FFFFFF',
      secondary: '#654321',
      secondaryForeground: '#FFFFFF',
      accent: '#00AA77',
      accentForeground: '#0F172A',
      ring: '#123456',
      muted: '#F8FAFC',
    },
    logo_url: '',
    favicon_url: '',
    sidebar_style: '',
    button_radius: 10,
    is_customized: true,
    ...overrides,
  };
}

describe('effective tenant theme utilities', () => {
  it('DEFAULT applies organization custom tokens when workspace branding exists', () => {
    const { target, values } = styleTarget();

    applyThemeTokens(theme(), target, 'DEFAULT');

    expect(values.get('--brand-primary')).toBe('#123456');
    expect(values.get('--brand-accent')).toBe('#00AA77');
    expect(values.get('--color-primary')).toBe('#123456');
    expect(values.get('--color-link')).toBe('#123456');
    expect(values.get('--color-focus-ring')).toBe('#123456');
  });

  it('CUSTOM applies organization colors to actions, links, selected states, and focus tokens', () => {
    const { target, values } = styleTarget();

    applyThemeTokens(theme(), target, 'CUSTOM');

    expect(values.get('--brand-primary')).toBe('#123456');
    expect(values.get('--brand-secondary')).toBe('#654321');
    expect(values.get('--brand-accent')).toBe('#00AA77');
    expect(values.get('--color-primary')).toBe('#123456');
    expect(values.get('--color-link')).toBe('#123456');
    expect(values.get('--color-focus-ring')).toBe('#123456');
    expect(values.get('--color-input-focus-border')).toBe('#123456');
    expect(values.get('--color-table-link')).toBe('#123456');
    expect(values.get('--color-icon-emphasis')).toBe('#123456');
  });

  it('CUSTOM keeps neutral readable surfaces and borders', () => {
    const { target, values } = styleTarget();

    applyThemeTokens(theme(), target, 'CUSTOM');

    expect(values.get('--color-app-bg')).toBe('#F6F8FC');
    expect(values.get('--color-card')).toBe('#FFFFFF');
    expect(values.get('--color-header')).toBe('#FFFFFF');
    expect(values.get('--color-sidebar')).toBe('#F8FAFC');
    expect(values.get('--color-dropdown')).toBe('#FFFFFF');
    expect(values.get('--color-border')).toBe('#D7E0EC');
    expect(values.get('--color-border')).not.toBe('#123456');
  });

  it('DARK uses fixed Scholaroscope dark tokens and ignores organization brand colors', () => {
    const { target, values } = styleTarget();

    applyThemeTokens(theme({
      tokens: {
        ...DEFAULT_THEME_TOKENS,
        primary: '#FF0000',
        primaryForeground: '#FFFFFF',
        secondary: '#880000',
        secondaryForeground: '#FFFFFF',
        accent: '#00FF00',
        accentForeground: '#000000',
        ring: '#FF0000',
        muted: '#FFF1F1',
      },
    }), target, 'DARK');

    expect(values.get('--brand-primary')).toBe(SCHOLAROSCOPE_DARK_TOKENS.brandPrimary);
    expect(values.get('--color-primary')).toBe(SCHOLAROSCOPE_DARK_TOKENS.buttonPrimary);
    expect(values.get('--color-link')).toBe(SCHOLAROSCOPE_DARK_TOKENS.link);
    expect(values.get('--color-focus-ring')).toBe(SCHOLAROSCOPE_DARK_TOKENS.focusRing);
    expect(values.get('--color-app-bg')).toBe('#050812');
    expect(values.get('--color-card')).toBe('#0B1220');
    expect(values.get('--color-header')).toBe('#070B14');
    expect(values.get('--color-sidebar')).toBe('#07111F');
    expect(values.get('--color-dropdown')).toBe('#0B1220');
  });

  it('DARK border tokens are dark neutral and not derived from organization primary', () => {
    const { target, values } = styleTarget();

    applyThemeTokens(theme({
      tokens: {
        ...DEFAULT_THEME_TOKENS,
        primary: '#FF0000',
        secondary: '#00AAFF',
        accent: '#00FF00',
        ring: '#FF0000',
      },
    }), target, 'DARK');

    expect(values.get('--color-border')).toBe('#1E293B');
    expect(values.get('--color-border-strong')).toBe('#334155');
    expect(values.get('--color-border')).not.toBe('#FFB8B8');
    expect(values.get('--color-border')).not.toBe('#FF0000');
    expect(values.get('--color-border-strong')).not.toBe('#FF9494');
  });

  it('falls back to the Scholaroscope default theme when no custom theme exists', () => {
    const normalized = normalizeEffectiveTheme(null, 'DEFAULT');

    expect(normalized.source).toBe('default');
    expect(normalized.tokens).toEqual(DEFAULT_THEME_TOKENS);
    expect(normalized.is_customized).toBe(false);
  });

  it('DEFAULT falls back to Scholaroscope light tokens when no org branding exists', () => {
    const { target, values } = styleTarget();

    applyThemeTokens(theme({ is_customized: false, source: 'default' }), target, 'DEFAULT');

    expect(values.get('--brand-primary')).toBe(DEFAULT_THEME_TOKENS.brandPrimary);
    expect(values.get('--color-primary')).toBe(DEFAULT_THEME_TOKENS.buttonPrimary);
    expect(values.get('--color-border')).toBe(DEFAULT_THEME_TOKENS.border);
  });

  it('maps legacy backend appearance modes to explicit frontend theme modes', () => {
    expect(appearanceModeToThemeMode('LIGHT')).toBe('DEFAULT');
    expect(appearanceModeToThemeMode('DARK')).toBe('DARK');
    expect(appearanceModeToThemeMode('SYSTEM')).toBe('DEFAULT');
    expect(themeModeToAppearanceMode('DEFAULT')).toBe('LIGHT');
    expect(themeModeToAppearanceMode('DARK')).toBe('DARK');
    expect(themeModeToAppearanceMode('CUSTOM')).toBe('LIGHT');
  });

  it('keeps the dark-mode CSS block on stable Scholaroscope dark colors', () => {
    const globalsCss = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
    const darkBlock = globalsCss.match(/html\[data-theme='dark'\] \{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(darkBlock).toContain('--color-app-bg: #050812;');
    expect(darkBlock).toContain('--color-border: #1e293b;');
    expect(darkBlock).toContain('--color-border-strong: #334155;');
    expect(darkBlock).not.toContain('mixHex');
    expect(darkBlock).not.toContain('var(--brand-primary) 24%');
  });

  it('allows organization admins to edit organization themes', () => {
    expect(canEditOrganizationTheme({
      user,
      activeOrg: organization,
      activeRole: 'ADMIN',
      capabilities: {
        ...baseCapabilities,
        can_manage_academic_setup: true,
      },
    })).toBe(true);
  });

  it('allows freelance owners to edit their workspace theme', () => {
    expect(canEditOrganizationTheme({
      user,
      activeOrg: {
        ...organization,
        org_type: 'PERSONAL',
      },
      activeRole: 'ADMIN',
      capabilities: {
        ...baseCapabilities,
        can_manage_academic_setup: true,
        is_workspace_owner: true,
        workspace_behavior: 'FREELANCE_TEACHER',
      },
    })).toBe(true);
  });

  it('does not expose organization theme editing to instructors', () => {
    expect(canEditOrganizationTheme({
      user,
      activeOrg: organization,
      activeRole: 'INSTRUCTOR' as Role,
      capabilities: {
        ...baseCapabilities,
        can_manage_academic_setup: false,
        can_teach: true,
      },
    })).toBe(false);
  });

  it('keeps shared UI components theme-native', () => {
    const files = [
      'app/components/ui/Button.tsx',
      'app/components/ui/Input.tsx',
      'app/components/ui/Select.tsx',
      'app/components/ui/Badge.tsx',
      'app/components/ui/Table.tsx',
      'app/components/ui/ActionMenu.tsx',
    ];
    const source = files.map((file) => readFileSync(join(process.cwd(), file), 'utf8')).join('\n');

    expect(source).toContain('theme-button-primary');
    expect(source).toContain('theme-input');
    expect(source).toContain('theme-select');
    expect(source).toContain('theme-table-sort-icon');
    expect(source).toContain('theme-dropdown');
    expect(source).not.toMatch(/focus:ring-blue|focus:border-blue|text-blue|bg-blue|border-blue/);
  });

  it('uses themed learner list controls and table links', () => {
    const source = readFileSync(join(process.cwd(), 'app/core/components/learners/LearnersPage.tsx'), 'utf8');

    expect(source).toContain('theme-table-link');
    expect(source).toContain('theme-input theme-select');
    expect(source).toContain('theme-app-bg');
    expect(source).not.toMatch(/focus:ring-blue|focus:border-blue|text-blue|bg-blue|border-blue/);
  });
});

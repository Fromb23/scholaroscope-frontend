import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_THEME_TOKENS,
  appearanceModeToThemeMode,
  applyThemeTokens,
  canEditOrganizationTheme,
  normalizeEffectiveTheme,
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
  return normalizeEffectiveTheme({
    organization,
    source: 'organization',
    appearance_mode: 'SYSTEM',
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
  });
}

describe('effective tenant theme utilities', () => {
  it('applies resolved brand and semantic tokens to CSS variables', () => {
    const { target, values } = styleTarget();

    applyThemeTokens(theme(), target);

    expect(values.get('--brand-primary')).toBe('#123456');
    expect(values.get('--brand-primary-foreground')).toBe('#FFFFFF');
    expect(values.get('--brand-secondary')).toBe('#654321');
    expect(values.get('--brand-secondary-foreground')).toBe('#FFFFFF');
    expect(values.get('--brand-accent')).toBe('#00AA77');
    expect(values.get('--brand-accent-foreground')).toBe('#0F172A');
    expect(values.get('--brand-ring')).toBe('#123456');
    expect(values.get('--brand-button-radius')).toBe('10px');
    expect(values.get('--color-primary')).toBe('#123456');
    expect(values.get('--color-primary-hover')).toBe('#0F2C48');
    expect(values.get('--color-primary-soft')).toBe('#DEE3E7');
    expect(values.get('--color-primary-contrast')).toBe('#FFFFFF');
    expect(values.get('--color-app-bg')).toBe('#F1F3F5');
    expect(values.get('--color-card')).toBe('#FFFFFF');
    expect(values.get('--color-header')).toBe('#FFFFFF');
    expect(values.get('--color-sidebar')).toBe('#F9F7F6');
    expect(values.get('--color-dropdown')).toBe('#FFFFFF');
    expect(values.get('--color-text')).toBe('#0F172A');
    expect(values.get('--color-text-muted')).toBe('#475569');
    expect(values.get('--color-text-subtle')).toBe('#64748B');
    expect(values.get('--color-link')).toBe('#123456');
    expect(values.get('--color-link-hover')).toBe('#0F2C48');
    expect(values.get('--color-focus-ring')).toBe('#123456');
    expect(values.get('--color-table-header')).toBe('#ECEFF1');
    expect(values.get('--color-table-link')).toBe('#123456');
    expect(values.get('--color-icon-emphasis')).toBe('#123456');
  });

  it('replaces tokens when another active organization theme is applied', () => {
    const { target, values } = styleTarget();

    applyThemeTokens(theme(), target);
    applyThemeTokens(theme({
      organization: {
        id: 20,
        name: 'Olympic High',
        org_type: 'INSTITUTION',
      },
      tokens: {
        ...DEFAULT_THEME_TOKENS,
        primary: '#006644',
        primaryForeground: '#FFFFFF',
        secondary: '#111827',
        secondaryForeground: '#FFFFFF',
        accent: '#F59E0B',
        accentForeground: '#0F172A',
        ring: '#006644',
        muted: '#F8FAFC',
      },
    }), target);

    expect(values.get('--brand-primary')).toBe('#006644');
    expect(values.get('--brand-accent')).toBe('#F59E0B');
    expect(values.get('--color-link')).toBe('#006644');
    expect(values.get('--color-input-focus-border')).toBe('#006644');
    expect(values.get('--color-table-link')).toBe('#006644');
  });

  it('keeps organization brand tokens while adapting surfaces in dark mode', () => {
    const { target, values } = styleTarget();

    applyThemeTokens(theme({
      tokens: {
        ...DEFAULT_THEME_TOKENS,
        primary: '#006644',
        primaryForeground: '#FFFFFF',
        secondary: '#111827',
        secondaryForeground: '#FFFFFF',
        accent: '#F59E0B',
        accentForeground: '#0F172A',
        ring: '#006644',
        muted: '#F8FAFC',
      },
    }), target, 'dark');

    expect(values.get('--brand-primary')).toBe('#006644');
    expect(values.get('--color-primary')).toBe('#006644');
    expect(values.get('--color-link')).toBe('#006644');
    expect(values.get('--color-focus-ring')).toBe('#006644');
    expect(values.get('--color-app-bg')).toBe('#040509');
    expect(values.get('--color-card')).not.toBe('#FFFFFF');
    expect(values.get('--color-text')).toBe('#E5E7EB');
  });

  it('falls back to the Scholaroscope default theme when no custom theme exists', () => {
    const normalized = normalizeEffectiveTheme(null);

    expect(normalized.source).toBe('default');
    expect(normalized.tokens).toEqual(DEFAULT_THEME_TOKENS);
    expect(normalized.is_customized).toBe(false);
  });

  it('keeps dark mode as a user appearance preference', () => {
    expect(appearanceModeToThemeMode('LIGHT')).toBe('light');
    expect(appearanceModeToThemeMode('DARK')).toBe('dark');
    expect(appearanceModeToThemeMode('SYSTEM')).toBe('system');
  });

  it('does not redeclare brand primary tokens in the dark-mode CSS block', () => {
    const globalsCss = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8');
    const darkBlock = globalsCss.match(/html\[data-theme='dark'\] \{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(darkBlock).not.toContain('--color-primary:');
    expect(darkBlock).not.toContain('--color-primary-hover:');
    expect(darkBlock).not.toContain('--color-primary-soft:');
    expect(darkBlock).not.toContain('--color-primary-contrast:');
    expect(darkBlock).not.toContain('--brand-primary:');
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
    const source = readFileSync(join(process.cwd(), 'app/(dashboard)/learners/page.tsx'), 'utf8');

    expect(source).toContain('theme-table-link');
    expect(source).toContain('theme-input theme-select');
    expect(source).toContain('theme-app-bg');
    expect(source).not.toMatch(/focus:ring-blue|focus:border-blue|text-blue|bg-blue|border-blue/);
  });
});

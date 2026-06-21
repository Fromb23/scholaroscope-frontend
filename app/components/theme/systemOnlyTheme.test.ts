import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveThemeMode } from '@/app/context/ThemeContext';

describe('explicit Scholaroscope theme modes', () => {
  it('persists explicit selected theme mode and does not force system-only mode', () => {
    const source = readFileSync(join(process.cwd(), 'app/context/ThemeContext.tsx'), 'utf8');

    expect(source).toContain("THEME_MODE_STORAGE_KEY = 'scholaroscope_theme_mode'");
    expect(source).toContain('window.localStorage.setItem(THEME_MODE_STORAGE_KEY, mode)');
    expect(source).not.toContain('window.localStorage.removeItem(THEME_MODE_STORAGE_KEY)');
    expect(source).not.toContain("setThemeModeState('system')");
  });

  it('resolves explicit theme modes predictably', () => {
    expect(resolveThemeMode('DEFAULT')).toBe('light');
    expect(resolveThemeMode('DARK')).toBe('dark');
    expect(resolveThemeMode('CUSTOM')).toBe('light');
  });

  it('renders real Default, Dark, and Custom choice buttons', () => {
    const source = readFileSync(join(process.cwd(), 'app/components/theme/ThemeModeSelector.tsx'), 'utf8');

    expect(source).toContain('THEME_OPTIONS');
    expect(source).toContain("label: 'Default Scholaroscope'");
    expect(source).toContain("label: 'Scholaroscope Dark'");
    expect(source).toContain("label: 'Organization Custom'");
    expect(source).not.toContain('Dark mode follows your device settings.');
  });
});

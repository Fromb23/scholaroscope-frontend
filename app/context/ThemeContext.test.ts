import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolveThemeMode } from './ThemeContext';

describe('ThemeContext', () => {
  it('defaults to DEFAULT mode and supports localStorage migration without deleting stored mode', () => {
    const source = readFileSync(join(process.cwd(), 'app/context/ThemeContext.tsx'), 'utf8');

    expect(source).toContain("useState<ScholaroscopeThemeMode>('DEFAULT')");
    expect(source).toContain("return 'DEFAULT';");
    expect(source).toContain('LEGACY_THEME_STORAGE_KEY');
    expect(source).not.toContain('removeItem(THEME_MODE_STORAGE_KEY)');
  });

  it('maps DEFAULT, DARK, and CUSTOM to resolved themes', () => {
    expect(resolveThemeMode('DEFAULT')).toBe('light');
    expect(resolveThemeMode('DARK')).toBe('dark');
    expect(resolveThemeMode('CUSTOM')).toBe('light');
  });

  it('exposes the expected public context values', () => {
    const source = readFileSync(join(process.cwd(), 'app/context/ThemeContext.tsx'), 'utf8');

    expect(source).toContain('themeMode: ScholaroscopeThemeMode');
    expect(source).toContain('resolvedTheme: ResolvedTheme');
    expect(source).toContain('setThemeMode: (mode: ScholaroscopeThemeMode) => void');
    expect(source).toContain('isDark: boolean');
    expect(source).toContain('isCustom: boolean');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('system-only theme mode', () => {
  it('does not persist manual theme overrides', () => {
    const source = readFileSync(join(process.cwd(), 'app/context/ThemeContext.tsx'), 'utf8');
    expect(source).toContain("window.localStorage.removeItem(THEME_STORAGE_KEY)");
    expect(source).not.toContain('window.localStorage.setItem(THEME_STORAGE_KEY');
  });

  it('does not expose Light/Dark/System choice buttons', () => {
    const source = readFileSync(join(process.cwd(), 'app/components/theme/ThemeModeSelector.tsx'), 'utf8');
    expect(source).toContain('Dark mode follows your device settings.');
    expect(source).not.toContain('THEME_OPTIONS');
    expect(source).not.toContain("label: 'Light'");
    expect(source).not.toContain("label: 'Dark'");
  });
});

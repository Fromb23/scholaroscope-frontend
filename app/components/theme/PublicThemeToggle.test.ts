import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public light/dark theme toggle', () => {
  it('switches only between Default Scholaroscope light and Scholaroscope dark', () => {
    const source = readFileSync(join(process.cwd(), 'app/components/theme/PublicThemeToggle.tsx'), 'utf8');

    expect(source).toContain("const nextMode = isDark ? 'DEFAULT' : 'DARK'");
    expect(source).not.toContain('CUSTOM');
    expect(source).not.toContain('device settings');
  });

  it('is present on auth frame and public header', () => {
    const authFrame = readFileSync(join(process.cwd(), 'app/core/components/auth/AuthFrame.tsx'), 'utf8');
    const publicHeader = readFileSync(join(process.cwd(), 'app/core/components/public/PublicHeader.tsx'), 'utf8');

    expect(authFrame).toContain('PublicThemeToggle');
    expect(publicHeader).toContain('PublicThemeToggle');
  });
});

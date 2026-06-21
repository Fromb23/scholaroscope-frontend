import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Header user dropdown', () => {
  it('does not render Appearance or ThemeModeSelector in the user dropdown', () => {
    const source = readFileSync(join(process.cwd(), 'app/components/layout/Header.tsx'), 'utf8');

    expect(source).not.toContain('ThemeModeSelector');
    expect(source).not.toContain('Appearance');
    expect(source).toContain('View Profile');
    expect(source).toContain('Settings');
    expect(source).toContain('Logout');
  });
});

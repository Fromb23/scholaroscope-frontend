import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('StatStrip architecture', () => {
  it('centralizes compact mobile and normal desktop stat layout classes', () => {
    const source = read('app/components/dashboard/StatStrip.tsx');

    expect(source).toContain('grid-cols-2');
    expect(source).toContain('md:grid-cols-4');
    expect(source).toContain('xl:grid-cols-4');
    expect(source).toContain("normal: 'gap-3 md:gap-4'");
    expect(source).not.toContain('window.innerWidth');
    expect(source).not.toContain('useMediaQuery');
  });
});

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('mobile stats architecture', () => {
  it('passes the mobile stats UI checker', () => {
    expect(() => {
      execFileSync(process.execPath, ['tools/check-mobile-stats.mjs'], {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }).not.toThrow();
  });

  it('keeps stat rendering CSS-switched through StatsCard and StatStrip', () => {
    const statsCard = read('app/components/dashboard/StatsCard.tsx');
    const statStrip = read('app/components/dashboard/StatStrip.tsx');

    expect(statsCard).toContain('md:hidden');
    expect(statsCard).toContain('hidden md:block');
    expect(statsCard).toContain("mobile = 'compact'");
    expect(statStrip).toContain('grid-cols-2');
    expect(statStrip).toContain('md:grid-cols-4');
    expect(statsCard).not.toContain('window.innerWidth');
    expect(statStrip).not.toContain('useMediaQuery');
  });
});

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('mobile navigation shell architecture', () => {
  it('passes the mobile navigation shell checker', () => {
    expect(() => {
      execFileSync(process.execPath, ['tools/check-mobile-nav.mjs'], {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }).not.toThrow();
  });

  it('uses nav-config mobile priority and short labels for the bottom bar', () => {
    const mobileNav = read('app/components/layout/MobileBottomNav.tsx');

    expect(mobileNav).toContain('resolveMobilePrimaryNav(navConfig)');
    expect(mobileNav).toContain('item.shortName ?? item.name');
    expect(mobileNav).not.toContain('navConfig.primary.slice(0, 4)');
  });
});

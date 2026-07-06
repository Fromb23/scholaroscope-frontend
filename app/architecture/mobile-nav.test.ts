import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('mobile navigation shell architecture', () => {
  it('passes the mobile navigation shell checker', () => {
    expect(() => {
      execFileSync(process.execPath, ['tools/check-mobile-nav.mjs'], {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }).not.toThrow();
  });
});

import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('PWA integrity architecture', () => {
  it('passes the PWA integrity checker', () => {
    expect(() => {
      execFileSync(process.execPath, ['tools/check-pwa-integrity.mjs'], {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }).not.toThrow();
  });
});

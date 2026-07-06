import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('desire path architecture', () => {
  it('passes the desire path checker', () => {
    expect(() => {
      execFileSync(process.execPath, ['tools/check-desire-paths.mjs'], {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }).not.toThrow();
  });
});

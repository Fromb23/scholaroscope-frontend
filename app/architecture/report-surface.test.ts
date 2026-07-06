import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('report surface architecture', () => {
  it('passes the report surface checker', () => {
    expect(() => {
      execFileSync(process.execPath, ['tools/check-report-surface.mjs'], {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }).not.toThrow();
  });
});

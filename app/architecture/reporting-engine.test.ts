import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('one reporting engine architecture', () => {
  it('passes the reporting engine guard', () => {
    expect(() => execFileSync(process.execPath, ['tools/check-reporting-engine.mjs'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    })).not.toThrow();
  });
});


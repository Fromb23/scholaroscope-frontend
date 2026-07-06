import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('hierarchy filter architecture', () => {
  it('passes the hierarchy filter checker', () => {
    expect(() => {
      execFileSync(process.execPath, ['tools/check-hierarchy-filters.mjs'], {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
    }).not.toThrow();
  });
});

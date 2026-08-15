import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/core/components/reports/PolicyAccessUnavailableState.tsx'),
  'utf8',
);

describe('PolicyAccessUnavailableState', () => {
  it('uses capability-neutral denied copy', () => {
    expect(source).toContain('Policy configuration unavailable');
    expect(source).toContain('This workspace or your current permissions do not allow policy');
    expect(source).not.toContain('Administrator access required');
    expect(source).not.toContain('managed by administrators');
    expect(source).not.toContain('Instructors can review');
  });
});

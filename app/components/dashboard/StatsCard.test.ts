import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('StatsCard mobile architecture', () => {
  it('keeps the full desktop stat card and adds a compact CSS-switched mobile branch', () => {
    const source = read('app/components/dashboard/StatsCard.tsx');

    expect(source).toContain("mobile?: 'show' | 'compact' | 'hide'");
    expect(source).toContain("mobile = 'compact'");
    expect(source).toContain('md:hidden');
    expect(source).toContain('hidden md:block');
    expect(source).toContain('text-3xl font-semibold theme-text');
    expect(source).toContain('text-xl font-semibold');
    expect(source).toContain('rounded-full p-3');
  });
});

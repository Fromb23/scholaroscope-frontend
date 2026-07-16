import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const checker = join(process.cwd(), 'tools/check-security-presentation.mjs');
const fixtures = join(process.cwd(), '.tmp-security-presentation-check');

function runFixture(component: string) {
  rmSync(fixtures, { recursive: true, force: true });
  mkdirSync(join(fixtures, 'app/core/auth'), { recursive: true });
  mkdirSync(join(fixtures, 'app/example'), { recursive: true });
  writeFileSync(
    join(fixtures, 'app/core/auth/navigation.ts'),
    "export const parseAppDestination = (value: string) => decodeURIComponent(value);\n",
  );
  writeFileSync(join(fixtures, 'app/example/Page.tsx'), component);
  return () => execFileSync(process.execPath, [checker, '--root', fixtures], { encoding: 'utf8' });
}

afterEach(() => rmSync(fixtures, { recursive: true, force: true }));

describe('Phase 3 security presentation architecture', () => {
  it('rejects unsafe redirect consumers even when a safe helper is merely mentioned elsewhere', () => {
    const run = runFixture(`
      const helperName = 'parseAppDestination';
      const returnTo = searchParams.get('returnTo');
      export const Page = () => <a href={returnTo}>Back</a>;
    `);
    expect(run).toThrow(/canonical destination parser/);
  });

  it('rejects the retired raw error extractor', () => {
    const run = runFixture(`
      export const Page = ({ error }) => <p>{extractErrorMessage(error)}</p>;
    `);
    expect(run).toThrow(/retired extractErrorMessage/);
  });

  it('accepts a canonical parser at the destination consumer', () => {
    const run = runFixture(`
      import { parseAppDestination } from '../core/auth/navigation';
      const returnTo = parseAppDestination(searchParams.get('returnTo'));
      export const Page = () => <a href={returnTo ?? '/dashboard'}>Back</a>;
    `);
    expect(run()).toContain('passed');
  });
});

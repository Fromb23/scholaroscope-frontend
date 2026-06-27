import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function makeFixtureRoot() {
  return mkdtempSync(join(tmpdir(), 'error-placement-check-'));
}

function runChecker(root: string, baseline: Record<string, unknown> = {}) {
  const baselinePath = join(root, 'baseline.json');
  writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));

  try {
    const stdout = execFileSync(
      process.execPath,
      ['tools/check-error-placement.mjs', '--root', root, '--baseline', baselinePath],
      { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { ok: true, stdout, stderr: '' };
  } catch (error) {
    const failure = error as { stdout?: Buffer | string; stderr?: Buffer | string };
    return {
      ok: false,
      stdout: String(failure.stdout ?? ''),
      stderr: String(failure.stderr ?? ''),
    };
  }
}

const baselineEntry = {
  count: 2,
  reason: 'Existing duplicate error fixture debt.',
  owner: 'frontend-test',
  priority: 'P0',
  removeBy: '2026-08-31',
};

describe('error placement checker', () => {
  it('fails when one error state is rendered in multiple banners', () => {
    const root = makeFixtureRoot();
    try {
      writeFileSync(join(root, 'Bad.tsx'), `
        export function Bad({ activeErrorMessage }) {
          return <>
            <ErrorBanner message={activeErrorMessage} />
            <div className="fixed bottom-0"><ErrorBanner message={activeErrorMessage} compact /></div>
          </>;
        }
      `);

      const result = runChecker(root);

      expect(result.ok).toBe(false);
      expect(result.stderr).toContain('Bad.tsx::duplicate-error-banner:activeErrorMessage');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('allows one page error and one distinct field summary state', () => {
    const root = makeFixtureRoot();
    try {
      writeFileSync(join(root, 'Good.tsx'), `
        export function Good({ submitError, fieldErrors }) {
          return <>
            <ErrorBanner message={submitError} />
            <FormValidationSummary fieldErrors={fieldErrors} />
          </>;
        }
      `);

      const result = runChecker(root);

      expect(result.ok).toBe(true);
      expect(result.stdout).toContain('Error placement guard passed');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses baseline metadata to prevent duplicate count growth', () => {
    const root = makeFixtureRoot();
    try {
      writeFileSync(join(root, 'Bad.tsx'), `
        export function Bad({ formError }) {
          return <>
            <ErrorBanner message={formError} />
            <ErrorBanner message={formError} compact />
          </>;
        }
      `);

      expect(runChecker(root, { 'Bad.tsx::duplicate-error-banner:formError': baselineEntry }).ok).toBe(true);

      writeFileSync(join(root, 'Bad.tsx'), `
        export function Bad({ formError }) {
          return <>
            <ErrorBanner message={formError} />
            <ErrorBanner message={formError} compact />
            <ErrorBanner message={formError} />
          </>;
        }
      `);

      const result = runChecker(root, { 'Bad.tsx::duplicate-error-banner:formError': baselineEntry });
      expect(result.ok).toBe(false);
      expect(result.stderr).toContain('increased from baseline 2 to 3');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function makeFixtureRoot() {
  return mkdtempSync(join(tmpdir(), 'workspace-boundary-check-'));
}

function runChecker(root: string, baseline: Record<string, unknown> = {}) {
  const baselinePath = join(root, 'baseline.json');
  writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));

  try {
    const stdout = execFileSync(
      process.execPath,
      ['tools/check-workspace-boundaries.mjs', '--root', root, '--baseline', baselinePath],
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
  count: 1,
  reason: 'Existing test fixture debt.',
  owner: 'frontend-test',
  priority: 'P0',
  removeBy: '2026-08-31',
};

describe('workspace boundary checker', () => {
  it('fails raw admin role behavior in feature UI', () => {
    const root = makeFixtureRoot();
    try {
      writeFileSync(join(root, 'Feature.tsx'), `
        export function Feature({ activeRole }) {
          return activeRole === 'ADMIN' ? <div>User management</div> : null;
        }
      `);

      const result = runChecker(root);

      expect(result.ok).toBe(false);
      expect(result.stderr).toContain('Feature.tsx::raw-admin-role-check');
      expect(result.stderr).toContain('Feature.tsx::freelance-risky-staff-admin-copy');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails future canManageUsers calls that omit capabilities', () => {
    const root = makeFixtureRoot();
    try {
      writeFileSync(join(root, 'Feature.tsx'), `
        export function Feature({ user, activeRole }) {
          return canManageUsers(user, activeRole) ? <div /> : null;
        }
      `);

      const result = runChecker(root);

      expect(result.ok).toBe(false);
      expect(result.stderr).toContain('Feature.tsx::can-manage-users-without-capabilities');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('allows raw personal selection in registration onboarding', () => {
    const root = makeFixtureRoot();
    try {
      const authDir = join(root, 'core/components/auth');
      mkdirSync(authDir, { recursive: true });
      writeFileSync(join(authDir, 'RegisterPage.tsx'), `
        export function RegisterPage({ form }) {
          return form.org_type === 'PERSONAL' ? <div>Freelance</div> : null;
        }
      `);

      const result = runChecker(root);

      expect(result.ok).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses baseline metadata to prevent count growth', () => {
    const root = makeFixtureRoot();
    try {
      writeFileSync(join(root, 'Feature.tsx'), `
        export function Feature({ activeRole }) {
          return activeRole === 'ADMIN' ? <div /> : null;
        }
      `);

      expect(runChecker(root, { 'Feature.tsx::raw-admin-role-check': baselineEntry }).ok).toBe(true);

      writeFileSync(join(root, 'Feature.tsx'), `
        export function Feature({ activeRole, role }) {
          return activeRole === 'ADMIN' || role === 'ADMIN' ? <div /> : null;
        }
      `);

      const result = runChecker(root, { 'Feature.tsx::raw-admin-role-check': baselineEntry });
      expect(result.ok).toBe(false);
      expect(result.stderr).toContain('increased from baseline 1 to 2');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

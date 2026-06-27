import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function makeFixtureRoot() {
  return mkdtempSync(join(tmpdir(), 'form-validation-check-'));
}

function runChecker(root: string, baseline: Record<string, unknown> = {}) {
  const baselinePath = join(root, 'baseline.json');
  writeFileSync(baselinePath, JSON.stringify(baseline, null, 2));

  try {
    const stdout = execFileSync(
      process.execPath,
      ['tools/check-form-validation.mjs', '--root', root, '--baseline', baselinePath],
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
  priority: 'P1',
  removeBy: '2026-10-31',
};

describe('form validation checker', () => {
  it('fails bad silent validate returns', () => {
    const root = makeFixtureRoot();
    try {
      writeFileSync(join(root, 'Bad.tsx'), `
        export function BadForm() {
          const validate = () => false;
          const submit = () => {
            if (!validate()) return;
          };
          const FormValidationSummary = () => null;
          return <form onSubmit={submit}><input required /></form>;
        }
      `);

      const result = runChecker(root);

      expect(result.ok).toBe(false);
      expect(result.stderr).toContain('Bad.tsx::silent-validate-return');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('passes a multi-field form with shared summary and focus helper', () => {
    const root = makeFixtureRoot();
    try {
      writeFileSync(join(root, 'Good.tsx'), `
        import { FormValidationSummary } from '@/app/components/ui/forms';
        import { useFormValidationFeedback } from '@/app/core/forms';
        export function GoodForm() {
          const feedback = useFormValidationFeedback({ fieldErrors: {}, fieldOrder: ['name'] });
          return (
            <form onSubmit={() => feedback.focusFirstError({})}>
              <FormValidationSummary fieldErrors={{}} />
              <input required />
              <input required />
            </form>
          );
        }
      `);

      const result = runChecker(root);

      expect(result.ok).toBe(true);
      expect(result.stdout).toContain('Form validation guard passed');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('allows a one-field inline form only when intentionally marked', () => {
    const root = makeFixtureRoot();
    try {
      writeFileSync(join(root, 'OneField.tsx'), `
        // form-validation-check: allow-one-field-inline
        export function OneFieldForm() {
          return <form><input required aria-invalid="true" /></form>;
        }
      `);

      expect(runChecker(root).ok).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('uses the baseline to prevent old debt from growing', () => {
    const root = makeFixtureRoot();
    try {
      writeFileSync(join(root, 'Bad.tsx'), `
        export function BadForm() {
          const validate = () => false;
          const submit = () => {
            if (!validate()) return;
          };
          const FormValidationSummary = () => null;
          return <form onSubmit={submit}><input required /></form>;
        }
      `);

      expect(runChecker(root, { 'Bad.tsx::silent-validate-return': baselineEntry }).ok).toBe(true);

      writeFileSync(join(root, 'Bad.tsx'), `
        export function BadForm() {
          const validate = () => false;
          const submit = () => {
            if (!validate()) return;
            if (!validate()) return;
          };
          const FormValidationSummary = () => null;
          return <form onSubmit={submit}><input required /></form>;
        }
      `);

      const result = runChecker(root, { 'Bad.tsx::silent-validate-return': baselineEntry });
      expect(result.ok).toBe(false);
      expect(result.stderr).toContain('increased from baseline 1 to 2');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails baseline entries missing required metadata', () => {
    const root = makeFixtureRoot();
    try {
      writeFileSync(join(root, 'Bad.tsx'), `
        export function BadForm() {
          const validate = () => false;
          const submit = () => {
            if (!validate()) return;
          };
          return <form onSubmit={submit}><input required /></form>;
        }
      `);

      const result = runChecker(root, {
        'Bad.tsx::silent-validate-return': { count: 1 },
      });

      expect(result.ok).toBe(false);
      expect(result.stderr).toContain('missing reason');
      expect(result.stderr).toContain('missing owner');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

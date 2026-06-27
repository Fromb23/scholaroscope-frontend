import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ENABLE_MULTI_WORKSPACE_SIGNUP, WORKSPACE_MODE_COPY } from '@/app/core/lib/workspaces';

describe('freelance-first registration', () => {
  it('defaults public multi-workspace signup off', () => {
    expect(ENABLE_MULTI_WORKSPACE_SIGNUP).toBe(false);
  });

  it('uses the required freelance workspace copy', () => {
    expect(WORKSPACE_MODE_COPY.PERSONAL.description).toBe(
      'Start as a freelance teacher. Manage your learners, schemes of work, lesson plans, teaching records, assessments, reports, and academic intelligence in your own workspace.',
    );
  });

  it('marks non-freelance workspace cards as coming soon when disabled', () => {
    const source = readFileSync(join(process.cwd(), 'app/core/components/auth/RegisterPage.tsx'), 'utf8');
    expect(source).toContain('Coming soon');
    expect(source).toContain("disabled={disabled}");
    expect(source).toContain('Create Freelance Teacher Workspace');
  });

  it('shows local validation summary and focuses invalid register/workspace fields', () => {
    const pageSource = readFileSync(join(process.cwd(), 'app/core/components/auth/RegisterPage.tsx'), 'utf8');
    const hookSource = readFileSync(join(process.cwd(), 'app/core/hooks/useRegister.ts'), 'utf8');

    expect(pageSource).toContain('<FormValidationSummary');
    expect(pageSource).toContain('focusFirstError(fieldErrors)');
    expect(pageSource).toContain("ref={setFieldRef('workspace_name')}");
    expect(pageSource).toContain("ref={setFieldRef('first_name')}");
    expect(hookSource).toContain('createFormValidationAppError');
    expect(hookSource).not.toContain('if (!validate()) return');
  });
});

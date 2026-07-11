import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  join(process.cwd(), 'app/core/components/auth/RegisterPage.tsx'),
  'utf8',
);
const hookSource = readFileSync(
  join(process.cwd(), 'app/core/hooks/useRegister.ts'),
  'utf8',
);

describe('RegisterPage form validation feedback', () => {
  it('renders a validation summary and focuses invalid account/workspace fields', () => {
    expect(pageSource).toContain('<FormValidationSummary');
    expect(pageSource).toContain('focusFirstError(fieldErrors)');
    expect(pageSource).toContain("ref={setFieldRef('workspace_name')}");
    expect(pageSource).toContain("ref={setFieldRef('first_name')}");
    expect(pageSource).toContain("ref={setFieldRef('email')}");
    expect(hookSource).toContain('createFormValidationAppError');
    expect(hookSource).not.toContain('if (!validate()) return');
  });

  it('treats pending workspace approval as a submitted state instead of a red failure', () => {
    expect(hookSource).toContain("if (res.status === 'pending')");
    expect(hookSource).toContain('setIsPending(true);');
    expect(hookSource).toContain('setSuccess(true);');
    expect(pageSource).toContain('Workspace request submitted');
    expect(pageSource).toContain('Platform approval is required before this workspace becomes active.');
  });

  it('classifies public registration errors by account state, not workspace switching', () => {
    expect(hookSource).toContain('resolveRegistrationError(err,');
    expect(hookSource).toContain("action: 'submit'");
    expect(hookSource).toContain("entityLabel: 'workspace registration'");
    expect(hookSource).not.toContain("action: 'switch',\n                    entityLabel: 'workspace registration'");
    expect(hookSource).not.toContain("resolveWorkspaceError(err, {\n                    action: 'create'");
  });
});

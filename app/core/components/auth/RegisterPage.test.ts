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

  it('maps backend field validation to one form summary without retaining a duplicate API banner', () => {
    expect(hookSource).toContain('if (appError.fieldErrors)');
    expect(hookSource).toContain('const mappedErrors = mapRegisterFieldErrors(appError.fieldErrors)');
    expect(hookSource).toContain('setFormValidationError(createFormValidationAppError');
    expect(hookSource).toContain('setApiError(null);');
    expect(pageSource).toContain('{apiError && (');
    expect(pageSource).toContain('{hasVisibleFieldErrors && (');
    expect(pageSource).toContain('error={getFormFieldErrorMessage(fieldErrors.email)}');
  });

  it('treats pending workspace approval as a submitted state instead of a red failure', () => {
    expect(hookSource).toContain("if (res.status === 'pending')");
    expect(hookSource).toContain('setIsPending(true);');
    expect(hookSource).toContain('setSuccess(true);');
    expect(pageSource).toContain('Workspace request submitted');
    expect(pageSource).toContain('Platform approval is required before this workspace becomes active.');
  });

  it('classifies initial registration and additional-workspace failures separately', () => {
    expect(hookSource).toContain('resolveRegistrationError(err,');
    expect(hookSource).toContain("action: 'submit'");
    expect(hookSource).toContain("entityLabel: 'workspace registration'");
    expect(hookSource).toContain("completionOperation === CREATE_ADDITIONAL_WORKSPACE");
    expect(hookSource).toContain('resolveWorkspaceError(err,');
    expect(hookSource).toContain("action: 'create'");
    expect(hookSource).toContain("entityLabel: 'additional workspace'");
    expect(hookSource).not.toContain("action: 'switch',\n                    entityLabel: 'workspace registration'");
    expect(hookSource).not.toContain("Registration could not be submitted");
  });

  it('derives onboarding completion operation from AuthContext instead of URL mode', () => {
    expect(hookSource).toContain('CommercialOnboardingCompletionOperation');
    expect(hookSource).toContain("REGISTER_INITIAL_WORKSPACE");
    expect(hookSource).toContain("CREATE_ADDITIONAL_WORKSPACE");
    expect(hookSource).toContain('isCommercialWorkspaceFlow && user');
    expect(hookSource).not.toContain("mode === 'new_workspace'");
    expect(pageSource).toContain('Checking account state...');
  });
});

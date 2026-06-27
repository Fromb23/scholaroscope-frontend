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
});

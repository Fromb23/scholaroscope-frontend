import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('report compute form validation', () => {
  it('shows visible term feedback instead of silently skipping computation', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'app/core/components/reports/ComputePage.tsx'),
      'utf8',
    );
    const hookSource = readFileSync(
      join(process.cwd(), 'app/core/hooks/reports/useComputePage.ts'),
      'utf8',
    );

    expect(pageSource).toContain('<FormValidationSummary');
    expect(pageSource).toContain("error={getFormFieldErrorMessage(fieldErrors.term)}");
    expect(pageSource).toContain('focusFirstError(fieldErrors)');
    expect(hookSource).toContain('Select a term before computing.');
    expect(hookSource).not.toContain('if (!selectedTerm) return;');
  });
});

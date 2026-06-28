import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { validateNumericAssignmentScore } from './AssignmentReviewForm';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/assignments/AssignmentReviewForm.tsx'),
  'utf8',
);

describe('AssignmentReviewForm numeric marking', () => {
  it('blocks invalid numeric scores before saving', () => {
    expect(validateNumericAssignmentScore('', 30)).toBe('Numeric score is required for this assignment.');
    expect(validateNumericAssignmentScore('abc', 30)).toBe('Numeric score must be a number.');
    expect(validateNumericAssignmentScore('-1', 30)).toBe('Numeric score cannot be negative.');
    expect(validateNumericAssignmentScore('31', 30)).toBe('Numeric score cannot exceed 30.');
    expect(validateNumericAssignmentScore('30', 30)).toBeNull();
  });

  it('shows total marks, helper text, inline errors, and a validation summary', () => {
    const formSource = source();

    expect(formSource).toContain('<FormValidationSummary');
    expect(formSource).toContain('Numeric score${totalMarksLabel}');
    expect(formSource).toContain('Maximum score: ${assignment.total_marks}');
    expect(formSource).toContain('error={getFormFieldErrorMessage(fieldErrors.numericScore)}');
    expect(formSource).toContain('focusFirstError(nextFieldErrors)');
  });
});

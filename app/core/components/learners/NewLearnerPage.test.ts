import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'app/core/components/learners/NewLearnerPage.tsx'),
  'utf8',
);

describe('new learner class-context save flow', () => {
  it('preselects cohort context and redirects to safe returnTo after create', () => {
    expect(source).toContain("searchParams.get('cohort')");
    expect(source).toContain('getLearnerCreateReturnTo');
    expect(source).toContain('router.push(returnAfterCreate)');
  });

  it('uses the existing subject enrollment API for subject-context creation', () => {
    expect(source).toContain('bulkEnrollCohortSubjectLearners');
    expect(source).toContain('requestedCohortSubjectId');
    expect(source).not.toContain('freelance-only');
  });

  it('resolves creation failures through the learner error architecture', () => {
    expect(source).toContain('resolveLearnerError');
    expect(source).toContain('<AppErrorBanner error={error}');
    expect(source).toContain('normalizeFormFieldErrors(resolvedError.fieldErrors)');
    expect(source).toContain("error={getFormFieldErrorMessage(fieldErrors.admission_number)}");
    expect(source).toContain("error={getFormFieldErrorMessage(fieldErrors.cohort)}");
    expect(source).not.toContain('getLearnerCreationError');
  });

  it('owns local required-field validation with summary and first-error focus before API create', () => {
    expect(source).toContain('validateLearnerCreateForm');
    expect(source).toContain('<FormValidationSummary');
    expect(source).toContain('focusFirstError(validationErrors)');
    expect(source).toContain('Admission number is required.');
    expect(source).toContain('Cohort is required.');
    expect(source).toContain('First name is required.');
    expect(source).toContain('Last name is required.');
    expect(source).toContain('learnersAPI.createStudent(studentData)');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  LESSON_TITLE_REQUIRED_MESSAGE,
  validateLessonPlanEditForm,
} from './lessonPlanFormValidation';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/lessonPlans/LessonPlanForm.tsx'),
  'utf8',
);

describe('LessonPlanForm validation and error placement', () => {
  it('requires lesson title on edit', () => {
    expect(validateLessonPlanEditForm({ title: '' })).toEqual({
      title: LESSON_TITLE_REQUIRED_MESSAGE,
    });
  });

  it('accepts valid lesson title on edit', () => {
    expect(validateLessonPlanEditForm({ title: 'Equivalent fractions' })).toEqual({});
  });

  it('uses shared validation summary and inline title error', () => {
    const formSource = source();

    expect(formSource).toContain('<FormValidationSummary');
    expect(formSource).toContain("ref={setFieldRef('title')}");
    expect(formSource).toContain("id=\"lesson-plan-title\"");
    expect(formSource).toContain('aria-describedby={getFieldDescribedBy');
    expect(formSource).toContain('getFormFieldErrorMessage(fieldErrors.title)');
    expect(formSource).toContain('focusFirstError(validationErrors)');
    expect(formSource).not.toContain("setFormError('Title is required.')");
  });

  it('blocks the save API path before building the update payload when title is blank', () => {
    const formSource = source();
    const validationIndex = formSource.indexOf('if (hasFormFieldErrors(validationErrors))');
    const payloadIndex = formSource.indexOf('const payload: LessonPlanUpdatePayload');

    expect(validationIndex).toBeGreaterThan(-1);
    expect(payloadIndex).toBeGreaterThan(-1);
    expect(validationIndex).toBeLessThan(payloadIndex);
  });

  it('sends the trimmed title for valid saves', () => {
    const formSource = source();

    expect(formSource).toContain('const trimmedTitle = formData.title.trim();');
    expect(formSource).toContain('title: trimmedTitle');
  });

  it('uses one form-level error banner for non-field edit errors', () => {
    const formSource = source();

    expect(formSource.match(/message=\{formError\}/g) ?? []).toHaveLength(1);
    expect(formSource).not.toContain('autoDismissMs={5000}');
  });

  it('keeps reference-page errors and scheduled reference lock behavior', () => {
    const formSource = source();

    expect(formSource).toContain('Scheduled lesson plans lock reference scope');
    expect(formSource).toContain('validateReferencePages(referencePages, plannedOutcomeMap)');
    expect(formSource).toContain('setFormError(validatedReferences.error)');
    expect(formSource).toContain("referencesLocked = lessonPlan.status === 'SCHEDULED'");
  });
});

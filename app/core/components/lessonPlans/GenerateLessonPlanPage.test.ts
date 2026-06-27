import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  LESSON_TITLE_REQUIRED_MESSAGE,
  validateLessonPlanGenerationForm,
} from './lessonPlanFormValidation';

const source = () => readFileSync(
  join(process.cwd(), 'app/core/components/lessonPlans/GenerateLessonPlanPage.tsx'),
  'utf8',
);

describe('GenerateLessonPlanPage validation and error placement', () => {
  it('blank lesson title blocks generation with field validation', () => {
    expect(validateLessonPlanGenerationForm({ title: '   ' })).toEqual({
      title: LESSON_TITLE_REQUIRED_MESSAGE,
    });
  });

  it('valid lesson title can submit', () => {
    expect(validateLessonPlanGenerationForm({ title: 'Equivalent fractions' })).toEqual({});
  });

  it('shows blank lesson title inline and in the validation summary', () => {
    const pageSource = source();

    expect(pageSource).toContain('<FormValidationSummary');
    expect(pageSource).toContain("ref={setFieldRef('title')}");
    expect(pageSource).toContain('required');
    expect(pageSource).toContain('error={getFormFieldErrorMessage(fieldErrors.title)}');
    expect(pageSource).toContain('focusFirstError(validationErrors)');
  });

  it('does not create or generate when lesson title validation fails', () => {
    const pageSource = source();
    const validationIndex = pageSource.indexOf('if (hasFormFieldErrors(validationErrors))');
    const createIndex = pageSource.indexOf('const lessonPlan = await upsertDraftLessonPlan');

    expect(validationIndex).toBeGreaterThan(-1);
    expect(createIndex).toBeGreaterThan(-1);
    expect(validationIndex).toBeLessThan(createIndex);
  });

  it('sends the trimmed title and never sends undefined for blank title', () => {
    const pageSource = source();

    expect(pageSource).toContain('const trimmedTitle = title.trim();');
    expect(pageSource).toContain('title: trimmedTitle');
    expect(pageSource).not.toContain('title: title.trim() || undefined');
  });

  it('renders active lesson-plan errors in one primary banner only', () => {
    const pageSource = source();

    expect(pageSource.match(/message=\{activeErrorMessage\}/g) ?? []).toHaveLength(1);
    expect(pageSource).not.toContain('className="hidden md:flex"');
  });

  it('keeps distinct AI retry and missing reference warnings separate', () => {
    const pageSource = source();

    expect(pageSource).toContain('showRetryWithoutAi');
    expect(pageSource).toContain('Generate without AI');
    expect(pageSource).toContain('showMissingReferenceWarning');
    expect(pageSource).toContain('referenceCoverage.missingOutcomes.length');
  });

  it('preserves scheme-first redirect behavior', () => {
    const pageSource = source();

    expect(pageSource).toContain('router.push(schemeGenerationHref)');
    expect(pageSource).toContain('First document required: Scheme of Work');
  });
});

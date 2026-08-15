import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  getSchemeTermCalendarSetupMessage,
  SELF_MANAGED_TERM_SETUP_INCOMPLETE_MESSAGE,
} from './CreateSchemePage';
import {
  buildDefaultSchemeTitle,
  validateCreateSchemeStep,
  type CreateSchemeStepValidationInput,
} from '@/app/plugins/schemes/lib/workflow';

const incompleteTerm = { configuration_state: 'SETUP_OPEN' as const, configuration_locked_reason: null };
const completeTerm = { configuration_state: 'SETUP_LOCKED' as const, configuration_locked_reason: 'Term configuration locked.' };
const historicalTerm = { configuration_state: 'HISTORICAL_LOCKED' as const, configuration_locked_reason: 'Historical terms are locked.' };
const source = readFileSync(
  join(process.cwd(), 'app/plugins/schemes/components/CreateSchemePage.tsx'),
  'utf8',
);

describe('create scheme term calendar setup copy', () => {
  it('keeps institution teacher wording when the term calendar is incomplete', () => {
    expect(getSchemeTermCalendarSetupMessage({
      selectedTerm: incompleteTerm,
      selfManagedTeachingAdmin: false,
      isTeachingActor: true,
    })).toBe('Your admin needs to complete the term calendar before schemes can be generated.');
  });

  it('uses owner wording for self-managed teaching workspaces', () => {
    expect(getSchemeTermCalendarSetupMessage({
      selectedTerm: incompleteTerm,
      selfManagedTeachingAdmin: true,
      isTeachingActor: true,
    })).toBe(SELF_MANAGED_TERM_SETUP_INCOMPLETE_MESSAGE);
  });

  it('does not show a prerequisite error once the calendar setup is complete', () => {
    expect(getSchemeTermCalendarSetupMessage({
      selectedTerm: completeTerm,
      selfManagedTeachingAdmin: true,
      isTeachingActor: true,
    })).toBeNull();
  });

  it('uses the server locked reason for historical terms', () => {
    expect(getSchemeTermCalendarSetupMessage({
      selectedTerm: historicalTerm,
      selfManagedTeachingAdmin: true,
      isTeachingActor: true,
    })).toBe('Historical terms are locked.');
  });

  it('uses asynchronous scheme generation job polling', () => {
    expect(source).toContain('schemesAPI.getGenerationJob');
    expect(source).toContain('Generation already queued.');
    expect(source).toContain('generated.result_payload.scheme');
    expect(source).toContain('Scheme generation failed. Please retry.');
  });
});

const validStepInput: CreateSchemeStepValidationInput = {
  step: 1,
  hasSelectedCurriculum: true,
  hasSelectedSubject: true,
  hasSelectedLevel: true,
  hasSelectedCohortSubject: true,
  hasSelectedTerm: true,
  hasTitle: true,
  noActiveTermMessage: null,
  termCalendarIsComplete: true,
  termCalendarSetupMessage: null,
  activeLearningWeekCount: 10,
  lessonsPerWeekValue: 4,
  weeklyTeachingLoadConfirmed: true,
  lessonDurationMinutesValue: 40,
  strandsError: null,
  flattenedSubStrandCount: 4,
  rangeError: null,
  hasStartStrand: true,
  hasStartSubStrand: true,
  hasEndStrand: true,
  hasEndSubStrand: true,
  hasCurriculumRange: true,
};

describe('create scheme wizard validation targets', () => {
  it('Step 1 invalid remains on Step 1 and targets the first missing teaching-context field', () => {
    expect(validateCreateSchemeStep({
      ...validStepInput,
      hasSelectedCurriculum: false,
    })).toEqual({
      valid: false,
      step: 1,
      target: 'curriculum',
      message: 'Choose the curriculum.',
    });

    expect(validateCreateSchemeStep({
      ...validStepInput,
      hasTitle: false,
    })).toEqual({
      valid: false,
      step: 1,
      target: 'title',
      message: 'Enter a scheme title.',
    });
  });

  it('Step 2 incomplete term calendar targets the calendar status action area', () => {
    expect(validateCreateSchemeStep({
      ...validStepInput,
      step: 2,
      termCalendarIsComplete: false,
      termCalendarSetupMessage: SELF_MANAGED_TERM_SETUP_INCOMPLETE_MESSAGE,
    })).toEqual({
      valid: false,
      step: 2,
      target: 'term-calendar',
      message: SELF_MANAGED_TERM_SETUP_INCOMPLETE_MESSAGE,
    });
  });

  it('Step 2 invalid teaching periods target the lessons-per-week input', () => {
    expect(validateCreateSchemeStep({
      ...validStepInput,
      step: 2,
      lessonsPerWeekValue: 11,
    })).toEqual({
      valid: false,
      step: 2,
      target: 'lessons-per-week',
      message: 'Lessons per week must be between 1 and 10.',
    });
  });

  it('Step 3 invalid range targets the relevant selector', () => {
    expect(validateCreateSchemeStep({
      ...validStepInput,
      step: 3,
      hasStartSubStrand: false,
    })).toEqual({
      valid: false,
      step: 3,
      target: 'start-substrand',
      message: 'Choose the first sub-strand to cover.',
    });
  });

  it('successful validation advances normally by returning a valid result', () => {
    expect(validateCreateSchemeStep({
      ...validStepInput,
      step: 1,
    })).toEqual({ valid: true });
    expect(validateCreateSchemeStep({
      ...validStepInput,
      step: 2,
    })).toEqual({ valid: true });
    expect(validateCreateSchemeStep({
      ...validStepInput,
      step: 3,
    })).toEqual({ valid: true });
  });

  it('wires all failed validation and generation failures through one focus mechanism', () => {
    expect(source).toContain('handleValidationFailure(result)');
    expect(source).toContain('handleValidationFailure(validationResult)');
    expect(source).toContain('focusValidationTarget(stepError.target)');
    expect(source).toContain("focusValidationTarget('generation-status')");
    expect(source).toContain("block: 'center'");
    expect(source).toContain('validationFocusRequest === 0');
    expect(source).toContain("id={CREATE_SCHEME_TARGET_ELEMENT_IDS['generation-status']}");
  });

  it('Step 4 generation/API failure renders a visible accessible error region', () => {
    expect(source).toContain('setGenerationFailure(');
    expect(source).toContain('Draft scheme generation failed');
    expect(source).toContain('role="alert"');
    expect(source).toContain('aria-live="polite"');
  });

  it('clears stale step errors after correction, successful advance, or Back', () => {
    expect(source).toContain('if (result.valid)');
    expect(source).toContain('setStepError(null)');
    expect(source).toContain('const handleBack = () =>');
  });
});

describe('create scheme default title', () => {
  it('derives a useful title from teaching context, term, and academic year', () => {
    expect(buildDefaultSchemeTitle({
      levelLabel: 'Grade 9 cv',
      subjectName: 'Mathematics',
      academicYearName: '2026/2027',
      termName: 'sem1',
    })).toBe('Grade 9 cv Mathematics 2026/2027 sem1 Scheme of Work');
  });

  it('does not derive a title until authoritative context exists', () => {
    expect(buildDefaultSchemeTitle({
      levelLabel: 'Grade 9',
      subjectName: '',
      termName: 'sem1',
      academicYearName: '2026/2027',
    })).toBe('');
  });

  it('updates default title while titleTouched is false and preserves manual titles afterward', () => {
    expect(source).toContain('if (titleTouched) {');
    expect(source).toContain('buildDefaultSchemeTitle');
    expect(source).toContain('setTitle(defaultTitle)');
    expect(source).toContain('setTitleTouched(true)');
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  getSchemeTermCalendarSetupMessage,
  SELF_MANAGED_TERM_SETUP_INCOMPLETE_MESSAGE,
} from './CreateSchemePage';
import {
  buildDefaultSchemeTitle,
  buildSchemeTermCalendarSetupHref,
  buildSchemeWeeksFromTermCalendar,
  resolveSchemeTermCalendarState,
  summarizeSchemeWeeks,
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

describe('create scheme calendar state projection', () => {
  it('shows one incomplete calendar state and a configuration action only for SETUP_OPEN', () => {
    const state = resolveSchemeTermCalendarState({
      selectedTerm: incompleteTerm,
      canManageCalendar: true,
      selfManagedTeachingAdmin: true,
      setupMessage: SELF_MANAGED_TERM_SETUP_INCOMPLETE_MESSAGE,
    });

    expect(state).toMatchObject({
      state: 'INCOMPLETE',
      showConfigurationAction: true,
      title: 'Term calendar setup incomplete',
      actionLabel: 'Review term calendar',
    });
    expect(source).toContain('resolveSchemeTermCalendarState');
    expect(source).toContain('termCalendarState.showConfigurationAction');
    expect(source).not.toContain("selfManagedTeachingAdmin ? 'Your term calendar' : 'Admin-managed term calendar'");
  });

  it('treats SETUP_LOCKED as ready and never asks for review', () => {
    const state = resolveSchemeTermCalendarState({
      selectedTerm: completeTerm,
      canManageCalendar: true,
      selfManagedTeachingAdmin: true,
      setupMessage: null,
    });

    expect(state).toMatchObject({
      state: 'READY',
      showConfigurationAction: false,
      title: 'Term calendar ready',
    });
    expect(getSchemeTermCalendarSetupMessage({
      selectedTerm: completeTerm,
      selfManagedTeachingAdmin: true,
      isTeachingActor: true,
    })).toBeNull();
  });

  it('keeps HISTORICAL_LOCKED read-only with no configuration action', () => {
    const state = resolveSchemeTermCalendarState({
      selectedTerm: historicalTerm,
      canManageCalendar: true,
      selfManagedTeachingAdmin: false,
      setupMessage: 'Historical terms are locked.',
    });

    expect(state).toMatchObject({
      state: 'HISTORICAL',
      showConfigurationAction: false,
      title: 'Term calendar is historical',
      message: "This term's calendar is locked and cannot be changed.",
    });
  });

  it('allows Step 2 for a SETUP_LOCKED term even when there are zero calendar events', () => {
    const derivedWeeks = buildSchemeWeeksFromTermCalendar(
      {
        start_date: '2026-07-01',
        end_date: '2026-07-28',
        week_count: 4,
      },
      [],
    );
    const weekSummary = summarizeSchemeWeeks(derivedWeeks);

    expect(derivedWeeks).toHaveLength(4);
    expect(weekSummary.activeLearningWeekCount).toBe(4);
    expect(validateCreateSchemeStep({
      ...validStepInput,
      step: 2,
      termCalendarIsComplete: completeTerm.configuration_state === 'SETUP_LOCKED',
      activeLearningWeekCount: weekSummary.activeLearningWeekCount,
    })).toEqual({ valid: true });
  });

  it('treats a reopened SETUP_OPEN term as incomplete again', () => {
    expect(resolveSchemeTermCalendarState({
      selectedTerm: incompleteTerm,
      canManageCalendar: true,
      selfManagedTeachingAdmin: false,
      setupMessage: 'Complete the term calendar in term setup before generating schemes of work.',
    })).toMatchObject({
      state: 'INCOMPLETE',
      showConfigurationAction: true,
      actionLabel: 'Edit term calendar',
    });
  });

  it('builds a safe calendar setup return link with exact scheme context preserved', () => {
    const href = buildSchemeTermCalendarSetupHref({
      selectedTermId: 7,
      currentSchemeHref:
        '/schemes/new?cohort_subject=28&returnTo=%2Freports%2Fsubjects%2F4%3Fterm%3D7&source=teacher',
    });
    const url = new URL(href, 'http://localhost');

    expect(url.pathname).toBe('/academic/terms');
    expect(url.searchParams.get('term')).toBe('7');
    expect(url.searchParams.get('returnTo')).toBe(
      '/schemes/new?cohort_subject=28&returnTo=%2Freports%2Fsubjects%2F4%3Fterm%3D7&source=teacher',
    );
  });

  it('rejects unsafe nested returnTo while still navigating to term setup', () => {
    const href = buildSchemeTermCalendarSetupHref({
      selectedTermId: 7,
      currentSchemeHref: '/schemes/new?cohort_subject=28&returnTo=https%3A%2F%2Fevil.example',
    });
    const url = new URL(href, 'http://localhost');

    expect(url.pathname).toBe('/academic/terms');
    expect(url.searchParams.get('term')).toBe('7');
    expect(url.searchParams.get('returnTo')).toBe('/schemes/new');
  });

  it('refetches authoritative academic lifecycle state when the wizard mounts or resumes', () => {
    expect(source).toContain("refetchOnMount: 'always'");
    expect(source).toContain("termCalendarIsComplete: selectedTerm?.configuration_state === 'SETUP_LOCKED'");
    expect(source).not.toContain('termCalendarEvents.length');
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

  it('Step 2 complete calendar proceeds to later validation fields', () => {
    expect(validateCreateSchemeStep({
      ...validStepInput,
      step: 2,
      termCalendarIsComplete: true,
      weeklyTeachingLoadConfirmed: false,
    })).toEqual({
      valid: false,
      step: 2,
      target: 'weekly-load-confirmation',
      message: 'Confirm the weekly teaching periods for this subject before continuing.',
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

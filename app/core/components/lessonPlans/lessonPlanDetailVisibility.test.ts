import { describe, expect, it } from 'vitest';

import {
  getLessonPlanDetailInitialSectionState,
  shouldOpenLearnerTaskFromQuery,
  shouldShowLearnerTaskSection,
} from './lessonPlanDetailVisibility';

describe('lesson plan detail visibility rules', () => {
  it('hides learner task preparation for used and archived records', () => {
    expect(shouldShowLearnerTaskSection({ status: 'USED', canShowLearnerTaskAction: true })).toBe(false);
    expect(shouldShowLearnerTaskSection({ status: 'ARCHIVED', canShowLearnerTaskAction: true })).toBe(false);
  });

  it('keeps learner task preparation visible for active plan states when permitted', () => {
    expect(shouldShowLearnerTaskSection({ status: 'GENERATED', canShowLearnerTaskAction: true })).toBe(true);
    expect(shouldShowLearnerTaskSection({ status: 'REVIEWED', canShowLearnerTaskAction: true })).toBe(true);
    expect(shouldShowLearnerTaskSection({ status: 'SCHEDULED', canShowLearnerTaskAction: true })).toBe(true);
  });

  it('does not show learner task preparation without teaching permissions', () => {
    expect(shouldShowLearnerTaskSection({ status: 'GENERATED', canShowLearnerTaskAction: false })).toBe(false);
  });

  it('keeps heavy detail sections collapsed by default', () => {
    expect(getLessonPlanDetailInitialSectionState()).toEqual({
      outcomesOpen: false,
      lessonContentOpen: false,
      referencesOpen: false,
      metadataOpen: false,
      generationMetadataOpen: false,
    });
  });

  it('opens the learner task section from query params only when the section is allowed', () => {
    expect(shouldOpenLearnerTaskFromQuery({
      section: 'learner-task',
      showLearnerTaskSection: true,
    })).toBe(true);
    expect(shouldOpenLearnerTaskFromQuery({
      section: 'learner-task',
      showLearnerTaskSection: false,
    })).toBe(false);
    expect(shouldOpenLearnerTaskFromQuery({
      section: 'references',
      showLearnerTaskSection: true,
    })).toBe(false);
  });
});

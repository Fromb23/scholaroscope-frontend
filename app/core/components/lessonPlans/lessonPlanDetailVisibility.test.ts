import { describe, expect, it } from 'vitest';

import {
  getLessonPlanDetailInitialSectionState,
  shouldOpenLearnerTaskFromQuery,
  shouldShowLearnerTaskSection,
} from './lessonPlanDetailVisibility';

describe('lesson plan detail visibility rules', () => {
  it('hides learner task preparation for used and archived records', () => {
    expect(shouldShowLearnerTaskSection({ status: 'USED', canPrepareLearnerTask: true })).toBe(false);
    expect(shouldShowLearnerTaskSection({ status: 'ARCHIVED', canPrepareLearnerTask: true })).toBe(false);
  });

  it('keeps learner task preparation hidden for generated plans without historical learner work', () => {
    expect(shouldShowLearnerTaskSection({ status: 'GENERATED', canPrepareLearnerTask: false })).toBe(false);
  });

  it('shows learner task preparation only when reviewed or scheduled plans are eligible', () => {
    expect(shouldShowLearnerTaskSection({ status: 'REVIEWED', canPrepareLearnerTask: true })).toBe(true);
    expect(shouldShowLearnerTaskSection({ status: 'SCHEDULED', canPrepareLearnerTask: true })).toBe(true);
    expect(shouldShowLearnerTaskSection({ status: 'REVIEWED', canPrepareLearnerTask: false })).toBe(false);
  });

  it('preserves learner task read access when historical learner work exists', () => {
    expect(shouldShowLearnerTaskSection({
      status: 'GENERATED',
      canPrepareLearnerTask: false,
      hasPreparedAssignment: true,
    })).toBe(true);
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

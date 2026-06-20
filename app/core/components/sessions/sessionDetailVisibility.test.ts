import { describe, expect, it } from 'vitest';

import {
  shouldShowMergedCohortBadge,
  shouldShowParticipatingCohorts,
  shouldShowPostLessonAssignmentActions,
} from './sessionDetailVisibility';

describe('session detail visibility rules', () => {
  it('hides live participating cohort management after completion or cancellation', () => {
    expect(shouldShowParticipatingCohorts('COMPLETED')).toBe(false);
    expect(shouldShowParticipatingCohorts('CANCELLED')).toBe(false);
    expect(shouldShowParticipatingCohorts('SCHEDULED')).toBe(true);
    expect(shouldShowParticipatingCohorts('IN_PROGRESS')).toBe(true);
  });

  it('only shows the multi-cohort badge while cohort participation remains live', () => {
    expect(shouldShowMergedCohortBadge({ isMerged: true, status: 'COMPLETED' })).toBe(false);
    expect(shouldShowMergedCohortBadge({ isMerged: true, status: 'IN_PROGRESS' })).toBe(true);
    expect(shouldShowMergedCohortBadge({ isMerged: false, status: 'IN_PROGRESS' })).toBe(false);
  });

  it('keeps completed session assignment creation and issue actions hidden', () => {
    expect(shouldShowPostLessonAssignmentActions()).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import {
  shouldShowMergedCohortBadge,
  shouldShowParticipatingCohorts,
  shouldShowPostLessonAssignmentActions,
} from './sessionDetailVisibility';

describe('session detail visibility rules', () => {
  it('keeps participating cohorts visible after completion or cancellation', () => {
    expect(shouldShowParticipatingCohorts('COMPLETED')).toBe(true);
    expect(shouldShowParticipatingCohorts('CANCELLED')).toBe(true);
    expect(shouldShowParticipatingCohorts('SCHEDULED')).toBe(true);
    expect(shouldShowParticipatingCohorts('IN_PROGRESS')).toBe(true);
  });

  it('shows the multi-cohort badge whenever a session has multiple visible cohorts', () => {
    expect(shouldShowMergedCohortBadge({ isMerged: true, status: 'COMPLETED' })).toBe(true);
    expect(shouldShowMergedCohortBadge({ isMerged: true, status: 'IN_PROGRESS' })).toBe(true);
    expect(shouldShowMergedCohortBadge({ isMerged: false, status: 'IN_PROGRESS' })).toBe(false);
  });

  it('keeps completed session assignment creation and issue actions hidden', () => {
    expect(shouldShowPostLessonAssignmentActions()).toBe(false);
  });
});

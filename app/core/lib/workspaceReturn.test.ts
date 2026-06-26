import { describe, expect, it } from 'vitest';

import { getReturnBackLabel, isCohortWorkspaceReturnTo } from './workspaceReturn';

describe('workspace return helpers', () => {
  it('recognizes cohort subject workspace anchors', () => {
    expect(isCohortWorkspaceReturnTo('/academic/cohorts/9#subject-26')).toBe(true);
    expect(isCohortWorkspaceReturnTo('/academic/cohorts/9?setup=1#subject-26')).toBe(true);
    expect(isCohortWorkspaceReturnTo('/academic/cohorts#subject-26')).toBe(false);
    expect(isCohortWorkspaceReturnTo('/reports/instructor/cohort-subjects/26')).toBe(false);
  });

  it('labels cohort workspace returns clearly', () => {
    expect(getReturnBackLabel('/academic/cohorts/9#subject-26')).toBe('Back to workspace');
    expect(getReturnBackLabel('/lesson-plans')).toBe('Back');
    expect(getReturnBackLabel('/lesson-plans', 'Back to Lesson Plans')).toBe('Back to Lesson Plans');
  });
});

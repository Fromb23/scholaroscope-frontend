import { describe, expect, it } from 'vitest';

import {
  buildClassSubjectReturnTo,
  buildLearnerCreateHref,
  getLearnerCreateReturnTo,
} from './learnerCreateNavigation';

describe('learner create navigation', () => {
  it('builds class-context learner creation links with encoded returnTo', () => {
    expect(buildLearnerCreateHref({ cohortId: 9 })).toBe(
      '/learners/new?cohort=9&returnTo=%2Facademic%2Fcohorts%2F9',
    );
  });

  it('builds subject-context learner creation links with cohort subject and anchor returnTo', () => {
    expect(buildLearnerCreateHref({ cohortId: 9, cohortSubjectId: 26 })).toBe(
      '/learners/new?cohort=9&cohort_subject=26&returnTo=%2Facademic%2Fcohorts%2F9%23subject-26',
    );
    expect(buildClassSubjectReturnTo(9, 26)).toBe('/academic/cohorts/9#subject-26');
  });

  it('keeps safe explicit returnTo and ignores unsafe external returnTo', () => {
    expect(getLearnerCreateReturnTo({
      returnTo: '/academic/cohorts/9',
      cohortId: 9,
      isSelfManagedTeachingWorkspace: true,
    })).toBe('/academic/cohorts/9');
    expect(getLearnerCreateReturnTo({
      returnTo: 'https://example.com/steal',
      cohortId: 9,
      isSelfManagedTeachingWorkspace: true,
    })).toBe('/academic/cohorts/9');
  });

  it('keeps institution global creation on the existing non-return flow', () => {
    expect(getLearnerCreateReturnTo({
      returnTo: null,
      cohortId: null,
      isSelfManagedTeachingWorkspace: false,
    })).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import {
  buildClassSubjectReturnTo,
  buildLearnerCreateHref,
  getLearnerCreateReturnTo,
  resolveLearnerCreateNavigation,
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
      returnTo: '/academic/cohorts/9#subject-26',
      cohortId: 9,
      cohortSubjectId: 26,
      isSelfManagedTeachingWorkspace: true,
    })).toBe('/academic/cohorts/9#subject-26');
    expect(getLearnerCreateReturnTo({
      returnTo: 'https://example.com/steal',
      cohortId: 9,
      isSelfManagedTeachingWorkspace: true,
    })).toBe('/academic/cohorts/9');
  });

  it('falls back from unsafe returnTo to the class-subject context when available', () => {
    expect(getLearnerCreateReturnTo({
      returnTo: 'https://example.com/steal',
      cohortId: 9,
      cohortSubjectId: 26,
      isSelfManagedTeachingWorkspace: true,
    })).toBe('/academic/cohorts/9#subject-26');
  });

  it('keeps institution global creation on the existing non-return flow', () => {
    expect(getLearnerCreateReturnTo({
      returnTo: null,
      cohortId: null,
      isSelfManagedTeachingWorkspace: false,
    })).toBeNull();
  });

  it('uses the same contextual destination for Back, Cancel, and successful create', () => {
    expect(resolveLearnerCreateNavigation({
      returnTo: '/academic/cohorts/14',
      cohortId: 14,
      isSelfManagedTeachingWorkspace: true,
    })).toEqual({
      returnTo: '/academic/cohorts/14',
      backHref: '/academic/cohorts/14',
      cancelHref: '/academic/cohorts/14',
      successHref: '/academic/cohorts/14',
      doneHref: '/academic/cohorts/14',
    });
  });

  it('uses anchored class-subject returnTo across contextual learner exits', () => {
    expect(resolveLearnerCreateNavigation({
      returnTo: '/academic/cohorts/14#subject-28',
      cohortId: 14,
      cohortSubjectId: 28,
      isSelfManagedTeachingWorkspace: true,
    })).toMatchObject({
      backHref: '/academic/cohorts/14#subject-28',
      cancelHref: '/academic/cohorts/14#subject-28',
      successHref: '/academic/cohorts/14#subject-28',
      doneHref: '/academic/cohorts/14#subject-28',
    });
  });

  it('falls back direct learner creation exits to learners without inventing a success redirect', () => {
    expect(resolveLearnerCreateNavigation({
      returnTo: null,
      cohortId: null,
      isSelfManagedTeachingWorkspace: false,
    })).toEqual({
      returnTo: null,
      backHref: '/learners',
      cancelHref: '/learners',
      successHref: null,
      doneHref: '/learners',
    });
  });

  it('rejects unsafe returnTo values and resolves safe learner-create exits', () => {
    expect(resolveLearnerCreateNavigation({
      returnTo: 'https://evil.example',
      cohortId: null,
      isSelfManagedTeachingWorkspace: false,
    })).toEqual({
      returnTo: null,
      backHref: '/learners',
      cancelHref: '/learners',
      successHref: null,
      doneHref: '/learners',
    });
  });
});

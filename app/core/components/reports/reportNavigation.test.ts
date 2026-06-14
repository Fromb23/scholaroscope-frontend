import { describe, expect, it } from 'vitest';

import {
  buildCohortReportHref,
  buildCohortSubjectReportHref,
  buildInstructorReportHref,
  buildInstructorClassReportHref,
  buildInstructorCohortSubjectDetailHref,
  buildLearnerReportHref,
  buildReportReturnTo,
  buildSubjectReportHref,
  parsePositiveReportParam,
  resolveReportBackHref,
} from './reportNavigation';

describe('report navigation helpers', () => {
  it('builds a clean class report route when no term is selected', () => {
    expect(buildInstructorClassReportHref(3)).toBe(
      '/reports/instructor/cohort-subjects/3/class-report',
    );
  });

  it('preserves only the relevant term filter in the class report route', () => {
    expect(buildInstructorClassReportHref(3, 7)).toBe(
      '/reports/instructor/cohort-subjects/3/class-report?term=7',
    );
  });

  it('adds class report context params when they are available', () => {
    expect(buildInstructorClassReportHref(3, 7, {
      cohortId: 5,
      returnTo: '/reports/instructor/cohort-subjects/3',
    })).toBe(
      '/reports/instructor/cohort-subjects/3/class-report?term=7&cohort=5&returnTo=%2Freports%2Finstructor%2Fcohort-subjects%2F3',
    );
  });

  it('preserves the selected term on the cohort-subject detail route', () => {
    expect(buildInstructorCohortSubjectDetailHref(3, 7)).toBe(
      '/reports/instructor/cohort-subjects/3?term=7',
    );
  });

  it('accepts only positive integer report params', () => {
    expect(parsePositiveReportParam('5')).toBe(5);
    expect(parsePositiveReportParam('0')).toBeNull();
    expect(parsePositiveReportParam('-2')).toBeNull();
    expect(parsePositiveReportParam('abc')).toBeNull();
    expect(parsePositiveReportParam(null)).toBeNull();
  });

  it('builds canonical admin report hrefs with shared query state', () => {
    expect(buildLearnerReportHref(9, { term: 7, returnTo: '/reports/students' })).toBe(
      '/reports/students/9?term=7&returnTo=%2Freports%2Fstudents',
    );
    expect(buildCohortReportHref(4, { term: 7, tab: 'subjects' })).toBe(
      '/reports/cohorts/4?term=7&tab=subjects',
    );
    expect(buildSubjectReportHref(8, { term: 7, cohort: 4 })).toBe(
      '/reports/subjects/8?term=7&cohort=4',
    );
    expect(buildCohortSubjectReportHref(6, { term: 7, cohort: 4, subject: 8 })).toBe(
      '/reports/cohort-subjects/6?term=7&cohort=4&subject=8',
    );
    expect(buildInstructorReportHref(12, { term: 7, cohort: 4 })).toBe(
      '/reports/instructors/12?term=7&cohort=4',
    );
  });

  it('builds returnTo paths without nesting previous returnTo values', () => {
    expect(buildReportReturnTo('/reports/cohorts/4', {
      term: 7,
      tab: 'subjects',
      returnTo: '/reports',
    })).toBe('/reports/cohorts/4?term=7&tab=subjects');
  });

  it('prefers returnTo when resolving back navigation', () => {
    expect(resolveReportBackHref({
      returnTo: '/reports/cohorts/4?term=7&tab=subjects',
      fallbackHref: '/reports/cohorts/4',
      fallbackState: { term: 7 },
    })).toBe('/reports/cohorts/4?term=7&tab=subjects');
  });

  it('falls back to the parent href with preserved state when returnTo is missing', () => {
    expect(resolveReportBackHref({
      fallbackHref: '/reports/cohorts/4',
      fallbackState: { term: 7, tab: 'subjects' },
    })).toBe('/reports/cohorts/4?term=7&tab=subjects');
  });
});

import { describe, expect, it } from 'vitest';

import {
  buildCbcCohortProgressHref,
  buildCbcLearnerProgressHref,
  buildCohortReportHref,
  buildCohortSubjectReportHref,
  buildInstructorReportHref,
  buildInstructorClassReportHref,
  buildInstructorCohortSubjectDetailHref,
  buildLearnerAssessmentReportHref,
  buildLearnerReportHref,
  buildLearnerSubjectReportHref,
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
    expect(buildLearnerSubjectReportHref(9, 6, {
      returnTo: '/reports/students/9?term=7',
    })).toBe(
      '/reports/learners/9/subject?cohort_subject=6&returnTo=%2Freports%2Fstudents%2F9%3Fterm%3D7',
    );
    expect(buildLearnerAssessmentReportHref(9, {
      assessment: 22,
      cohortSubjectId: 6,
      assessmentType: 'CAT',
      term: 7,
      subjectId: 8,
      cohortId: 4,
      returnTo: '/assessments/22?tab=scores',
    })).toBe(
      '/reports/learners/9/assessments?assessment=22&cohort_subject=6&assessment_type=CAT&term=7&subject=8&cohort=4&returnTo=%2Fassessments%2F22%3Ftab%3Dscores',
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

  it('falls back to the instructor reports index when the instructor id is invalid', () => {
    expect(buildInstructorReportHref(Number.NaN, {
      term: 7,
      returnTo: '/admin/instructors/13/progress',
    })).toBe('/reports/instructors?term=7&returnTo=%2Fadmin%2Finstructors%2F13%2Fprogress');
  });

  it('builds CBC progress routes with preserved report context', () => {
    expect(buildCbcLearnerProgressHref(9, {
      subject: 8,
      cohortSubject: 6,
      returnTo: '/reports/students/9?term=7',
    })).toBe(
      '/cbc/progress/learner/9?subject=8&cohort_subject=6&returnTo=%2Freports%2Fstudents%2F9%3Fterm%3D7',
    );
    expect(buildCbcCohortProgressHref(4, {
      subject: 8,
      cohortSubject: 6,
      instructor: 12,
      returnTo: '/reports/cohorts/4?term=7',
    })).toBe(
      '/cbc/progress/cohort/4?subject=8&cohort_subject_id=6&instructor_id=12&returnTo=%2Freports%2Fcohorts%2F4%3Fterm%3D7',
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

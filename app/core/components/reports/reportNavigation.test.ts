import { describe, expect, it } from 'vitest';

import {
  buildCbcCohortProgressHref,
  buildCbcLearnerProgressHref,
  buildCohortReportHref,
  buildCohortSubjectReportHref,
  buildInstructorReportHref,
  buildInstructorClassReportHref,
  buildInstructorCohortSubjectDetailHref,
  buildInstructorCohortSubjectProjectionHref,
  buildLearnerAssessmentReportHref,
  buildLearnerAssignmentReportHref,
  buildLearnerOverviewReportHref,
  buildLearnerReportHref,
  buildLearnerSubjectReportHref,
  buildReportReturnTo,
  buildSessionReportHref,
  buildExactReportReturnTo,
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
    expect(
      buildInstructorClassReportHref(3, 7, {
        cohortId: 5,
        returnTo: '/reports/instructor/cohort-subjects/3',
      }),
    ).toBe(
      '/reports/instructor/cohort-subjects/3/class-report?term=7&cohort=5&returnTo=%2Freports%2Finstructor%2Fcohort-subjects%2F3',
    );
  });

  it('preserves the selected term on the cohort-subject detail route', () => {
    expect(buildInstructorCohortSubjectDetailHref(3, 7)).toBe(
      '/reports/instructor/cohort-subjects/3?term=7',
    );
  });

  it.each([
    'learners',
    'attendance',
    'assessments-results',
    'assignments',
    'curriculum-progress',
  ] as const)(
    'keeps the %s projection on the same instructor cohort-subject object',
    (projection) => {
      const href = buildInstructorCohortSubjectProjectionHref(
        3,
        projection,
        'projection=learners&term=1&q=amina&sort=name&page=2&status=support',
      );
      const url = new URL(href, 'https://scholaroscope.local');

      expect(url.pathname).toBe('/reports/instructor/cohort-subjects/3');
      expect(url.searchParams.get('projection')).toBe(projection);
      expect(url.searchParams.get('term')).toBe('1');
      expect(url.searchParams.get('q')).toBe('amina');
      expect(url.searchParams.get('sort')).toBe('name');
      expect(url.searchParams.get('page')).toBe('2');
      expect(href).not.toContain('/reports/subjects/');
    },
  );

  it('accepts only positive integer report params', () => {
    expect(parsePositiveReportParam('5')).toBe(5);
    expect(parsePositiveReportParam('0')).toBeNull();
    expect(parsePositiveReportParam('-2')).toBeNull();
    expect(parsePositiveReportParam('abc')).toBeNull();
    expect(parsePositiveReportParam(null)).toBeNull();
  });

  it('builds the default learner assessment route without hard assessment filters', () => {
    const href = buildLearnerAssessmentReportHref(74, {
      cohortSubjectId: 3,
      term: 1,
      subjectId: 13,
      cohortId: 5,
      returnTo: '/assessments/10',
    });

    expect(href).toBe(
      '/reports/learners/74/assessments?cohort_subject=3&term=1&subject=13&cohort=5&returnTo=%2Fassessments%2F10',
    );
    expect(href).not.toContain('assessment=');
    expect(href).not.toContain('assessment_type=');
  });

  it('builds learner assignment report routes with assignment highlight and return state', () => {
    expect(
      buildLearnerAssignmentReportHref(74, {
        cohortSubjectId: 3,
        highlightAssignment: 99,
        returnTo:
          '/academic/cohorts/5/assignments/99?workflow=review&unit=student%3A12&tab=evaluations&returnTo=%2Facademic%2Fcohorts%2F5%2Fassignments',
      }),
    ).toBe(
      '/reports/learners/74/assignments?cohort_subject=3&highlightAssignment=99&assignment=99&returnTo=%2Facademic%2Fcohorts%2F5%2Fassignments%2F99%3Fworkflow%3Dreview%26unit%3Dstudent%253A12%26tab%3Devaluations%26returnTo%3D%252Facademic%252Fcohorts%252F5%252Fassignments',
    );
  });

  it('builds learner overview report routes with complete learner profile return state', () => {
    expect(
      buildLearnerOverviewReportHref(18, {
        returnTo:
          '/learners/18?back=sort%3Dadmission_number%3Aasc%26page%3D1%26page_size%3D20&section=reports',
      }),
    ).toBe(
      '/reports/learners/18/overview?returnTo=%2Flearners%2F18%3Fback%3Dsort%253Dadmission_number%253Aasc%2526page%253D1%2526page_size%253D20%26section%3Dreports',
    );
  });

  it('builds canonical admin report hrefs with shared query state', () => {
    expect(buildLearnerReportHref(9, { term: 7, returnTo: '/reports/students' })).toBe(
      '/reports/students/9?term=7&returnTo=%2Freports%2Fstudents',
    );
    expect(
      buildLearnerSubjectReportHref(9, 6, {
        returnTo: '/reports/students/9?term=7',
      }),
    ).toBe(
      '/reports/learners/9/subject?cohort_subject=6&returnTo=%2Freports%2Fstudents%2F9%3Fterm%3D7',
    );
    expect(
      buildLearnerAssessmentReportHref(9, {
        assessment: 22,
        cohortSubjectId: 6,
        assessmentType: 'CAT',
        term: 7,
        subjectId: 8,
        cohortId: 4,
        returnTo: '/assessments/22?tab=scores',
      }),
    ).toBe(
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
    expect(
      buildInstructorReportHref(Number.NaN, {
        term: 7,
        returnTo: '/admin/instructors/13/progress',
      }),
    ).toBe('/reports/instructors?term=7&returnTo=%2Fadmin%2Finstructors%2F13%2Fprogress');
  });

  it('builds CBC progress routes with preserved report context', () => {
    expect(
      buildCbcLearnerProgressHref(9, {
        subject: 8,
        cohortSubject: 6,
        returnTo: '/reports/students/9?term=7',
      }),
    ).toBe(
      '/cbc/progress/learner/9?subject=8&cohort_subject=6&returnTo=%2Freports%2Fstudents%2F9%3Fterm%3D7',
    );
    expect(
      buildCbcCohortProgressHref(4, {
        subject: 8,
        cohortSubject: 6,
        instructor: 12,
        returnTo: '/reports/cohorts/4?term=7',
      }),
    ).toBe(
      '/cbc/progress/cohort/4?subject=8&cohort_subject_id=6&instructor_id=12&returnTo=%2Freports%2Fcohorts%2F4%3Fterm%3D7',
    );
  });

  it('builds returnTo paths without nesting previous returnTo values', () => {
    expect(
      buildReportReturnTo('/reports/cohorts/4', {
        term: 7,
        tab: 'subjects',
        returnTo: '/reports',
      }),
    ).toBe('/reports/cohorts/4?term=7&tab=subjects');
  });

  it('can preserve one exact safe hierarchical origin for operational detail', () => {
    expect(
      buildExactReportReturnTo('/reports/instructor/cohort-subjects/3', {
        projection: 'assignments',
        term: 1,
        q: 'revision',
        page: 2,
        returnTo: '/reports/instructor',
      }),
    ).toBe(
      '/reports/instructor/cohort-subjects/3?projection=assignments&term=1&q=revision&page=2&returnTo=%2Freports%2Finstructor',
    );
  });

  it('builds an attendance session destination with explicit authority and return state', () => {
    const origin = '/reports/instructor/cohort-subjects/3?projection=attendance&term=1&page=2';
    const href = buildSessionReportHref(42, {
      projection: 'attendance',
      authorityMode: 'teaching',
      returnTo: origin,
    });
    const url = new URL(href, 'https://scholaroscope.local');

    expect(url.pathname).toBe('/sessions/42');
    expect(url.searchParams.get('section')).toBe('attendance');
    expect(url.searchParams.get('authority_mode')).toBe('teaching');
    expect(url.searchParams.get('returnTo')).toBe(origin);
  });

  it('prefers returnTo when resolving back navigation', () => {
    expect(
      resolveReportBackHref({
        returnTo: '/reports/cohorts/4?term=7&tab=subjects',
        fallbackHref: '/reports/cohorts/4',
        fallbackState: { term: 7 },
      }),
    ).toBe('/reports/cohorts/4?term=7&tab=subjects');
  });

  it('falls back to the parent href with preserved state when returnTo is missing', () => {
    expect(
      resolveReportBackHref({
        fallbackHref: '/reports/cohorts/4',
        fallbackState: { term: 7, tab: 'subjects' },
      }),
    ).toBe('/reports/cohorts/4?term=7&tab=subjects');
  });
});

import { describe, expect, it } from 'vitest';

import {
  buildInstructorClassReportHref,
  buildInstructorCohortSubjectDetailHref,
  parsePositiveReportParam,
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
});

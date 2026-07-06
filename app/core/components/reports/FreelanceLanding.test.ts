import { describe, expect, it } from 'vitest';

import { getFreelanceReportLandingCards } from './FreelanceReportLandingPage';

describe('FreelanceLanding navigation', () => {
  it('exposes the expected freelance report cards for filtered test runs', () => {
    expect(getFreelanceReportLandingCards().map((card) => card.href)).toEqual([
      '/reports/students',
      '/reports/assessments',
      '/reports/attendance',
      '/reports/instructor/cohort-subjects',
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import {
  buildLearnerAttendanceReportHref,
  buildLearnerProfileHref,
  buildSessionLearnerAttendanceReportHref,
} from './learnerIntentRoutes';

describe('learner intent routes', () => {
  it('builds learner profile hrefs', () => {
    expect(buildLearnerProfileHref(74)).toBe('/learners/74');
  });

  it('builds learner attendance report hrefs with cohort-subject scope', () => {
    expect(buildLearnerAttendanceReportHref({
      studentId: 74,
      termId: 3,
      cohortId: 9,
      cohortSubjectId: 11,
      subjectId: 5,
      returnTo: '/sessions/22?section=attendance',
    })).toBe(
      '/reports/attendance?student=74&term=3&cohort=9&cohortSubject=11&returnTo=%2Fsessions%2F22%3Fsection%3Dattendance',
    );
  });

  it('falls back to subject scope when cohort-subject scope is unavailable', () => {
    expect(buildLearnerAttendanceReportHref({
      studentId: 74,
      subjectId: 5,
      returnTo: '/sessions/22?section=attendance',
    })).toBe(
      '/reports/attendance?student=74&subject=5&returnTo=%2Fsessions%2F22%3Fsection%3Dattendance',
    );
  });

  it('builds session attendance learner links with safe returnTo', () => {
    expect(buildSessionLearnerAttendanceReportHref({
      studentId: 74,
      sessionId: 22,
      termId: 3,
      cohortId: 9,
      cohortSubjectId: 11,
    })).toBe(
      '/reports/attendance?student=74&term=3&cohort=9&cohortSubject=11&returnTo=%2Fsessions%2F22%3Fsection%3Dattendance',
    );
  });
});

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
      '/reports/learners/74/cohort-subjects/11?projection=attendance&term=3&cohort=9&subject=5&origin=intent&returnTo=%2Fsessions%2F22%3Fsection%3Dattendance',
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
      '/reports/learners/74/cohort-subjects/11?projection=attendance&term=3&session=22&cohort=9&origin=intent&returnTo=%2Fsessions%2F22%3Fsection%3Dattendance',
    );
  });

  it('preserves a session-specific constraint even when cohort-subject scope is present', () => {
    expect(buildLearnerAttendanceReportHref({
      studentId: 74,
      termId: 3,
      cohortId: 9,
      subjectId: 5,
      cohortSubjectId: 11,
      sessionId: 22,
      returnTo: '/sessions/22?section=attendance',
    })).toBe(
      '/reports/learners/74/cohort-subjects/11?projection=attendance&term=3&session=22&cohort=9&subject=5&origin=intent&returnTo=%2Fsessions%2F22%3Fsection%3Dattendance',
    );
  });

  it('includes session fallback when a session link has no cohort-subject scope', () => {
    expect(buildSessionLearnerAttendanceReportHref({
      studentId: 74,
      sessionId: 22,
      termId: 3,
      cohortId: 9,
      subjectId: 5,
    })).toBe(
      '/reports/attendance?student=74&term=3&cohort=9&subject=5&session=22&returnTo=%2Fsessions%2F22%3Fsection%3Dattendance',
    );
  });
});

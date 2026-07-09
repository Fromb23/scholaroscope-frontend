import { isSafeNextPath } from '@/app/core/auth/navigation';

function setPositiveParam(
  params: URLSearchParams,
  key: string,
  value: number | null | undefined,
): void {
  if (Number.isInteger(value) && Number(value) > 0) {
    params.set(key, String(value));
  }
}

function setReturnToParam(
  params: URLSearchParams,
  returnTo: string | null | undefined,
): void {
  if (isSafeNextPath(returnTo)) {
    params.set('returnTo', returnTo);
  }
}

export interface LearnerAttendanceReportRouteState {
  studentId: number;
  termId?: number | null;
  cohortId?: number | null;
  subjectId?: number | null;
  cohortSubjectId?: number | null;
  sessionId?: number | null;
  returnTo?: string | null;
}

export interface SessionLearnerAttendanceRouteState {
  studentId: number;
  sessionId: number;
  termId?: number | null;
  cohortId?: number | null;
  subjectId?: number | null;
  cohortSubjectId?: number | null;
}

export function buildLearnerProfileHref(studentId: number): string {
  return `/learners/${studentId}`;
}

export function buildLearnerAttendanceReportHref(
  state: LearnerAttendanceReportRouteState,
): string {
  const params = new URLSearchParams();
  setPositiveParam(params, 'student', state.studentId);
  setPositiveParam(params, 'term', state.termId ?? null);
  setPositiveParam(params, 'cohort', state.cohortId ?? null);

  if (state.cohortSubjectId && state.cohortSubjectId > 0) {
    setPositiveParam(params, 'cohortSubject', state.cohortSubjectId);
  } else {
    setPositiveParam(params, 'subject', state.subjectId ?? null);
    setPositiveParam(params, 'session', state.sessionId ?? null);
  }

  setReturnToParam(params, state.returnTo ?? null);

  const query = params.toString();
  return query ? `/reports/attendance?${query}` : '/reports/attendance';
}

export function buildSessionLearnerAttendanceReportHref(
  state: SessionLearnerAttendanceRouteState,
): string {
  return buildLearnerAttendanceReportHref({
    studentId: state.studentId,
    termId: state.termId ?? null,
    cohortId: state.cohortId ?? null,
    subjectId: state.subjectId ?? null,
    cohortSubjectId: state.cohortSubjectId ?? null,
    sessionId: state.sessionId,
    returnTo: `/sessions/${state.sessionId}?section=attendance`,
  });
}

export interface ReportNavigationState {
  term?: number | null;
  tab?: string | null;
  student?: number | null;
  cohort?: number | null;
  subject?: number | null;
  cohortSubject?: number | null;
  instructor?: number | null;
  assessment?: number | null;
  session?: number | null;
  q?: string | null;
  returnTo?: string | null;
  cohortId?: number | null;
  cohortSubjectId?: number | null;
  studentId?: number | null;
  subjectId?: number | null;
  instructorId?: number | null;
}

function setPositiveParam(
  params: URLSearchParams,
  key: string,
  value: number | null | undefined,
): void {
  if (value && Number.isInteger(value) && value > 0) {
    params.set(key, String(value));
  }
}

function setStringParam(
  params: URLSearchParams,
  key: string,
  value: string | null | undefined,
): void {
  if (value) {
    params.set(key, value);
  }
}

function normalizePositiveId(value: number | null | undefined): number | null {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : null;
}

function normalizeState(state?: ReportNavigationState | URLSearchParams | string | null): URLSearchParams {
  if (!state) {
    return new URLSearchParams();
  }

  if (typeof state === 'string') {
    return new URLSearchParams(state.startsWith('?') ? state.slice(1) : state);
  }

  if (state instanceof URLSearchParams) {
    return new URLSearchParams(state.toString());
  }

  const params = new URLSearchParams();
  setPositiveParam(params, 'term', state.term ?? null);
  setStringParam(params, 'tab', state.tab ?? null);
  setPositiveParam(params, 'student', state.student ?? state.studentId ?? null);
  setPositiveParam(params, 'cohort', state.cohort ?? state.cohortId ?? null);
  setPositiveParam(params, 'subject', state.subject ?? state.subjectId ?? null);
  setPositiveParam(
    params,
    'cohortSubject',
    state.cohortSubject ?? state.cohortSubjectId ?? null,
  );
  setPositiveParam(
    params,
    'instructor',
    state.instructor ?? state.instructorId ?? null,
  );
  setPositiveParam(params, 'assessment', state.assessment ?? null);
  setPositiveParam(params, 'session', state.session ?? null);
  setStringParam(params, 'q', state.q ?? null);
  setStringParam(params, 'returnTo', state.returnTo ?? null);
  return params;
}

function withQuery(
  href: string,
  state?: ReportNavigationState | URLSearchParams | string | null,
): string {
  const params = normalizeState(state);
  const query = params.toString();
  return query ? `${href}?${query}` : href;
}

function isSafeReturnTo(value: string | null | undefined): value is string {
  return Boolean(value && value.startsWith('/'));
}

export function parsePositiveReportParam(value: string | null): number | null {
  if (!value) return null;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function buildReportReturnTo(
  pathname: string,
  state?: ReportNavigationState | URLSearchParams | string | null,
): string {
  const params = normalizeState(state);
  params.delete('returnTo');
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildLearnerReportHref(
  studentId: number,
  state?: ReportNavigationState,
): string {
  return withQuery(`/reports/students/${studentId}`, state);
}

export function buildLearnerOverviewReportHref(
  learnerId: number,
  state?: ReportNavigationState,
): string {
  const params = new URLSearchParams();
  if (state?.returnTo) {
    params.set('returnTo', state.returnTo);
  }
  const query = params.toString();
  return query
    ? `/reports/learners/${learnerId}/overview?${query}`
    : `/reports/learners/${learnerId}/overview`;
}

export function buildLearnerSubjectReportHref(
  learnerId: number,
  cohortSubjectId?: number | null,
  state?: ReportNavigationState,
): string {
  const params = new URLSearchParams();
  if (cohortSubjectId && Number.isInteger(cohortSubjectId) && cohortSubjectId > 0) {
    params.set('cohort_subject', String(cohortSubjectId));
  }
  if (state?.returnTo) {
    params.set('returnTo', state.returnTo);
  }
  const query = params.toString();
  return query
    ? `/reports/learners/${learnerId}/subject?${query}`
    : `/reports/learners/${learnerId}/subject`;
}

export function buildCohortReportHref(
  cohortId: number,
  state?: ReportNavigationState,
): string {
  return withQuery(`/reports/cohorts/${cohortId}`, state);
}

export function buildSubjectReportHref(
  subjectId: number,
  state?: ReportNavigationState,
): string {
  return withQuery(`/reports/subjects/${subjectId}`, state);
}

export function buildCohortSubjectReportHref(
  cohortSubjectId: number,
  state?: ReportNavigationState,
): string {
  return withQuery(`/reports/cohort-subjects/${cohortSubjectId}`, state);
}

export function buildInstructorReportHref(
  instructorId: number,
  state?: ReportNavigationState | URLSearchParams | string | null,
): string {
  const normalizedInstructorId = normalizePositiveId(instructorId);
  const href = normalizedInstructorId
    ? `/reports/instructors/${normalizedInstructorId}`
    : '/reports/instructors';
  return withQuery(href, state);
}

export function buildAssessmentReportHref(
  assessmentId?: number | null,
  state?: ReportNavigationState,
): string {
  return withQuery('/reports/assessments', {
    ...state,
    assessment: assessmentId ?? undefined,
  });
}

export function buildAttendanceReportHref(
  state?: ReportNavigationState,
): string {
  return withQuery('/reports/attendance', state);
}

export function buildCbcLearnerProgressHref(
  studentId: number,
  state?: ReportNavigationState,
): string {
  const params = new URLSearchParams();
  setPositiveParam(params, 'subject', state?.subject ?? state?.subjectId ?? null);
  setPositiveParam(
    params,
    'cohort_subject',
    state?.cohortSubject ?? state?.cohortSubjectId ?? null,
  );
  setStringParam(params, 'returnTo', state?.returnTo ?? null);
  const query = params.toString();
  return query ? `/cbc/progress/learner/${studentId}?${query}` : `/cbc/progress/learner/${studentId}`;
}

export function buildCbcCohortProgressHref(
  cohortId: number,
  state?: ReportNavigationState,
): string {
  const params = new URLSearchParams();
  setPositiveParam(params, 'subject', state?.subject ?? state?.subjectId ?? null);
  setPositiveParam(
    params,
    'cohort_subject_id',
    state?.cohortSubject ?? state?.cohortSubjectId ?? null,
  );
  setPositiveParam(
    params,
    'instructor_id',
    state?.instructor ?? state?.instructorId ?? null,
  );
  setStringParam(params, 'returnTo', state?.returnTo ?? null);
  const query = params.toString();
  return query ? `/cbc/progress/cohort/${cohortId}?${query}` : `/cbc/progress/cohort/${cohortId}`;
}

export function buildSessionReportHref(
  sessionId: number,
  state?: ReportNavigationState,
): string {
  const returnTo = state?.returnTo;
  const params = new URLSearchParams();
  if (returnTo) {
    params.set('returnTo', returnTo);
  }
  const query = params.toString();
  return query ? `/sessions/${sessionId}?${query}` : `/sessions/${sessionId}`;
}

export function resolveReportBackHref(options: {
  returnTo?: string | null;
  fallbackHref: string;
  fallbackState?: ReportNavigationState | URLSearchParams | string | null;
}): string {
  if (isSafeReturnTo(options.returnTo)) {
    return options.returnTo;
  }
  return withQuery(options.fallbackHref, options.fallbackState);
}

export function buildInstructorCohortSubjectDetailHref(
  cohortSubjectId: number,
  termId?: number | null,
  state?: Omit<ReportNavigationState, 'term'>,
): string {
  return withQuery(`/reports/instructor/cohort-subjects/${cohortSubjectId}`, {
    ...state,
    term: termId,
  });
}

export function buildInstructorClassReportHref(
  cohortSubjectId: number,
  termId?: number | null,
  options?: {
    cohortId?: number | null;
    subjectId?: number | null;
    studentId?: number | null;
    instructorId?: number | null;
    tab?: string | null;
    returnTo?: string | null;
  },
): string {
  return withQuery(
    `/reports/instructor/cohort-subjects/${cohortSubjectId}/class-report`,
    {
      term: termId,
      cohort: options?.cohortId,
      subject: options?.subjectId,
      student: options?.studentId,
      instructor: options?.instructorId,
      tab: options?.tab,
      returnTo: options?.returnTo,
    },
  );
}

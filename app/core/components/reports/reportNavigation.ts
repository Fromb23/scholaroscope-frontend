import { isSafeNextPath, parseAppDestination } from '@/app/core/auth/navigation';
import {
  buildReportIntentHref,
  buildReportOrigin,
  parseReportIntent,
  type ReportIntent,
  type ReportProjection,
} from '@/app/core/components/reports/reportIntent';

export interface ReportNavigationState {
  projection?: ReportProjection | null;
  term?: number | null;
  tab?: string | null;
  student?: number | null;
  cohort?: number | null;
  subject?: number | null;
  cohortSubject?: number | null;
  instructor?: number | null;
  assessment?: number | null;
  highlightAssignment?: number | null;
  assignment?: number | null;
  assessmentType?: string | null;
  session?: number | null;
  strand?: number | null;
  subStrand?: number | null;
  outcome?: number | null;
  evidence?: number | null;
  source?: string | null;
  q?: string | null;
  status?: string | null;
  sort?: string | null;
  page?: number | null;
  pageSize?: number | null;
  authorityMode?: 'teaching' | 'supervision' | null;
  originKind?: 'intent' | 'hierarchy' | null;
  returnTo?: string | null;
  academicYear?: number | null;
  academicYearId?: number | null;
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
  const safeValue = key === 'returnTo' ? parseAppDestination(value) : value;
  if (safeValue) {
    params.set(key, safeValue);
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
    const params = new URLSearchParams(state.startsWith('?') ? state.slice(1) : state);
    const safeReturnTo = parseAppDestination(params.get('returnTo'));
    if (safeReturnTo) params.set('returnTo', safeReturnTo);
    else params.delete('returnTo');
    return params;
  }

  if (state instanceof URLSearchParams) {
    const params = new URLSearchParams(state.toString());
    const safeReturnTo = parseAppDestination(params.get('returnTo'));
    if (safeReturnTo) params.set('returnTo', safeReturnTo);
    else params.delete('returnTo');
    return params;
  }

  const params = new URLSearchParams();
  setStringParam(params, 'projection', state.projection ?? null);
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
  setPositiveParam(params, 'assignment', state.assignment ?? state.highlightAssignment ?? null);
  setPositiveParam(params, 'session', state.session ?? null);
  setPositiveParam(params, 'strand', state.strand ?? null);
  setPositiveParam(params, 'sub_strand', state.subStrand ?? null);
  setPositiveParam(params, 'outcome', state.outcome ?? null);
  setPositiveParam(params, 'evidence', state.evidence ?? null);
  setStringParam(params, 'q', state.q ?? null);
  setStringParam(params, 'status', state.status ?? null);
  setStringParam(params, 'sort', state.sort ?? null);
  setPositiveParam(params, 'page', state.page ?? null);
  setPositiveParam(params, 'page_size', state.pageSize ?? null);
  setStringParam(params, 'authority_mode', state.authorityMode ?? null);
  setStringParam(params, 'origin', state.originKind ?? null);
  setStringParam(params, 'returnTo', state.returnTo ?? null);
  setPositiveParam(
    params,
    'academic_year',
    state.academicYear ?? state.academicYearId ?? null,
  );
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
  return isSafeNextPath(value);
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
  return buildReportOrigin(pathname, normalizeState(state));
}

export { buildReportIntentHref, parseReportIntent };
export type { ReportIntent };

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
  setPositiveParam(params, 'academic_year', state?.academicYear ?? state?.academicYearId ?? null);
  setPositiveParam(params, 'term', state?.term ?? null);
  const safeReturnTo = parseAppDestination(state?.returnTo);
  if (safeReturnTo) {
    params.set('returnTo', safeReturnTo);
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
  setPositiveParam(params, 'academic_year', state?.academicYear ?? state?.academicYearId ?? null);
  setPositiveParam(params, 'term', state?.term ?? null);
  const safeReturnTo = parseAppDestination(state?.returnTo);
  if (safeReturnTo) {
    params.set('returnTo', safeReturnTo);
  }
  const query = params.toString();
  return query
    ? `/reports/learners/${learnerId}/subject?${query}`
    : `/reports/learners/${learnerId}/subject`;
}

export function buildLearnerAssessmentReportHref(
  learnerId: number,
  state?: ReportNavigationState,
): string {
  const params = new URLSearchParams();
  setPositiveParam(params, 'assessment', state?.assessment ?? null);
  setPositiveParam(
    params,
    'cohort_subject',
    state?.cohortSubject ?? state?.cohortSubjectId ?? null,
  );
  setStringParam(params, 'assessment_type', state?.assessmentType ?? null);
  setPositiveParam(params, 'term', state?.term ?? null);
  setPositiveParam(params, 'subject', state?.subject ?? state?.subjectId ?? null);
  setPositiveParam(params, 'cohort', state?.cohort ?? state?.cohortId ?? null);
  setPositiveParam(
    params,
    'academic_year',
    state?.academicYear ?? state?.academicYearId ?? null,
  );
  if (isSafeReturnTo(state?.returnTo)) {
    params.set('returnTo', state.returnTo);
  }
  const query = params.toString();
  return query
    ? `/reports/learners/${learnerId}/assessments?${query}`
    : `/reports/learners/${learnerId}/assessments`;
}

export function buildLearnerAssignmentReportHref(
  learnerId: number,
  state?: ReportNavigationState,
): string {
  const params = new URLSearchParams();
  setPositiveParam(
    params,
    'cohort_subject',
    state?.cohortSubject ?? state?.cohortSubjectId ?? null,
  );
  setPositiveParam(params, 'highlightAssignment', state?.highlightAssignment ?? null);
  setPositiveParam(params, 'assignment', state?.assignment ?? state?.highlightAssignment ?? null);
  setPositiveParam(params, 'term', state?.term ?? null);
  setPositiveParam(
    params,
    'academic_year',
    state?.academicYear ?? state?.academicYearId ?? null,
  );
  if (isSafeReturnTo(state?.returnTo)) {
    params.set('returnTo', state.returnTo);
  }
  const query = params.toString();
  return query
    ? `/reports/learners/${learnerId}/assignments?${query}`
    : `/reports/learners/${learnerId}/assignments`;
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

export function buildCanonicalLearnerSubjectReportHref(
  learnerId: number,
  cohortSubjectId: number,
  projection: Exclude<ReportProjection, 'learners' | 'portfolio'> = 'overview',
  state?: ReportNavigationState,
): string {
  return buildReportIntentHref({
    object: { type: 'learner-subject', learnerId, cohortSubjectId },
    projection,
    period: {
      academicYearId: normalizePositiveId(state?.academicYear ?? state?.academicYearId) ?? undefined,
      termId: normalizePositiveId(state?.term) ?? undefined,
    },
    focus: {
      sessionId: normalizePositiveId(state?.session) ?? undefined,
      assessmentId: normalizePositiveId(state?.assessment) ?? undefined,
      assignmentId: normalizePositiveId(state?.assignment ?? state?.highlightAssignment) ?? undefined,
      strandId: normalizePositiveId(state?.strand) ?? undefined,
      subStrandId: normalizePositiveId(state?.subStrand) ?? undefined,
      outcomeId: normalizePositiveId(state?.outcome) ?? undefined,
      evidenceId: normalizePositiveId(state?.evidence) ?? undefined,
    },
    filters: {
      cohortId: normalizePositiveId(state?.cohort ?? state?.cohortId) ?? undefined,
      subjectId: normalizePositiveId(state?.subject ?? state?.subjectId) ?? undefined,
      cohortSubjectId: normalizePositiveId(state?.cohortSubject ?? state?.cohortSubjectId) ?? undefined,
      instructorId: normalizePositiveId(state?.instructor ?? state?.instructorId) ?? undefined,
      learnerId,
      assessmentType: state?.assessmentType ?? undefined,
      evidenceType: state?.source ?? undefined,
    },
    table: {
      query: state?.q ?? undefined,
      status: state?.status ?? undefined,
      sort: state?.sort ?? undefined,
      page: normalizePositiveId(state?.page) ?? undefined,
      pageSize: normalizePositiveId(state?.pageSize) ?? undefined,
    },
    authorityMode: state?.authorityMode ?? undefined,
    origin: isSafeReturnTo(state?.returnTo)
      ? { kind: state?.originKind ?? 'intent', returnTo: state.returnTo }
      : undefined,
  });
}

export function buildLearnerPortfolioReportHref(
  learnerId: number,
  state?: ReportNavigationState,
): string {
  return buildReportIntentHref({
    object: { type: 'learner-portfolio', learnerId },
    projection: 'portfolio',
    period: {
      academicYearId: normalizePositiveId(state?.academicYear ?? state?.academicYearId) ?? undefined,
      termId: normalizePositiveId(state?.term) ?? undefined,
    },
    focus: {
      outcomeId: normalizePositiveId(state?.outcome) ?? undefined,
      evidenceId: normalizePositiveId(state?.evidence) ?? undefined,
    },
    filters: {
      cohortSubjectId: normalizePositiveId(state?.cohortSubject ?? state?.cohortSubjectId) ?? undefined,
      evidenceType: state?.source ?? undefined,
    },
    table: { page: normalizePositiveId(state?.page) ?? undefined },
    authorityMode: state?.authorityMode ?? undefined,
    origin: isSafeReturnTo(state?.returnTo)
      ? { kind: state?.originKind ?? 'intent', returnTo: state.returnTo }
      : undefined,
  });
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
  setPositiveParam(params, 'term', state?.term ?? null);
  setPositiveParam(params, 'academic_year', state?.academicYear ?? state?.academicYearId ?? null);
  setPositiveParam(params, 'strand', state?.strand ?? null);
  setPositiveParam(params, 'sub_strand', state?.subStrand ?? null);
  setPositiveParam(params, 'outcome', state?.outcome ?? null);
  setPositiveParam(params, 'evidence', state?.evidence ?? null);
  setStringParam(params, 'authority_mode', state?.authorityMode ?? null);
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
  setPositiveParam(params, 'term', state?.term ?? null);
  setPositiveParam(params, 'academic_year', state?.academicYear ?? state?.academicYearId ?? null);
  setStringParam(params, 'authority_mode', state?.authorityMode ?? null);
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
  const returnTo = parseAppDestination(state?.returnTo);
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

export function getReportBackLabel(destination: string | null | undefined): string {
  const safeDestination = parseAppDestination(destination);
  if (!safeDestination) return 'Back to Reports';
  const path = safeDestination.split(/[?#]/, 1)[0];
  if (/^\/assignments(?:\/|$)|\/assignments\//.test(path)) return 'Back to Assignment';
  if (/^\/assessments(?:\/|$)|\/assessments\//.test(path)) return 'Back to Assessment';
  if (/^\/sessions\/\d+/.test(path)) return 'Back to Session Attendance';
  if (/^\/cbc\/(?:teaching|evidence)/.test(path)) return 'Back to CBC Workflow';
  if (/^\/reports\/learners\//.test(path) || /^\/learners\//.test(path)) return 'Back to Learner Report';
  if (/^\/reports\/subjects\//.test(path)) return 'Back to Subject Report';
  if (/^\/reports\/cohorts\//.test(path)) return 'Back to Class Report';
  if (/^\/reports\/cohort-subjects/.test(path)) return 'Back to Class Subjects';
  return 'Back to Reports';
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

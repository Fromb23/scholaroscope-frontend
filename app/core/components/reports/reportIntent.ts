import { parseAppDestination } from '@/app/core/auth/navigation';

export type ReportProjection =
  | 'overview'
  | 'learners'
  | 'attendance'
  | 'assessments-results'
  | 'assignments'
  | 'curriculum-progress'
  | 'portfolio';

export type ReportObject =
  | { type: 'workspace' }
  | { type: 'cohort'; cohortId: number }
  | { type: 'workspace-subject'; subjectId: number }
  | { type: 'cohort-subject'; cohortSubjectId: number }
  | { type: 'instructor'; instructorId: number }
  | { type: 'learner'; learnerId: number }
  | { type: 'learner-subject'; learnerId: number; cohortSubjectId: number }
  | { type: 'learner-portfolio'; learnerId: number };

export interface ReportPeriod {
  academicYearId?: number;
  termId?: number;
}

export interface ReportFocus {
  sessionId?: number;
  assessmentId?: number;
  assignmentId?: number;
  strandId?: number;
  subStrandId?: number;
  outcomeId?: number;
  evidenceId?: number;
}

export interface ReportTableState {
  query?: string;
  status?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export interface ReportFilterState {
  cohortId?: number;
  subjectId?: number;
  cohortSubjectId?: number;
  instructorId?: number;
  learnerId?: number;
  assessmentType?: string;
  evidenceType?: string;
}

export interface ReportIntent {
  object: ReportObject;
  projection: ReportProjection;
  period?: ReportPeriod;
  focus?: ReportFocus;
  filters?: ReportFilterState;
  table?: ReportTableState;
  authorityMode?: 'teaching' | 'supervision';
  origin?: {
    kind: 'intent' | 'hierarchy';
    returnTo: string;
  };
}

const PROJECTIONS = new Set<ReportProjection>([
  'overview',
  'learners',
  'attendance',
  'assessments-results',
  'assignments',
  'curriculum-progress',
  'portfolio',
]);

const LEGACY_PROJECTIONS: Record<string, ReportProjection> = {
  performance: 'assessments-results',
  assessments: 'assessments-results',
  results: 'assessments-results',
  'class-results': 'assessments-results',
  'teaching-activity': 'curriculum-progress',
  progress: 'curriculum-progress',
  subject: 'overview',
};

const OBJECT_PROJECTIONS: Record<ReportObject['type'], ReadonlySet<ReportProjection>> = {
  workspace: new Set(['overview']),
  cohort: new Set(['overview', 'learners', 'attendance', 'assessments-results', 'assignments', 'curriculum-progress']),
  'workspace-subject': new Set(['overview', 'learners', 'attendance', 'assessments-results', 'assignments', 'curriculum-progress']),
  'cohort-subject': new Set(['overview', 'learners', 'attendance', 'assessments-results', 'assignments', 'curriculum-progress']),
  instructor: new Set(['overview', 'attendance', 'assessments-results', 'assignments', 'curriculum-progress']),
  learner: new Set(['overview']),
  'learner-subject': new Set(['overview', 'attendance', 'assessments-results', 'assignments', 'curriculum-progress']),
  'learner-portfolio': new Set(['portfolio']),
};

function positive(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function firstPositive(params: URLSearchParams, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = positive(params.get(key));
    if (value) return value;
  }
  return undefined;
}

function nonEmpty(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function projectionFrom(params: URLSearchParams, fallback: ReportProjection): ReportProjection {
  const requested = nonEmpty(params.get('projection')) ?? nonEmpty(params.get('tab'));
  if (!requested) return fallback;
  if (PROJECTIONS.has(requested as ReportProjection)) return requested as ReportProjection;
  return LEGACY_PROJECTIONS[requested] ?? fallback;
}

export function canonicalReportPath(object: ReportObject): string {
  switch (object.type) {
    case 'workspace': return '/reports';
    case 'cohort': return `/reports/cohorts/${object.cohortId}`;
    case 'workspace-subject': return `/reports/subjects/${object.subjectId}`;
    case 'cohort-subject': return `/reports/cohort-subjects/${object.cohortSubjectId}`;
    case 'instructor': return `/reports/instructors/${object.instructorId}`;
    case 'learner': return `/reports/learners/${object.learnerId}/overview`;
    case 'learner-subject': return `/reports/learners/${object.learnerId}/cohort-subjects/${object.cohortSubjectId}`;
    case 'learner-portfolio': return `/reports/learners/${object.learnerId}/portfolio`;
  }
}

export function isProjectionAllowed(object: ReportObject, projection: ReportProjection): boolean {
  return OBJECT_PROJECTIONS[object.type].has(projection);
}

export function parseReportIntent(
  object: ReportObject,
  source: URLSearchParams | string,
  fallbackProjection: ReportProjection = object.type === 'learner-portfolio' ? 'portfolio' : 'overview',
): ReportIntent {
  const params = typeof source === 'string'
    ? new URLSearchParams(source.startsWith('?') ? source.slice(1) : source)
    : new URLSearchParams(source.toString());
  const requestedProjection = projectionFrom(params, fallbackProjection);
  const projection = isProjectionAllowed(object, requestedProjection)
    ? requestedProjection
    : fallbackProjection;
  const academicYearId = firstPositive(params, 'academic_year', 'academicYear', 'academic_year_id');
  const termId = firstPositive(params, 'term', 'term_id');
  const sessionId = firstPositive(params, 'session', 'session_id', 'sessionId');
  const assessmentId = firstPositive(params, 'assessment', 'assessment_id', 'assessmentId');
  const assignmentId = firstPositive(params, 'assignment', 'assignment_id', 'assignmentId', 'highlightAssignment');
  const strandId = firstPositive(params, 'strand', 'strand_id', 'strandId');
  const subStrandId = firstPositive(params, 'sub_strand', 'sub_strand_id', 'subStrandId');
  const outcomeId = firstPositive(params, 'outcome', 'outcome_id', 'outcomeId');
  const evidenceId = firstPositive(params, 'evidence', 'evidence_id', 'evidenceId');
  const page = firstPositive(params, 'page');
  const pageSize = firstPositive(params, 'page_size', 'pageSize');
  const returnTo = parseAppDestination(params.get('returnTo'));
  const originKind = params.get('origin') === 'hierarchy' ? 'hierarchy' : 'intent';
  const authorityMode = params.get('authority_mode') === 'supervision'
    ? 'supervision'
    : params.get('authority_mode') === 'teaching'
      ? 'teaching'
      : undefined;

  return {
    object,
    projection,
    period: academicYearId || termId ? { academicYearId, termId } : undefined,
    focus: sessionId || assessmentId || assignmentId || strandId || subStrandId || outcomeId || evidenceId
      ? { sessionId, assessmentId, assignmentId, strandId, subStrandId, outcomeId, evidenceId }
      : undefined,
    filters: firstPositive(params, 'cohort', 'cohort_id')
      || firstPositive(params, 'subject', 'subject_id')
      || firstPositive(params, 'cohortSubject', 'cohort_subject', 'cohort_subject_id')
      || firstPositive(params, 'instructor', 'instructor_id')
      || firstPositive(params, 'student', 'learner', 'learner_id')
      || nonEmpty(params.get('assessment_type'))
      || nonEmpty(params.get('source'))
      ? {
          cohortId: firstPositive(params, 'cohort', 'cohort_id'),
          subjectId: firstPositive(params, 'subject', 'subject_id'),
          cohortSubjectId: firstPositive(params, 'cohortSubject', 'cohort_subject', 'cohort_subject_id'),
          instructorId: firstPositive(params, 'instructor', 'instructor_id'),
          learnerId: firstPositive(params, 'student', 'learner', 'learner_id'),
          assessmentType: nonEmpty(params.get('assessment_type')),
          evidenceType: nonEmpty(params.get('source')),
        }
      : undefined,
    table: nonEmpty(params.get('q')) || nonEmpty(params.get('status')) || nonEmpty(params.get('sort')) || page || pageSize
      ? {
          query: nonEmpty(params.get('q')),
          status: nonEmpty(params.get('status')),
          sort: nonEmpty(params.get('sort')),
          page,
          pageSize,
        }
      : undefined,
    authorityMode,
    origin: returnTo ? { kind: originKind, returnTo } : undefined,
  };
}

function setPositive(params: URLSearchParams, key: string, value?: number): void {
  if (value && Number.isInteger(value) && value > 0) params.set(key, String(value));
}

function setText(params: URLSearchParams, key: string, value?: string): void {
  if (value?.trim()) params.set(key, value.trim());
}

export function serializeReportIntent(intent: ReportIntent): URLSearchParams {
  const params = new URLSearchParams();
  params.set('projection', intent.projection);
  setPositive(params, 'academic_year', intent.period?.academicYearId);
  setPositive(params, 'term', intent.period?.termId);
  setPositive(params, 'session', intent.focus?.sessionId);
  setPositive(params, 'assessment', intent.focus?.assessmentId);
  setPositive(params, 'assignment', intent.focus?.assignmentId);
  setPositive(params, 'strand', intent.focus?.strandId);
  setPositive(params, 'sub_strand', intent.focus?.subStrandId);
  setPositive(params, 'outcome', intent.focus?.outcomeId);
  setPositive(params, 'evidence', intent.focus?.evidenceId);
  setPositive(params, 'cohort', intent.filters?.cohortId);
  setPositive(params, 'subject', intent.filters?.subjectId);
  if (intent.object.type !== 'learner-subject') {
    setPositive(params, 'cohort_subject', intent.filters?.cohortSubjectId);
  }
  setPositive(params, 'instructor', intent.filters?.instructorId);
  if (intent.object.type !== 'learner-subject') {
    setPositive(params, 'student', intent.filters?.learnerId);
  }
  setText(params, 'assessment_type', intent.filters?.assessmentType);
  setText(params, 'source', intent.filters?.evidenceType);
  setText(params, 'q', intent.table?.query);
  setText(params, 'status', intent.table?.status);
  setText(params, 'sort', intent.table?.sort);
  setPositive(params, 'page', intent.table?.page);
  setPositive(params, 'page_size', intent.table?.pageSize);
  if (intent.authorityMode) params.set('authority_mode', intent.authorityMode);
  const returnTo = parseAppDestination(intent.origin?.returnTo);
  if (returnTo) {
    params.set('origin', intent.origin?.kind ?? 'intent');
    params.set('returnTo', returnTo);
  }
  return params;
}

export function buildReportIntentHref(intent: ReportIntent): string {
  const query = serializeReportIntent(intent).toString();
  const path = canonicalReportPath(intent.object);
  return query ? `${path}?${query}` : path;
}

export function buildReportOrigin(pathname: string, source: URLSearchParams | string): string {
  const params = typeof source === 'string'
    ? new URLSearchParams(source.startsWith('?') ? source.slice(1) : source)
    : new URLSearchParams(source.toString());
  params.delete('returnTo');
  params.delete('origin');
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ''}`;
}

export function reportAuthorityModeForOperatingContext(
  context: 'WORKSPACE_MANAGEMENT' | 'MY_TEACHING' | null | undefined,
): 'supervision' | 'teaching' {
  return context === 'WORKSPACE_MANAGEMENT' ? 'supervision' : 'teaching';
}

const FOCUS_KEYS = [
  'session', 'session_id', 'assessment', 'assessment_id', 'assignment',
  'assignment_id', 'highlightAssignment', 'strand', 'strand_id', 'sub_strand',
  'sub_strand_id', 'outcome', 'outcome_id', 'evidence', 'evidence_id',
] as const;

function clearKeys(params: URLSearchParams, keys: readonly string[]): void {
  keys.forEach((key) => params.delete(key));
}

export function applyReportStateChange(
  source: URLSearchParams | string,
  key: 'academic_year' | 'term' | 'cohort' | 'subject' | 'cohort_subject' | 'learner' | 'projection',
  value: string | number | null,
): URLSearchParams {
  const params = typeof source === 'string'
    ? new URLSearchParams(source.startsWith('?') ? source.slice(1) : source)
    : new URLSearchParams(source.toString());
  if (value === null || value === '') params.delete(key);
  else params.set(key, String(value));

  if (key === 'academic_year') {
    clearKeys(params, ['term', 'term_id', 'cohort', 'cohort_id', 'subject', 'subject_id', 'cohort_subject', 'cohortSubject', 'cohort_subject_id', 'learner', 'student', ...FOCUS_KEYS]);
  } else if (key === 'term') {
    clearKeys(params, FOCUS_KEYS);
  } else if (key === 'cohort' || key === 'subject') {
    clearKeys(params, ['cohort_subject', 'cohortSubject', 'cohort_subject_id', 'learner', 'student', ...FOCUS_KEYS]);
  } else if (key === 'cohort_subject') {
    clearKeys(params, ['learner', 'student', ...FOCUS_KEYS]);
  } else if (key === 'learner') {
    clearKeys(params, FOCUS_KEYS);
  }
  return params;
}

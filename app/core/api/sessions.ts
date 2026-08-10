// ============================================================================
// app/core/api/sessions.ts
//
// Pure I/O boundary — no logic, no state, no transformation.
// All methods accept typed params and return typed responses only.
// ============================================================================

import { apiClient } from './client';
import { withClientMutationId } from '@/app/core/lib/clientMutationId';
import { withOperationalScope } from '@/app/core/lib/academicScope';
import type { OperationalScope } from '@/app/core/lib/academicScope';
import {
  AvailableSessionCohortSubjectsResponse,
  Session,
  SessionDetail,
  SessionDetailResponse,
  AttendanceRecord,
  AttendanceRecordUpdatePayload,
  AttendanceSummary,
  BulkAttendanceData,
  BulkAttendanceResponse,
  ConfirmTaughtOutcomesPayload,
  RecordLessonReflectionPayload,
  RecordLessonReflectionResponse,
  LinkCohortRequest,
  RescheduleSessionPayload,
  SessionClosureState,
  SessionAssignmentDraftResponse,
  SessionCohortsResponse,
  SessionCohort,
  SessionFormData,
  SessionIssuePreparedAssignmentPayload,
  SessionIssuePreparedAssignmentResponse,
  SessionTeachingAssignmentOption,
  SupervisionCohortsResponse,
  SupervisionSessionSummary,
  SupervisionSubjectsResponse,
} from '../types/session';
import { CohortSubject } from '../types/academic';

const KERNEL_COHORT_SUBJECTS_BASE = '/academic/cohort-subjects';

// ── Shared response shapes ────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface ApiRequestOptions {
  signal?: AbortSignal;
}

export interface SupervisionHierarchyQuery {
  workspaceId: number;
  term: number;
  authorityMode: SessionReadAuthorityMode;
  instructorId?: number;
  sessionType?: string;
}

function supervisionHierarchyParams(params: SupervisionHierarchyQuery) {
  // workspaceId belongs in cache keys; tenant scope itself comes from the
  // authenticated session and is intentionally never accepted by the API.
  void params.workspaceId;
  return {
    term: params.term,
    authority_mode: params.authorityMode,
    instructor_id: params.instructorId,
    session_type: params.sessionType,
  };
}

function isPaginatedResponse<T>(data: T[] | PaginatedResponse<T>): data is PaginatedResponse<T> {
  return !Array.isArray(data) && Array.isArray(data.results);
}

function apiRelativePathFromTrustedNext(next: string): string {
  const base = new URL(
    String(apiClient.defaults.baseURL ?? ''),
    'http://localhost',
  );
  const nextUrl = new URL(next, base);

  if (nextUrl.origin !== base.origin) {
    throw new Error('Refusing to follow an external pagination URL.');
  }

  const basePath = base.pathname.replace(/\/$/, '');
  if (basePath && !nextUrl.pathname.startsWith(`${basePath}/`)) {
    throw new Error('Refusing to follow a pagination URL outside the API base path.');
  }

  const apiPath = basePath
    ? nextUrl.pathname.slice(basePath.length)
    : nextUrl.pathname;
  return `${apiPath || '/'}${nextUrl.search}`;
}

async function getCompletePaginatedList<T>(
  path: string,
  params?: object,
  options: ApiRequestOptions = {},
): Promise<T[]> {
  const firstResponse = await apiClient.get<T[] | PaginatedResponse<T>>(
    path,
    { params, signal: options.signal },
  );
  const firstPage = firstResponse.data;

  if (!isPaginatedResponse(firstPage)) {
    return firstPage;
  }

  const results = [...firstPage.results];
  const visited = new Set<string>();
  let next = firstPage.next;

  while (next && results.length < firstPage.count) {
    if (visited.has(next)) {
      throw new Error('Pagination loop detected while loading sessions.');
    }
    visited.add(next);

    const nextPath = apiRelativePathFromTrustedNext(next);
    const response = await apiClient.get<PaginatedResponse<T>>(
      nextPath,
      { signal: options.signal },
    );
    const page = response.data;

    if (!isPaginatedResponse(page)) {
      throw new Error('Expected a paginated response while loading all sessions.');
    }

    results.push(...page.results);
    next = page.next;
  }

  if (results.length < firstPage.count) {
    throw new Error('Session pagination ended before the complete result set was loaded.');
  }

  return results;
}

// ── Query param types ─────────────────────────────────────────────────────

export interface SessionQueryParams {
  scope?: OperationalScope;
  term?: number;
  cohort_subject?: number;
  cohort_subject__cohort?: number;
  cohort_subject__subject?: number;
  session_type?: string;
  session_date?: string;
  session_date__gte?: string;
  session_date__lte?: string;
  authority_mode?: SessionReadAuthorityMode;
}

export interface SupervisedSessionQueryParams extends Omit<SessionQueryParams, 'authority_mode'> {
  authority_mode: 'supervision';
  instructor_id?: number;
}

export interface AttendanceQueryParams {
  scope?: OperationalScope;
  term?: number;
  session?: number;
  student?: number;
  status?: string;
  session__term?: number;
  session__cohort_subject?: number;
  session__cohort_subject__cohort?: number;
  session__cohort_subject__subject?: number;
  session__session_date?: string;
  page?: number;
  page_size?: number;
  search?: string;
  authority_mode?: SessionReadAuthorityMode;
}

export type SessionReadAuthorityMode = 'teaching' | 'supervision';

export type SessionAttendanceQueryParams = Omit<AttendanceQueryParams, 'session'>;

interface DateRangeParams {
  start_date?: string;
  end_date?: string;
  scope?: OperationalScope;
}

interface StudentHistoryParams extends DateRangeParams {
  cohort_id?: number;
  subject_id?: number;
}

interface CohortSummaryParams extends DateRangeParams {
  cohort_subject_id: number;
}

export interface SessionLearner {
  id: number;
  admission_number: string;
  first_name: string;
  last_name: string;
  session_evidence_count: number;
}

// ── Sessions API ──────────────────────────────────────────────────────────

export const sessionAPI = {
  getAll: async (
    params?: SessionQueryParams,
    options: ApiRequestOptions = {},
  ): Promise<Session[] | PaginatedResponse<Session>> => {
    const res = await apiClient.get<Session[] | PaginatedResponse<Session>>(
      '/sessions/',
      { params: withOperationalScope(params), signal: options.signal },
    );
    return res.data;
  },

  getAllComplete: async (
    params?: SessionQueryParams,
    options: ApiRequestOptions = {},
  ): Promise<Session[]> => getCompletePaginatedList<Session>(
    '/sessions/',
    withOperationalScope(params),
    options,
  ),

  getSupervised: async (
    params: SupervisedSessionQueryParams,
    options: ApiRequestOptions = {},
  ): Promise<Session[] | PaginatedResponse<Session>> => {
    const res = await apiClient.get<Session[] | PaginatedResponse<Session>>(
      '/sessions/',
      { params: withOperationalScope(params), signal: options.signal },
    );
    return res.data;
  },

  getSupervisedComplete: async (
    params: SupervisedSessionQueryParams,
    options: ApiRequestOptions = {},
  ): Promise<Session[]> => getCompletePaginatedList<Session>(
    '/sessions/',
    withOperationalScope(params),
    options,
  ),

  getSupervisionSubjects: async (
    params: SupervisionHierarchyQuery,
    options: ApiRequestOptions = {},
  ): Promise<SupervisionSubjectsResponse> => {
    const response = await apiClient.get<SupervisionSubjectsResponse>(
      '/sessions/supervision-subjects/',
      { params: supervisionHierarchyParams(params), signal: options.signal },
    );
    return response.data;
  },

  getSupervisionCohorts: async (
    params: SupervisionHierarchyQuery & {
      subjectSource: 'kernel' | 'cambridge';
      subjectId: number;
    },
    options: ApiRequestOptions = {},
  ): Promise<SupervisionCohortsResponse> => {
    const response = await apiClient.get<SupervisionCohortsResponse>(
      '/sessions/supervision-cohorts/',
      {
        params: {
          ...supervisionHierarchyParams(params),
          subject_source: params.subjectSource,
          subject_id: params.subjectId,
        },
        signal: options.signal,
      },
    );
    return response.data;
  },

  getSupervisionSessions: async (
    params: SupervisionHierarchyQuery & {
      subjectSource: 'kernel' | 'cambridge';
      subjectId: number;
      cohortId: number;
    },
    options: ApiRequestOptions = {},
  ): Promise<SupervisionSessionSummary[]> => getCompletePaginatedList<SupervisionSessionSummary>(
      '/sessions/supervision-sessions/',
      {
          ...supervisionHierarchyParams(params),
          subject_source: params.subjectSource,
          subject_id: params.subjectId,
          cohort_id: params.cohortId,
      },
      options,
    ),

  getById: async (
    id: number,
    authorityMode?: SessionReadAuthorityMode,
  ): Promise<SessionDetailResponse> => {
    const res = await apiClient.get<SessionDetailResponse>(`/sessions/${id}/`, {
      params: authorityMode ? { authority_mode: authorityMode } : undefined,
    });
    return res.data;
  },

  getToday: async (): Promise<Session[]> => {
    const res = await apiClient.get<Session[]>('/sessions/today/');
    return res.data;
  },

  getUpcoming: async (): Promise<Session[]> => {
    const res = await apiClient.get<Session[]>('/sessions/upcoming/');
    return res.data;
  },

  getByDateRange: async (
    startDate: string,
    endDate: string,
    params?: Pick<DateRangeParams, 'scope'>,
  ): Promise<Session[]> => {
    const res = await apiClient.get<Session[]>('/sessions/by_date_range/', {
      params: withOperationalScope({ ...params, start_date: startDate, end_date: endDate }),
    });
    return res.data;
  },

  getByCohort: async (cohortId: number, startDate?: string, endDate?: string): Promise<Session[]> => {
    const params: { cohort_id: number } & DateRangeParams = { cohort_id: cohortId };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const res = await apiClient.get<Session[]>('/sessions/by_cohort/', { params });
    return res.data;
  },

  getBySubject: async (subjectId: number, cohortId?: number): Promise<Session[]> => {
    const params: { subject_id: number; cohort_id?: number } = { subject_id: subjectId };
    if (cohortId) params.cohort_id = cohortId;
    const res = await apiClient.get<Session[]>('/sessions/by_subject/', { params });
    return res.data;
  },

  getByCohortSubject: async (cohortSubjectId: number): Promise<Session[]> => {
    const res = await apiClient.get<Session[]>('/sessions/by_cohort_subject/', {
      params: { cohort_subject_id: cohortSubjectId },
    });
    return res.data;
  },

  create: async (data: SessionFormData): Promise<Session> => {
    const res = await apiClient.post<Session>('/sessions/', data);
    return res.data;
  },

  listTeachingAssignmentOptions: async (params: {
    cohort_subject: number;
    term: number;
    session_date: string;
  }): Promise<SessionTeachingAssignmentOption[]> => {
    const res = await apiClient.get<SessionTeachingAssignmentOption[]>(
      '/sessions/teaching_assignment_options/',
      { params },
    );
    return res.data;
  },

  update: async (id: number, data: Partial<Session>): Promise<Session> => {
    const res = await apiClient.patch<Session>(`/sessions/${id}/`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/sessions/${id}/`);
  },

  getAttendanceSummary: async (id: number, authorityMode?: SessionReadAuthorityMode): Promise<AttendanceSummary> => {
    const res = await apiClient.get<AttendanceSummary>(`/sessions/${id}/attendance_summary/`, {
      params: authorityMode ? { authority_mode: authorityMode } : undefined,
    });
    return res.data;
  },

  getClosureState: async (id: number, authorityMode?: SessionReadAuthorityMode): Promise<SessionClosureState> => {
    const res = await apiClient.get<SessionClosureState>(`/sessions/${id}/closure-state/`, {
      params: authorityMode ? { authority_mode: authorityMode } : undefined,
    });
    return res.data;
  },

  getAttendanceRecords: async (
    id: number,
    params?: SessionAttendanceQueryParams,
  ): Promise<AttendanceRecord[] | PaginatedResponse<AttendanceRecord>> => {
    const res = await apiClient.get<AttendanceRecord[] | PaginatedResponse<AttendanceRecord>>(
      `/sessions/${id}/attendance-records/`,
      { params }
    );
    return res.data;
  },

  markAttendance: async (id: number, data: BulkAttendanceData): Promise<BulkAttendanceResponse> => {
    const res = await apiClient.post<BulkAttendanceResponse>(`/sessions/${id}/mark_attendance/`, data);
    return res.data;
  },

  reseedAttendance: async (id: number): Promise<void> => {
    await apiClient.post(`/sessions/${id}/reseed_attendance/`);
  },
  start: async (id: number): Promise<SessionDetail> => {
    const res = await apiClient.post<SessionDetail>(`/sessions/${id}/start/`);
    return res.data;
  },
  complete: async (id: number): Promise<SessionDetail> => {
    const res = await apiClient.post<SessionDetail>(`/sessions/${id}/complete/`);
    return res.data;
  },
  cancel: async (id: number): Promise<SessionDetail> => {
    const res = await apiClient.post<SessionDetail>(`/sessions/${id}/cancel/`);
    return res.data;
  },
  reschedule: async (
    id: number,
    data: RescheduleSessionPayload,
  ): Promise<SessionDetail> => {
    const res = await apiClient.post<SessionDetail>(`/sessions/${id}/reschedule/`, data);
    return res.data;
  },
  confirmTaughtOutcomes: async (
    id: number,
    data: ConfirmTaughtOutcomesPayload,
  ): Promise<SessionDetail> => {
    const res = await apiClient.post<SessionDetail>(
      `/sessions/${id}/confirm_taught_outcomes/`,
      data,
    );
    return res.data;
  },
  recordReflection: async (
    id: number,
    data: RecordLessonReflectionPayload,
  ): Promise<RecordLessonReflectionResponse> => {
    const res = await apiClient.post<RecordLessonReflectionResponse>(
      `/sessions/${id}/record_reflection/`,
      data,
    );
    return res.data;
  },
  createAssignmentFromLesson: async (
    id: number,
  ): Promise<SessionAssignmentDraftResponse> => {
    const res = await apiClient.post<SessionAssignmentDraftResponse>(
      `/sessions/${id}/create_assignment_from_lesson/`,
      withClientMutationId({}, 'session-assignment-draft'),
    );
    return res.data;
  },
  issuePreparedAssignment: async (
    id: number,
    data: SessionIssuePreparedAssignmentPayload,
  ): Promise<SessionIssuePreparedAssignmentResponse> => {
    const res = await apiClient.post<SessionIssuePreparedAssignmentResponse>(
      `/sessions/${id}/issue-prepared-assignment/`,
      withClientMutationId(data, 'session-issue-assignment'),
    );
    return res.data;
  },
};

// ── Attendance API ────────────────────────────────────────────────────────

export const attendanceAPI = {
  getAll: async (
    params?: AttendanceQueryParams
  ): Promise<AttendanceRecord[] | PaginatedResponse<AttendanceRecord>> => {
    const res = await apiClient.get<AttendanceRecord[] | PaginatedResponse<AttendanceRecord>>(
      '/attendance/',
      { params: withOperationalScope(params, ['session__term']) }
    );
    return res.data;
  },

  getById: async (id: number): Promise<AttendanceRecord> => {
    const res = await apiClient.get<AttendanceRecord>(`/sessions/attendance/${id}/`);
    return res.data;
  },

  create: async (data: {
    session: number;
    student: number;
    status: string;
    notes?: string;
  }): Promise<AttendanceRecord> => {
    const res = await apiClient.post<AttendanceRecord>('/sessions/attendance/', data);
    return res.data;
  },

  update: async (id: number, data: AttendanceRecordUpdatePayload): Promise<AttendanceRecord> => {
    const res = await apiClient.patch<AttendanceRecord>(`/sessions/attendance/${id}/`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/sessions/attendance/${id}/`);
  },

  bulkMark: async (data: BulkAttendanceData & { session: number }): Promise<void> => {
    await apiClient.post('/sessions/attendance/bulk_mark/', data);
  },

  getStudentHistory: async (studentId: number, params?: StudentHistoryParams) => {
    const res = await apiClient.get('/attendance/student-history/', {
      params: { student_id: studentId, ...params },
    });
    return res.data;
  },

  getSessionReport: async (sessionId: number) => {
    const res = await apiClient.get('/sessions/attendance/session_report/', {
      params: { session_id: sessionId },
    });
    return res.data;
  },

  getCohortSummary: async (cohortId: number, params?: CohortSummaryParams) => {
    const res = await apiClient.get('/sessions/attendance/cohort_summary/', {
      params: { cohort_id: cohortId, ...params },
    });
    return res.data;
  },
};

// ── Cohort Subjects API ───────────────────────────────────────────────────

export const cohortSubjectAPI = {
  getByCohort: async (cohortId: number): Promise<CohortSubject[] | PaginatedResponse<CohortSubject>> => {
    const res = await apiClient.get<CohortSubject[] | PaginatedResponse<CohortSubject>>(
      `${KERNEL_COHORT_SUBJECTS_BASE}/`,
      { params: { cohort: cohortId } }
    );
    return res.data;
  },

  getById: async (id: number): Promise<CohortSubject> => {
    const res = await apiClient.get<CohortSubject>(`${KERNEL_COHORT_SUBJECTS_BASE}/${id}/`);
    return res.data;
  },
};

// ── Session Cohort API ────────────────────────────────────────────────────

export const sessionCohortAPI = {
  getLinkedCohorts: async (
    sessionId: number,
    authorityMode?: SessionReadAuthorityMode,
  ): Promise<SessionCohortsResponse> => {
    const res = await apiClient.get<SessionCohortsResponse>(`/sessions/${sessionId}/cohorts/`, {
      params: authorityMode ? { authority_mode: authorityMode } : undefined,
    });
    return res.data;
  },

  getAvailableCohortSubjects: async (
    sessionId: number
  ): Promise<AvailableSessionCohortSubjectsResponse> => {
    const res = await apiClient.get<AvailableSessionCohortSubjectsResponse>(
      `/sessions/${sessionId}/available-cohort-subjects/`
    );
    return res.data;
  },

  linkCohort: async (sessionId: number, data: LinkCohortRequest): Promise<SessionCohort> => {
    const res = await apiClient.post<SessionCohort>(`/sessions/${sessionId}/cohorts/link/`, data);
    return res.data;
  },

  unlinkCohort: async (sessionId: number, cohortId: number): Promise<void> => {
    await apiClient.delete(`/sessions/${sessionId}/cohorts/unlink/${cohortId}/`);
  },

  getSessionLearners: async (sessionId: number) => {
    const res = await apiClient.get<SessionLearner[]>(`/cbc/teaching-sessions/${sessionId}/learners/`);
    return res.data;
  },
};

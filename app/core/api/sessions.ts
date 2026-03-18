// ============================================================================
// app/core/api/sessions.ts
//
// Pure I/O boundary — no logic, no state, no transformation.
// All methods accept typed params and return typed responses only.
// ============================================================================

import { apiClient } from './client';
import {
  Session,
  SessionDetail,
  AttendanceRecord,
  AttendanceSummary,
  BulkAttendanceData,
  CohortSubject,
  LinkCohortRequest,
  SessionCohortsResponse,
  SessionCohort,
  SessionFormData,
} from '../types/session';
import { TopicSessionLink } from '../types/topics';

// ── Shared response shapes ────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ── Query param types ─────────────────────────────────────────────────────

export interface SessionQueryParams {
  term?: number;
  cohort_subject?: number;
  cohort_subject__cohort?: number;
  cohort_subject__subject?: number;
  session_type?: string;
  session_date?: string;
  created_by?: string;
}

export interface AttendanceQueryParams {
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
}

export interface CreateWithLinksResponse {
  session: Session;
  links_created: number;
  links: TopicSessionLink[];
}

interface DateRangeParams {
  start_date?: string;
  end_date?: string;
}

interface StudentHistoryParams extends DateRangeParams {
  cohort_id?: number;
  subject_id?: number;
}

interface CohortSummaryParams extends DateRangeParams {
  subject_id?: number;
}

// ── Sessions API ──────────────────────────────────────────────────────────

export const sessionAPI = {
  getAll: async (params?: SessionQueryParams): Promise<Session[] | PaginatedResponse<Session>> => {
    const res = await apiClient.get<Session[] | PaginatedResponse<Session>>('/sessions/', { params });
    return res.data;
  },

  getById: async (id: number): Promise<SessionDetail> => {
    const res = await apiClient.get<SessionDetail>(`/sessions/${id}/`);
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

  getByDateRange: async (startDate: string, endDate: string): Promise<Session[]> => {
    const res = await apiClient.get<Session[]>('/sessions/by_date_range/', {
      params: { start_date: startDate, end_date: endDate },
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

  create: async (data: SessionFormData & { created_by: number }): Promise<Session> => {
    const res = await apiClient.post<Session>('/sessions/', data);
    return res.data;
  },

  createWithLinks: async (
    data: SessionFormData & { created_by?: number; subtopic_ids?: number[] }
  ): Promise<CreateWithLinksResponse> => {
    const res = await apiClient.post<CreateWithLinksResponse>('/sessions/create_with_links/', data);
    return res.data;
  },

  update: async (id: number, data: Partial<Session>): Promise<Session> => {
    const res = await apiClient.patch<Session>(`/sessions/${id}/`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/sessions/${id}/`);
  },

  getAttendanceSummary: async (id: number): Promise<AttendanceSummary> => {
    const res = await apiClient.get<AttendanceSummary>(`/sessions/${id}/attendance_summary/`);
    return res.data;
  },

  markAttendance: async (id: number, data: BulkAttendanceData): Promise<void> => {
    await apiClient.post(`/sessions/${id}/mark_attendance/`, data);
  },

  reseedAttendance: async (id: number): Promise<void> => {
    await apiClient.post(`/sessions/${id}/reseed_attendance/`);
  },
};

// ── Attendance API ────────────────────────────────────────────────────────

export const attendanceAPI = {
  getAll: async (
    params?: AttendanceQueryParams
  ): Promise<AttendanceRecord[] | PaginatedResponse<AttendanceRecord>> => {
    const res = await apiClient.get<AttendanceRecord[] | PaginatedResponse<AttendanceRecord>>(
      '/attendance/',
      { params }
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
    marked_by: string;
  }): Promise<AttendanceRecord> => {
    const res = await apiClient.post<AttendanceRecord>('/sessions/attendance/', data);
    return res.data;
  },

  update: async (id: number, data: Partial<AttendanceRecord>): Promise<AttendanceRecord> => {
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
      `/cohort-subjects/?cohort=${cohortId}`
    );
    return res.data;
  },

  getById: async (id: number): Promise<CohortSubject> => {
    const res = await apiClient.get<CohortSubject>(`/cohort-subjects/${id}/`);
    return res.data;
  },
};

// ── Session Cohort API ────────────────────────────────────────────────────

export const sessionCohortAPI = {
  getLinkedCohorts: async (sessionId: number): Promise<SessionCohortsResponse> => {
    const res = await apiClient.get<SessionCohortsResponse>(`/sessions/${sessionId}/cohorts/`);
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
    const res = await apiClient.get(`/sessions/${sessionId}/learners/`);
    return res.data;
  },
};
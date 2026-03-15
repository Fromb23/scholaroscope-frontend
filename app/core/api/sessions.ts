// ============================================================================
// app/core/api/sessions.ts
//
// ONLY CHANGE: createWithLinks added to sessionAPI.
// Every existing method is untouched.
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
  SessionCohort
} from '../types/session';
import { TopicSessionLink } from '../types/topics';

// Sessions API
export const sessionAPI = {
  getAll: async (params?: {
    term?: number;
    cohort_subject?: number;
    'cohort_subject__cohort'?: number;
    'cohort_subject__subject'?: number;
    session_type?: string;
    session_date?: string;
    created_by?: string;
  }) => {
    const response = await apiClient.get<Session[]>('/sessions/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<SessionDetail>(`/sessions/${id}/`);
    return response.data;
  },

  getToday: async () => {
    const response = await apiClient.get<Session[]>('/sessions/today/');
    return response.data;
  },

  getUpcoming: async () => {
    const response = await apiClient.get<Session[]>('/sessions/upcoming/');
    return response.data;
  },

  getByDateRange: async (startDate: string, endDate: string) => {
    const response = await apiClient.get<Session[]>('/sessions/by_date_range/', {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data;
  },

  getByCohort: async (cohortId: number, startDate?: string, endDate?: string) => {
    const params: any = { cohort_id: cohortId };
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await apiClient.get<Session[]>('/sessions/by_cohort/', { params });
    return response.data;
  },

  getBySubject: async (subjectId: number, cohortId?: number) => {
    const params: any = { subject_id: subjectId };
    if (cohortId) params.cohort_id = cohortId;

    const response = await apiClient.get<Session[]>('/sessions/by_subject/', { params });
    return response.data;
  },

  getByCohortSubject: async (cohortSubjectId: number) => {
    const response = await apiClient.get<Session[]>('/sessions/by_cohort_subject/', {
      params: { cohort_subject_id: cohortSubjectId }
    });
    return response.data;
  },

  create: async (data: {
    cohort_subject: number;
    term?: number | null;
    session_type: string;
    session_date: string;
    start_time: string;
    end_time: string;
    title?: string;
    description?: string;
    venue?: string;
    created_by: number;
    auto_create_attendance?: boolean;
  }) => {
    const response = await apiClient.post<Session>('/sessions/', data);
    return response.data;
  },

  // ── NEW ──────────────────────────────────────────────────────────────────
  // Creates a session then links subtopics in one call.
  // The service layer handles link creation after the session is committed.
  // subtopic_ids is optional — omit or pass [] for CBC sessions or when
  // the instructor will link subtopics later from the session detail page.

  createWithLinks: async (data: {
    cohort_subject: number;
    term?: number | null;
    session_type: string;
    session_date: string;
    start_time: string;
    end_time: string;
    title?: string;
    description?: string;
    venue?: string;
    created_by?: string;
    auto_create_attendance?: boolean;
    subtopic_ids?: number[];
  }) => {
    const response = await apiClient.post<{
      session: Session;
      links_created: number;
      links: TopicSessionLink[];
    }>('/sessions/create_with_links/', data);
    return response.data;
  },

  // ─────────────────────────────────────────────────────────────────────────

  update: async (id: number, data: Partial<Session>) => {
    const response = await apiClient.patch<Session>(`/sessions/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/sessions/${id}/`);
  },

  getAttendanceSummary: async (id: number) => {
    const response = await apiClient.get<AttendanceSummary>(
      `/sessions/${id}/attendance_summary/`
    );
    return response.data;
  },

  markAttendance: async (id: number, attendanceData: BulkAttendanceData) => {
    console.log("Attendance at session level", attendanceData);
    const response = await apiClient.post(
      `/sessions/${id}/mark_attendance/`,
      attendanceData
    );
    return response.data;
  },

  reseedAttendance: async (id: number) => {
    const response = await apiClient.post(`/sessions/${id}/reseed_attendance/`);
    return response.data;
  }
};

// Attendance API
export const attendanceAPI = {
  getAll: async (params?: {
    session?: number;
    student?: number;
    status?: string;
    session__term?: number;
    session__cohort_subject?: number;
    'session__cohort_subject__cohort'?: number;
    'session__cohort_subject__subject'?: number;
    session__session_date?: string;
  }) => {
    const response = await apiClient.get<AttendanceRecord[]>('/attendance/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<AttendanceRecord>(`/sessions/attendance/${id}/`);
    return response.data;
  },

  create: async (data: {
    session: number;
    student: number;
    status: string;
    notes?: string;
    marked_by: string;
  }) => {
    const response = await apiClient.post<AttendanceRecord>('/sessions/attendance/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<AttendanceRecord>) => {
    const response = await apiClient.patch<AttendanceRecord>(`/sessions/attendance/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/sessions/attendance/${id}/`);
  },

  bulkMark: async (data: BulkAttendanceData & { session: number }) => {
    const response = await apiClient.post('/sessions/attendance/bulk_mark/', data);
    return response.data;
  },

  getStudentHistory: async (
    studentId: number,
    cohortId?: number,
    subjectId?: number,
    startDate?: string,
    endDate?: string
  ) => {
    const params: any = { student_id: studentId };
    if (cohortId) params.cohort_id = cohortId;
    if (subjectId) params.subject_id = subjectId;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await apiClient.get('/attendance/student-history/', { params });
    return response.data;
  },

  getSessionReport: async (sessionId: number) => {
    const response = await apiClient.get('/sessions/attendance/session_report/', {
      params: { session_id: sessionId }
    });
    return response.data;
  },

  getCohortSummary: async (
    cohortId: number,
    subjectId?: number,
    startDate?: string,
    endDate?: string
  ) => {
    const params: any = { cohort_id: cohortId };
    if (subjectId) params.subject_id = subjectId;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await apiClient.get('/sessions/attendance/cohort_summary/', { params });
    return response.data;
  }
};

// Cohort Subjects API
export const cohortSubjectAPI = {
  getByCohort: async (cohortId: number) => {
    const response = await apiClient.get<CohortSubject[]>(
      `/cohort-subjects/?cohort=${cohortId}`
    );
    return response.data;
  },

  getById: async (cohortSubjectId: number) => {
    const response = await apiClient.get<CohortSubject>(
      `/cohort-subjects/${cohortSubjectId}/`
    );
    return response.data;
  }
};

export const sessionCohortAPI = {
  getLinkedCohorts: async (sessionId: number): Promise<SessionCohortsResponse> => {
    const response = await apiClient.get<SessionCohortsResponse>(
      `/sessions/${sessionId}/cohorts/`
    );
    console.log("Linked cohorts", response.data);
    return response.data;
  },

  linkCohort: async (sessionId: number, data: LinkCohortRequest): Promise<SessionCohort> => {
    const response = await apiClient.post<SessionCohort>(
      `/sessions/${sessionId}/cohorts/link/`,
      data
    );
    return response.data;
  },

  unlinkCohort: async (sessionId: number, cohortId: number): Promise<void> => {
    await apiClient.delete(`/sessions/${sessionId}/cohorts/unlink/${cohortId}/`);
  },

  getSessionLearners: async (sessionId: number) => {
    const response = await apiClient.get(`/sessions/${sessionId}/learners/`);
    return response.data;
  }
};
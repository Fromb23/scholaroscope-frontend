// ============================================================================
// app/core/hooks/useSessions.ts
//
// Owns all session server state and mutations.
// No API calls outside this file. No any. No business logic in pages.
// ============================================================================

import { useState, useEffect } from 'react';
import {
  sessionAPI,
  attendanceAPI,
  sessionCohortAPI,
  SessionQueryParams,
  AttendanceQueryParams,
} from '@/app/core/api/sessions';
import { cohortSubjectAPI } from '@/app/core/api/academic';
import {
  Session,
  SessionDetail,
  AttendanceRecord,
  BulkAttendanceData,
  SessionCohort,
  SessionFormData,
  PaginationState,
  StudentAttendanceHistory,
  CohortAttendanceSummary,
} from '@/app/core/types/session';
import { CohortSubject } from '@/app/core/types/academic';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';


// ── Helper — unwrap paginated or flat response ────────────────────────────

function unwrapList<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : data?.results ?? [];
}

// ── useSessions ───────────────────────────────────────────────────────────

export const useSessions = (params?: SessionQueryParams) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await sessionAPI.getAll(params);
      setSessions(unwrapList(data));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch sessions'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [
    params?.term,
    params?.cohort_subject,
    params?.cohort_subject__cohort,
    params?.cohort_subject__subject,
    params?.session_type,
    params?.session_date,
  ]);

  const createSession = async (data: SessionFormData & { created_by: number }): Promise<Session> => {
    const newSession = await sessionAPI.create(data);
    setSessions(prev => [newSession, ...prev]);
    return newSession;
  };

  // Creates session + links subtopics in one atomic operation.
  // Use this instead of calling createSession + topicSessionLinkAPI separately.
  const createSessionWithLinks = async (
    data: SessionFormData & { created_by: number },
    subtopicIds: number[]
  ): Promise<Session> => {
    const result = await sessionAPI.createWithLinks({ ...data, subtopic_ids: subtopicIds });
    setSessions(prev => [result.session, ...prev]);
    return result.session;
  };

  const updateSession = async (id: number, data: Partial<Session>): Promise<Session> => {
    const updated = await sessionAPI.update(id, data);
    setSessions(prev => prev.map(s => s.id === id ? updated : s));
    return updated;
  };

  const deleteSession = async (id: number): Promise<void> => {
    await sessionAPI.delete(id);
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions,
    createSession,
    createSessionWithLinks,
    updateSession,
    deleteSession,
  };
};

// ── useTodaySessions ──────────────────────────────────────────────────────

export const useTodaySessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodaySessions = async () => {
    try {
      setLoading(true);
      const data = await sessionAPI.getToday();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, "Failed to fetch today's sessions"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaySessions();
  }, []);

  return { sessions, loading, error, refetch: fetchTodaySessions };
};

// ── useSessionDetail ──────────────────────────────────────────────────────

export const useSessionDetail = (
  sessionId: number | null,
  searchQuery?: string,
  page = 1,
  pageSize = 10
) => {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1, pageSize: 10, totalItems: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = async () => {
    if (!sessionId) { setLoading(false); return; }

    try {
      setLoading(true);

      const [sessionData, attendanceData] = await Promise.all([
        sessionAPI.getById(sessionId),
        attendanceAPI.getAll({
          session: sessionId,
          page,
          page_size: pageSize,
          ...(searchQuery ? { search: searchQuery } : {}),
        } as AttendanceQueryParams),
      ]);

      setSession(sessionData);

      const records = unwrapList(attendanceData);
      const totalItems = Array.isArray(attendanceData)
        ? records.length
        : (attendanceData as { count?: number }).count ?? records.length;

      setAttendanceRecords(records);
      setPagination({
        currentPage: page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      });
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch session details'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSession(); }, [sessionId, searchQuery, page, pageSize]);

  const markAttendance = async (data: BulkAttendanceData): Promise<void> => {
    if (!sessionId) return;
    await sessionAPI.markAttendance(sessionId, data);
    await fetchSession();
  };

  const reseedAttendance = async (): Promise<void> => {
    if (!sessionId) return;
    await sessionAPI.reseedAttendance(sessionId);
    await fetchSession();
  };

  const startSession = async (): Promise<void> => {
    if (!sessionId) return;
    const updated = await sessionAPI.start(sessionId);
    setSession(updated);
  };

  const completeSession = async (): Promise<void> => {
    if (!sessionId) return;
    const updated = await sessionAPI.complete(sessionId);
    setSession(updated);
  };

  return {
    session, attendanceRecords, pagination,
    loading, error,
    refetch: fetchSession,
    markAttendance, reseedAttendance, completeSession, startSession,
  };
};

// ── useCohortSessions ─────────────────────────────────────────────────────

export const useCohortSessions = (
  cohortId: number | null,
  startDate?: string,
  endDate?: string
) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    if (!cohortId) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await sessionAPI.getByCohort(cohortId, startDate, endDate);
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch cohort sessions'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, [cohortId, startDate, endDate]);

  return { sessions, loading, error, refetch: fetchSessions };
};

// ── useCohortSubjects ─────────────────────────────────────────────────────

export const useCohortSubjects = (cohortId: number | null) => {
  const [cohortSubjects, setCohortSubjects] = useState<CohortSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCohortSubjects = async () => {
    if (!cohortId) { setCohortSubjects([]); setLoading(false); return; }
    try {
      setLoading(true);
      const data = await cohortSubjectAPI.getByCohort(cohortId);
      setCohortSubjects(unwrapList(data));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch cohort subjects'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCohortSubjects(); }, [cohortId]);

  return { cohortSubjects, loading, error, refetch: fetchCohortSubjects };
};

// ── useAttendance ─────────────────────────────────────────────────────────

export const useAttendance = (params?: AttendanceQueryParams) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await attendanceAPI.getAll(params);
      setRecords(unwrapList(data));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch attendance records'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [
    params?.session,
    params?.student,
    params?.status,
    params?.session__cohort_subject,
    params?.session__cohort_subject__cohort,
    params?.session__cohort_subject__subject,
  ]);

  const updateRecord = async (id: number, data: Partial<AttendanceRecord>): Promise<AttendanceRecord> => {
    const updated = await attendanceAPI.update(id, data);
    setRecords(prev => prev.map(r => r.id === id ? updated : r));
    return updated;
  };

  return { records, loading, error, refetch: fetchRecords, updateRecord };
};

// ── useStudentAttendanceHistory ───────────────────────────────────────────


export const useStudentAttendanceHistory = (
  studentId: number | null,
  cohortId?: number,
  subjectId?: number,
  startDate?: string,
  endDate?: string
) => {
  const [data, setData] = useState<StudentAttendanceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!studentId) { setLoading(false); return; }
    try {
      setLoading(true);
      const result = await attendanceAPI.getStudentHistory(studentId, {
        cohort_id: cohortId,
        subject_id: subjectId,
        start_date: startDate,
        end_date: endDate,
      });
      setData(result as StudentAttendanceHistory);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch attendance history'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [studentId, cohortId, subjectId, startDate, endDate]);

  return { data, loading, error, refetch: fetchHistory };
};

// ── useCohortAttendanceSummary ───────────────────────────────────────────
export const useCohortAttendanceSummary = (
  cohortId: number | null,
  subjectId?: number,
  startDate?: string,
  endDate?: string
) => {
  const [data, setData] = useState<CohortAttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!cohortId) { setLoading(false); return; }
    try {
      setLoading(true);
      const result = await attendanceAPI.getCohortSummary(cohortId, {
        subject_id: subjectId,
        start_date: startDate,
        end_date: endDate,
      });
      setData(result as CohortAttendanceSummary);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch cohort attendance summary'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, [cohortId, subjectId, startDate, endDate]);

  return { data, loading, error, refetch: fetchSummary };
};

// ── useSessionCohorts ─────────────────────────────────────────────────────

export const useSessionCohorts = (sessionId: number | null) => {
  const [linkedCohorts, setLinkedCohorts] = useState<SessionCohort[]>([]);
  const [activeCohorts, setActiveCohorts] = useState<SessionCohort[]>([]);
  const [historicalCohorts, setHistoricalCohorts] = useState<SessionCohort[]>([]);
  const [totalLearners, setTotalLearners] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkedCohorts = async () => {
    if (!sessionId) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await sessionCohortAPI.getLinkedCohorts(sessionId);
      setLinkedCohorts(data.cohorts);
      setTotalLearners(data.total_learners);
      setActiveCohorts(data.cohorts.filter(c => c.is_active !== false));
      setHistoricalCohorts(data.cohorts.filter(c => c.is_active === false));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch linked cohorts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLinkedCohorts(); }, [sessionId]);

  const linkCohort = async (cohortId: number): Promise<void> => {
    if (!sessionId) return;
    await sessionCohortAPI.linkCohort(sessionId, { cohort_id: cohortId });
    await fetchLinkedCohorts();
  };

  const unlinkCohort = async (cohortId: number): Promise<void> => {
    if (!sessionId) return;
    await sessionCohortAPI.unlinkCohort(sessionId, cohortId);
    await fetchLinkedCohorts();
  };

  return {
    linkedCohorts, activeCohorts, historicalCohorts,
    totalLearners, loading, error,
    refetch: fetchLinkedCohorts,
    linkCohort, unlinkCohort,
  };
};
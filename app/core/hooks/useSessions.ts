// ============================================================================
// app/hooks/useSessions.ts - Updated with server-side search & pagination
// ============================================================================

import { useState, useEffect } from 'react';
import { sessionAPI, attendanceAPI, cohortSubjectAPI, sessionCohortAPI } from '@/app/core/api/sessions';
import {
  Session,
  SessionDetail,
  AttendanceRecord,
  BulkAttendanceData,
  CohortSubject,
  SessionCohort
} from '../types/session';

// Sessions Hook (unchanged)
export const useSessions = (params?: {
  term?: number;
  cohort_subject?: number;
  'cohort_subject__cohort'?: number;
  'cohort_subject__subject'?: number;
  session_type?: string;
  session_date?: string;
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await sessionAPI.getAll(params);
      const sessionArray = Array.isArray(data)
        ? data
        : (data as Record<string, any>)?.results ?? [];
      setSessions(sessionArray);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [
    params?.term,
    params?.cohort_subject,
    params?.['cohort_subject__cohort'],
    params?.['cohort_subject__subject'],
    params?.session_type,
    params?.session_date
  ]);

  const createSession = async (data: {
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
    try {
      const newSession = await sessionAPI.create(data);
      setSessions(prev => [newSession, ...prev]);
      return newSession;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create session');
    }
  };

  const updateSession = async (id: number, data: Partial<Session>) => {
    try {
      const updated = await sessionAPI.update(id, data);
      setSessions(prev => prev.map(s => s.id === id ? updated : s));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update session');
    }
  };

  const deleteSession = async (id: number) => {
    try {
      await sessionAPI.delete(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete session');
    }
  };

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions,
    createSession,
    updateSession,
    deleteSession
  };
};

// Today's Sessions Hook (unchanged)
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
    } catch (err: any) {
      setError(err.message || 'Failed to fetch today\'s sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaySessions();
  }, []);

  return {
    sessions,
    loading,
    error,
    refetch: fetchTodaySessions
  };
};

// Session Detail Hook - UPDATED with server-side search & pagination
export const useSessionDetail = (
  sessionId: number | null,
  searchQuery?: string,
  page: number = 1,
  pageSize: number = 10
) => {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch session details
      const sessionData = await sessionAPI.getById(sessionId);
      setSession(sessionData);

      // Fetch attendance with server-side filtering and pagination
      const attendanceParams: any = {
        session: sessionId,
        page: page,
        page_size: pageSize
      };

      if (searchQuery) {
        attendanceParams.search = searchQuery;
      }

      const response = await attendanceAPI.getAll(attendanceParams);

      // Handle paginated response
      const attendanceData: AttendanceRecord[] = Array.isArray(response)
        ? response
        : ((response as Record<string, any>)?.results ?? []);

      setAttendanceRecords(attendanceData);

      setPagination({
        currentPage: page,
        pageSize,
        totalItems: Array.isArray(response)
          ? attendanceData.length
          : ((response as Record<string, any>)?.count ?? attendanceData.length),
        totalPages: Array.isArray(response)
          ? 1
          : Math.ceil((((response as Record<string, any>)?.count ?? attendanceData.length) / pageSize))
      });


      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch session details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [sessionId, searchQuery, page, pageSize]);

  const markAttendance = async (attendanceData: BulkAttendanceData) => {
    if (!sessionId) return;

    try {
      await sessionAPI.markAttendance(sessionId, attendanceData);
      await fetchSession(); // Refresh session data
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to mark attendance');
    }
  };

  const reseedAttendance = async () => {
    if (!sessionId) return;

    try {
      await sessionAPI.reseedAttendance(sessionId);
      await fetchSession(); // Refresh session data
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to reseed attendance');
    }
  };

  return {
    session,
    attendanceRecords,
    pagination,
    loading,
    error,
    refetch: fetchSession,
    markAttendance,
    reseedAttendance
  };
};

// Cohort Sessions Hook (unchanged)
export const useCohortSessions = (
  cohortId: number | null,
  startDate?: string,
  endDate?: string
) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = async () => {
    if (!cohortId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await sessionAPI.getByCohort(cohortId, startDate, endDate);
      setSessions(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cohort sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [cohortId, startDate, endDate]);

  return {
    sessions,
    loading,
    error,
    refetch: fetchSessions
  };
};

// Cohort Subjects Hook (unchanged)
export const useCohortSubjects = (cohortId: number | null) => {
  const [cohortSubjects, setCohortSubjects] = useState<CohortSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCohortSubjects = async () => {
    if (!cohortId) {
      setCohortSubjects([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await cohortSubjectAPI.getByCohort(cohortId);
      const cohortSubjectsArray = Array.isArray(data)
        ? data
        : (data as Record<string, any>)?.results ?? []
      setCohortSubjects(cohortSubjectsArray);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cohort subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCohortSubjects();
  }, [cohortId]);

  return {
    cohortSubjects,
    loading,
    error,
    refetch: fetchCohortSubjects
  };
};

// Attendance Records Hook (unchanged)
export const useAttendance = (params?: {
  session?: number;
  student?: number;
  status?: string;
  session__cohort_subject?: number;
  'session__cohort_subject__cohort'?: number;
  'session__cohort_subject__subject'?: number;
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await attendanceAPI.getAll(params);
      setRecords(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance records');
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
    params?.['session__cohort_subject__cohort'],
    params?.['session__cohort_subject__subject']
  ]);

  const updateRecord = async (id: number, data: Partial<AttendanceRecord>) => {
    try {
      const updated = await attendanceAPI.update(id, data);
      setRecords(prev => prev.map(r => r.id === id ? updated : r));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update attendance');
    }
  };

  return {
    records,
    loading,
    error,
    refetch: fetchRecords,
    updateRecord
  };
};

// Student Attendance History Hook (unchanged)
export const useStudentAttendanceHistory = (
  studentId: number | null,
  cohortId?: number,
  subjectId?: number,
  startDate?: string,
  endDate?: string
) => {
  const [data, setData] = useState<{
    statistics: {
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      sick: number;
      unmarked: number;
      attendance_percentage: number;
    };
    records: AttendanceRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await attendanceAPI.getStudentHistory(
        studentId,
        cohortId,
        subjectId,
        startDate,
        endDate
      );
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [studentId, cohortId, subjectId, startDate, endDate]);

  return {
    data,
    loading,
    error,
    refetch: fetchHistory
  };
};

// Cohort Attendance Summary Hook (unchanged)
export const useCohortAttendanceSummary = (
  cohortId: number | null,
  subjectId?: number,
  startDate?: string,
  endDate?: string
) => {
  const [data, setData] = useState<{
    cohort_id: number;
    subject_id?: number;
    student_statistics: Array<{
      student: number;
      student__admission_number: string;
      student__first_name: string;
      student__last_name: string;
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      sick: number;
      unmarked: number;
      attendance_percentage: number;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!cohortId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await attendanceAPI.getCohortSummary(
        cohortId,
        subjectId,
        startDate,
        endDate
      );
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cohort attendance summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [cohortId, subjectId, startDate, endDate]);

  return {
    data,
    loading,
    error,
    refetch: fetchSummary
  };
};


/**
 * Hook for managing cohorts linked to a session
 * Separates active vs historical cohorts while maintaining backward compatibility
 */
export const useSessionCohorts = (sessionId: number | null) => {
  const [linkedCohorts, setLinkedCohorts] = useState<SessionCohort[]>([]);
  const [activeCohorts, setActiveCohorts] = useState<SessionCohort[]>([]);
  const [historicalCohorts, setHistoricalCohorts] = useState<SessionCohort[]>([]);
  const [totalLearners, setTotalLearners] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkedCohorts = async () => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await sessionCohortAPI.getLinkedCohorts(sessionId);

      // Maintain backward compatibility
      setLinkedCohorts(data.cohorts);
      setTotalLearners(data.total_learners);

      // New: Separate active and historical
      // Client-side filtering to separate cohorts
      setActiveCohorts(
        data.cohorts.filter(c => c.is_active !== false)
      );
      setHistoricalCohorts(
        data.cohorts.filter(c => c.is_active === false)
      );

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch linked cohorts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinkedCohorts();
  }, [sessionId]);

  const linkCohort = async (cohortId: number) => {
    if (!sessionId) return;

    try {
      const newLink = await sessionCohortAPI.linkCohort(sessionId, { cohort_id: cohortId });
      // Optimistic update
      setLinkedCohorts(prev => [...prev, newLink]);
      // Refresh to get accurate server state
      await fetchLinkedCohorts();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to link cohort');
    }
  };

  const unlinkCohort = async (cohortId: number) => {
    if (!sessionId) return;

    try {
      await sessionCohortAPI.unlinkCohort(sessionId, cohortId);
      // Optimistic update
      setLinkedCohorts(prev => prev.filter(c => c.cohort !== cohortId));
      // Refresh to get accurate server state (soft-delete moves to historical)
      await fetchLinkedCohorts();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to unlink cohort');
    }
  };

  return {
    // Backward compatible exports (existing code continues to work)
    linkedCohorts,
    totalLearners,
    loading,
    error,
    refetch: fetchLinkedCohorts,
    linkCohort,
    unlinkCohort,

    // New exports for components that need active/historical separation
    activeCohorts,
    historicalCohorts
  };
};

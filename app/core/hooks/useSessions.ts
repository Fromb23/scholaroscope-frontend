// ============================================================================
// app/core/hooks/useSessions.ts
//
// Owns all session server state and mutations.
// No API calls outside this file. No any. No business logic in pages.
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  sessionAPI,
  attendanceAPI,
  sessionCohortAPI,
  SessionQueryParams,
  AttendanceQueryParams,
} from '@/app/core/api/sessions';
import { cohortAPI, cohortSubjectAPI } from '@/app/core/api/academic';
import {
  emitSessionDataChanged,
  subscribeToSessionDataChanged,
} from '@/app/core/lib/sessionEvents';
import { withOperationalScope } from '@/app/core/lib/academicScope';
import {
  AvailableSessionCohortSubject,
  AvailableSessionCohortSubjectsResponse,
  Session,
  SessionDetail,
  AttendanceRecord,
  AttendanceRecordUpdatePayload,
  BulkAttendanceData,
  BulkAttendanceResponse,
  ConfirmTaughtOutcomesPayload,
  SessionClosureState,
  SessionAssignmentDraftResponse,
  SessionCohort,
  SessionFormData,
  PaginationState,
  RescheduleSessionPayload,
  StudentAttendanceHistory,
  CohortAttendanceSummary,
  CohortSubjectOption,
} from '@/app/core/types/session';
import { CohortSubject } from '@/app/core/types/academic';
import { ApiError, resolveErrorMessage } from '@/app/core/types/errors';


// ── Helper — unwrap paginated or flat response ────────────────────────────

function unwrapList<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : data?.results ?? [];
}

function mergeUniqueSessionCohorts(...collections: SessionCohort[][]): SessionCohort[] {
  const cohorts = new Map<number, SessionCohort>();

  collections.flat().forEach((cohort) => {
    if (!cohorts.has(cohort.id)) {
      cohorts.set(cohort.id, cohort);
    }
  });

  return Array.from(cohorts.values());
}

// ── useSessions ───────────────────────────────────────────────────────────

interface SessionSupervisionOptions {
  enabled: boolean;
  instructorId?: number;
}

export const useSessions = (
  params?: SessionQueryParams,
  supervision?: SessionSupervisionOptions,
) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionFilters = useMemo(
    () => withOperationalScope({
      scope: params?.scope,
      term: params?.term,
      cohort_subject: params?.cohort_subject,
      cohort_subject__cohort: params?.cohort_subject__cohort,
      cohort_subject__subject: params?.cohort_subject__subject,
      session_type: params?.session_type,
      session_date: params?.session_date,
      authority_mode: 'teaching' as const,
    }),
    [
      params?.scope,
      params?.term,
      params?.cohort_subject,
      params?.cohort_subject__cohort,
      params?.cohort_subject__subject,
      params?.session_type,
      params?.session_date,
    ],
  );
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = supervision?.enabled
        ? await sessionAPI.getSupervised({
          ...sessionFilters,
          authority_mode: 'supervision',
          instructor_id: supervision.instructorId,
        })
        : await sessionAPI.getAll(sessionFilters);
      setSessions(unwrapList(data));
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Unable to load sessions right now.'));
    } finally {
      setLoading(false);
    }
  }, [sessionFilters, supervision?.enabled, supervision?.instructorId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    return subscribeToSessionDataChanged(() => {
      void fetchSessions();
    });
  }, [fetchSessions]);

  const createSession = async (data: SessionFormData): Promise<Session> => {
    const newSession = await sessionAPI.create(data);
    setSessions(prev => [newSession, ...prev]);
    return newSession;
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
    updateSession,
    deleteSession,
  };
};

// ── useTodaySessions ──────────────────────────────────────────────────────

export const useTodaySessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchTodaySessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sessionAPI.getToday();
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, "Failed to fetch today's sessions"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodaySessions();
  }, [fetchTodaySessions]);

  useEffect(() => {
    return subscribeToSessionDataChanged(() => {
      void fetchTodaySessions();
    });
  }, [fetchTodaySessions]);

  return { sessions, loading, error, refetch: fetchTodaySessions };
};

// ── useSessionDetail ──────────────────────────────────────────────────────

export const useSessionDetail = (
  sessionId: number | null,
  options?: { includeOperationalData?: boolean },
) => {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [closureState, setClosureState] = useState<SessionClosureState | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1, pageSize: 0, totalItems: 0, totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const includeOperationalData = options?.includeOperationalData ?? true;

  const fetchClosureState = useCallback(async (): Promise<SessionClosureState | null> => {
    if (!sessionId || !includeOperationalData) {
      setClosureState(null);
      return null;
    }

    try {
      const data = await sessionAPI.getClosureState(sessionId);
      setClosureState(data);
      return data;
    } catch (err) {
      const message = resolveErrorMessage(err as ApiError, 'Failed to fetch lesson closure state');
      setError(message);
      setClosureState(null);
      throw new Error(message);
    }
  }, [includeOperationalData, sessionId]);

  const fetchSession = useCallback(async (
    freshClosureState?: SessionClosureState | null,
  ) => {
    if (!sessionId) { setLoading(false); return; }

    try {
      setLoading(true);

      const sessionData = await sessionAPI.getById(sessionId);
      const [attendanceData, closureData] = includeOperationalData
        ? await Promise.all([
          sessionAPI.getAttendanceRecords(sessionId, {
            page_size: 1000,
          }),
          freshClosureState === undefined
            ? sessionAPI.getClosureState(sessionId)
            : Promise.resolve(freshClosureState),
        ])
        : [sessionData.attendance_records, null] as const;

      // Operational fields are absent from the learner contract. Empty/default
      // values keep the shared component stable without reconstructing class data.
      setSession({
        linked_cohorts: [],
        planned_outcomes: [],
        taught_outcomes: [],
        attendance_count: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          sick: 0,
          unmarked: 0,
        },
        schedule_state: 'UNKNOWN',
        is_current_year: true,
        ...sessionData,
      } as SessionDetail);
      setClosureState(closureData);

      const records = unwrapList(attendanceData) as AttendanceRecord[];
      const totalItems = Array.isArray(attendanceData)
        ? records.length
        : (attendanceData as { count?: number }).count ?? records.length;

      setAttendanceRecords(records);
      setPagination({
        currentPage: 1,
        pageSize: records.length,
        totalItems,
        totalPages: 1,
      });
      setError(null);
      setErrorStatus(null);
    } catch (err) {
      const apiError = err as ApiError;
      setSession(null);
      setAttendanceRecords([]);
      setClosureState(null);
      setError(resolveErrorMessage(apiError, 'Failed to fetch session details'));
      setErrorStatus(typeof apiError.response?.status === 'number' ? apiError.response.status : null);
    } finally {
      setLoading(false);
    }
  }, [includeOperationalData, sessionId]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  const markAttendance = async (data: BulkAttendanceData): Promise<BulkAttendanceResponse | null> => {
    if (!sessionId) return null;
    const response = await sessionAPI.markAttendance(sessionId, data);
    setClosureState(response.closure_state);
    await fetchSession(response.closure_state);
    emitSessionDataChanged({
      reason: 'attendance_updated',
      sessionId,
    });
    return response;
  };

  const reseedAttendance = async (): Promise<void> => {
    if (!sessionId) return;
    await sessionAPI.reseedAttendance(sessionId);
    await fetchSession();
    emitSessionDataChanged({
      reason: 'attendance_updated',
      sessionId,
    });
  };

  const startSession = async (): Promise<void> => {
    if (!sessionId) return;
    const updated = await sessionAPI.start(sessionId);
    setSession(updated);
    await fetchSession();
    emitSessionDataChanged({
      reason: 'session_started',
      sessionId,
    });
  };

  const completeSession = async (): Promise<void> => {
    if (!sessionId) return;
    const updated = await sessionAPI.complete(sessionId);
    setSession(updated);
    await fetchSession();
    emitSessionDataChanged({
      reason: 'session_completed',
      sessionId,
    });
  };

  const cancelSession = async (): Promise<void> => {
    if (!sessionId) return;
    const updated = await sessionAPI.cancel(sessionId);
    setSession(updated);
    await fetchSession();
    emitSessionDataChanged({
      reason: 'session_cancelled',
      sessionId,
    });
  };

  const rescheduleSession = async (
    data: RescheduleSessionPayload,
  ): Promise<void> => {
    if (!sessionId) return;
    const updated = await sessionAPI.reschedule(sessionId, data);
    setSession(updated);
    await fetchSession();
    emitSessionDataChanged({
      reason: 'session_rescheduled',
      sessionId,
    });
  };

  const confirmTaughtOutcomes = async (
    data: ConfirmTaughtOutcomesPayload,
  ): Promise<void> => {
    if (!sessionId) return;
    const updated = await sessionAPI.confirmTaughtOutcomes(sessionId, data);
    setSession(updated);
    await fetchSession();
    emitSessionDataChanged({
      reason: 'taught_outcomes_confirmed',
      sessionId,
    });
  };

  const createAssignmentFromLesson = async (): Promise<SessionAssignmentDraftResponse> => {
    if (!sessionId) {
      throw new Error('Session not found.');
    }

    return sessionAPI.createAssignmentFromLesson(sessionId);
  };

  return {
    session, attendanceRecords, pagination,
    closureState,
    loading, error, errorStatus,
    refetch: () => fetchSession(),
    refetchClosureState: fetchClosureState,
    markAttendance,
    reseedAttendance,
    completeSession,
    cancelSession,
    rescheduleSession,
    startSession,
    confirmTaughtOutcomes,
    createAssignmentFromLesson,
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

  const fetchSessions = useCallback(async () => {
    if (!cohortId) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await sessionAPI.getByCohort(cohortId, startDate, endDate);
      setSessions(data);
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch cohort sessions'));
    } finally {
      setLoading(false);
    }
  }, [cohortId, endDate, startDate]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  return { sessions, loading, error, refetch: fetchSessions };
};

// ── useCohortSubjects ─────────────────────────────────────────────────────

export const useCohortSubjects = (cohortId: number | null) => {
  const [cohortSubjects, setCohortSubjects] = useState<CohortSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCohortSubjects = useCallback(async () => {
    if (!cohortId) { setCohortSubjects([]); setLoading(false); return; }
    try {
      setLoading(true);
      const data = await cohortSubjectAPI.getByCohort(cohortId);
      setCohortSubjects(unwrapList(data));
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch cohort subjects'));
    } finally {
      setLoading(false);
    }
  }, [cohortId]);

  useEffect(() => { fetchCohortSubjects(); }, [fetchCohortSubjects]);

  return { cohortSubjects, loading, error, refetch: fetchCohortSubjects };
};

export const useCohortSubjectOptions = (cohortId: number | null) => {
  const [subjectOptions, setSubjectOptions] = useState<CohortSubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjectOptions = useCallback(async () => {
    if (!cohortId) {
      setSubjectOptions([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await cohortAPI.getSubjectOptions(cohortId);
      setSubjectOptions(data);
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch cohort subject options'));
    } finally {
      setLoading(false);
    }
  }, [cohortId]);

  useEffect(() => {
    fetchSubjectOptions();
  }, [fetchSubjectOptions]);

  return { subjectOptions, loading, error, refetch: fetchSubjectOptions };
};

// ── useAttendance ─────────────────────────────────────────────────────────

export const useAttendance = (params?: AttendanceQueryParams) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const attendanceFilters = useMemo(
    () => withOperationalScope({
      scope: params?.scope,
      term: params?.term,
      session: params?.session,
      student: params?.student,
      status: params?.status,
      session__term: params?.session__term,
      session__cohort_subject: params?.session__cohort_subject,
      session__cohort_subject__cohort: params?.session__cohort_subject__cohort,
      session__cohort_subject__subject: params?.session__cohort_subject__subject,
      session__session_date: params?.session__session_date,
      page: params?.page,
      page_size: params?.page_size,
      search: params?.search,
    }, ['session__term']),
    [
      params?.scope,
      params?.term,
      params?.session,
      params?.student,
      params?.status,
      params?.session__term,
      params?.session__cohort_subject,
      params?.session__cohort_subject__cohort,
      params?.session__cohort_subject__subject,
      params?.session__session_date,
      params?.page,
      params?.page_size,
      params?.search,
    ],
  );

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const data = await attendanceAPI.getAll(attendanceFilters);
      setRecords(unwrapList(data));
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch attendance records'));
    } finally {
      setLoading(false);
    }
  }, [attendanceFilters]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const updateRecord = async (id: number, data: AttendanceRecordUpdatePayload): Promise<AttendanceRecord> => {
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

  const fetchHistory = useCallback(async () => {
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
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch attendance history'));
    } finally {
      setLoading(false);
    }
  }, [cohortId, endDate, startDate, studentId, subjectId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  return { data, loading, error, refetch: fetchHistory };
};

// ── useCohortAttendanceSummary ───────────────────────────────────────────
export const useCohortAttendanceSummary = (
  cohortId: number | null,
  cohortSubjectId: number,
  startDate?: string,
  endDate?: string
) => {
  const [data, setData] = useState<CohortAttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!cohortId || !cohortSubjectId) { setLoading(false); return; }
    try {
      setLoading(true);
      const result = await attendanceAPI.getCohortSummary(cohortId, {
        cohort_subject_id: cohortSubjectId,
        start_date: startDate,
        end_date: endDate,
      });
      setData(result as CohortAttendanceSummary);
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch cohort attendance summary'));
    } finally {
      setLoading(false);
    }
  }, [cohortId, cohortSubjectId, endDate, startDate]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  return { data, loading, error, refetch: fetchSummary };
};

// ── useSessionCohorts ─────────────────────────────────────────────────────

export const useSessionCohorts = (sessionId: number | null, enabled = true) => {
  const [linkedCohorts, setLinkedCohorts] = useState<SessionCohort[]>([]);
  const [activeCohorts, setActiveCohorts] = useState<SessionCohort[]>([]);
  const [historicalCohorts, setHistoricalCohorts] = useState<SessionCohort[]>([]);
  const [totalLearners, setTotalLearners] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkedCohorts = useCallback(async () => {
    if (!sessionId || !enabled) {
      setLinkedCohorts([]);
      setActiveCohorts([]);
      setHistoricalCohorts([]);
      setTotalLearners(0);
      setError(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await sessionCohortAPI.getLinkedCohorts(sessionId);
      const fallbackCohorts = data.cohorts ?? [];
      const activeItems = data.active_cohorts ?? fallbackCohorts.filter((cohort) => cohort.is_active !== false);
      const historicalItems = data.historical_cohorts ?? fallbackCohorts.filter((cohort) => cohort.is_active === false);
      const allItems = fallbackCohorts.length > 0
        ? fallbackCohorts
        : mergeUniqueSessionCohorts(activeItems, historicalItems);

      setLinkedCohorts(allItems);
      setTotalLearners(data.total_participating_learners ?? data.total_learners ?? 0);
      setActiveCohorts(activeItems);
      setHistoricalCohorts(historicalItems);
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch linked cohorts'));
    } finally {
      setLoading(false);
    }
  }, [enabled, sessionId]);

  useEffect(() => { fetchLinkedCohorts(); }, [fetchLinkedCohorts]);

  const linkCohortSubject = async (cohortSubjectId: number): Promise<void> => {
    if (!sessionId) return;
    await sessionCohortAPI.linkCohort(sessionId, { cohort_subject_id: cohortSubjectId });
    await fetchLinkedCohorts();
    emitSessionDataChanged({
      reason: 'participation_updated',
      sessionId,
    });
  };

  const unlinkCohort = async (cohortId: number): Promise<void> => {
    if (!sessionId) return;
    await sessionCohortAPI.unlinkCohort(sessionId, cohortId);
    await fetchLinkedCohorts();
    emitSessionDataChanged({
      reason: 'participation_updated',
      sessionId,
    });
  };

  return {
    linkedCohorts, activeCohorts, historicalCohorts,
    totalLearners, loading, error,
    refetch: fetchLinkedCohorts,
    linkCohortSubject, unlinkCohort,
  };
};

export const useAvailableSessionCohortSubjects = (
  sessionId: number | null,
  enabled = true
) => {
  const [data, setData] = useState<AvailableSessionCohortSubjectsResponse | null>(null);
  const [cohortSubjects, setCohortSubjects] = useState<AvailableSessionCohortSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableCohortSubjects = useCallback(async () => {
    if (!sessionId || !enabled) {
      setData(null);
      setCohortSubjects([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await sessionCohortAPI.getAvailableCohortSubjects(sessionId);
      setData(result);
      setCohortSubjects(result.results ?? []);
      setError(null);
    } catch (err) {
      setData(null);
      setCohortSubjects([]);
      setError(
        resolveErrorMessage(err as ApiError, 'Failed to fetch available cohort subjects')
      );
    } finally {
      setLoading(false);
    }
  }, [enabled, sessionId]);

  useEffect(() => {
    fetchAvailableCohortSubjects();
  }, [fetchAvailableCohortSubjects]);

  return {
    data,
    cohortSubjects,
    loading,
    error,
    refetch: fetchAvailableCohortSubjects,
  };
};

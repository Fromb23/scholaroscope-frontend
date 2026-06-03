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
import {
  AvailableSessionCohortSubject,
  AvailableSessionCohortSubjectsResponse,
  Session,
  SessionDetail,
  AttendanceRecord,
  BulkAttendanceData,
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
import { CohortSubject, TeachingAssignment } from '@/app/core/types/academic';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';


// ── Helper — unwrap paginated or flat response ────────────────────────────

function unwrapList<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : data?.results ?? [];
}

function toIdSet(idsKey: string): Set<number> {
  if (!idsKey) return new Set<number>();
  return new Set(
    idsKey
      .split(',')
      .map(value => Number(value))
      .filter(value => Number.isFinite(value))
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function firstFiniteNumber(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (isFiniteNumber(value)) {
      return value;
    }
  }

  return null;
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

function normalizeTeachingSource(source?: string | null, curriculumType?: string | null) {
  if (curriculumType === 'CBE') {
    return 'cbc';
  }

  return source?.trim().toLowerCase() || 'kernel';
}

function getSessionScopedCohortSubjectId(session: Session): number | null {
  return firstFiniteNumber(session.cohort_subject, session.cambridge_cohort_subject_id);
}

function hasEquivalentSessionIdentity(session: Session) {
  return isFiniteNumber(session.offering_id) || isFiniteNumber(session.subject_id);
}

function matchesInstructorAssignmentBySessionIdentity(
  session: Session,
  assignment: TeachingAssignment
) {
  if (session.cohort_id !== assignment.cohort_id) {
    return false;
  }

  const sessionSource = normalizeTeachingSource(session.subject_source, session.curriculum_type);
  const assignmentSource = normalizeTeachingSource(
    assignment.source ?? assignment.subject_source,
    assignment.curriculum_type
  );

  if (sessionSource !== assignmentSource) {
    return false;
  }

  if (
    sessionSource === 'cambridge' &&
    isFiniteNumber(session.offering_id) &&
    isFiniteNumber(assignment.offering_id)
  ) {
    return session.offering_id === assignment.offering_id;
  }

  return isFiniteNumber(session.subject_id) && session.subject_id === assignment.subject_id;
}

function filterInstructorSessions(
  allSessions: Session[],
  assignments: TeachingAssignment[],
  allowedCohortSubjectIds: Set<number>,
  allowedCohortIds: Set<number>
) {
  return allSessions.filter((session) => {
    const scopedCohortSubjectId = getSessionScopedCohortSubjectId(session);

    if (scopedCohortSubjectId !== null) {
      if (allowedCohortSubjectIds.has(scopedCohortSubjectId)) {
        return true;
      }

      return hasEquivalentSessionIdentity(session)
        ? assignments.some((assignment) => matchesInstructorAssignmentBySessionIdentity(session, assignment))
        : false;
    }

    if (hasEquivalentSessionIdentity(session)) {
      return assignments.some((assignment) => matchesInstructorAssignmentBySessionIdentity(session, assignment));
    }

    return allowedCohortIds.has(session.cohort_id);
  });
}

// ── useSessions ───────────────────────────────────────────────────────────

export const useSessions = (params?: SessionQueryParams) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const instructorAccess = useInstructorCohortAccess();
  const sessionFilters = useMemo(
    () => ({
      term: params?.term,
      cohort_subject: params?.cohort_subject,
      cohort_subject__cohort: params?.cohort_subject__cohort,
      cohort_subject__subject: params?.cohort_subject__subject,
      session_type: params?.session_type,
      session_date: params?.session_date,
      created_by: params?.created_by,
      instructor_id: params?.instructor_id,
    }),
    [
      params?.term,
      params?.cohort_subject,
      params?.cohort_subject__cohort,
      params?.cohort_subject__subject,
      params?.session_type,
      params?.session_date,
      params?.created_by,
      params?.instructor_id,
    ],
  );
  const cohortIdsKey = instructorAccess.cohortIdsKey;
  const allowedCohortIds = useMemo(
    () => toIdSet(cohortIdsKey),
    [cohortIdsKey]
  );
  const cohortSubjectIdsKey = instructorAccess.cohortSubjectIdsKey;
  const allowedCohortSubjectIds = useMemo(
    () => toIdSet(cohortSubjectIdsKey),
    [cohortSubjectIdsKey]
  );

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sessionAPI.getAll(sessionFilters);
      const allSessions = unwrapList(data);
      setSessions(
        instructorAccess.isInstructor
          ? filterInstructorSessions(
            allSessions,
            instructorAccess.assignments,
            allowedCohortSubjectIds,
            allowedCohortIds
          )
          : allSessions
      );
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch sessions'));
    } finally {
      setLoading(false);
    }
  }, [
    allowedCohortIds,
    allowedCohortSubjectIds,
    instructorAccess.assignments,
    instructorAccess.isInstructor,
    sessionFilters,
  ]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    return subscribeToSessionDataChanged(() => {
      void fetchSessions();
    });
  }, [fetchSessions]);

  const createSession = async (data: SessionFormData & { created_by: number }): Promise<Session> => {
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
  const instructorAccess = useInstructorCohortAccess();
  const cohortIdsKey = instructorAccess.cohortIdsKey;
  const allowedCohortIds = useMemo(
    () => toIdSet(cohortIdsKey),
    [cohortIdsKey]
  );
  const cohortSubjectIdsKey = instructorAccess.cohortSubjectIdsKey;
  const allowedCohortSubjectIds = useMemo(
    () => toIdSet(cohortSubjectIdsKey),
    [cohortSubjectIdsKey]
  );

  const fetchTodaySessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await sessionAPI.getToday();
      setSessions(
        instructorAccess.isInstructor
          ? filterInstructorSessions(
            data,
            instructorAccess.assignments,
            allowedCohortSubjectIds,
            allowedCohortIds
          )
          : data
      );
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, "Failed to fetch today's sessions"));
    } finally {
      setLoading(false);
    }
  }, [
    allowedCohortIds,
    allowedCohortSubjectIds,
    instructorAccess.assignments,
    instructorAccess.isInstructor,
  ]);

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
) => {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [closureState, setClosureState] = useState<SessionClosureState | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1, pageSize: 0, totalItems: 0, totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClosureState = useCallback(async (): Promise<SessionClosureState | null> => {
    if (!sessionId) {
      setClosureState(null);
      return null;
    }

    try {
      const data = await sessionAPI.getClosureState(sessionId);
      setClosureState(data);
      return data;
    } catch {
      setClosureState(null);
      return null;
    }
  }, [sessionId]);

  const fetchSession = useCallback(async () => {
    if (!sessionId) { setLoading(false); return; }

    try {
      setLoading(true);

      const [sessionData, attendanceData, closureData] = await Promise.all([
        sessionAPI.getById(sessionId),
        sessionAPI.getAttendanceRecords(sessionId, {
          page_size: 1000,
        }),
        sessionAPI.getClosureState(sessionId).catch(() => null),
      ]);

      setSession(sessionData);
      setClosureState(closureData);

      const records = unwrapList(attendanceData);
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
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch session details'));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  const markAttendance = async (data: BulkAttendanceData): Promise<void> => {
    if (!sessionId) return;
    await sessionAPI.markAttendance(sessionId, data);
    await fetchSession();
    emitSessionDataChanged({
      reason: 'attendance_updated',
      sessionId,
    });
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
    loading, error,
    refetch: fetchSession,
    refetchClosureState: fetchClosureState,
    markAttendance,
    reseedAttendance,
    completeSession,
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
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch cohort sessions'));
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
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch cohort subjects'));
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
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch cohort subject options'));
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
    () => ({
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
    }),
    [
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
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch attendance records'));
    } finally {
      setLoading(false);
    }
  }, [attendanceFilters]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

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
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch attendance history'));
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
  subjectId?: number,
  startDate?: string,
  endDate?: string
) => {
  const [data, setData] = useState<CohortAttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
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
  }, [cohortId, endDate, startDate, subjectId]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

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

  const fetchLinkedCohorts = useCallback(async () => {
    if (!sessionId) { setLoading(false); return; }
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
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch linked cohorts'));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

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
        extractErrorMessage(err as ApiError, 'Failed to fetch available cohort subjects')
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

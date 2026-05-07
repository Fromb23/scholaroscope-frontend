import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { learnersAPI } from '../api/learners';
import { Student, StudentStats, StudentDetail } from '../types/student';
import { ApiError, extractErrorMessage } from '../types/errors';

// ── useStudents ───────────────────────────────────────────────────────────

interface StudentsFilters {
  cohort?: number;
  cohort_subject?: number;
  status?: string;
  gender?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

export function useStudents(filters?: StudentsFilters) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  });

  const abortRef = useRef<AbortController | null>(null);
  const filtersKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);
  const normalizedFilters = useMemo<StudentsFilters>(
    () => JSON.parse(filtersKey) as StudentsFilters,
    [filtersKey]
  );

  const loadStudents = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await learnersAPI.getStudents({
        ...normalizedFilters,
        page: normalizedFilters.page ?? 1,
        page_size: normalizedFilters.page_size ?? 10,
      });

      if (controller.signal.aborted) return;

      const results = Array.isArray(data) ? data : data.results ?? [];
      setStudents(results);

      if (!Array.isArray(data)) {
        const totalItems = data.count ?? results.length;
        const pageSize = normalizedFilters.page_size ?? 10;
        setPagination({
          currentPage: normalizedFilters.page ?? 1,
          pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / pageSize),
        });
      } else {
        setPagination({
          currentPage: 1,
          pageSize: results.length,
          totalItems: results.length,
          totalPages: 1,
        });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(extractErrorMessage(err as ApiError, 'Failed to load students'));
      setStudents([]);
      setPagination({ currentPage: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [normalizedFilters]);

  useEffect(() => {
    loadStudents();
    return () => { abortRef.current?.abort(); };
  }, [loadStudents]);

  return { students, pagination, loading, error, reload: loadStudents };
}

// ── useStudent ────────────────────────────────────────────────────────────

export function useStudent(id: number) {
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadStudent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await learnersAPI.getStudent(id);
      setStudent(data);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to load student'));
      setStudent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) loadStudent();
  }, [id, loadStudent]);

  const withAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await fn();
      await loadStudent();
    } catch (err) {
      const message = extractErrorMessage(err as ApiError, 'Action failed');
      setActionError(message);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  const updateStatus = (status: string, deactivateEnrollments: boolean, notes: string) =>
    withAction(() => learnersAPI.updateStatus(id, status, deactivateEnrollments, notes));

  const enroll = (data: { cohort_id: number; enrollment_type: string; notes: string }) =>
    withAction(() => learnersAPI.enrollStudent(id, data));

  const unenroll = (cohortId: number, data: { end_reason: string; notes: string }) =>
    withAction(() => learnersAPI.unenrollStudent(id, cohortId, data));

  const deleteStudent = () =>
    withAction(() => learnersAPI.deleteStudent(id));

  return {
    student, loading, error,
    actionLoading, actionError, setActionError,
    reload: loadStudent,
    updateStatus, enroll, unenroll, deleteStudent,
  };
}

// ── useStudentStats ───────────────────────────────────────────────────────

export function useStudentStats() {
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await learnersAPI.getStatistics();
      setStats(data);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to load stats'));
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  return { stats, loading, error, reload: loadStats };
}

// ── useStudentsByCohort ───────────────────────────────────────────────────

export function useStudentsByCohort(cohortId?: number) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    if (!cohortId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await learnersAPI.getStudentsByCohort(cohortId);
      setStudents(data);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to load students'));
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [cohortId]);

  useEffect(() => {
    if (cohortId) loadStudents();
  }, [cohortId, loadStudents]);

  return { students, loading, error, reload: loadStudents };
}

// ── useMultiCohortStudents ────────────────────────────────────────────────

export function useMultiCohortStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await learnersAPI.getMultiCohortStudents();
      setStudents(data);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to load students'));
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  return { students, loading, error, reload: loadStudents };
}

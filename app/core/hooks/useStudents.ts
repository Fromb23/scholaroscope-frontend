import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { learnersAPI } from '../api/learners';
import { Student, StudentStats, StudentDetail } from '../types/student';
import { ApiError, extractErrorMessage } from '../types/errors';
import { academicKeys } from '@/app/core/lib/queryKeys';

// ── useStudents ───────────────────────────────────────────────────────────

interface StudentsFilters {
  cohort?: number;
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
  const cohort = filters?.cohort;
  const status = filters?.status;
  const gender = filters?.gender;
  const search = filters?.search;
  const page = filters?.page ?? 1;
  const pageSize = filters?.page_size ?? 10;

  const loadStudents = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await learnersAPI.getStudents({
        cohort,
        status,
        gender,
        search,
        page,
        page_size: pageSize,
      });

      if (controller.signal.aborted) return;

      const results = Array.isArray(data) ? data : data.results ?? [];
      setStudents(results);

      if (!Array.isArray(data)) {
        const totalItems = data.count ?? results.length;
        setPagination({
          currentPage: page,
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
  }, [
    cohort,
    gender,
    page,
    pageSize,
    search,
    status,
  ]);

  useEffect(() => {
    loadStudents();
    return () => { abortRef.current?.abort(); };
  }, [loadStudents]);

  return { students, pagination, loading, error, reload: loadStudents };
}

// ── useStudent ────────────────────────────────────────────────────────────

export function useStudent(id: number) {
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const enabled = Number.isFinite(id) && id > 0;
  const query = useQuery<StudentDetail, Error>({
    queryKey: academicKeys.students.detail(id),
    queryFn: async () => learnersAPI.getStudent(id),
    enabled,
    staleTime: 30_000,
  });

  const loadStudent = async () => {
    const result = await query.refetch();
    return result.data ?? null;
  };

  const withAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: academicKeys.students.detail(id) });
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
    student: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
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

  const loadStats = async () => {
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
  };

  useEffect(() => { loadStats(); }, []);

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

  const loadStudents = async () => {
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
  };

  useEffect(() => { loadStudents(); }, []);

  return { students, loading, error, reload: loadStudents };
}

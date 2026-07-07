import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { learnersAPI } from '../api/learners';
import {
  EnrollmentFormData,
  LearnerDeleteEligibility,
  LearnerLifecyclePayload,
  Student,
  StudentDetail,
  StudentStats,
  TransferFormData,
} from '../types/student';
import { ApiError, extractErrorMessage } from '../types/errors';
import { academicKeys } from '@/app/core/lib/queryKeys';

// ── useStudents ───────────────────────────────────────────────────────────

interface StudentsFilters {
  cohort?: number;
  cohort_subject?: number;
  status?: string;
  gender?: string;
  search?: string;
  q?: string;
  admission_number?: string;
  name?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export function useStudents(filters?: StudentsFilters, options?: { enabled?: boolean }) {
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
  const enabled = options?.enabled ?? true;
  const cohort = filters?.cohort;
  const cohortSubject = filters?.cohort_subject;
  const status = filters?.status;
  const gender = filters?.gender;
  const search = filters?.search;
  const q = filters?.q;
  const admissionNumber = filters?.admission_number;
  const name = filters?.name;
  const page = filters?.page ?? 1;
  const pageSize = filters?.page_size ?? 10;
  const ordering = filters?.ordering;

  const loadStudents = useCallback(async () => {
    if (!enabled) {
      abortRef.current?.abort();
      setStudents([]);
      setError(null);
      setLoading(false);
      setPagination({ currentPage: 1, pageSize, totalItems: 0, totalPages: 0 });
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await learnersAPI.getStudents({
        cohort,
        cohort_subject: cohortSubject,
        status,
        gender,
        search,
        q,
        admission_number: admissionNumber,
        name,
        page,
        page_size: pageSize,
        ordering,
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
    admissionNumber,
    cohortSubject,
    enabled,
    cohort,
    gender,
    name,
    ordering,
    page,
    pageSize,
    q,
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

  const invalidateLearnerDependencies = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: academicKeys.students.all }),
      queryClient.invalidateQueries({ queryKey: academicKeys.students.detail(id) }),
      queryClient.invalidateQueries({ queryKey: academicKeys.cohorts.all }),
      queryClient.invalidateQueries({ queryKey: ['academic', 'cohorts', 'students', 'enrolled'] }),
      queryClient.invalidateQueries({ queryKey: ['academic', 'cohorts', 'students', 'available'] }),
      queryClient.invalidateQueries({ queryKey: ['academic', 'cohorts', 'subject-participation'] }),
      queryClient.invalidateQueries({ queryKey: academicKeys.cohortSubjects.learnersPrefix }),
      queryClient.invalidateQueries({
        predicate: queryCacheItem => {
          const key = queryCacheItem.queryKey;
          return Array.isArray(key)
            && key.some(part => typeof part === 'string' && ['report', 'reports', 'reporting'].includes(part));
        },
      }),
    ]);
  };

  const withAction = async <T,>(fn: () => Promise<T>, options?: { refetch?: boolean }): Promise<T> => {
    setActionLoading(true);
    setActionError(null);
    try {
      const result = await fn();
      await invalidateLearnerDependencies();
      if (options?.refetch ?? true) {
        await loadStudent();
      }
      return result;
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

  const enroll = (data: EnrollmentFormData) =>
    withAction(() => learnersAPI.enrollStudent(id, data));

  const reenroll = (data: EnrollmentFormData) =>
    withAction(() => learnersAPI.reenrollStudent(id, data));

  const transfer = (data: TransferFormData) =>
    withAction(() => learnersAPI.transferStudent(id, data));

  const unenroll = (cohortId: number, data: { end_reason: string; effective_to: string; notes: string }) =>
    withAction(() => learnersAPI.unenrollStudent(id, cohortId, data));

  const deleteStudent = () =>
    withAction(() => learnersAPI.deleteStudent(id), { refetch: false });

  const checkDeleteEligibility = useCallback(
    (): Promise<LearnerDeleteEligibility> => learnersAPI.checkDeleteEligibility(id),
    [id]
  );

  const withdraw = (payload?: LearnerLifecyclePayload) =>
    withAction(() => learnersAPI.withdrawStudent(id, payload));

  const graduate = (payload?: LearnerLifecyclePayload) =>
    withAction(() => learnersAPI.graduateStudent(id, payload));

  const archiveStudent = (payload?: LearnerLifecyclePayload) =>
    withAction(() => learnersAPI.archiveStudent(id, payload));

  return {
    student: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    actionLoading, actionError, setActionError,
    reload: loadStudent,
    updateStatus, enroll, reenroll, transfer, unenroll, deleteStudent,
    checkDeleteEligibility, withdraw, graduate, archiveStudent,
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

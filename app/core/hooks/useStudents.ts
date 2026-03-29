import { useState, useEffect, useRef } from 'react';
import { learnersAPI } from '../api/learners';
import { Student, StudentStats, StudentDetail } from '../types/student';

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

  const loadStudents = async () => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await learnersAPI.getStudents({
        ...filters,
        page: filters?.page ?? 1,
        page_size: filters?.page_size ?? 10,
      });

      if (controller.signal.aborted) return;

      const results = Array.isArray(data) ? data : data.results ?? [];
      setStudents(results);

      if (!Array.isArray(data)) {
        const totalItems = data.count ?? results.length;
        const pageSize = filters?.page_size ?? 10;
        setPagination({
          currentPage: filters?.page ?? 1,
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
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to load students');
      setStudents([]);
      setPagination({ currentPage: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
    return () => { abortRef.current?.abort(); };
  }, [
    filters?.cohort,
    filters?.status,
    filters?.gender,
    filters?.search,
    filters?.page,
    filters?.page_size,
  ]);

  return { students, pagination, loading, error, reload: loadStudents };
}

// ── useStudent ────────────────────────────────────────────────────────────

export function useStudent(id: number) {
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadStudent = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await learnersAPI.getStudent(id);
      setStudent(data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to load student');
      setStudent(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadStudent();
  }, [id]);

  const withAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await fn();
      await loadStudent();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setActionError(e.message ?? 'Action failed');
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

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await learnersAPI.getStatistics();
      setStats(data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to load stats');
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

  const loadStudents = async () => {
    if (!cohortId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await learnersAPI.getStudentsByCohort(cohortId);
      setStudents(data);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cohortId) loadStudents();
  }, [cohortId]);

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
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, []);

  return { students, loading, error, reload: loadStudents };
}
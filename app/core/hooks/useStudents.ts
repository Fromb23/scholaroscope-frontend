import { useState, useEffect, useRef } from 'react';
import { learnersAPI } from '../api/learners';
import { Student, StudentStats, StudentDetail } from '../types/student';

export function useStudents(filters?: {
  cohort?: number;
  status?: string;
  gender?: string;
  search?: string;
  page?: number;
  page_size?: number;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const loadStudents = async () => {
    const controller = new AbortController();

    try {
      abortRef.current?.abort();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      const data = await learnersAPI.getStudents({
        ...filters,
        page: filters?.page || 1,
        page_size: filters?.page_size || 10,
      });

      if (controller.signal.aborted) return;

      // Handle both array response and paginated response
      const studentsArray = Array.isArray(data)
        ? data
        : data.results ?? [];

      setStudents(studentsArray);

      // Update pagination state
      if (!Array.isArray(data)) {
        const totalItems = data.count ?? studentsArray.length;
        const pageSize = filters?.page_size || 10;

        setPagination({
          currentPage: filters?.page || 1,
          pageSize: pageSize,
          totalItems: totalItems,
          totalPages: Math.ceil(totalItems / pageSize),
        });
      } else {
        // Fallback for non-paginated response
        setPagination({
          currentPage: 1,
          pageSize: data.length,
          totalItems: data.length,
          totalPages: 1,
        });
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      setError(err.message ?? 'Failed to load students');
      setStudents([]);
      setPagination({
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      });
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadStudents();

    return () => {
      abortRef.current?.abort();
    };
  }, [
    filters?.cohort,
    filters?.status,
    filters?.gender,
    filters?.search,
    filters?.page,          // ✅ Added pagination dependencies
    filters?.page_size,     // ✅ Added pagination dependencies
  ]);

  return {
    students,
    pagination,    // ✅ Now returns pagination state
    loading,
    error,
    reload: loadStudents,
  };
}

export function useStudent(id: number) {
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadStudent();
    }
  }, [id]);

  const loadStudent = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await learnersAPI.getStudent(id);
      setStudent(data);
    } catch (err: any) {
      setError(err.message);
      setStudent(null);
    } finally {
      setLoading(false);
    }
  };

  return { student, loading, error, reload: loadStudent };
}

export function useStudentStats() {
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await learnersAPI.getStatistics();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, reload: loadStats };
}

export function useStudentsByCohort(cohortId?: number) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cohortId) {
      loadStudents();
    }
  }, [cohortId]);

  const loadStudents = async () => {
    if (!cohortId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await learnersAPI.getStudentsByCohort(cohortId);
      setStudents(data);
    } catch (err: any) {
      setError(err.message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  return { students, loading, error, reload: loadStudents };
}

export function useMultiCohortStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await learnersAPI.getMultiCohortStudents();
      setStudents(data);
    } catch (err: any) {
      setError(err.message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  return { students, loading, error, reload: loadStudents };
}
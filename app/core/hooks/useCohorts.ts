// ============================================================================
// app/hooks/useCohorts.ts - Cohorts Data Hooks
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { cohortsAPI, Cohort, CohortDetail, CohortStats } from '../api/cohorts';
import { CohortSubject } from '../types/academic';
import { StudentDetail } from '../types/student';
import { ApiError, resolveErrorMessage } from '../types/errors';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';

function toIdSet(idsKey: string): Set<number> {
  if (!idsKey) return new Set<number>();
  return new Set(
    idsKey
      .split(',')
      .map(value => Number(value))
      .filter(value => Number.isFinite(value))
  );
}

export function useCohorts(filters?: {
  curriculum?: number;
  academic_year?: number;
  level?: string;
  is_active?: boolean;
  search?: string;
}, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const instructorAccess = useInstructorCohortAccess({ enabled });
  const curriculum = filters?.curriculum;
  const academicYear = filters?.academic_year;
  const level = filters?.level;
  const isActive = filters?.is_active;
  const search = filters?.search;
  const requestFilters = useMemo(
    () => ({
      curriculum,
      academic_year: academicYear,
      level,
      is_active: isActive,
      search,
    }),
    [academicYear, curriculum, isActive, level, search]
  );
  const allowedCohortIds = useMemo(
    () => toIdSet(instructorAccess.cohortIdsKey),
    [instructorAccess.cohortIdsKey]
  );

  const loadCohorts = useCallback(async () => {
    if (!enabled) {
      setCohorts([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getCohorts(requestFilters);
      const allCohorts = Array.isArray(data) ? data : data.results ?? [];
      setCohorts(
        instructorAccess.isInstructor
          ? allCohorts.filter(cohort => allowedCohortIds.has(cohort.id))
          : allCohorts
      );
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch cohorts'));
      setCohorts([]);
    } finally {
      setLoading(false);
    }
  }, [allowedCohortIds, enabled, instructorAccess.isInstructor, requestFilters]);

  useEffect(() => {
    void loadCohorts();
  }, [loadCohorts]);

  return { cohorts, loading, error, reload: loadCohorts };
}

export function useCohort(id: number) {
  const [cohort, setCohort] = useState<CohortDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCohort = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getCohort(id);
      setCohort(data);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch cohort'));
      setCohort(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      void loadCohort();
    }
  }, [id, loadCohort]);

  return { cohort, loading, error, reload: loadCohort };
}

export function useActiveCohorts() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCohorts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getActiveCohorts();
      setCohorts(data);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch active cohorts'));
      setCohorts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCohorts();
  }, [loadCohorts]);

  return { cohorts, loading, error, reload: loadCohorts };
}

export function useCohortsByCurriculum(curriculumId?: number) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCohorts = useCallback(async () => {
    if (!curriculumId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getCohortsByCurriculum(curriculumId);
      setCohorts(data);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch cohorts by curriculum'));
      setCohorts([]);
    } finally {
      setLoading(false);
    }
  }, [curriculumId]);

  useEffect(() => {
    if (curriculumId) {
      void loadCohorts();
    }
  }, [curriculumId, loadCohorts]);

  return { cohorts, loading, error, reload: loadCohorts };
}

export function useCohortsByAcademicYear(academicYearId?: number) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCohorts = useCallback(async () => {
    if (!academicYearId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getCohortsByAcademicYear(academicYearId);
      setCohorts(data);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch cohorts by academic year'));
      setCohorts([]);
    } finally {
      setLoading(false);
    }
  }, [academicYearId]);

  useEffect(() => {
    if (academicYearId) {
      void loadCohorts();
    }
  }, [academicYearId, loadCohorts]);

  return { cohorts, loading, error, reload: loadCohorts };
}

export function useCohortStats() {
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getStatistics();
      setStats(data);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch cohort stats'));
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  return { stats, loading, error, reload: loadStats };
}

export function useCohortStudents(cohortId?: number) {
  const [students, setStudents] = useState<StudentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    if (!cohortId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getCohortStudents(cohortId);
      setStudents(data);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch cohort students'));
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [cohortId]);

  useEffect(() => {
    if (cohortId) {
      void loadStudents();
    }
  }, [cohortId, loadStudents]);

  return { students, loading, error, reload: loadStudents };
}

export function useCohortSubjects(cohortId?: number) {
  const [subjects, setSubjects] = useState<CohortSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSubjects = useCallback(async () => {
    if (!cohortId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getCohortSubjects(cohortId);
      setSubjects(Array.isArray(data) ? data : (data as { results?: CohortSubject[] }).results ?? []);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch cohort subjects'));
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [cohortId]);

  useEffect(() => {
    if (cohortId) {
      void loadSubjects();
    }
  }, [cohortId, loadSubjects]);

  return { subjects, loading, error, reload: loadSubjects };
}

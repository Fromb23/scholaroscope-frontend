// ============================================================================
// app/hooks/useCohorts.ts - Cohorts Data Hooks
// ============================================================================

import { useState, useEffect } from 'react';
import { cohortsAPI, Cohort, CohortDetail, CohortStats } from '../api/cohorts';
import { CohortSubject, Subject } from '../types/academic';
import { StudentDetail } from '../types/student';

export function useCohorts(filters?: {
  curriculum?: number;
  academic_year?: number;
  level?: string;
  is_active?: boolean;
  search?: string;
}) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCohorts();
  }, [JSON.stringify(filters)]);

  const loadCohorts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getCohorts(filters);
      setCohorts(Array.isArray(data) ? data : data.results ?? []);
    } catch (err: any) {
      setError(err.message);
      setCohorts([]);
    } finally {
      setLoading(false);
    }
  };

  return { cohorts, loading, error, reload: loadCohorts };
}

export function useCohort(id: number) {
  const [cohort, setCohort] = useState<CohortDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadCohort();
    }
  }, [id]);

  const loadCohort = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getCohort(id);
      setCohort(data);
    } catch (err: any) {
      setError(err.message);
      setCohort(null);
    } finally {
      setLoading(false);
    }
  };

  return { cohort, loading, error, reload: loadCohort };
}

export function useActiveCohorts() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCohorts();
  }, []);

  const loadCohorts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getActiveCohorts();
      setCohorts(data);
    } catch (err: any) {
      setError(err.message);
      setCohorts([]);
    } finally {
      setLoading(false);
    }
  };

  return { cohorts, loading, error, reload: loadCohorts };
}

export function useCohortsByCurriculum(curriculumId?: number) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (curriculumId) {
      loadCohorts();
    }
  }, [curriculumId]);

  const loadCohorts = async () => {
    if (!curriculumId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getCohortsByCurriculum(curriculumId);
      setCohorts(data);
    } catch (err: any) {
      setError(err.message);
      setCohorts([]);
    } finally {
      setLoading(false);
    }
  };

  return { cohorts, loading, error, reload: loadCohorts };
}

export function useCohortsByAcademicYear(academicYearId?: number) {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (academicYearId) {
      loadCohorts();
    }
  }, [academicYearId]);

  const loadCohorts = async () => {
    if (!academicYearId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getCohortsByAcademicYear(academicYearId);
      setCohorts(data);
    } catch (err: any) {
      setError(err.message);
      setCohorts([]);
    } finally {
      setLoading(false);
    }
  };

  return { cohorts, loading, error, reload: loadCohorts };
}

export function useCohortStats() {
  const [stats, setStats] = useState<CohortStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getStatistics();
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

export function useCohortStudents(cohortId?: number) {
  const [students, setStudents] = useState<StudentDetail[]>([]);
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
      const data = await cohortsAPI.getCohortStudents(cohortId);
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

export function useCohortSubjects(cohortId?: number) {
  const [subjects, setSubjects] = useState<CohortSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cohortId) {
      loadSubjects();
    }
  }, [cohortId]);

  const loadSubjects = async () => {
    if (!cohortId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await cohortsAPI.getCohortSubjects(cohortId);
      setSubjects(Array.isArray(data) ? data : (data as { results?: CohortSubject[] }).results ?? []);
    } catch (err: any) {
      setError(err.message);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  return { subjects, loading, error, reload: loadSubjects };
}
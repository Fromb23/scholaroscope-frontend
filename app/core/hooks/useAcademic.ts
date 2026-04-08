import { useState, useEffect } from 'react';
import {
  academicYearAPI,
  termAPI,
  curriculumAPI,
  subjectAPI,
  cohortAPI,
  cohortSubjectAPI
} from '@/app/core/api/academic';
import {
  AcademicYear,
  Term,
  Curriculum,
  Subject,
  Cohort,
  CohortDetail,
  CohortSubject,
} from '@/app/core/types/academic';
import { useOrganizationContext } from '@/app/context/OrganizationContext';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

export interface CohortFilters {
  academic_year?: number;
  curriculum?: number;
  organization?: number;
}

// ── useAcademicYears ──────────────────────────────────────────────────────

export const useAcademicYears = () => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchAcademicYears = async () => {
    try {
      setLoading(true);
      const params: { organization?: number } = {};
      if (organizationId) params.organization = organizationId;
      const data = await academicYearAPI.getAll(params);
      setAcademicYears(Array.isArray(data) ? data : (data as { results?: AcademicYear[] })?.results ?? []);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch academic years'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAcademicYears(); }, [organizationId]);

  const createAcademicYear = async (data: Partial<AcademicYear>) => {
    try {
      const newYear = await academicYearAPI.create(data);
      setAcademicYears(prev => [newYear, ...prev]);
      return newYear;
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to create academic year'));
    }
  };

  const updateAcademicYear = async (id: number, data: Partial<AcademicYear>) => {
    try {
      const updated = await academicYearAPI.update(id, data);
      setAcademicYears(prev => prev.map(y => y.id === id ? updated : y));
      return updated;
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to update academic year'));
    }
  };

  const deleteAcademicYear = async (id: number) => {
    try {
      await academicYearAPI.delete(id);
      setAcademicYears(prev => prev.filter(y => y.id !== id));
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to delete academic year'));
    }
  };

  const setCurrentYear = async (id: number) => {
    try {
      const updated = await academicYearAPI.setCurrent(id);
      setAcademicYears(prev => prev.map(y => ({ ...y, is_current: y.id === id })));
      return updated;
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to set current year'));
    }
  };

  return { academicYears, loading, error, refetch: fetchAcademicYears, createAcademicYear, updateAcademicYear, deleteAcademicYear, setCurrentYear };
};

// ── useCurrentAcademicYear ────────────────────────────────────────────────

export const useCurrentAcademicYear = () => {
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchCurrentYear = async () => {
    try {
      setLoading(true);
      const params: { organization?: number } = {};
      if (organizationId) params.organization = organizationId;
      const data = await academicYearAPI.getCurrent(params);
      setCurrentYear(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch current academic year'));
      setCurrentYear(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCurrentYear(); }, [organizationId]);

  return { currentYear, loading, error, refetch: fetchCurrentYear };
};

// ── useCurrentTerm ────────────────────────────────────────────────────────

export const useCurrentTerm = () => {
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchCurrentTerm = async () => {
    try {
      setLoading(true);
      const params: { organization?: number } = {};
      if (organizationId) params.organization = organizationId;
      const data = await termAPI.getCurrent(params);
      setCurrentTerm(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch current term'));
      setCurrentTerm(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCurrentTerm(); }, [organizationId]);

  return { currentTerm, loading, error, refetch: fetchCurrentTerm };
};

// ── useTerms ──────────────────────────────────────────────────────────────

export const useTerms = (academicYearId?: number) => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (organizationId) params.organization = String(organizationId);
      if (academicYearId) params.academic_year = String(academicYearId);
      const data = await termAPI.getAll(params);
      setTerms(Array.isArray(data) ? data : (data as { results?: Term[] })?.results ?? []);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch terms'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTerms(); }, [academicYearId, organizationId]);

  const createTerm = async (data: Partial<Term>) => {
    try {
      const newTerm = await termAPI.create(data);
      setTerms(prev => [...prev, newTerm].sort((a, b) => a.sequence - b.sequence));
      return newTerm;
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to create term'));
    }
  };

  const updateTerm = async (id: number, data: Partial<Term>) => {
    try {
      const updated = await termAPI.update(id, data);
      setTerms(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to update term'));
    }
  };

  const deleteTerm = async (id: number) => {
    try {
      await termAPI.delete(id);
      setTerms(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to delete term'));
    }
  };

  return { terms, loading, error, refetch: fetchTerms, createTerm, updateTerm, deleteTerm };
};

// ── useCurricula ──────────────────────────────────────────────────────────

export const useCurricula = () => {
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchCurricula = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (organizationId) params.organization = String(organizationId);
      const data = await curriculumAPI.getAll(params);
      setCurricula(Array.isArray(data) ? data : (data as { results?: Curriculum[] })?.results ?? []);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch curricula'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCurricula(); }, [organizationId]);

  const createCurriculum = async (data: Partial<Curriculum>) => {
    try {
      const newCurriculum = await curriculumAPI.create(data);
      setCurricula(prev => [...prev, newCurriculum]);
      return newCurriculum;
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to create curriculum'));
    }
  };

  const updateCurriculum = async (id: number, data: Partial<Curriculum>) => {
    try {
      const updated = await curriculumAPI.update(id, data);
      setCurricula(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to update curriculum'));
    }
  };

  const deleteCurriculum = async (id: number) => {
    try {
      await curriculumAPI.delete(id);
      setCurricula(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to delete curriculum'));
    }
  };

  return { curricula, loading, error, refetch: fetchCurricula, createCurriculum, updateCurriculum, deleteCurriculum };
};

// ── useSubjects ───────────────────────────────────────────────────────────

export const useSubjects = (curriculumId?: number) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { page_size: '1000' };
      if (curriculumId) params.curriculum = String(curriculumId);
      if (organizationId) params.organization = String(organizationId);
      const data = await subjectAPI.getAll(params);
      setSubjects(Array.isArray(data) ? data : (data as { results?: Subject[] })?.results ?? []);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch subjects'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubjects(); }, [curriculumId, organizationId]);

  const createSubject = async (data: Partial<Subject>) => {
    try {
      const newSubject = await subjectAPI.create(data);
      setSubjects(prev => [...prev, newSubject]);
      return newSubject;
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to create subject'));
    }
  };

  const updateSubject = async (id: number, data: Partial<Subject>) => {
    try {
      const updated = await subjectAPI.update(id, data);
      setSubjects(prev => prev.map(s => s.id === id ? updated : s));
      return updated;
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to update subject'));
    }
  };

  const deleteSubject = async (id: number) => {
    try {
      await subjectAPI.delete(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to delete subject'));
    }
  };

  return { subjects, loading, error, refetch: fetchSubjects, createSubject, updateSubject, deleteSubject };
};

// ── useCohortSubjects ─────────────────────────────────────────────────────

export const useCohortSubjects = (cohortId?: number) => {
  const [cohortSubjects, setCohortSubjects] = useState<CohortSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (cohortId) params.cohort = String(cohortId);
        const data = await cohortSubjectAPI.getAll(params);
        const arr = Array.isArray(data) ? data : (data as { results?: CohortSubject[] })?.results ?? [];
        setCohortSubjects(arr.filter((cs: CohortSubject) => cs.curriculum_type !== 'CBE'));
        setError(null);
      } catch (err) {
        setError(extractErrorMessage(err as ApiError, 'Failed to fetch cohort subjects'));
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [cohortId, organizationId]);

  return { cohortSubjects, loading, error };
};

// ── useCohorts ────────────────────────────────────────────────────────────

export const useCohorts = (filters?: CohortFilters) => {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchCohorts = async () => {
    try {
      setLoading(true);
      const data = await cohortAPI.getAll({ ...filters, organization: organizationId || undefined });
      setCohorts(Array.isArray(data) ? data : (data as { results?: Cohort[] })?.results ?? []);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch cohorts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCohorts(); }, [JSON.stringify(filters), organizationId]);

  const createCohort = async (data: {
    curriculum: number;
    academic_year: number;
    level: string;
    stream?: string;
    subjects?: Array<{ subject_id: number; is_compulsory: boolean }>;
  }) => {
    try {
      const newCohort = await cohortAPI.create(data);
      setCohorts(prev => [...prev, newCohort]);
      return newCohort;
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to create cohort'));
    }
  };

  const updateCohort = async (id: number, data: Partial<Cohort> & {
    subjects?: Array<{ subject_id: number; is_compulsory: boolean }>;
  }) => {
    try {
      const updated = await cohortAPI.update(id, data);
      setCohorts(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to update cohort'));
    }
  };

  const deleteCohort = async (id: number) => {
    try {
      await cohortAPI.delete(id);
      setCohorts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      throw new Error(extractErrorMessage(err as ApiError, 'Failed to delete cohort'));
    }
  };

  return { cohorts, loading, error, refetch: fetchCohorts, createCohort, updateCohort, deleteCohort };
};
export const useCohort = (cohortId: number | null) => {
  const [cohort, setCohort] = useState<CohortDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cohortId) return;
    setLoading(true);
    cohortAPI.getById(cohortId)
      .then(data => { setCohort(data); setError(null); })
      .catch(err => setError(extractErrorMessage(err as ApiError, 'Failed to fetch cohort')))
      .finally(() => setLoading(false));
  }, [cohortId]);

  return { cohort, loading, error };
};

// ── useCohortDetail ───────────────────────────────────────────────────────

export const useCohortDetail = (cohortId: number | null) => {
  const [cohort, setCohort] = useState<CohortDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCohort = async () => {
    if (!cohortId) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await cohortAPI.getById(cohortId);
      setCohort(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch cohort details'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCohort(); }, [cohortId]);

  return { cohort, loading, error, refetch: fetchCohort };
};

// ── useAcademic (composite) ───────────────────────────────────────────────

export const useAcademic = () => {
  const curriculaState = useCurricula();
  const subjectsState = useSubjects();
  const academicYearsState = useAcademicYears();
  const currentYearState = useCurrentAcademicYear();
  const currentTermState = useCurrentTerm();

  return {
    curricula: curriculaState.curricula,
    subjects: subjectsState.subjects,
    academicYears: academicYearsState.academicYears,
    currentYear: currentYearState.currentYear,
    currentTerm: currentTermState.currentTerm,
    grades: [],
    loading:
      curriculaState.loading ||
      subjectsState.loading ||
      academicYearsState.loading ||
      currentYearState.loading ||
      currentTermState.loading,
    errors: {
      curricula: curriculaState.error,
      subjects: subjectsState.error,
      academicYears: academicYearsState.error,
      currentYear: currentYearState.error,
      currentTerm: currentTermState.error,
    },
  };
};
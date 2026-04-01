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
  CohortDetail
} from '@/app/core/types/academic';
import { useOrganizationContext } from '@/app/context/OrganizationContext';

export interface CohortFilters {
  academic_year?: number;
  curriculum?: number;
  organization?: number;
}

// Academic Years Hook
export const useAcademicYears = () => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchAcademicYears = async () => {
    try {
      setLoading(true);
      const params: { organization?: number } = {};
      if (organizationId) {
        params.organization = organizationId;
      }
      const data = await academicYearAPI.getAll(params);
      const academicYearArray = Array.isArray(data)
        ? data
        : (data as any)?.results ?? (Array.isArray((data as any)) ? (data as any) : []);
      setAcademicYears(academicYearArray);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch academic years');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const createAcademicYear = async (data: Partial<AcademicYear>) => {
    try {
      const newYear = await academicYearAPI.create(data);
      setAcademicYears(prev => [newYear, ...prev]);
      return newYear;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create academic year');
    }
  };

  const updateAcademicYear = async (id: number, data: Partial<AcademicYear>) => {
    try {
      const updated = await academicYearAPI.update(id, data);
      setAcademicYears(prev => prev.map(y => y.id === id ? updated : y));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update academic year');
    }
  };

  const deleteAcademicYear = async (id: number) => {
    try {
      await academicYearAPI.delete(id);
      setAcademicYears(prev => prev.filter(y => y.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete academic year');
    }
  };

  const setCurrentYear = async (id: number) => {
    try {
      const updated = await academicYearAPI.setCurrent(id);
      setAcademicYears(prev => prev.map(y => ({
        ...y,
        is_current: y.id === id
      })));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to set current year');
    }
  };

  return {
    academicYears,
    loading,
    error,
    refetch: fetchAcademicYears,
    createAcademicYear,
    updateAcademicYear,
    deleteAcademicYear,
    setCurrentYear
  };
};

// ... your existing hooks (useAcademicYears, useTerms, etc.)

// Current Academic Year Hook
export const useCurrentAcademicYear = () => {
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchCurrentYear = async () => {
    try {
      setLoading(true);
      const params: { organization?: number } = {};

      if (organizationId) {
        params.organization = organizationId;
      }
      const data = await academicYearAPI.getCurrent(params);
      setCurrentYear(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch current academic year');
      setCurrentYear(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentYear();
  }, []);

  return {
    currentYear,
    loading,
    error,
    refetch: fetchCurrentYear
  };
};

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

// Current Term Hook
export const useCurrentTerm = () => {
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchCurrentTerm = async () => {
    try {
      setLoading(true);
      const params: { organization?: number } = {};
      if (organizationId) {
        params.organization = organizationId;
      }
      const data = await termAPI.getCurrent(params);
      setCurrentTerm(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch current term');
      setCurrentTerm(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentTerm();
  }, [organizationId]);

  return {
    currentTerm,
    loading,
    error,
    refetch: fetchCurrentTerm
  };
};

// Terms Hook
export const useTerms = (academicYearId?: number) => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (organizationId) {
        params.organization = String(organizationId);
      }
      if (academicYearId) {
        params.academic_year = String(academicYearId);
      }
      const data = await termAPI.getAll(params);
      const termsArray = Array.isArray(data)
        ? data
        : (data as any)?.results ?? [];
      setTerms(termsArray);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch terms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, [academicYearId]);

  const createTerm = async (data: Partial<Term>) => {
    try {
      const newTerm = await termAPI.create(data);
      setTerms(prev => [...prev, newTerm].sort((a, b) => a.sequence - b.sequence));
      return newTerm;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create term');
    }
  };

  const updateTerm = async (id: number, data: Partial<Term>) => {
    try {
      const updated = await termAPI.update(id, data);
      setTerms(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update term');
    }
  };

  const deleteTerm = async (id: number) => {
    try {
      await termAPI.delete(id);
      setTerms(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete term');
    }
  };

  return {
    terms,
    loading,
    error,
    refetch: fetchTerms,
    createTerm,
    updateTerm,
    deleteTerm
  };
};

// Curricula Hook
export const useCurricula = () => {
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchCurricula = async () => {
    try {
      setLoading(true);

      // NEW: Build params object with optional organization filter
      const params: Record<string, string> = {};
      if (organizationId) {
        params.organization = String(organizationId);
      }

      const data = await curriculumAPI.getAll(params);
      const curriculaArray = Array.isArray(data)
        ? data
        : (data as any)?.results ?? [];
      setCurricula(curriculaArray);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch curricula');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Re-fetch when organizationId changes
  useEffect(() => {
    fetchCurricula();
  }, [organizationId]);

  const createCurriculum = async (data: Partial<Curriculum>) => {
    try {
      const newCurriculum = await curriculumAPI.create(data);
      setCurricula(prev => [...prev, newCurriculum]);
      return newCurriculum;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create curriculum');
    }
  };

  const updateCurriculum = async (id: number, data: Partial<Curriculum>) => {
    try {
      const updated = await curriculumAPI.update(id, data);
      setCurricula(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update curriculum');
    }
  };

  const deleteCurriculum = async (id: number) => {
    try {
      await curriculumAPI.delete(id);
      setCurricula(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete curriculum');
    }
  };

  return {
    curricula,
    loading,
    error,
    refetch: fetchCurricula,
    createCurriculum,
    updateCurriculum,
    deleteCurriculum
  };
};

// Subjects Hook
export const useSubjects = (curriculumId?: number) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (curriculumId) {
        params.curriculum = String(curriculumId);
      }
      if (organizationId) {
        params.organization = String(organizationId);
      }
      const data = await subjectAPI.getAll(params);
      const subjectArray = Array.isArray(data)
        ? data
        : (data as any)?.results ?? [];
      setSubjects(subjectArray);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [curriculumId, organizationId]);

  const createSubject = async (data: Partial<Subject>) => {
    try {
      const newSubject = await subjectAPI.create(data);
      setSubjects(prev => [...prev, newSubject]);
      return newSubject;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create subject');
    }
  };

  const updateSubject = async (id: number, data: Partial<Subject>) => {
    try {
      const updated = await subjectAPI.update(id, data);
      setSubjects(prev => prev.map(s => s.id === id ? updated : s));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update subject');
    }
  };

  const deleteSubject = async (id: number) => {
    try {
      await subjectAPI.delete(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete subject');
    }
  };

  return {
    subjects,
    loading,
    error,
    refetch: fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject
  };
};
export const useCohortSubjects = (cohortId?: number) => {
  const [cohortSubjects, setCohortSubjects] = useState<any[]>([]);
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
        const arr = Array.isArray(data) ? data : (data as any)?.results ?? [];
        // Exclude CBE cohort subjects — no topic structure
        setCohortSubjects(arr.filter((cs: any) => cs.curriculum_type !== 'CBE'));
      } catch (err: any) {
        setError(err.message || 'Failed to fetch cohort subjects');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [cohortId, organizationId]);

  return { cohortSubjects, loading, error };
};

// Cohorts Hook
export const useCohorts = (filters?: CohortFilters) => {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchCohorts = async () => {
    try {
      setLoading(true);
      const data = await cohortAPI.getAll({ ...filters, organization: organizationId || undefined });
      const cohortsArray = Array.isArray(data)
        ? data
        : (data as any)?.results ?? [];
      setCohorts(cohortsArray);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cohorts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCohorts();
  }, [JSON.stringify(filters), organizationId]);

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
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create cohort');
    }
  };

  const updateCohort = async (id: number, data: Partial<Cohort> & {
    subjects?: Array<{ subject_id: number; is_compulsory: boolean }>;
  }) => {
    try {
      const updated = await cohortAPI.update(id, data);
      setCohorts(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update cohort');
    }
  };

  const deleteCohort = async (id: number) => {
    try {
      await cohortAPI.delete(id);
      setCohorts(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete cohort');
    }
  };

  return {
    cohorts,
    loading,
    error,
    refetch: fetchCohorts,
    createCohort,
    updateCohort,
    deleteCohort
  };
};

// Cohort Detail Hook
export const useCohortDetail = (cohortId: number | null) => {
  const [cohort, setCohort] = useState<CohortDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCohort = async () => {
    if (!cohortId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await cohortAPI.getById(cohortId);
      setCohort(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cohort details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCohort();
  }, [cohortId]);

  return {
    cohort,
    loading,
    error,
    refetch: fetchCohort
  };
};


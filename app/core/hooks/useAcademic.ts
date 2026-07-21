import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  academicYearAPI,
  academicLifecycleAPI,
  termAPI,
  termCalendarEventAPI,
  curriculumAPI,
  subjectAPI,
  cohortAPI,
  cohortSubjectAPI,
  learnerSubjectOptionsAPI
} from '@/app/core/api/academic';
import {
  AcademicYear,
  AcademicLifecycleContext,
  Term,
  TermCalendarEvent,
  Curriculum,
  Subject,
  SubjectDetail,
  Cohort,
  CohortDetail,
  CohortSubject,
  LearnerSubjectOption,
} from '@/app/core/types/academic';
import { useOrganizationContext } from '@/app/context/OrganizationContext';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { ApiError, ApiErrorWithCode, extractErrorCode, resolveErrorMessage } from '@/app/core/types/errors';
import { academicKeys } from '@/app/core/lib/queryKeys';

export interface CohortFilters {
  academic_year?: number;
  curriculum?: number;
  curriculum_type?: string;
  organization?: number;
  level?: string;
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

function wrapApiMutationError(err: unknown, fallback: string): ApiErrorWithCode {
  const apiError = err as ApiError;
  const wrapped = new Error(resolveErrorMessage(apiError, fallback)) as ApiErrorWithCode;
  wrapped.code = extractErrorCode(apiError);
  wrapped.response = apiError.response;
  return wrapped;
}

export function useAcademicLifecycleContext(options: { enabled?: boolean } = {}) {
  const { organizationId } = useOrganizationContext();
  const enabled = options.enabled ?? true;

  return useQuery<AcademicLifecycleContext, Error>({
    queryKey: academicKeys.currentContext.detail(organizationId),
    queryFn: async () => {
      try {
        return await academicLifecycleAPI.getCurrentContext(
          organizationId ? { organization: organizationId } : undefined
        );
      } catch (err) {
        throw new Error(resolveErrorMessage(err as ApiError, 'Failed to load academic context'));
      }
    },
    enabled,
    staleTime: 60_000,
  });
}

// ── useAcademicYears ──────────────────────────────────────────────────────

export const useAcademicYears = () => {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchAcademicYears = useCallback(async () => {
    try {
      setLoading(true);
      const params: { organization?: number } = {};
      if (organizationId) params.organization = organizationId;
      const data = await academicYearAPI.getAll(params);
      setAcademicYears(Array.isArray(data) ? data : (data as { results?: AcademicYear[] })?.results ?? []);
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch academic years'));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { fetchAcademicYears(); }, [fetchAcademicYears]);

  const createAcademicYear = async (data: Partial<AcademicYear>) => {
    try {
      const newYear = await academicYearAPI.create(data);
      setAcademicYears(prev => [newYear, ...prev]);
      return newYear;
    } catch (err) {
      throw new Error(resolveErrorMessage(err as ApiError, 'Failed to create academic year'));
    }
  };

  const updateAcademicYear = async (id: number, data: Partial<AcademicYear>) => {
    try {
      const updated = await academicYearAPI.update(id, data);
      setAcademicYears(prev => prev.map(y => y.id === id ? updated : y));
      return updated;
    } catch (err) {
      throw new Error(resolveErrorMessage(err as ApiError, 'Failed to update academic year'));
    }
  };

  const deleteAcademicYear = async (id: number) => {
    try {
      await academicYearAPI.delete(id);
      setAcademicYears(prev => prev.filter(y => y.id !== id));
    } catch (err) {
      throw new Error(resolveErrorMessage(err as ApiError, 'Failed to delete academic year'));
    }
  };

  const setCurrentYear = async (id: number) => {
    try {
      const updated = await academicYearAPI.setCurrent(id);
      setAcademicYears(prev => prev.map(y => ({ ...y, is_current: y.id === id })));
      return updated;
    } catch (err) {
      throw new Error(resolveErrorMessage(err as ApiError, 'Failed to set current year'));
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

  const fetchCurrentYear = useCallback(async () => {
    try {
      setLoading(true);
      const params: { organization?: number } = {};
      if (organizationId) params.organization = organizationId;
      const data = await academicYearAPI.getCurrent(params);
      setCurrentYear(data);
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch current academic year'));
      setCurrentYear(null);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { fetchCurrentYear(); }, [fetchCurrentYear]);

  return { currentYear, loading, error, refetch: fetchCurrentYear };
};

// ── useCurrentTerm ────────────────────────────────────────────────────────

export const useCurrentTerm = () => {
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchCurrentTerm = useCallback(async () => {
    try {
      setLoading(true);
      const params: { organization?: number } = {};
      if (organizationId) params.organization = organizationId;
      const data = await termAPI.getCurrent(params);
      setCurrentTerm(data);
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch current term'));
      setCurrentTerm(null);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { fetchCurrentTerm(); }, [fetchCurrentTerm]);

  return { currentTerm, loading, error, refetch: fetchCurrentTerm };
};

// ── useTerms ──────────────────────────────────────────────────────────────

export const useTerms = (academicYearId?: number) => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();

  const fetchTerms = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (organizationId) params.organization = String(organizationId);
      if (academicYearId) params.academic_year = String(academicYearId);
      const data = await termAPI.getAll(params);
      const nextTerms = Array.isArray(data) ? data : (data as { results?: Term[] })?.results ?? [];
      setTerms(nextTerms);
      setError(null);
      return nextTerms;
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch terms'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [academicYearId, organizationId]);

  useEffect(() => { fetchTerms(); }, [fetchTerms]);

  const createTerm = async (data: Partial<Term>) => {
    try {
      const newTerm = await termAPI.create(data);
      setTerms(prev => [...prev, newTerm].sort((a, b) => a.sequence - b.sequence));
      return newTerm;
    } catch (err) {
      throw wrapApiMutationError(err, 'Failed to create term');
    }
  };

  const updateTerm = async (id: number, data: Partial<Term>) => {
    try {
      const updated = await termAPI.update(id, data);
      setTerms(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (err) {
      throw wrapApiMutationError(err, 'Failed to update term');
    }
  };

  const deleteTerm = async (id: number) => {
    try {
      await termAPI.delete(id);
      setTerms(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      throw wrapApiMutationError(err, 'Failed to delete term');
    }
  };

  const completeCalendarSetup = async (id: number) => {
    try {
      const updated = await termAPI.completeCalendarSetup(id);
      setTerms(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (err) {
      throw wrapApiMutationError(err, 'Failed to complete term calendar setup');
    }
  };

  const reopenCalendarSetup = async (id: number) => {
    try {
      const updated = await termAPI.reopenCalendarSetup(id);
      setTerms(prev => prev.map(t => t.id === id ? updated : t));
      return updated;
    } catch (err) {
      throw wrapApiMutationError(err, 'Failed to reopen term calendar setup');
    }
  };

  return {
    terms,
    loading,
    error,
    refetch: fetchTerms,
    createTerm,
    updateTerm,
    deleteTerm,
    completeCalendarSetup,
    reopenCalendarSetup,
  };
};

export const useTermCalendarEvents = (termId: number | null) => {
  const [events, setEvents] = useState<TermCalendarEvent[]>([]);
  const [loading, setLoading] = useState(Boolean(termId));
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!termId) {
      setEvents([]);
      setLoading(false);
      setError(null);
      return [];
    }

    try {
      setLoading(true);
      const data = await termCalendarEventAPI.getAll({ term: termId });
      const nextEvents = Array.isArray(data)
        ? [...data].sort((left, right) => (
          left.start_date.localeCompare(right.start_date)
          || left.end_date.localeCompare(right.end_date)
          || left.title.localeCompare(right.title)
        ))
        : [];
      setEvents(nextEvents);
      setError(null);
      return nextEvents;
    } catch (err) {
      setEvents([]);
      setError(resolveErrorMessage(err as ApiError, 'Failed to load term calendar events'));
      return [];
    } finally {
      setLoading(false);
    }
  }, [termId]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (data: Partial<TermCalendarEvent>) => {
    try {
      const created = await termCalendarEventAPI.create(data);
      setEvents(prev => [...prev, created].sort((left, right) => (
        left.start_date.localeCompare(right.start_date)
        || left.end_date.localeCompare(right.end_date)
        || left.title.localeCompare(right.title)
      )));
      return created;
    } catch (err) {
      throw wrapApiMutationError(err, 'Failed to create term calendar event');
    }
  };

  const updateEvent = async (id: number, data: Partial<TermCalendarEvent>) => {
    try {
      const updated = await termCalendarEventAPI.update(id, data);
      setEvents(prev => prev
        .map(event => event.id === id ? updated : event)
        .sort((left, right) => (
          left.start_date.localeCompare(right.start_date)
          || left.end_date.localeCompare(right.end_date)
          || left.title.localeCompare(right.title)
        )));
      return updated;
    } catch (err) {
      throw wrapApiMutationError(err, 'Failed to update term calendar event');
    }
  };

  const deleteEvent = async (id: number) => {
    try {
      await termCalendarEventAPI.delete(id);
      setEvents(prev => prev.filter(event => event.id !== id));
    } catch (err) {
      throw wrapApiMutationError(err, 'Failed to delete term calendar event');
    }
  };

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
};

// ── useCurricula ──────────────────────────────────────────────────────────

export const useCurricula = (options: { enabled?: boolean } = {}) => {
  const { organizationId } = useOrganizationContext();
  const qc = useQueryClient();
  const enabled = options.enabled ?? true;
  const query = useQuery<Curriculum[], Error>({
    queryKey: academicKeys.curricula.list(organizationId),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (organizationId) params.organization = String(organizationId);
      const data = await curriculumAPI.getAll(params);
      return Array.isArray(data)
        ? data
        : (data as { results?: Curriculum[] })?.results ?? [];
    },
    enabled,
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Curriculum>) => {
      try {
        return await curriculumAPI.create(data);
      } catch (err) {
        throw new Error(resolveErrorMessage(err as ApiError, 'Failed to create curriculum'));
      }
    },
    onSuccess: (created) => {
      qc.setQueryData<Curriculum[]>(
        academicKeys.curricula.list(organizationId),
        (prev = []) => [...prev, created],
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Curriculum> }) => {
      try {
        return await curriculumAPI.update(id, data);
      } catch (err) {
        throw new Error(resolveErrorMessage(err as ApiError, 'Failed to update curriculum'));
      }
    },
    onSuccess: (updated) => {
      qc.setQueryData<Curriculum[]>(
        academicKeys.curricula.list(organizationId),
        (prev = []) => prev.map(c => c.id === updated.id ? updated : c),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        await curriculumAPI.delete(id);
        return id;
      } catch (err) {
        throw new Error(resolveErrorMessage(err as ApiError, 'Failed to delete curriculum'));
      }
    },
    onSuccess: (deletedId) => {
      qc.setQueryData<Curriculum[]>(
        academicKeys.curricula.list(organizationId),
        (prev = []) => prev.filter(c => c.id !== deletedId),
      );
    },
  });

  return {
    curricula: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: async () => {
      await query.refetch();
    },
    createCurriculum: async (data: Partial<Curriculum>) => createMutation.mutateAsync(data),
    updateCurriculum: async (id: number, data: Partial<Curriculum>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteCurriculum: async (id: number) => deleteMutation.mutateAsync(id),
  };
};

// ── useSubjects ───────────────────────────────────────────────────────────

export const useSubjects = (curriculumId?: number, options?: { enabled?: boolean }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(Boolean(options?.enabled ?? true));
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();
  const enabled = options?.enabled ?? true;
  const instructorAccess = useInstructorCohortAccess({ enabled });
  const subjectIdsKey = instructorAccess.subjectIdsKey;
  const allowedSubjectIds = useMemo(
    () => toIdSet(subjectIdsKey),
    [subjectIdsKey]
  );

  const fetchSubjects = useCallback(async () => {
    if (!enabled) {
      setSubjects([]);
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      const params: Record<string, string> = { page_size: '1000' };
      if (curriculumId) params.curriculum = String(curriculumId);
      if (organizationId) params.organization = String(organizationId);
      const data = await subjectAPI.getAll(params);
      const allSubjects = Array.isArray(data) ? data : (data as { results?: Subject[] })?.results ?? [];
      setSubjects(
        instructorAccess.isInstructor
          ? allSubjects.filter(subject => allowedSubjectIds.has(subject.id))
          : allSubjects
      );
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch subjects'));
    } finally {
      setLoading(false);
    }
  }, [allowedSubjectIds, curriculumId, enabled, instructorAccess.isInstructor, organizationId]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const createSubject = async (data: Partial<Subject>) => {
    try {
      const newSubject = await subjectAPI.create(data);
      setSubjects(prev => [...prev, newSubject]);
      return newSubject;
    } catch (err) {
      throw new Error(resolveErrorMessage(err as ApiError, 'Failed to create subject'));
    }
  };

  const updateSubject = async (id: number, data: Partial<Subject>) => {
    try {
      const updated = await subjectAPI.update(id, data);
      setSubjects(prev => prev.map(s => s.id === id ? updated : s));
      return updated;
    } catch (err) {
      throw new Error(resolveErrorMessage(err as ApiError, 'Failed to update subject'));
    }
  };

  const deleteSubject = async (id: number) => {
    try {
      await subjectAPI.delete(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      throw new Error(resolveErrorMessage(err as ApiError, 'Failed to delete subject'));
    }
  };

  return { subjects, loading, error, refetch: fetchSubjects, createSubject, updateSubject, deleteSubject };
};

export const useLearnerSubjectOptions = (
  learnerId: number | null | undefined,
  options?: { enabled?: boolean },
) => {
  const enabled = Boolean(learnerId) && (options?.enabled ?? true);
  const [subjectOptions, setSubjectOptions] = useState<LearnerSubjectOption[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjectOptions = useCallback(async () => {
    if (!enabled || !learnerId) {
      setSubjectOptions([]);
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      const data = await learnerSubjectOptionsAPI.getAll(learnerId);
      setSubjectOptions(data.results ?? []);
      setError(null);
    } catch (err) {
      setSubjectOptions([]);
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch learner subject options'));
    } finally {
      setLoading(false);
    }
  }, [enabled, learnerId]);

  useEffect(() => {
    void fetchSubjectOptions();
  }, [fetchSubjectOptions]);

  return {
    subjectOptions,
    loading,
    error,
    refetch: fetchSubjectOptions,
  };
};

export const useSubjectDetail = (subjectId: number | null) => {
  const [subject, setSubject] = useState<SubjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubject = useCallback(async () => {
    if (!subjectId) {
      setSubject(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await subjectAPI.getById(subjectId);
      setSubject(data);
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch subject details'));
      setSubject(null);
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    fetchSubject();
  }, [fetchSubject]);

  return { subject, loading, error, refetch: fetchSubject };
};

// ── useCohortSubjects ─────────────────────────────────────────────────────

export const useCohortSubjects = (cohortId?: number) => {
  const enabled = typeof cohortId === 'number' && cohortId > 0;
  const query = useQuery<CohortSubject[], Error>({
    queryKey: academicKeys.cohorts.subjects(cohortId ?? null),
    queryFn: async () => {
      const data = await cohortSubjectAPI.getAll({ cohort: String(cohortId) });
      return Array.isArray(data)
        ? data
        : (data as { results?: CohortSubject[] })?.results ?? [];
    },
    enabled,
    staleTime: 30_000,
  });

  return {
    cohortSubjects: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
};

// ── useCohorts ────────────────────────────────────────────────────────────

export const useCohorts = (filters?: CohortFilters, options?: { enabled?: boolean }) => {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(Boolean(options?.enabled ?? true));
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganizationContext();
  const enabled = options?.enabled ?? true;
  const instructorAccess = useInstructorCohortAccess({ enabled });
  const cohortIdsKey = instructorAccess.cohortIdsKey;
  const allowedCohortIds = useMemo(
    () => toIdSet(cohortIdsKey),
    [cohortIdsKey]
  );
  const academicYear = filters?.academic_year;
  const curriculum = filters?.curriculum;
  const curriculumType = filters?.curriculum_type;
  const level = filters?.level;

  const resolvedFilters = useMemo(() => {
    const nextFilters: CohortFilters = {};

    if (academicYear) nextFilters.academic_year = academicYear;
    if (curriculum) nextFilters.curriculum = curriculum;
    if (curriculumType) nextFilters.curriculum_type = curriculumType;
    if (organizationId) nextFilters.organization = organizationId;
    if (level) nextFilters.level = level;

    return nextFilters;
  }, [academicYear, curriculum, curriculumType, level, organizationId]);

  const fetchCohorts = useCallback(async () => {
    if (!enabled) {
      setCohorts([]);
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      const data = await cohortAPI.getAll(resolvedFilters);
      const allCohorts = Array.isArray(data) ? data : (data as { results?: Cohort[] })?.results ?? [];
      setCohorts(
        instructorAccess.isInstructor
          ? allCohorts.filter(cohort => allowedCohortIds.has(cohort.id))
          : allCohorts
      );
      setError(null);
    } catch (err) {
      setError(resolveErrorMessage(err as ApiError, 'Failed to fetch cohorts'));
    } finally {
      setLoading(false);
    }
  }, [allowedCohortIds, enabled, instructorAccess.isInstructor, resolvedFilters]);

  useEffect(() => { fetchCohorts(); }, [fetchCohorts]);

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
      throw new Error(resolveErrorMessage(err as ApiError, 'Failed to create cohort'));
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
      throw new Error(resolveErrorMessage(err as ApiError, 'Failed to update cohort'));
    }
  };

  const deleteCohort = async (id: number) => {
    try {
      await cohortAPI.delete(id);
      setCohorts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      throw new Error(resolveErrorMessage(err as ApiError, 'Failed to delete cohort'));
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
      .catch(err => setError(resolveErrorMessage(err as ApiError, 'Failed to fetch cohort')))
      .finally(() => setLoading(false));
  }, [cohortId]);

  return { cohort, loading, error };
};

// ── useCohortDetail ───────────────────────────────────────────────────────

export const useCohortDetail = (cohortId: number | null) => {
  const enabled = typeof cohortId === 'number' && cohortId > 0;
  const query = useQuery<CohortDetail, Error>({
    queryKey: academicKeys.cohorts.detail(cohortId),
    queryFn: async () => {
      if (!cohortId) {
        throw new Error('Cohort id is required');
      }

      return cohortAPI.getById(cohortId);
    },
    enabled,
    staleTime: 30_000,
  });

  return {
    cohort: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
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

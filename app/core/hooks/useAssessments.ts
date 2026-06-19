// app/core/hooks/useAssessments.ts
//
// Owns all assessment server state and mutations.
// No API calls outside this file. No any. No business logic in pages.

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  assessmentAPI,
  assessmentScoreAPI,
  rubricScaleAPI,
} from '../api/assessments';
import { getDefaultAssessmentParticipationMode } from '@/app/core/lib/assessmentParticipation';
import {
  Assessment,
  AssessmentDetail,
  AssessmentParticipationMode,
  AssessmentScore,
  AssessmentScoreStatus,
  AssessmentStatus,
  RubricScale,
  RubricScaleDetail,
  BulkScoreData,
  StudentScoresResponse,
  AssessmentReviewSummary,
} from '../types/assessment';
import { PaginatedResponse } from '@/app/core/types/api';
import { ApiError, extractErrorMessage } from '../types/errors';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';

// ── Helper ────────────────────────────────────────────────────────────────


function unwrapList<T>(data: T[] | PaginatedResponse<T>): T[] {
  return Array.isArray(data) ? data : data?.results ?? [];
}

function unwrapCount<T>(data: T[] | PaginatedResponse<T>): number {
  return Array.isArray(data) ? data.length : data?.count ?? data?.results?.length ?? 0;
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

// ── useAssessments ────────────────────────────────────────────────────────

export const useAssessments = (params?: {
  term?: number;
  cohort_subject?: number;
  assessment_type?: string;
  evaluation_type?: string;
  status?: AssessmentStatus;
}) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const instructorAccess = useInstructorCohortAccess();
  const cohortSubjectIdsKey = instructorAccess.cohortSubjectIdsKey;
  const allowedCohortSubjectIds = useMemo(
    () => toIdSet(cohortSubjectIdsKey),
    [cohortSubjectIdsKey]
  );
  const assessmentFilters = useMemo(
    () => ({
      term: params?.term,
      cohort_subject: params?.cohort_subject,
      assessment_type: params?.assessment_type,
      evaluation_type: params?.evaluation_type,
      status: params?.status,
    }),
    [
      params?.term,
      params?.cohort_subject,
      params?.assessment_type,
      params?.evaluation_type,
      params?.status,
    ]
  );

  const fetchAssessments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await assessmentAPI.getAll(assessmentFilters);
      const allAssessments = unwrapList(data);
      setAssessments(
        instructorAccess.isInstructor
          ? allAssessments.filter(assessment => allowedCohortSubjectIds.has(assessment.cohort_subject))
          : allAssessments
      );
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch assessments'));
    } finally {
      setLoading(false);
    }
  }, [allowedCohortSubjectIds, assessmentFilters, instructorAccess.isInstructor]);

  useEffect(() => {
    void fetchAssessments();
  }, [fetchAssessments]);

  const createAssessment = async (data: Partial<Assessment>): Promise<Assessment> => {
    const created = await assessmentAPI.create(data);
    setAssessments(prev => [created, ...prev]);
    return created;
  };

  const updateAssessment = async (id: number, data: Partial<Assessment>): Promise<Assessment> => {
    const updated = await assessmentAPI.update(id, data);
    setAssessments(prev => prev.map(a => a.id === id ? updated : a));
    return updated;
  };

  const deleteAssessment = async (id: number): Promise<void> => {
    await assessmentAPI.delete(id);
    setAssessments(prev => prev.filter(a => a.id !== id));
  };

  return {
    assessments, loading, error,
    refetch: fetchAssessments,
    createAssessment, updateAssessment, deleteAssessment,
  };
};

// ── useOpenAssessmentsForStudent ──────────────────────────────────────────

export const useOpenAssessmentsForStudent = (
  studentId: number | null,
  options?: { enabled?: boolean }
) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = (options?.enabled ?? true)
    && Number.isInteger(studentId)
    && Number(studentId) > 0;

  const fetchAssessments = useCallback(async () => {
    if (!enabled || !studentId) {
      setAssessments([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await assessmentAPI.getOpenForStudent(studentId);
      const openAssessments = unwrapList(data).filter(
        (assessment) => assessment.status === AssessmentStatus.ACTIVE && assessment.can_score !== false
      );
      setAssessments(openAssessments);
    } catch (err) {
      setAssessments([]);
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch open assessments'));
    } finally {
      setLoading(false);
    }
  }, [enabled, studentId]);

  useEffect(() => {
    void fetchAssessments();
  }, [fetchAssessments]);

  return {
    assessments,
    loading,
    error,
    refetch: fetchAssessments,
  };
};

// ── useAssessmentDetail ───────────────────────────────────────────────────

export const useAssessmentDetail = (assessmentId: number | null) => {
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchAssessment = useCallback(async () => {
    if (!assessmentId) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await assessmentAPI.getById(assessmentId);
      setAssessment(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch assessment'));
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => { void fetchAssessment(); }, [fetchAssessment]);

  const activateAssessment = async (): Promise<void> => {
    if (!assessmentId) return;
    const updated = await assessmentAPI.activate(assessmentId);
    setAssessment(prev => prev ? { ...prev, ...updated } : null);
  };

  const finalizeAssessment = async (
    options?: { finalize_unresolved_absent?: boolean }
  ): Promise<void> => {
    if (!assessmentId) return;
    setFinalizing(true);
    try {
      const updated = await assessmentAPI.finalize(assessmentId, options);
      setAssessment(prev => prev ? { ...prev, ...updated } : null);
    } finally {
      setFinalizing(false);
    }
  };

  const deleteAssessment = async (): Promise<void> => {
    if (!assessmentId) return;
    setDeleting(true);
    try {
      await assessmentAPI.delete(assessmentId);
    } finally {
      setDeleting(false);
    }
  };

  return {
    assessment, loading, error,
    finalizing, deleting,
    refetch: fetchAssessment,
    activateAssessment,
    finalizeAssessment,
    deleteAssessment,
  };
};

// ── useAssessmentScores ───────────────────────────────────────────────────

export const useAssessmentScores = (params?: {
  assessment?: number;
  student?: number;
  assessment__term?: number;
  status?: AssessmentScoreStatus;
  search?: string;
  page?: number;
  page_size?: number;
  enabled?: boolean;
}) => {
  const [scores, setScores] = useState<AssessmentScore[]>([]);
  const [loading, setLoading] = useState(params?.enabled !== false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const enabled = params?.enabled ?? true;
  const scoreFilters = useMemo(
    () => ({
      assessment: params?.assessment,
      student: params?.student,
      assessment__term: params?.assessment__term,
      status: params?.status,
      search: params?.search,
      page: params?.page,
      page_size: params?.page_size,
    }),
    [
      params?.assessment,
      params?.student,
      params?.assessment__term,
      params?.status,
      params?.search,
      params?.page,
      params?.page_size,
    ]
  );

  const fetchScores = useCallback(async () => {
    if (!enabled) {
      setScores([]);
      setTotalItems(0);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await assessmentScoreAPI.getAll(scoreFilters);
      setScores(unwrapList(data));
      setTotalItems(unwrapCount(data));
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch scores'));
      setScores([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [enabled, scoreFilters]);

  useEffect(() => {
    void fetchScores();
  }, [fetchScores]);

  const updateScore = async (id: number, data: Partial<AssessmentScore>): Promise<AssessmentScore> => {
    const updated = await assessmentScoreAPI.update(id, data);
    setScores(prev => prev.map(s => s.id === id ? updated : s));
    return updated;
  };

  const bulkEntry = async (data: BulkScoreData): Promise<void> => {
    await assessmentScoreAPI.bulkEntry(data);
    await fetchScores();
  };

  return {
    scores, loading, error, totalItems,
    refetch: fetchScores,
    updateScore, bulkEntry,
  };
};

export const useAssessmentReviewSummary = (params?: {
  term?: number;
  enabled?: boolean;
}) => {
  const [summary, setSummary] = useState<AssessmentReviewSummary | null>(null);
  const [loading, setLoading] = useState(params?.enabled !== false);
  const [error, setError] = useState<string | null>(null);
  const enabled = params?.enabled ?? true;

  const fetchSummary = useCallback(async () => {
    if (!enabled) {
      setSummary(null);
      setError(null);
      setLoading(false);
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await assessmentAPI.getReviewSummary(params?.term);
      setSummary(data);
      return data;
    } catch (err) {
      setSummary(null);
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch assessment review summary'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled, params?.term]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary,
  };
};

// ── useRubricScales ───────────────────────────────────────────────────────

export const useRubricScales = (curriculumId?: number) => {
  const [rubricScales, setRubricScales] = useState<RubricScale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRubricScales = useCallback(async () => {
    try {
      setLoading(true);
      const data = curriculumId
        ? await rubricScaleAPI.getByCurriculum(curriculumId)
        : await rubricScaleAPI.getAll();
      setRubricScales(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch rubric scales'));
    } finally {
      setLoading(false);
    }
  }, [curriculumId]);

  useEffect(() => { void fetchRubricScales(); }, [fetchRubricScales]);

  const createRubricScale = async (data: Partial<RubricScale>): Promise<RubricScale> => {
    const created = await rubricScaleAPI.create(data);
    setRubricScales(prev => [...prev, created]);
    return created;
  };

  const updateRubricScale = async (id: number, data: Partial<RubricScale>): Promise<RubricScale> => {
    const updated = await rubricScaleAPI.update(id, data);
    setRubricScales(prev => prev.map(r => r.id === id ? updated : r));
    return updated;
  };

  const deleteRubricScale = async (id: number): Promise<void> => {
    await rubricScaleAPI.delete(id);
    setRubricScales(prev => prev.filter(r => r.id !== id));
  };

  return {
    rubricScales, loading, error,
    refetch: fetchRubricScales,
    createRubricScale, updateRubricScale, deleteRubricScale,
  };
};

// ── useRubricScaleDetail ──────────────────────────────────────────────────

export const useRubricScaleDetail = (scaleId: number | null) => {
  const [scale, setScale] = useState<RubricScaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScale = useCallback(async () => {
    if (!scaleId) { setLoading(false); return; }
    try {
      setLoading(true);
      const data = await rubricScaleAPI.getById(scaleId);
      setScale(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch rubric scale'));
    } finally {
      setLoading(false);
    }
  }, [scaleId]);

  useEffect(() => { void fetchScale(); }, [fetchScale]);

  return { scale, loading, error, refetch: fetchScale };
};

// ── useStudentScores ──────────────────────────────────────────────────────

export const useStudentScores = (
  studentId: number | null,
  termId?: number,
  cohortId?: number,
) => {
  const [data, setData] = useState<StudentScoresResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentScores = useCallback(async () => {
    if (!studentId) { setLoading(false); return; }
    try {
      setLoading(true);
      const result = await assessmentScoreAPI.getStudentScores(studentId, termId, cohortId);
      setData(result);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch student scores'));
    } finally {
      setLoading(false);
    }
  }, [cohortId, studentId, termId]);

  useEffect(() => { void fetchStudentScores(); }, [fetchStudentScores]);

  return { data, loading, error, refetch: fetchStudentScores };
};


// ── useCreateAssessmentForm ───────────────────────────────────────────────

interface AssessmentFormState {
  cohort_subject: number;
  term: number | null;
  name: string;
  assessment_type: string;
  evaluation_type: string;
  total_marks: number | null;
  rubric_scale: number | null;
  assessment_date: string;
  description: string;
  participation_mode: AssessmentParticipationMode;
}

interface FormErrors {
  cohort?: string;
  cohort_subject?: string;
  name?: string;
  total_marks?: string;
  rubric_scale?: string;
}

export const useCreateAssessmentForm = (options?: {
  allowedCohortSubjectIds?: number[];
  enforceAssignedSubject?: boolean;
}) => {
  const [selectedCohortId, setSelectedCohortId] = useState<number>(0);
  const allowedCohortSubjectIds = options?.allowedCohortSubjectIds ?? [];
  const enforceAssignedSubject = options?.enforceAssignedSubject ?? false;
  const [form, setForm] = useState<AssessmentFormState>({
    cohort_subject: 0,
    term: null,
    name: '',
    assessment_type: 'CAT',
    evaluation_type: 'NUMERIC',
    total_marks: 100,
    rubric_scale: null,
    assessment_date: new Date().toISOString().split('T')[0],
    description: '',
    participation_mode: getDefaultAssessmentParticipationMode(),
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setField = <K extends keyof AssessmentFormState>(
    field: K,
    value: AssessmentFormState[K]
  ) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'evaluation_type') {
        if (value === 'NUMERIC') { updated.rubric_scale = null; updated.total_marks = 100; }
        if (value === 'RUBRIC') { updated.total_marks = null; }
      }
      return updated;
    });
    if (field in errors) {
      setErrors(prev => { const e = { ...prev }; delete e[field as keyof FormErrors]; return e; });
    }
  };

  const selectCohort = (cohortId: number) => {
    setSelectedCohortId(cohortId);
    setForm(prev => ({ ...prev, cohort_subject: 0 }));
    setErrors(prev => { const e = { ...prev }; delete e.cohort; return e; });
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!selectedCohortId) e.cohort = 'Cohort is required';
    if (!form.cohort_subject) e.cohort_subject = 'Subject is required';
    if (
      enforceAssignedSubject
      && form.cohort_subject
      && !allowedCohortSubjectIds.includes(form.cohort_subject)
    ) {
      e.cohort_subject = 'You are not assigned to this cohort subject';
    }
    if (!form.name.trim()) e.name = 'Assessment name is required';
    if (form.evaluation_type === 'NUMERIC' && !form.total_marks)
      e.total_marks = 'Total marks required for numeric assessments';
    if (form.evaluation_type === 'RUBRIC' && !form.rubric_scale)
      e.rubric_scale = 'Rubric scale required for rubric assessments';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (): Promise<Assessment | null> => {
    if (!validate()) return null;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await assessmentAPI.create(form);
      return result;
    } catch (err) {
      setSaveError(extractErrorMessage(err as ApiError, 'Failed to create assessment'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  return {
    form, errors, saving, saveError, selectedCohortId,
    setField, selectCohort, submit,
    dismissError: () => setSaveError(null),
  };
};

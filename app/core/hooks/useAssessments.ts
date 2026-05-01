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
import {
  Assessment,
  AssessmentDetail,
  AssessmentScore,
  AssessmentStatus,
  RubricScale,
  RubricScaleDetail,
  BulkScoreData,
  StudentScoresResponse,
} from '../types/assessment';
import { PaginatedResponse } from '@/app/core/types/api';
import { ApiError, extractErrorMessage } from '../types/errors';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';

// ── Helper ────────────────────────────────────────────────────────────────


function unwrapList<T>(data: T[] | PaginatedResponse<T>): T[] {
  return Array.isArray(data) ? data : data?.results ?? [];
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
  const cohortIdsKey = instructorAccess.cohortIdsKey;
  const allowedCohortIds = useMemo(
    () => toIdSet(cohortIdsKey),
    [cohortIdsKey]
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
          ? allAssessments.filter(assessment => allowedCohortIds.has(assessment.cohort_id))
          : allAssessments
      );
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch assessments'));
    } finally {
      setLoading(false);
    }
  }, [allowedCohortIds, assessmentFilters, instructorAccess.isInstructor]);

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

  const finalizeAssessment = async (): Promise<void> => {
    if (!assessmentId) return;
    setFinalizing(true);
    try {
      const updated = await assessmentAPI.finalize(assessmentId);
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
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  const [scores, setScores] = useState<AssessmentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const scoreFilters = useMemo(
    () => ({
      assessment: params?.assessment,
      student: params?.student,
      search: params?.search,
      page: params?.page,
      page_size: params?.page_size,
    }),
    [
      params?.assessment,
      params?.student,
      params?.search,
      params?.page,
      params?.page_size,
    ]
  );

  const fetchScores = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await assessmentScoreAPI.getAll(scoreFilters);
      setScores(unwrapList(data));
      setTotalItems(
        Array.isArray(data) ? data.length : (data as PaginatedResponse<AssessmentScore>).count ?? 0
      );
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch scores'));
      setScores([]);
    } finally {
      setLoading(false);
    }
  }, [scoreFilters]);

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
}

interface FormErrors {
  cohort?: string;
  cohort_subject?: string;
  name?: string;
  total_marks?: string;
  rubric_scale?: string;
}

export const useCreateAssessmentForm = (userEmail: string) => {
  const [selectedCohortId, setSelectedCohortId] = useState<number>(0);
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
      const result = await assessmentAPI.create({
        ...form,
        created_by: userEmail,
      });
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

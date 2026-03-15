import { useState, useEffect } from 'react';
import {
  assessmentAPI,
  assessmentScoreAPI,
  rubricScaleAPI,
  rubricLevelAPI
} from '../api/assessments';
import {
  Assessment,
  AssessmentDetail,
  AssessmentScore,
  RubricScale,
  RubricScaleDetail,
  RubricLevel,
  BulkScoreData
} from '../types/assessment';

// Assessments Hook
export const useAssessments = (params?: {
  term?: number;
  subject?: number;
  assessment_type?: string;
  evaluation_type?: string;
}) => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const data = await assessmentAPI.getAll(params);
      const assessmentArray = Array.isArray(data)
        ? data
        : (data && typeof data === 'object' && 'results' in data) ? (data as any).results ?? [] : [];
      setAssessments(assessmentArray);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [params?.term, params?.subject, params?.assessment_type, params?.evaluation_type]);

  const createAssessment = async (data: Partial<Assessment>) => {
    try {
      const newAssessment = await assessmentAPI.create(data);
      setAssessments(prev => [newAssessment, ...prev]);
      return newAssessment;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create assessment');
    }
  };

  const updateAssessment = async (id: number, data: Partial<Assessment>) => {
    try {
      const updated = await assessmentAPI.update(id, data);
      setAssessments(prev => prev.map(a => a.id === id ? updated : a));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update assessment');
    }
  };

  const deleteAssessment = async (id: number) => {
    try {
      await assessmentAPI.delete(id);
      setAssessments(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete assessment');
    }
  };

  return {
    assessments,
    loading,
    error,
    refetch: fetchAssessments,
    createAssessment,
    updateAssessment,
    deleteAssessment
  };
};

// Assessment Detail Hook
export const useAssessmentDetail = (assessmentId: number | null) => {
  const [assessment, setAssessment] = useState<AssessmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssessment = async () => {
    if (!assessmentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await assessmentAPI.getById(assessmentId);
      setAssessment(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch assessment details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment();
  }, [assessmentId]);

  return {
    assessment,
    loading,
    error,
    refetch: fetchAssessment
  };
};

// Assessment Scores Hook
export const useAssessmentScores = (params?: {
  assessment?: number;
  student?: number;
  assessment__term?: number;
  assessment__subject?: number;
  search?: string;
  page?: number;
  page_size?: number;
}) => {
  const [scores, setScores] = useState<AssessmentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalItems, setTotalItems] = useState(0);

  const fetchScores = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await assessmentScoreAPI.getAll({
        assessment: params?.assessment,
        student: params?.student,
        search: params?.search,
        page,
        page_size: pageSize,
      });

      const assessementScoresArray = Array.isArray(data)
        ? data
        : (data && typeof data === 'object' && 'results' in data) ? (data as any).results ?? [] : [];

      setScores(assessementScoresArray);
      setTotalItems((data as any)?.count);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch scores');
      setScores([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchScores();
  }, [
    params?.assessment,
    params?.student,
    params?.search,
    page,
    pageSize,
  ]);

  const updateScore = async (id: number, data: Partial<AssessmentScore>) => {
    try {
      const updated = await assessmentScoreAPI.update(id, data);
      setScores(prev => prev.map(s => s.id === id ? updated : s));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update score');
    }
  };

  const bulkEntry = async (data: BulkScoreData) => {
    try {
      await assessmentScoreAPI.bulkEntry(data);
      await fetchScores(); // Refresh scores
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to submit scores');
    }
  };

  return {
    scores,
    loading,
    error,
    refetch: fetchScores,
    updateScore,
    bulkEntry
  };
};

// Rubric Scales Hook
export const useRubricScales = (curriculumId?: number) => {
  const [rubricScales, setRubricScales] = useState<RubricScale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRubricScales = async () => {
    try {
      setLoading(true);
      const data = curriculumId
        ? await rubricScaleAPI.getByCurriculum(curriculumId)
        : await rubricScaleAPI.getAll();
      setRubricScales(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rubric scales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRubricScales();
  }, [curriculumId]);

  const createRubricScale = async (data: Partial<RubricScale>) => {
    try {
      const newScale = await rubricScaleAPI.create(data);
      setRubricScales(prev => [...prev, newScale]);
      return newScale;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create rubric scale');
    }
  };

  const updateRubricScale = async (id: number, data: Partial<RubricScale>) => {
    try {
      const updated = await rubricScaleAPI.update(id, data);
      setRubricScales(prev => prev.map(r => r.id === id ? updated : r));
      return updated;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to update rubric scale');
    }
  };

  const deleteRubricScale = async (id: number) => {
    try {
      await rubricScaleAPI.delete(id);
      setRubricScales(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete rubric scale');
    }
  };

  return {
    rubricScales,
    loading,
    error,
    refetch: fetchRubricScales,
    createRubricScale,
    updateRubricScale,
    deleteRubricScale
  };
};

// Rubric Scale Detail Hook
export const useRubricScaleDetail = (scaleId: number | null) => {
  const [scale, setScale] = useState<RubricScaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScale = async () => {
    if (!scaleId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await rubricScaleAPI.getById(scaleId);
      setScale(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rubric scale');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScale();
  }, [scaleId]);

  return {
    scale,
    loading,
    error,
    refetch: fetchScale
  };
};

// Student Scores Hook
export const useStudentScores = (studentId: number | null, termId?: number) => {
  const [data, setData] = useState<{
    statistics: {
      average: number;
      count: number;
    };
    scores: AssessmentScore[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentScores = async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await assessmentScoreAPI.getStudentScores(studentId, termId);
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch student scores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentScores();
  }, [studentId, termId]);

  return {
    data,
    loading,
    error,
    refetch: fetchStudentScores
  };
};

function setTotalItems(count: any) {
  throw new Error('Function not implemented.');
}

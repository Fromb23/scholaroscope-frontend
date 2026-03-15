import { useState, useEffect } from 'react';
import {
  attendanceSummaryAPI,
  gradeSummaryAPI,
  cohortSummaryAPI,
  subjectSummaryAPI,
  assessmentTypeSummaryAPI,
  reportsAPI
} from '@/app/core/api/reporting';
import {
  AttendanceSummary,
  GradeSummary,
  CohortSummary,
  SubjectSummary,
  AssessmentTypeSummary,
  DashboardOverview,
  StudentReportCard,
  ClassSummary,
  SubjectAnalysis,
  LongitudinalStudentData,
  ReportFilters
} from '@/app/core/types/reporting';

// ============================================================================
// Dashboard Overview Hook
// ============================================================================
export const useDashboardOverview = () => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const data = await reportsAPI.getDashboardOverview();
      setOverview(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return {
    overview,
    loading,
    error,
    refetch: fetchOverview
  };
};

// ============================================================================
// Attendance Summary Hook
// ============================================================================
export const useAttendanceSummaries = (params?: ReportFilters) => {
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      const data = await attendanceSummaryAPI.getAll(params);
      setSummaries(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance summaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [params?.student, params?.term, params?.cohort_subject]);

  const computeSummaries = async (termId: number) => {
    try {
      await attendanceSummaryAPI.compute(termId);
      await fetchSummaries();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to compute summaries');
    }
  };

  return {
    summaries,
    loading,
    error,
    refetch: fetchSummaries,
    computeSummaries
  };
};

// ============================================================================
// Grade Summary Hook
// ============================================================================
export const useGradeSummaries = (params?: ReportFilters) => {
  const [summaries, setSummaries] = useState<GradeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      const data = await gradeSummaryAPI.getAll(params);
      setSummaries(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch grade summaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [params?.student, params?.term, params?.cohort_subject]);

  const computeSummaries = async (termId: number) => {
    try {
      await gradeSummaryAPI.compute(termId);
      await fetchSummaries();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to compute summaries');
    }
  };

  return {
    summaries,
    loading,
    error,
    refetch: fetchSummaries,
    computeSummaries
  };
};

// ============================================================================
// Cohort Summary Hook
// ============================================================================
export const useCohortSummaries = (params?: ReportFilters) => {
  const [summaries, setSummaries] = useState<CohortSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      const data = await cohortSummaryAPI.getAll(params);
      setSummaries(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cohort summaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [params?.cohort, params?.term]);

  const computeSummaries = async (termId: number) => {
    try {
      await cohortSummaryAPI.compute(termId);
      await fetchSummaries();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to compute summaries');
    }
  };

  return {
    summaries,
    loading,
    error,
    refetch: fetchSummaries,
    computeSummaries
  };
};

// ============================================================================
// Subject Summary Hook
// ============================================================================
export const useSubjectSummaries = (params?: ReportFilters) => {
  const [summaries, setSummaries] = useState<SubjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      const data = await subjectSummaryAPI.getAll(params);
      setSummaries(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch subject summaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [params?.cohort_subject, params?.term]);

  const computeSummaries = async (termId: number) => {
    try {
      await subjectSummaryAPI.compute(termId);
      await fetchSummaries();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to compute summaries');
    }
  };

  return {
    summaries,
    loading,
    error,
    refetch: fetchSummaries,
    computeSummaries
  };
};

// ============================================================================
// Assessment Type Summary Hook
// ============================================================================
export const useAssessmentTypeSummaries = (params?: ReportFilters) => {
  const [summaries, setSummaries] = useState<AssessmentTypeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      const data = await assessmentTypeSummaryAPI.getAll(params);
      setSummaries(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch assessment type summaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [params?.cohort_subject, params?.term]);

  const computeSummaries = async (termId: number) => {
    try {
      await assessmentTypeSummaryAPI.compute(termId);
      await fetchSummaries();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to compute summaries');
    }
  };

  return {
    summaries,
    loading,
    error,
    refetch: fetchSummaries,
    computeSummaries
  };
};

// ============================================================================
// Student Report Card Hook
// ============================================================================
export const useStudentReportCard = (
  studentId: number | null,
  termId: number | null
) => {
  const [reportCard, setReportCard] = useState<StudentReportCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReportCard = async () => {
    if (!studentId || !termId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await reportsAPI.getStudentReportCard(studentId, termId);
      setReportCard(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch report card');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportCard();
  }, [studentId, termId]);

  return {
    reportCard,
    loading,
    error,
    refetch: fetchReportCard
  };
};

// ============================================================================
// Class Summary Hook
// ============================================================================
export const useClassSummary = (
  termId: number | null,
  cohortId: number | null
) => {
  const [summary, setSummary] = useState<ClassSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!termId || !cohortId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await reportsAPI.getClassSummary(termId, cohortId);
      setSummary(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch class summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [termId, cohortId]);

  return {
    summary,
    loading,
    error,
    refetch: fetchSummary
  };
};

// ============================================================================
// Subject Analysis Hook
// ============================================================================
export const useSubjectAnalysis = (
  termId: number | null,
  subjectId?: number
) => {
  const [analysis, setAnalysis] = useState<SubjectAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    if (!termId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await reportsAPI.getSubjectAnalysis(termId, subjectId);
      setAnalysis(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch subject analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [termId, subjectId]);

  return {
    analysis,
    loading,
    error,
    refetch: fetchAnalysis
  };
};

// ============================================================================
// Longitudinal Student Hook
// ============================================================================
export const useLongitudinalStudent = (studentId: number | null) => {
  const [data, setData] = useState<LongitudinalStudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await reportsAPI.getLongitudinalStudent(studentId);
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch longitudinal data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [studentId]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};
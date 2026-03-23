// app/core/hooks/useReporting.ts

import { useState, useEffect } from 'react';
import {
  attendanceSummaryAPI,
  gradeSummaryAPI,
  cohortSummaryAPI,
  subjectSummaryAPI,
  assessmentTypeSummaryAPI,
  reportsAPI,
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
  ReportFilters,
} from '@/app/core/types/reporting';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

function unwrap<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : data?.results ?? [];
}

// ── useDashboardOverview ──────────────────────────────────────────────────

export const useDashboardOverview = () => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setOverview(await reportsAPI.getDashboardOverview());
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch overview'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOverview(); }, []);
  return { overview, loading, error, refetch: fetchOverview };
};

// ── useAttendanceSummaries ────────────────────────────────────────────────

export const useAttendanceSummaries = (params?: ReportFilters) => {
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = async () => {
    const hasFilter = params && Object.values(params).some(v => v !== undefined);
    if (!hasFilter) { setLoading(false); return; }
    try {
      setLoading(true);
      setSummaries(unwrap(await attendanceSummaryAPI.getAll(params)));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch attendance summaries'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummaries(); }, [params?.student, params?.term, params?.cohort_subject]);

  const computeSummaries = async (termId: number): Promise<void> => {
    await attendanceSummaryAPI.compute(termId);
    await fetchSummaries();
  };

  return { summaries, loading, error, refetch: fetchSummaries, computeSummaries };
};

// ── useGradeSummaries ─────────────────────────────────────────────────────

export const useGradeSummaries = (params?: ReportFilters) => {
  const [summaries, setSummaries] = useState<GradeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = async () => {
    const hasFilter = params && Object.values(params).some(v => v !== undefined);
    if (!hasFilter) { setLoading(false); return; }
    try {
      setLoading(true);
      setSummaries(unwrap(await gradeSummaryAPI.getAll(params)));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch grade summaries'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummaries(); }, [params?.student, params?.term, params?.cohort_subject]);

  const computeSummaries = async (termId: number): Promise<void> => {
    await gradeSummaryAPI.compute(termId);
    await fetchSummaries();
  };

  return { summaries, loading, error, refetch: fetchSummaries, computeSummaries };
};

// ── useCohortSummaries ────────────────────────────────────────────────────

export const useCohortSummaries = (params?: ReportFilters) => {
  const [summaries, setSummaries] = useState<CohortSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      setSummaries(unwrap(await cohortSummaryAPI.getAll(params)));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch cohort summaries'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummaries(); }, [params?.cohort, params?.term]);

  const computeSummaries = async (termId: number): Promise<void> => {
    await cohortSummaryAPI.compute(termId);
    await fetchSummaries();
  };

  return { summaries, loading, error, refetch: fetchSummaries, computeSummaries };
};

// ── useSubjectSummaries ───────────────────────────────────────────────────

export const useSubjectSummaries = (params?: ReportFilters) => {
  const [summaries, setSummaries] = useState<SubjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      setSummaries(unwrap(await subjectSummaryAPI.getAll(params)));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch subject summaries'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummaries(); }, [params?.cohort_subject, params?.term]);

  const computeSummaries = async (termId: number): Promise<void> => {
    await subjectSummaryAPI.compute(termId);
    await fetchSummaries();
  };

  return { summaries, loading, error, refetch: fetchSummaries, computeSummaries };
};

// ── useAssessmentTypeSummaries ────────────────────────────────────────────

export const useAssessmentTypeSummaries = (params?: ReportFilters) => {
  const [summaries, setSummaries] = useState<AssessmentTypeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = async () => {
    try {
      setLoading(true);
      setSummaries(unwrap(await assessmentTypeSummaryAPI.getAll(params)));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch assessment type summaries'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummaries(); }, [params?.cohort_subject, params?.term]);

  const computeSummaries = async (termId: number): Promise<void> => {
    await assessmentTypeSummaryAPI.compute(termId);
    await fetchSummaries();
  };

  return { summaries, loading, error, refetch: fetchSummaries, computeSummaries };
};

// ── useStudentReportCard ──────────────────────────────────────────────────

export const useStudentReportCard = (
  studentId: number | null,
  termId: number | null,
) => {
  const [reportCard, setReportCard] = useState<StudentReportCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReportCard = async () => {
    if (!studentId || !termId) { setLoading(false); return; }
    try {
      setLoading(true);
      setReportCard(await reportsAPI.getStudentReportCard(studentId, termId));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch report card'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReportCard(); }, [studentId, termId]);
  return { reportCard, loading, error, refetch: fetchReportCard };
};

// ── useClassSummary ───────────────────────────────────────────────────────

export const useClassSummary = (
  termId: number | null,
  cohortId: number | null,
) => {
  const [summary, setSummary] = useState<ClassSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!termId || !cohortId) { setLoading(false); return; }
    try {
      setLoading(true);
      setSummary(await reportsAPI.getClassSummary(termId, cohortId));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch class summary'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, [termId, cohortId]);
  return { summary, loading, error, refetch: fetchSummary };
};

// ── useSubjectAnalysis ────────────────────────────────────────────────────

export const useSubjectAnalysis = (
  termId: number | null,
  subjectId?: number,
) => {
  const [analysis, setAnalysis] = useState<SubjectAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    if (!termId) { setLoading(false); return; }
    try {
      setLoading(true);
      setAnalysis(await reportsAPI.getSubjectAnalysis(termId, subjectId));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch subject analysis'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalysis(); }, [termId, subjectId]);
  return { analysis, loading, error, refetch: fetchAnalysis };
};

// ── useLongitudinalStudent ────────────────────────────────────────────────

export const useLongitudinalStudent = (studentId: number | null) => {
  const [data, setData] = useState<LongitudinalStudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!studentId) { setLoading(false); return; }
    try {
      setLoading(true);
      setData(await reportsAPI.getLongitudinalStudent(studentId));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch longitudinal data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [studentId]);
  return { data, loading, error, refetch: fetchData };
};
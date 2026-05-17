// app/core/hooks/useReporting.ts

import { useCallback, useEffect, useState } from 'react';
import {
  attendanceSummaryAPI,
  gradeSummaryAPI,
  cohortSummaryAPI,
  subjectSummaryAPI,
  assessmentTypeSummaryAPI,
  adminReportsAPI,
  instructorReportsAPI,
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
  InstructorOverview,
  InstructorCohortSubjectOverview,
  InstructorCohortSubjectLearnersReport,
  InstructorCohortSubjectPerformanceReport,
  InstructorCohortSubjectTeachingActivityReport,
  ReportFilters,
} from '@/app/core/types/reporting';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

function unwrap<T>(data: T[] | { results?: T[] }): T[] {
  return Array.isArray(data) ? data : data?.results ?? [];
}

function statusCode(err: ApiError): number | null {
  return err.response?.status ?? null;
}

function buildReportFilters(
  student?: number,
  term?: number,
  cohort?: number,
  subject?: number,
  cohortSubject?: number,
): ReportFilters | undefined {
  const params: ReportFilters = {};
  if (student !== undefined) params.student = student;
  if (term !== undefined) params.term = term;
  if (cohort !== undefined) params.cohort = cohort;
  if (subject !== undefined) params.subject = subject;
  if (cohortSubject !== undefined) params.cohort_subject = cohortSubject;
  return Object.keys(params).length > 0 ? params : undefined;
}

// ── useDashboardOverview ──────────────────────────────────────────────────

export const useDashboardOverview = () => {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setOverview(await adminReportsAPI.getOverview());
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch overview'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  return { overview, loading, error, refetch: fetchOverview };
};

// ── useAttendanceSummaries ────────────────────────────────────────────────

export const useAttendanceSummaries = ({
  student,
  term,
  cohort,
  subject,
  cohort_subject: cohortSubject,
}: ReportFilters = {}) => {
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = useCallback(async () => {
    const filters = buildReportFilters(student, term, cohort, subject, cohortSubject);
    if (!filters) { setLoading(false); return; }
    try {
      setLoading(true);
      setSummaries(unwrap(await attendanceSummaryAPI.getAll(filters)));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch attendance summaries'));
    } finally {
      setLoading(false);
    }
  }, [cohort, cohortSubject, student, subject, term]);

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  const computeSummaries = async (termId: number): Promise<void> => {
    await attendanceSummaryAPI.compute(termId);
    await fetchSummaries();
  };

  return { summaries, loading, error, refetch: fetchSummaries, computeSummaries };
};

// ── useGradeSummaries ─────────────────────────────────────────────────────

export const useGradeSummaries = ({
  student,
  term,
  cohort,
  subject,
  cohort_subject: cohortSubject,
}: ReportFilters = {}) => {
  const [summaries, setSummaries] = useState<GradeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = useCallback(async () => {
    const filters = buildReportFilters(student, term, cohort, subject, cohortSubject);
    if (!filters) { setLoading(false); return; }
    try {
      setLoading(true);
      setSummaries(unwrap(await gradeSummaryAPI.getAll(filters)));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch grade summaries'));
    } finally {
      setLoading(false);
    }
  }, [cohort, cohortSubject, student, subject, term]);

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  const computeSummaries = async (termId: number): Promise<void> => {
    await gradeSummaryAPI.compute(termId);
    await fetchSummaries();
  };

  return { summaries, loading, error, refetch: fetchSummaries, computeSummaries };
};

// ── useCohortSummaries ────────────────────────────────────────────────────

export const useCohortSummaries = ({
  student,
  term,
  cohort,
  subject,
  cohort_subject: cohortSubject,
}: ReportFilters = {}) => {
  const [summaries, setSummaries] = useState<CohortSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = useCallback(async () => {
    try {
      setLoading(true);
      setSummaries(unwrap(await cohortSummaryAPI.getAll(
        buildReportFilters(student, term, cohort, subject, cohortSubject)
      )));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch cohort summaries'));
    } finally {
      setLoading(false);
    }
  }, [cohort, cohortSubject, student, subject, term]);

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  const computeSummaries = async (termId: number): Promise<void> => {
    await cohortSummaryAPI.compute(termId);
    await fetchSummaries();
  };

  return { summaries, loading, error, refetch: fetchSummaries, computeSummaries };
};

// ── useSubjectSummaries ───────────────────────────────────────────────────

export const useSubjectSummaries = ({
  student,
  term,
  cohort,
  subject,
  cohort_subject: cohortSubject,
}: ReportFilters = {}) => {
  const [summaries, setSummaries] = useState<SubjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = useCallback(async () => {
    try {
      setLoading(true);
      setSummaries(unwrap(await subjectSummaryAPI.getAll(
        buildReportFilters(student, term, cohort, subject, cohortSubject)
      )));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch subject summaries'));
    } finally {
      setLoading(false);
    }
  }, [cohort, cohortSubject, student, subject, term]);

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  const computeSummaries = async (termId: number): Promise<void> => {
    await subjectSummaryAPI.compute(termId);
    await fetchSummaries();
  };

  return { summaries, loading, error, refetch: fetchSummaries, computeSummaries };
};

// ── useAssessmentTypeSummaries ────────────────────────────────────────────

export const useAssessmentTypeSummaries = ({
  student,
  term,
  cohort,
  subject,
  cohort_subject: cohortSubject,
}: ReportFilters = {}) => {
  const [summaries, setSummaries] = useState<AssessmentTypeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = useCallback(async () => {
    try {
      setLoading(true);
      setSummaries(unwrap(await assessmentTypeSummaryAPI.getAll(
        buildReportFilters(student, term, cohort, subject, cohortSubject)
      )));
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch assessment type summaries'));
    } finally {
      setLoading(false);
    }
  }, [cohort, cohortSubject, student, subject, term]);

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

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

  const fetchReportCard = useCallback(async () => {
    if (!studentId || !termId) {
      setReportCard(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setReportCard(await adminReportsAPI.getStudentReportCard(studentId, termId));
      setError(null);
    } catch (err) {
      setReportCard(null);
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch report card'));
    } finally {
      setLoading(false);
    }
  }, [studentId, termId]);

  useEffect(() => { fetchReportCard(); }, [fetchReportCard]);
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

  const fetchSummary = useCallback(async () => {
    if (!termId || !cohortId) {
      setSummary(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setSummary(await adminReportsAPI.getCohortSummary(cohortId, termId));
      setError(null);
    } catch (err) {
      setSummary(null);
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch class summary'));
    } finally {
      setLoading(false);
    }
  }, [cohortId, termId]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  return { summary, loading, error, refetch: fetchSummary };
};

// ── useSubjectAnalysis ────────────────────────────────────────────────────

export const useSubjectAnalysis = (
  termId: number | null,
  subjectId: number | null,
) => {
  const [analysis, setAnalysis] = useState<SubjectAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (!termId || !subjectId) {
      setAnalysis(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setAnalysis(await adminReportsAPI.getSubjectOverview(subjectId, termId));
      setError(null);
    } catch (err) {
      setAnalysis(null);
      setError(extractErrorMessage(err as ApiError, 'Failed to fetch subject analysis'));
    } finally {
      setLoading(false);
    }
  }, [subjectId, termId]);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);
  return { analysis, loading, error, refetch: fetchAnalysis };
};

// ── Instructor reporting ──────────────────────────────────────────────────

export const useInstructorOverview = () => {
  const [overview, setOverview] = useState<InstructorOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setOverview(await instructorReportsAPI.getOverview());
      setError(null);
      setErrorStatus(null);
    } catch (err) {
      const apiError = err as ApiError;
      setOverview(null);
      setError(extractErrorMessage(apiError, 'Failed to fetch instructor overview'));
      setErrorStatus(statusCode(apiError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  return { overview, loading, error, errorStatus, refetch: fetchOverview };
};

export const useInstructorCohortSubjects = () => {
  const [cohortSubjects, setCohortSubjects] = useState<InstructorCohortSubjectOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const fetchCohortSubjects = useCallback(async () => {
    try {
      setLoading(true);
      setCohortSubjects(await instructorReportsAPI.getCohortSubjects());
      setError(null);
      setErrorStatus(null);
    } catch (err) {
      const apiError = err as ApiError;
      setCohortSubjects([]);
      setError(extractErrorMessage(apiError, 'Failed to fetch cohort subject reports'));
      setErrorStatus(statusCode(apiError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCohortSubjects(); }, [fetchCohortSubjects]);
  return { cohortSubjects, loading, error, errorStatus, refetch: fetchCohortSubjects };
};

export const useInstructorCohortSubjectLearners = (
  cohortSubjectId: number | null,
  termId?: number | null,
  options?: { enabled?: boolean },
) => {
  const enabled = options?.enabled ?? true;
  const [report, setReport] = useState<InstructorCohortSubjectLearnersReport | null>(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const fetchReport = useCallback(async () => {
    if (!cohortSubjectId) {
      setReport(null);
      setLoading(false);
      setError(null);
      setErrorStatus(null);
      return;
    }
    if (!enabled) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setReport(await instructorReportsAPI.getCohortSubjectLearners(cohortSubjectId, termId));
      setError(null);
      setErrorStatus(null);
    } catch (err) {
      const apiError = err as ApiError;
      setReport(null);
      setError(extractErrorMessage(apiError, 'Failed to fetch learner report'));
      setErrorStatus(statusCode(apiError));
    } finally {
      setLoading(false);
    }
  }, [cohortSubjectId, enabled, termId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);
  return { report, loading, error, errorStatus, refetch: fetchReport };
};

export const useInstructorCohortSubjectPerformance = (
  cohortSubjectId: number | null,
  termId?: number | null,
  options?: { enabled?: boolean },
) => {
  const enabled = options?.enabled ?? true;
  const [report, setReport] = useState<InstructorCohortSubjectPerformanceReport | null>(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const fetchReport = useCallback(async () => {
    if (!cohortSubjectId) {
      setReport(null);
      setLoading(false);
      setError(null);
      setErrorStatus(null);
      return;
    }
    if (!enabled) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setReport(await instructorReportsAPI.getCohortSubjectPerformance(cohortSubjectId, termId));
      setError(null);
      setErrorStatus(null);
    } catch (err) {
      const apiError = err as ApiError;
      setReport(null);
      setError(extractErrorMessage(apiError, 'Failed to fetch performance report'));
      setErrorStatus(statusCode(apiError));
    } finally {
      setLoading(false);
    }
  }, [cohortSubjectId, enabled, termId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);
  return { report, loading, error, errorStatus, refetch: fetchReport };
};

export const useInstructorCohortSubjectTeachingActivity = (
  cohortSubjectId: number | null,
  termId?: number | null,
  options?: { enabled?: boolean },
) => {
  const enabled = options?.enabled ?? true;
  const [report, setReport] = useState<InstructorCohortSubjectTeachingActivityReport | null>(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);

  const fetchReport = useCallback(async () => {
    if (!cohortSubjectId) {
      setReport(null);
      setLoading(false);
      setError(null);
      setErrorStatus(null);
      return;
    }
    if (!enabled) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setReport(await instructorReportsAPI.getCohortSubjectTeachingActivity(cohortSubjectId, termId));
      setError(null);
      setErrorStatus(null);
    } catch (err) {
      const apiError = err as ApiError;
      setReport(null);
      setError(extractErrorMessage(apiError, 'Failed to fetch teaching activity report'));
      setErrorStatus(statusCode(apiError));
    } finally {
      setLoading(false);
    }
  }, [cohortSubjectId, enabled, termId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);
  return { report, loading, error, errorStatus, refetch: fetchReport };
};

// ── useLongitudinalStudent ────────────────────────────────────────────────

export const useLongitudinalStudent = (studentId: number | null) => {
  const [data, setData] = useState<LongitudinalStudentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
  }, [studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, loading, error, refetch: fetchData };
};

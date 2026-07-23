import { GradePolicy, ComputedGradeDTO } from '../types/gradePolicy';
import { apiClient, refreshAccessToken } from './client';
import { getAccessToken } from '@/app/core/auth/tokenStore';
import {
  getDownloadFileName,
  normalizeBlobError,
} from './downloads';
import {
  AttendanceSummary,
  AttendanceRiskLevel,
  ClassSubjectReportPayload,
  CohortSubjectReportTermsResponse,
  GradeSummary,
  CohortSummary,
  SubjectSummary,
  AssessmentTypeSummary,
  DashboardOverview,
  StudentReportCard,
  ClassSummary,
  SubjectAnalysis,
  AttendanceScopeReportPayload,
  LongitudinalStudentData,
  InstructorOverview,
  InstructorCohortSubjectOverview,
  InstructorCohortSubjectLearnersReport,
  InstructorCohortSubjectPerformanceReport,
  InstructorCohortSubjectTeachingActivityReport,
  InstructorAttendanceRiskItem,
  InstructorAttendanceRiskResponse,
  LearnerOverviewReportPayload,
  LearnerTermProgressReportPayload,
  LearnerAssignmentReportPayload,
  LearnerAssignmentReportQueryParams,
  LearnerAssessmentReportPayload,
  LearnerAssessmentReportQueryParams,
  LearnerAvailableReportScopesPayload,
  LearnerSubjectReportPayload,
  TeacherPerformanceReflectionItem,
  TeacherPerformanceReportPayload,
  ComputeResponse,
  ReportComputeJob,
  ReportComputeMode,
  ReportComputeProgressEvent,
  ReportComputeReadiness,
  ReportExportFormat,
  ReportFilters,
  CbcTeacherReview,
} from '@/app/core/types/reporting';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

function absoluteApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalizedPath = path.startsWith('/api/')
    ? path.slice(4)
    : path.startsWith('/')
      ? path
      : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

export class ReportComputeStreamFallbackError extends Error {
  constructor(message = 'Report compute progress stream switched to polling.') {
    super(message);
    this.name = 'ReportComputeStreamFallbackError';
  }
}

function parseSseBlock(block: string): ReportComputeProgressEvent | null {
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  if (lines.every((line) => line.startsWith(':'))) return null;

  const rawId = lines.find((line) => line.startsWith('id:'))?.slice(3).trim();
  const sequence = rawId && /^\d+$/.test(rawId) ? Number(rawId) : undefined;
  const rawEvent = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
  const event = rawEvent === 'progress' || rawEvent === 'complete' || rawEvent === 'error'
    ? rawEvent
    : undefined;
  const data = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .join('\n');

  if (!data) {
    return event ? { event, sequence, stage: event } : null;
  }

  try {
    const parsed = JSON.parse(data);
    return isRecord(parsed)
      ? { event, sequence, ...parsed } as ReportComputeProgressEvent
      : { event, sequence, stage: event ?? 'message', label: String(parsed) };
  } catch {
    return { event, sequence, stage: 'parse_error', label: data };
  }
}

function isTerminalProgressEvent(event: ReportComputeProgressEvent): boolean {
  return event.event === 'complete'
    || event.event === 'error'
    || event.status === 'COMPLETED'
    || event.status === 'FAILED'
    || event.status === 'BLOCKED';
}

function appendAfterCursor(url: string, after: number | null): string {
  if (!after || after < 1) return absoluteApiUrl(url);
  const absolute = absoluteApiUrl(url);
  const parsed = new URL(absolute);
  parsed.searchParams.set('after', String(after));
  return parsed.toString();
}

function streamDelay(attempt: number): number {
  const base = Math.min(30000, 1000 * (2 ** attempt));
  const jitter = Math.floor(Math.random() * 350);
  return base + jitter;
}

function toAttendanceRiskLevel(value: unknown): AttendanceRiskLevel {
  return value === 'WATCH' || value === 'RISK' || value === 'CRITICAL'
    ? value
    : 'WATCH';
}

function normalizeInstructorLearnersReport(
  report: InstructorCohortSubjectLearnersReport,
): InstructorCohortSubjectLearnersReport {
  return {
    ...report,
    learners: Array.isArray(report.learners) ? report.learners : [],
  };
}

function normalizeInstructorPerformanceReport(
  report: InstructorCohortSubjectPerformanceReport,
): InstructorCohortSubjectPerformanceReport {
  return {
    ...report,
    grade_distribution: Array.isArray(report.grade_distribution) ? report.grade_distribution : [],
    grade_status_counts: Array.isArray(report.grade_status_counts) ? report.grade_status_counts : [],
    assessment_type_breakdown: Array.isArray(report.assessment_type_breakdown)
      ? report.assessment_type_breakdown
      : [],
  };
}

function normalizeInstructorAttendanceRiskItem(value: unknown): InstructorAttendanceRiskItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const studentId = toNumber(value.student_id, Number.NaN);
  const cohortSubjectId = toNumber(value.cohort_subject_id, Number.NaN);

  if (!Number.isFinite(studentId) || !Number.isFinite(cohortSubjectId)) {
    return null;
  }

  return {
    student_id: studentId,
    student_name: toString(value.student_name),
    admission_number: toString(value.admission_number),
    cohort_subject_id: cohortSubjectId,
    cohort_id: toNumber(value.cohort_id),
    cohort_name: toString(value.cohort_name),
    subject_id: toNumber(value.subject_id),
    subject_name: toString(value.subject_name),
    term_id: toNullableNumber(value.term_id),
    total_sessions: toNumber(value.total_sessions),
    present_count: toNumber(value.present_count),
    absent_count: toNumber(value.absent_count),
    late_count: toNumber(value.late_count),
    excused_count: toNumber(value.excused_count),
    sick_count: toNumber(value.sick_count),
    unmarked_count: toNumber(value.unmarked_count),
    attendance_percentage: toNumber(value.attendance_percentage),
    threshold: toNumber(value.threshold),
    risk_level: toAttendanceRiskLevel(value.risk_level),
    reasons: toStringArray(value.reasons),
  };
}

function normalizeInstructorAttendanceRiskResponse(value: unknown): InstructorAttendanceRiskResponse {
  if (!isRecord(value)) {
    return {
      scope: 'instructor',
      threshold: 0,
      count: 0,
      unique_learner_count: 0,
      items: [],
    };
  }

  const rawItems = Array.isArray(value.items)
    ? value.items
    : Array.isArray(value.results)
      ? value.results
      : [];
  const items = rawItems
    .map((item) => normalizeInstructorAttendanceRiskItem(item))
    .filter((item): item is InstructorAttendanceRiskItem => item !== null);
  const uniqueLearnerCount = new Set(items.map((item) => item.student_id)).size;
  const rawCount = 'count' in value ? value.count : value.total;
  const rawUniqueLearnerCount = 'unique_learner_count' in value
    ? value.unique_learner_count
    : value.uniqueLearnerCount;

  return {
    scope: toString(value.scope, 'instructor'),
    threshold: toNumber(value.threshold),
    count: toNumber(rawCount, items.length),
    unique_learner_count: toNumber(rawUniqueLearnerCount, uniqueLearnerCount),
    items,
  };
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function normalizeTeacherPerformanceReflectionItem(
  value: unknown,
): TeacherPerformanceReflectionItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const reflectionText = (
    toNullableString(value.reflection_text)
    ?? toNullableString(value.reflectionText)
    ?? toNullableString(value.full_text)
    ?? toNullableString(value.text)
    ?? ''
  ).trim();
  const excerpt = toString(value.excerpt, reflectionText).trim();

  return {
    id: toNullableNumber(value.id),
    session_id: toNullableNumber(value.session_id),
    cohort_subject_id: toNullableNumber(value.cohort_subject_id),
    subject_id: toNullableNumber(value.subject_id),
    cohort_name: toString(value.cohort_name),
    subject_name: toString(value.subject_name),
    session_title: toString(value.session_title),
    session_date: toNullableString(value.session_date),
    created_at: toString(value.created_at),
    excerpt,
    reflection_text: reflectionText || null,
  };
}

function normalizeTeacherPerformanceReportPayload(
  value: TeacherPerformanceReportPayload,
): TeacherPerformanceReportPayload {
  if (!isRecord(value) || !isRecord(value.reflection_summary)) {
    return value;
  }

  const rawLatestReflections = Array.isArray(value.reflection_summary.latest_reflections)
    ? value.reflection_summary.latest_reflections
    : [];

  return {
    ...value,
    reflection_summary: {
      ...value.reflection_summary,
      latest_reflections: rawLatestReflections
        .map((item) => normalizeTeacherPerformanceReflectionItem(item))
        .filter((item): item is TeacherPerformanceReflectionItem => item !== null),
    },
  };
}

interface ReportDownloadResponse {
  blob: Blob;
  fileName: string;
}

async function fetchReportDownload(
  url: string,
  params: Record<string, string | number | undefined>,
  fallbackFileName: string,
): Promise<ReportDownloadResponse> {
  try {
    const response = await apiClient.get<Blob>(url, {
      params,
      responseType: 'blob',
    });
    return {
      blob: response.data,
      fileName: getDownloadFileName(
        response.headers['content-disposition'],
        fallbackFileName,
      ),
    };
  } catch (error) {
    return normalizeBlobError(error);
  }
}

// ============================================================================
// Attendance Summary API
// ============================================================================
export const attendanceSummaryAPI = {
  getAll: async (params?: ReportFilters) => {
    const response = await apiClient.get<AttendanceSummary[]>(
      '/reporting/attendance-summaries/',
      { params }
    );
    return response.data;
  },

  getByStudent: async (studentId: number) => {
    const response = await apiClient.get<AttendanceSummary[]>(
      '/reporting/attendance-summaries/by_student/',
      { params: { student_id: studentId } }
    );
    return response.data;
  },

  getByTerm: async (termId: number) => {
    const response = await apiClient.get<AttendanceSummary[]>(
      '/reporting/attendance-summaries/by_term/',
      { params: { term_id: termId } }
    );
    return response.data;
  },

  getByCohort: async (cohortId: number, termId: number) => {
    const response = await apiClient.get<AttendanceSummary[]>(
      '/reporting/attendance-summaries/by_cohort/',
      { params: { cohort_id: cohortId, term_id: termId } }
    );
    return response.data;
  },

  compute: async (termId: number) => {
    const response = await apiClient.post<ComputeResponse>(
      '/reporting/attendance-summaries/compute/',
      { term_id: termId }
    );
    return response.data;
  }
};

// ============================================================================
// Grade Summary API
// ============================================================================
export const gradeSummaryAPI = {
  getAll: async (params?: ReportFilters) => {
    const response = await apiClient.get<GradeSummary[]>(
      '/reporting/grade-summaries/',
      { params }
    );
    return response.data;
  },

  getByStudent: async (studentId: number) => {
    const response = await apiClient.get<GradeSummary[]>(
      '/reporting/grade-summaries/by_student/',
      { params: { student_id: studentId } }
    );
    return response.data;
  },

  getByTerm: async (termId: number) => {
    const response = await apiClient.get<GradeSummary[]>(
      '/reporting/grade-summaries/by_term/',
      { params: { term_id: termId } }
    );
    return response.data;
  },

  getByCohort: async (cohortId: number, termId: number) => {
    const response = await apiClient.get<GradeSummary[]>(
      '/reporting/grade-summaries/by_cohort/',
      { params: { cohort_id: cohortId, term_id: termId } }
    );
    return response.data;
  },

  getClassRanking: async (termId: number, cohortSubjectId: number) => {
    const response = await apiClient.get<GradeSummary[]>(
      '/reporting/grade-summaries/class_ranking/',
      { params: { term_id: termId, cohort_subject_id: cohortSubjectId } }
    );
    return response.data;
  },

  compute: async (termId: number) => {
    const response = await apiClient.post<ComputeResponse>(
      '/reporting/grade-summaries/compute/',
      { term_id: termId }
    );
    return response.data;
  }
};

// ============================================================================
// Cohort Summary API
// ============================================================================
export const cohortSummaryAPI = {
  getAll: async (params?: ReportFilters) => {
    const response = await apiClient.get<CohortSummary[]>(
      '/reporting/cohort-summaries/',
      { params }
    );
    return response.data;
  },

  compute: async (termId: number) => {
    const response = await apiClient.post<ComputeResponse>(
      '/reporting/cohort-summaries/compute/',
      { term_id: termId }
    );
    return response.data;
  }
};

// ============================================================================
// Subject Summary API
// ============================================================================
export const subjectSummaryAPI = {
  getAll: async (params?: ReportFilters) => {
    const response = await apiClient.get<SubjectSummary[]>(
      '/reporting/subject-summaries/',
      { params }
    );
    return response.data;
  },

  compute: async (termId: number) => {
    const response = await apiClient.post<ComputeResponse>(
      '/reporting/subject-summaries/compute/',
      { term_id: termId }
    );
    return response.data;
  }
};

// ============================================================================
// Assessment Type Summary API
// ============================================================================
export const assessmentTypeSummaryAPI = {
  getAll: async (params?: ReportFilters) => {
    const response = await apiClient.get<AssessmentTypeSummary[]>(
      '/reporting/assessment-type-summaries/',
      { params }
    );
    return response.data;
  },

  compute: async (termId: number) => {
    const response = await apiClient.post<ComputeResponse>(
      '/reporting/assessment-type-summaries/compute/',
      { term_id: termId }
    );
    return response.data;
  }
};

export const reportingAPI = {
  getInstructorAttendanceRisk: async (params?: {
    term?: number;
    threshold?: number;
    instructor_id?: number;
  }) => {
    const queryParams: Record<string, number> = {};

    if (params?.term !== undefined) queryParams.term = params.term;
    if (params?.threshold !== undefined) queryParams.threshold = params.threshold;
    if (params?.instructor_id !== undefined) queryParams.instructor_id = params.instructor_id;

    const response = await apiClient.get<unknown>(
      '/reports/instructor/attendance-risk/',
      {
        params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      }
    );

    return normalizeInstructorAttendanceRiskResponse(response.data);
  },
};

// ============================================================================
// Reports API (Comprehensive Reports)
// ============================================================================
export const adminReportsAPI = {
  getOverview: async (termId?: number | null) => {
    const response = await apiClient.get<DashboardOverview>(
      '/reports/admin/overview/',
      {
        params: termId ? { term_id: termId } : undefined,
      }
    );
    return response.data;
  },

  exportOverview: async (format: ReportExportFormat, termId?: number | null) => fetchReportDownload(
    '/reports/admin/overview/',
    {
      format,
      term_id: termId ?? undefined,
    },
    `admin-reporting-overview.${format}`,
  ),

  getCohortSummary: async (cohortId: number, termId?: number | null) => {
    const response = await apiClient.get<ClassSummary>(
      `/reports/admin/cohorts/${cohortId}/`,
      {
        params: termId ? { term_id: termId } : undefined,
      }
    );
    return response.data;
  },

  exportCohortSummary: async (
    cohortId: number,
    format: ReportExportFormat,
    termId?: number | null,
  ) => fetchReportDownload(
    `/reports/admin/cohorts/${cohortId}/`,
    {
      format,
      term_id: termId ?? undefined,
    },
    `cohort-report-${cohortId}.${format}`,
  ),

  getSubjectOverview: async (subjectId: number, termId?: number | null) => {
    const response = await apiClient.get<SubjectAnalysis>(
      `/reports/admin/subjects/${subjectId}/`,
      {
        params: termId ? { term_id: termId } : undefined,
      }
    );
    return response.data;
  },

  exportSubjectOverview: async (
    subjectId: number,
    format: ReportExportFormat,
    termId?: number | null,
  ) => fetchReportDownload(
    `/reports/admin/subjects/${subjectId}/`,
    {
      format,
      term_id: termId ?? undefined,
    },
    `subject-report-${subjectId}.${format}`,
  ),

  getStudentReportCard: async (studentId: number, termId?: number | null) => {
    const response = await apiClient.get<StudentReportCard>(
      `/reports/admin/students/${studentId}/report-card/`,
      {
        params: termId ? { term_id: termId } : undefined,
      }
    );
    return response.data;
  },

  exportStudentReportCard: async (
    studentId: number,
    format: ReportExportFormat,
    termId?: number | null,
  ) => fetchReportDownload(
    `/reports/admin/students/${studentId}/report-card/`,
    {
      format,
      term_id: termId ?? undefined,
    },
    `student-report-${studentId}.${format}`,
  ),

  getAttendanceScope: async (params?: {
    termId?: number | null;
    studentId?: number | null;
    cohortId?: number | null;
    subjectId?: number | null;
    cohortSubjectId?: number | null;
  }) => {
    const response = await apiClient.get<AttendanceScopeReportPayload>(
      '/reports/admin/attendance/',
      {
        params: {
          term_id: params?.termId ?? undefined,
          student_id: params?.studentId ?? undefined,
          cohort_id: params?.cohortId ?? undefined,
          subject_id: params?.subjectId ?? undefined,
          cohort_subject_id: params?.cohortSubjectId ?? undefined,
        },
      },
    );
    return response.data;
  },

  exportAttendanceScope: async (
    format: ReportExportFormat,
    params?: {
      termId?: number | null;
      studentId?: number | null;
      cohortId?: number | null;
      subjectId?: number | null;
      cohortSubjectId?: number | null;
    },
  ) => fetchReportDownload(
    '/reports/admin/attendance/',
    {
      format,
      term_id: params?.termId ?? undefined,
      student_id: params?.studentId ?? undefined,
      cohort_id: params?.cohortId ?? undefined,
      subject_id: params?.subjectId ?? undefined,
      cohort_subject_id: params?.cohortSubjectId ?? undefined,
    },
    `attendance-report.${format}`,
  ),
};

export const instructorReportsAPI = {
  getOverview: async () => {
    const response = await apiClient.get<InstructorOverview>(
      '/reports/instructor/overview/'
    );
    return response.data;
  },

  getCohortSubjects: async () => {
    const response = await apiClient.get<InstructorCohortSubjectOverview[]>(
      '/reports/instructor/cohort-subjects/'
    );
    return response.data;
  },

  getCohortSubjectLearners: async (
    cohortSubjectId: number,
    termId?: number | null,
  ) => {
    const response = await apiClient.get<InstructorCohortSubjectLearnersReport>(
      `/reports/instructor/cohort-subjects/${cohortSubjectId}/learners/`,
      {
        params: termId ? { term_id: termId } : undefined,
      }
    );
    return normalizeInstructorLearnersReport(response.data);
  },

  getCohortSubjectPerformance: async (
    cohortSubjectId: number,
    termId?: number | null,
  ) => {
    const response = await apiClient.get<InstructorCohortSubjectPerformanceReport>(
      `/reports/instructor/cohort-subjects/${cohortSubjectId}/performance/`,
      {
        params: termId ? { term_id: termId } : undefined,
      }
    );
    return normalizeInstructorPerformanceReport(response.data);
  },

  getCohortSubjectTeachingActivity: async (
    cohortSubjectId: number,
    termId?: number | null,
  ) => {
    const response = await apiClient.get<InstructorCohortSubjectTeachingActivityReport>(
      `/reports/instructor/cohort-subjects/${cohortSubjectId}/teaching-activity/`,
      {
        params: termId ? { term_id: termId } : undefined,
      }
    );
    return response.data;
  },
};

export const learnerReportingAPI = {
  getLearnerAvailableScopes: async (learnerId: number) => {
    const response = await apiClient.get<LearnerAvailableReportScopesPayload>(
      `/reporting/learners/${learnerId}/available-scopes/`,
    );
    return response.data;
  },

  getLearnerSubjectReport: async (
    learnerId: number,
    params: {
      cohortSubjectId?: number | null;
      subjectId?: number | null;
      cohortId?: number | null;
    },
  ) => {
    const response = await apiClient.get<LearnerSubjectReportPayload>(
      `/reporting/learners/${learnerId}/subject-report/`,
      {
        params: {
          cohort_subject_id: params.cohortSubjectId ?? undefined,
          subject_id: params.subjectId ?? undefined,
          cohort_id: params.cohortId ?? undefined,
        },
      }
    );
    return response.data;
  },

  getLearnerAssessmentReport: async (
    learnerId: number,
    params: LearnerAssessmentReportQueryParams,
  ) => {
    const response = await apiClient.get<LearnerAssessmentReportPayload>(
      `/reporting/learners/${learnerId}/assessment-report/`,
      {
        params: {
          assessment_id: params.assessmentId ?? undefined,
          cohort_subject_id: params.cohortSubjectId ?? undefined,
          assessment_type: params.assessmentType ?? undefined,
          term_id: params.termId ?? undefined,
          subject_id: params.subjectId ?? undefined,
          cohort_id: params.cohortId ?? undefined,
          academic_year_id: params.academicYearId ?? undefined,
        },
      }
    );
    return response.data;
  },

  getLearnerAssignmentReport: async (
    learnerId: number,
    params: LearnerAssignmentReportQueryParams,
  ) => {
    const response = await apiClient.get<LearnerAssignmentReportPayload>(
      `/reporting/learners/${learnerId}/assignment-report/`,
      {
        params: {
          cohort_subject_id: params.cohortSubjectId ?? undefined,
        },
      }
    );
    return response.data;
  },

  exportLearnerSubjectReport: async (
    learnerId: number,
    params: {
      format: ReportExportFormat;
      cohortSubjectId?: number | null;
      subjectId?: number | null;
      cohortId?: number | null;
    },
  ) => fetchReportDownload(
    `/reporting/learners/${learnerId}/subject-report/export/`,
    {
      format: params.format,
      cohort_subject_id: params.cohortSubjectId ?? undefined,
      subject_id: params.subjectId ?? undefined,
      cohort_id: params.cohortId ?? undefined,
    },
    `learner-subject-report-${learnerId}.${params.format}`,
  ),

  getLearnerOverviewReport: async (learnerId: number) => {
    const response = await apiClient.get<LearnerOverviewReportPayload>(
      `/reporting/learners/${learnerId}/overview-report/`
    );
    return response.data;
  },

  exportLearnerOverviewReport: async (
    learnerId: number,
    format: ReportExportFormat,
  ) => fetchReportDownload(
    `/reporting/learners/${learnerId}/overview-report/export/`,
    { format },
    `learner-overview-report-${learnerId}.${format}`,
  ),

  getLearnerTermProgressReport: async (
    learnerId: number,
    termId: number,
  ) => {
    const response = await apiClient.get<LearnerTermProgressReportPayload>(
      `/reporting/learners/${learnerId}/term-progress-report/`,
      {
        params: { term_id: termId },
      },
    );
    return response.data;
  },

  exportLearnerTermProgressReport: async (
    learnerId: number,
    params: {
      termId: number;
      format: 'pdf';
    },
  ) => fetchReportDownload(
    `/reporting/learners/${learnerId}/term-progress-report/export/`,
    {
      term_id: params.termId,
      format: params.format,
    },
    `learner-term-progress-report-${learnerId}.${params.format}`,
  ),

  getClassSubjectReport: async (
    cohortId: number,
    params: {
      cohortSubjectId?: number | null;
      subjectId?: number | null;
      termId?: number | null;
    },
  ) => {
    const response = await apiClient.get<ClassSubjectReportPayload>(
      `/reporting/classes/${cohortId}/subject-report/`,
      {
        params: {
          cohort_subject_id: params.cohortSubjectId ?? undefined,
          subject_id: params.subjectId ?? undefined,
          term_id: params.termId ?? undefined,
        },
      }
    );
    return response.data;
  },

  getCohortSubjectReportTerms: async (
    cohortSubjectId: number,
  ): Promise<CohortSubjectReportTermsResponse> => {
    const response = await apiClient.get<CohortSubjectReportTermsResponse>(
      `/reporting/cohort-subjects/${cohortSubjectId}/terms/`,
    );
    return response.data;
  },

  exportClassSubjectReport: async (
    cohortId: number,
    params: {
      format: ReportExportFormat;
      cohortSubjectId?: number | null;
      subjectId?: number | null;
      termId?: number | null;
    },
  ) => fetchReportDownload(
    `/reporting/classes/${cohortId}/subject-report/export/`,
    {
      format: params.format,
      cohort_subject_id: params.cohortSubjectId ?? undefined,
      subject_id: params.subjectId ?? undefined,
      term_id: params.termId ?? undefined,
    },
    `class-subject-report-${cohortId}.${params.format}`,
  ),

  getInstructorTeacherReport: async (
    params?: {
      termId?: number | null;
      cohortSubjectId?: number | null;
      startDate?: string | null;
      endDate?: string | null;
    },
  ) => {
    const response = await apiClient.get<TeacherPerformanceReportPayload>(
      '/reporting/instructor/me/teacher-report/',
      {
        params: {
          term_id: params?.termId ?? undefined,
          cohort_subject_id: params?.cohortSubjectId ?? undefined,
          start_date: params?.startDate ?? undefined,
          end_date: params?.endDate ?? undefined,
        },
      }
    );
    return normalizeTeacherPerformanceReportPayload(response.data);
  },

  exportInstructorTeacherReport: async (
    format: ReportExportFormat,
    params?: {
      termId?: number | null;
      cohortSubjectId?: number | null;
      startDate?: string | null;
      endDate?: string | null;
    },
  ) => fetchReportDownload(
    '/reporting/instructor/me/teacher-report/',
    {
      format,
      term_id: params?.termId ?? undefined,
      cohort_subject_id: params?.cohortSubjectId ?? undefined,
      start_date: params?.startDate ?? undefined,
      end_date: params?.endDate ?? undefined,
    },
    `teacher-performance-report.${format}`,
  ),

  getAdminInstructorTeacherReport: async (
    instructorId: number,
    params?: {
      termId?: number | null;
      cohortSubjectId?: number | null;
      startDate?: string | null;
      endDate?: string | null;
    },
  ) => {
    const response = await apiClient.get<TeacherPerformanceReportPayload>(
      `/reporting/admin/instructors/${instructorId}/teacher-report/`,
      {
        params: {
          term_id: params?.termId ?? undefined,
          cohort_subject_id: params?.cohortSubjectId ?? undefined,
          start_date: params?.startDate ?? undefined,
          end_date: params?.endDate ?? undefined,
        },
      }
    );
    return normalizeTeacherPerformanceReportPayload(response.data);
  },

  exportAdminInstructorTeacherReport: async (
    instructorId: number,
    format: ReportExportFormat,
    params?: {
      termId?: number | null;
      cohortSubjectId?: number | null;
      startDate?: string | null;
      endDate?: string | null;
    },
  ) => fetchReportDownload(
    `/reporting/admin/instructors/${instructorId}/teacher-report/`,
    {
      format,
      term_id: params?.termId ?? undefined,
      cohort_subject_id: params?.cohortSubjectId ?? undefined,
      start_date: params?.startDate ?? undefined,
      end_date: params?.endDate ?? undefined,
    },
    `teacher-performance-report-${instructorId}.${format}`,
  ),
};

export const cbcReportingAPI = {
  updateSubjectReportReview: async (
    termSubjectResultId: number,
    payload: {
      teacher_remark?: string;
      recommended_next_steps?: string[];
      contextual_note?: string;
      approve?: boolean;
    },
  ) => {
    const response = await apiClient.patch<CbcTeacherReview>(
      `/cbc/term-subject-results/${termSubjectResultId}/review/`,
      payload,
    );
    return response.data;
  },

  approveSubjectReportReview: async (termSubjectResultId: number) => {
    const response = await apiClient.post<CbcTeacherReview>(
      `/cbc/term-subject-results/${termSubjectResultId}/approve/`,
    );
    return response.data;
  },
};

export const reportsAPI = {
  getComputeReadiness: async (termId: number): Promise<ReportComputeReadiness> => {
    const response = await apiClient.get<ReportComputeReadiness>(
      '/reporting/reports/compute/readiness/',
      { params: { term: termId } },
    );
    return response.data;
  },

  prepareTermForReports: async (termId: number): Promise<ReportComputeReadiness> => {
    const response = await apiClient.post<ReportComputeReadiness>(
      '/reporting/reports/prepare/',
      { term: termId },
    );
    return response.data;
  },

  applyRecommendedFix: async (
    termId: number,
    recommendationId: string,
  ): Promise<ReportComputeReadiness> => {
    const response = await apiClient.post<ReportComputeReadiness>(
      '/reporting/reports/prepare/apply-recommended/',
      { term: termId, recommendation_id: recommendationId },
    );
    return response.data;
  },

  computeReports: async (termId: number, mode: ReportComputeMode = 'FINAL_RECONCILIATION'): Promise<ReportComputeJob> => {
    if (mode === 'FINAL_RECONCILIATION') {
      const response = await apiClient.post<ReportComputeJob>(
        '/reporting/reports/compute/final-reconciliation/',
        { term: termId },
      );
      return response.data;
    }

    const response = await apiClient.post<ReportComputeJob>(
      '/reporting/reports/compute/',
      { term: termId, mode },
    );
    return response.data;
  },

  getComputeJob: async (jobId: string): Promise<ReportComputeJob> => {
    const response = await apiClient.get<ReportComputeJob>(
      `/reporting/reports/compute/jobs/${jobId}/`,
    );
    return response.data;
  },

  streamComputeJobEvents: async (
    eventsUrl: string,
    onEvent: (event: ReportComputeProgressEvent) => void,
    signal?: AbortSignal,
    options: {
      initialSequence?: number | null;
      maxRetries?: number;
      onTransportState?: (state: 'connecting' | 'live' | 'disconnected' | 'restored') => void;
    } = {},
  ): Promise<void> => {
    let lastSequence = options.initialSequence ?? null;
    let retryCount = 0;
    let refreshedAfterUnauthorized = false;
    let hadLiveConnection = false;
    const maxRetries = options.maxRetries ?? 5;

    while (!signal?.aborted) {
      options.onTransportState?.(hadLiveConnection ? 'disconnected' : 'connecting');
      try {
        const token = getAccessToken();
        const headers: Record<string, string> = { Accept: 'text/event-stream' };
        if (token) headers.Authorization = `Bearer ${token}`;
        if (lastSequence && lastSequence > 0) headers['Last-Event-ID'] = String(lastSequence);

        const response = await fetch(appendAfterCursor(eventsUrl, lastSequence), {
          method: 'GET',
          headers,
          credentials: 'include',
          signal,
        });

        if (response.status === 401 && !refreshedAfterUnauthorized) {
          refreshedAfterUnauthorized = true;
          await refreshAccessToken();
          continue;
        }

        if (!response.ok) {
          throw new Error(`Progress stream failed with HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.toLowerCase().includes('text/event-stream')) {
          throw new Error('Progress stream response was not text/event-stream');
        }

        if (!response.body) {
          throw new Error('Progress stream response body was empty');
        }

        options.onTransportState?.(hadLiveConnection ? 'restored' : 'live');
        hadLiveConnection = true;
        retryCount = 0;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!signal?.aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() ?? '';

          for (const block of blocks) {
            const event = parseSseBlock(block);
            if (!event) continue;
            if (typeof event.sequence === 'number') {
              lastSequence = Math.max(lastSequence ?? 0, event.sequence);
            }
            onEvent(event);
            if (isTerminalProgressEvent(event)) return;
          }
        }

        if (buffer.trim()) {
          const event = parseSseBlock(buffer);
          if (event) {
            if (typeof event.sequence === 'number') {
              lastSequence = Math.max(lastSequence ?? 0, event.sequence);
            }
            onEvent(event);
            if (isTerminalProgressEvent(event)) return;
          }
        }
      } catch (error) {
        if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        retryCount += 1;
        if (retryCount > maxRetries) {
          throw new ReportComputeStreamFallbackError();
        }
        await new Promise((resolve) => {
          window.setTimeout(resolve, streamDelay(retryCount - 1));
        });
      }
    }
  },

  getAdminOverview: adminReportsAPI.getOverview,
  getAdminCohortSummary: adminReportsAPI.getCohortSummary,
  getAdminSubjectOverview: adminReportsAPI.getSubjectOverview,
  getAdminStudentReportCard: adminReportsAPI.getStudentReportCard,
  getInstructorOverview: instructorReportsAPI.getOverview,
  getInstructorCohortSubjects: instructorReportsAPI.getCohortSubjects,
  getInstructorCohortSubjectLearners: instructorReportsAPI.getCohortSubjectLearners,
  getInstructorCohortSubjectPerformance: instructorReportsAPI.getCohortSubjectPerformance,
  getInstructorCohortSubjectTeachingActivity: instructorReportsAPI.getCohortSubjectTeachingActivity,
  getLearnerSubjectReport: learnerReportingAPI.getLearnerSubjectReport,
  getLearnerAssessmentReport: learnerReportingAPI.getLearnerAssessmentReport,
  getLearnerAssignmentReport: learnerReportingAPI.getLearnerAssignmentReport,
  getLearnerAvailableScopes: learnerReportingAPI.getLearnerAvailableScopes,
  exportLearnerSubjectReport: learnerReportingAPI.exportLearnerSubjectReport,
  getLearnerOverviewReport: learnerReportingAPI.getLearnerOverviewReport,
  exportLearnerOverviewReport: learnerReportingAPI.exportLearnerOverviewReport,
  getLearnerTermProgressReport: learnerReportingAPI.getLearnerTermProgressReport,
  exportLearnerTermProgressReport: learnerReportingAPI.exportLearnerTermProgressReport,
  getCohortSubjectReportTerms: learnerReportingAPI.getCohortSubjectReportTerms,
  getClassSubjectReport: learnerReportingAPI.getClassSubjectReport,
  exportClassSubjectReport: learnerReportingAPI.exportClassSubjectReport,
  getInstructorTeacherReport: learnerReportingAPI.getInstructorTeacherReport,
  exportInstructorTeacherReport: learnerReportingAPI.exportInstructorTeacherReport,
  getAdminInstructorTeacherReport: learnerReportingAPI.getAdminInstructorTeacherReport,
  exportAdminInstructorTeacherReport: learnerReportingAPI.exportAdminInstructorTeacherReport,
  getDashboardOverview: async () => {
    return adminReportsAPI.getOverview();
  },

  getStudentReportCard: async (studentId: number, termId: number) => {
    return adminReportsAPI.getStudentReportCard(studentId, termId);
  },

  getClassSummary: async (termId: number, cohortId: number) => {
    return adminReportsAPI.getCohortSummary(cohortId, termId);
  },

  getSubjectAnalysis: async (termId: number, subjectId?: number): Promise<SubjectAnalysis> => {
    if (!subjectId) {
      throw new Error('Select a subject to view the subject report.');
    }
    return adminReportsAPI.getSubjectOverview(subjectId, termId);
  },

  getLongitudinalStudent: async (studentId: number) => {
    const response = await apiClient.get<LongitudinalStudentData>(
      '/reporting/reports/longitudinal_student/',
      { params: { student_id: studentId } }
    );
    return response.data;
  }
};


export const policyAPI = {
  // Grade Policies
  getGradePolicies: async (params?: ReportFilters) => {
    const { data } = await apiClient.get<GradePolicy[]>('/reporting/grade-policies/', {
      params
    });
    return data;
  },

  getGradePolicy: async (id: number) => {
    const { data } = await apiClient.get<GradePolicy>(`/reporting/grade-policies/${id}/`);
    return data;
  },

  createGradePolicy: async (payload: Partial<GradePolicy>) => {
    const { data } = await apiClient.post<GradePolicy>('/reporting/grade-policies/', payload);
    return data;
  },

  updateGradePolicy: async (id: number, payload: Partial<GradePolicy>) => {
    const { data } = await apiClient.patch<GradePolicy>(`/reporting/grade-policies/${id}/`, payload);
    return data;
  },

  deleteGradePolicy: async (id: number) => {
    await apiClient.delete(`/reporting/grade-policies/${id}/`);
  },

  duplicateGradePolicy: async (id: number) => {
    const { data } = await apiClient.post<GradePolicy>(`/reporting/grade-policies/${id}/duplicate/`);
    return data;
  },

  getPolicyForContext: async (filters: ReportFilters) => {
    const { data } = await apiClient.get<GradePolicy>(
      '/reporting/grade-policies/get_policy_for_context/',
      { params: filters }
    );
    return data;
  },

  // Computed Grades (auditable policy results)
  getComputedGrades: async (filters?: ReportFilters) => {
    const { data } = await apiClient.get<ComputedGradeDTO[]>('/reporting/computed-grades/', {
      params: filters
    });
    return data;
  },

  getComputedGrade: async (id: number) => {
    const { data } = await apiClient.get<ComputedGradeDTO>(`/reporting/computed-grades/${id}/`);
    return data;
  },

  computeGradesWithPolicy: async (payload: {
    term_id: number;
    cohort_id?: number;
    policy_id?: number;
  }) => {
    const { data } = await apiClient.post<ComputeResponse>(
      '/reporting/computed-grades/compute_with_policy/',
      payload
    );
    return data;
  },

  getComputedGradesByStudent: async (studentId: number) => {
    const { data } = await apiClient.get<ComputedGradeDTO[]>(
      '/reporting/computed-grades/by_student/',
      { params: { student_id: studentId } }
    );
    return data;
  }
};

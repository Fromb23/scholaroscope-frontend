import { GradePolicy, ComputedGradeDTO } from '../types/gradePolicy';
import { apiClient } from './client';
import {
  AttendanceSummary,
  AttendanceRiskLevel,
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
  InstructorAttendanceRiskItem,
  InstructorAttendanceRiskResponse,
  ComputeResponse,
  ReportFilters,
} from '@/app/core/types/reporting';

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

function toAttendanceRiskLevel(value: unknown): AttendanceRiskLevel {
  return value === 'WATCH' || value === 'RISK' || value === 'CRITICAL'
    ? value
    : 'WATCH';
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
  getOverview: async () => {
    const response = await apiClient.get<DashboardOverview>(
      '/reports/admin/overview/'
    );
    return response.data;
  },

  getCohortSummary: async (cohortId: number, termId?: number | null) => {
    const response = await apiClient.get<ClassSummary>(
      `/reports/admin/cohorts/${cohortId}/`,
      {
        params: termId ? { term_id: termId } : undefined,
      }
    );
    return response.data;
  },

  getSubjectOverview: async (subjectId: number, termId?: number | null) => {
    const response = await apiClient.get<SubjectAnalysis>(
      `/reports/admin/subjects/${subjectId}/`,
      {
        params: termId ? { term_id: termId } : undefined,
      }
    );
    return response.data;
  },

  getStudentReportCard: async (studentId: number, termId?: number | null) => {
    const response = await apiClient.get<StudentReportCard>(
      `/reports/admin/students/${studentId}/report-card/`,
      {
        params: termId ? { term_id: termId } : undefined,
      }
    );
    return response.data;
  },
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
    return response.data;
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
    return response.data;
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

export const reportsAPI = {
  getAdminOverview: adminReportsAPI.getOverview,
  getAdminCohortSummary: adminReportsAPI.getCohortSummary,
  getAdminSubjectOverview: adminReportsAPI.getSubjectOverview,
  getAdminStudentReportCard: adminReportsAPI.getStudentReportCard,
  getInstructorOverview: instructorReportsAPI.getOverview,
  getInstructorCohortSubjects: instructorReportsAPI.getCohortSubjects,
  getInstructorCohortSubjectLearners: instructorReportsAPI.getCohortSubjectLearners,
  getInstructorCohortSubjectPerformance: instructorReportsAPI.getCohortSubjectPerformance,
  getInstructorCohortSubjectTeachingActivity: instructorReportsAPI.getCohortSubjectTeachingActivity,
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

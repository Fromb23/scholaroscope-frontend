import { GradePolicy, ComputedGradeDTO } from '../types/gradePolicy';
import { apiClient } from './client';
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
  ComputeResponse,
  ReportFilters,
} from '@/app/core/types/reporting';

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

// ============================================================================
// Reports API (Comprehensive Reports)
// ============================================================================
export const reportsAPI = {
  getAdminOverview: async () => {
    const response = await apiClient.get<DashboardOverview>(
      '/reports/admin/overview/'
    );
    return response.data;
  },

  getAdminCohortSummary: async (cohortId: number, termId?: number | null) => {
    const response = await apiClient.get<ClassSummary>(
      `/reports/admin/cohorts/${cohortId}/`,
      {
        params: termId ? { term_id: termId } : undefined,
      }
    );
    return response.data;
  },

  getAdminSubjectOverview: async (subjectId: number, termId?: number | null) => {
    const response = await apiClient.get<SubjectAnalysis>(
      `/reports/admin/subjects/${subjectId}/`,
      {
        params: termId ? { term_id: termId } : undefined,
      }
    );
    return response.data;
  },

  getAdminStudentReportCard: async (studentId: number, termId?: number | null) => {
    const response = await apiClient.get<StudentReportCard>(
      `/reports/admin/students/${studentId}/report-card/`,
      {
        params: termId ? { term_id: termId } : undefined,
      }
    );
    return response.data;
  },

  getInstructorOverview: async () => {
    const response = await apiClient.get<InstructorOverview>(
      '/reports/instructor/overview/'
    );
    return response.data;
  },

  getInstructorCohortSubjects: async () => {
    const response = await apiClient.get<InstructorCohortSubjectOverview[]>(
      '/reports/instructor/cohort-subjects/'
    );
    return response.data;
  },

  getInstructorCohortSubjectLearners: async (
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

  getInstructorCohortSubjectPerformance: async (
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

  getInstructorCohortSubjectTeachingActivity: async (
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

  getDashboardOverview: async () => {
    return reportsAPI.getAdminOverview();
  },

  getStudentReportCard: async (studentId: number, termId: number) => {
    return reportsAPI.getAdminStudentReportCard(studentId, termId);
  },

  getClassSummary: async (termId: number, cohortId: number) => {
    return reportsAPI.getAdminCohortSummary(cohortId, termId);
  },

  getSubjectAnalysis: async (termId: number, subjectId?: number): Promise<SubjectAnalysis> => {
    if (!subjectId) {
      throw new Error('Select a subject to view the subject report.');
    }
    return reportsAPI.getAdminSubjectOverview(subjectId, termId);
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

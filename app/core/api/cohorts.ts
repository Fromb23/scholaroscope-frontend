// ============================================================================
// app/api/cohorts.ts - Cohorts API Calls
// ============================================================================

import { apiClient } from './client';

export interface Cohort {
  students_count: number;
  id: number;
  name: string;
  level: string;
  curriculum: number;
  curriculum_name: string;
  academic_year: number;
  academic_year_name: string;
  student_count: number;
  is_active: boolean;
  subjects_count: number;
  is_current_year: boolean;
  created_at: string;
  updated_at: string;
}

export interface CohortDetail extends Cohort {
  subjects: Array<{
    id: number;
    subject_id: number;
    subject_code: string;
    subject_name: string;
    is_compulsory: boolean;
    hours_per_week: number;
  }>;
  students: Array<{
    id: number;
    admission_number: string;
    full_name: string;
  }>;
}

export interface CohortFormData {
  name: string;
  level: string;
  curriculum: number;
  academic_year: number;
  is_active?: boolean;
}

export interface CohortStats {
  total: number;
  active: number;
  inactive: number;
  by_level: Record<string, number>;
  by_curriculum: Array<{
    curriculum_name: string;
    count: number;
  }>;
}

export const cohortsAPI = {
  // Get all cohorts with optional filters
  getCohorts: async (params?: {
    curriculum?: number;
    academic_year?: number;
    level?: string;
    is_active?: boolean;
    search?: string;
  }) => {
    const { data } = await apiClient.get<{
      count: number;
      results: Cohort[];
    }>('/cohorts/', { params });
    return data;
  },

  // Get cohort by ID (detailed)
  getCohort: async (id: number) => {
    const { data } = await apiClient.get<CohortDetail>(`/cohorts/${id}/`);
    return data;
  },

  // Get active cohorts only
  getActiveCohorts: async () => {
    const { data } = await apiClient.get<Cohort[]>('/cohorts/', {
      params: { is_active: true }
    });
    return Array.isArray(data) ? data : data ?? [];
  },

  // Get cohorts by curriculum
  getCohortsByCurriculum: async (curriculumId: number) => {
    const { data } = await apiClient.get<Cohort[]>('/cohorts/', {
      params: { curriculum: curriculumId }
    });
    return Array.isArray(data) ? data : data ?? [];
  },

  // Get cohorts by academic year
  getCohortsByAcademicYear: async (academicYearId: number) => {
    const { data } = await apiClient.get<Cohort[]>('/cohorts/', {
      params: { academic_year: academicYearId }
    });
    return Array.isArray(data) ? data : data ?? [];
  },

  // Get cohort statistics
  getStatistics: async () => {
    const { data } = await apiClient.get<CohortStats>('/cohorts/statistics/');
    return data;
  },

  // Create new cohort
  createCohort: async (cohortData: CohortFormData) => {
    const { data } = await apiClient.post<Cohort>('/cohorts/', cohortData);
    return data;
  },

  // Update cohort
  updateCohort: async (id: number, cohortData: Partial<CohortFormData>) => {
    const { data } = await apiClient.patch<Cohort>(`/cohorts/${id}/`, cohortData);
    return data;
  },

  // Delete cohort
  deleteCohort: async (id: number) => {
    await apiClient.delete(`/cohorts/${id}/`);
  },

  // Get cohort students
  getCohortStudents: async (id: number) => {
    const { data } = await apiClient.get(`/cohorts/${id}/students/`);
    return data;
  },

  // Get cohort subjects
  getCohortSubjects: async (id: number) => {
    const { data } = await apiClient.get(`/cohort-subjects/?cohort=${id}`);
    return data;
  },

  // Add subject to cohort
  addSubjectToCohort: async (id: number, subjectData: {
    subject_id: number;
    is_compulsory: boolean;
    hours_per_week?: number;
  }) => {
    const { data } = await apiClient.post(`/cohorts/${id}/add_subject/`, subjectData);
    return data;
  },

  // Remove subject from cohort
  removeSubjectFromCohort: async (id: number, subjectId: number) => {
    const { data } = await apiClient.post(`/cohorts/${id}/remove_subject/`, {
      subject_id: subjectId
    });
    return data;
  },
};
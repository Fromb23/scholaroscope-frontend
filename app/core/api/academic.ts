import { apiClient } from './client';
import {
  AcademicYear,
  Term,
  Curriculum,
  Subject,
  Cohort,
  CohortSubject,
  SubjectDetail,
  ListQueryParams,
  CohortDetail,
  TermQueryParams
} from '@/app/core/types/academic';
import { PaginatedResponse } from './sessions';

interface CurriculumQuery {
  organization?: number;
  is_active?: boolean;
}


// Academic Years
export const academicYearAPI = {
  getAll: async (params?: { organization?: number }) => {
    const response = await apiClient.get<AcademicYear[]>('/academic-years/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<AcademicYear>(`/academic-years/${id}/`);
    return response.data;
  },

  getCurrent: async (params?: { organization?: number }) => {
    const response = await apiClient.get<AcademicYear>('/academic-years/current/', { params });
    return response.data;
  },

  create: async (data: Partial<AcademicYear>) => {
    const response = await apiClient.post<AcademicYear>('/academic-years/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<AcademicYear>) => {
    const response = await apiClient.patch<AcademicYear>(`/academic-years/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/academic-years/${id}/`);
  },

  setCurrent: async (id: number) => {
    const response = await apiClient.post<AcademicYear>(`/academic-years/${id}/set_current/`);
    return response.data;
  }
};

// Terms
export const termAPI = {
  getAll: async (params?: TermQueryParams) => {
    const response = await apiClient.get<Term[]>('/terms/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<Term>(`/terms/${id}/`);
    return response.data;
  },

  getCurrent: async (params?: { organization?: number }) => {
    const response = await apiClient.get<Term>('/terms/current/', { params });
    return response.data;
  },

  create: async (data: Partial<Term>) => {
    const response = await apiClient.post<Term>('/terms/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Term>) => {
    const response = await apiClient.patch<Term>(`/terms/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/terms/${id}/`);
  }
};

// Curricula
export const curriculumAPI = {
  getAll: async (params?: ListQueryParams) => {
    const response = await apiClient.get<Curriculum[]>('/curricula/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<Curriculum>(`/curricula/${id}/`);
    return response.data;
  },

  getActive: async (params?: CurriculumQuery) => {
    const response = await apiClient.get<Curriculum[]>('/curricula/active/', { params });
    return response.data;
  },

  create: async (data: Partial<Curriculum>) => {
    const response = await apiClient.post<Curriculum>('/curricula/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Curriculum>) => {
    const response = await apiClient.patch<Curriculum>(`/curricula/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/curricula/${id}/`);
  }
};

// Subjects
export const subjectAPI = {
  getAll: async (params?: ListQueryParams) => {
    const response = await apiClient.get<Subject[]>('/subjects/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<SubjectDetail>(`/subjects/${id}/`);
    return response.data;
  },

  getByCurriculum: async (curriculumId: number) => {
    const response = await apiClient.get<Subject[]>('/subjects/by_curriculum/', {
      params: { curriculum_id: curriculumId }
    });
    return response.data;
  },

  create: async (data: Partial<Subject>) => {
    const response = await apiClient.post<Subject>('/subjects/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Subject>) => {
    const response = await apiClient.patch<Subject>(`/subjects/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/subjects/${id}/`);
  }
};

// Cohorts
export interface CohortQueryParams extends ListQueryParams {
  academic_year?: number;
  curriculum?: number;
  level?: string;
}
export const cohortAPI = {
  getAll: async (params?: CohortQueryParams) => {
    const response = await apiClient.get<Cohort[]>('/cohorts/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<CohortDetail>(`/cohorts/${id}/`);
    return response.data;
  },

  getCurrent: async (params?: { organization?: number }) => {
    const response = await apiClient.get<Cohort[]>('/cohorts/current/', { params });
    return response.data;
  },

  create: async (data: Partial<Cohort>) => {
    const response = await apiClient.post<Cohort>('/cohorts/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Cohort>) => {
    const response = await apiClient.patch<Cohort>(`/cohorts/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/cohorts/${id}/`);
  },

  assignSubject: async (cohortId: number, subjectId: number, isCompulsory: boolean = true) => {
    const response = await apiClient.post<CohortSubject>(
      `/cohorts/${cohortId}/assign_subject/`,
      { subject_id: subjectId, is_compulsory: isCompulsory }
    );
    return response.data;
  },

  removeSubject: async (cohortId: number, subjectId: number) => {
    await apiClient.delete(`/cohorts/${cohortId}/remove_subject/`, {
      params: { subject_id: subjectId }
    });
  },
  // Get students not enrolled in cohort
  getAvailableStudents: async (cohortId: number, search?: string) => {
    const params = search ? { search } : {};
    const { data } = await apiClient.get(
      `/cohorts/${cohortId}/available_students/`,
      { params }
    );
    return data;
  },
  // Get students enrolled in cohort
  getEnrolledStudents: async (cohortId: number) => {
    const { data } = await apiClient.get(`/cohorts/${cohortId}/enrolled_students/`);
    return data;
  },
  // Bulk enroll students
  bulkEnrollStudents: async (
    cohortId: number,
    studentIds: number[],
    enrollmentType: string = 'ELECTIVE',
    notes?: string
  ) => {
    const { data } = await apiClient.post(`/cohorts/${cohortId}/bulk_enroll_students/`, {
      student_ids: studentIds,
      enrollment_type: enrollmentType,
      notes: notes || 'Bulk enrollment'
    });
    return data;
  },
  bulkUnenrollStudents: async (cohortId: number, studentIds: number[], notes?: string) => {
    const { data } = await apiClient.post(`/cohorts/${cohortId}/bulk_unenroll_students/`, {
      student_ids: studentIds,
      notes: notes || 'Bulk unenrollment'
    });
    return data;
  },
  rollover: async (
    cohortId: number,
    data: {
      new_level: string;
      new_stream?: string;
      copy_subjects?: boolean;
    }
  ): Promise<Cohort> => {
    const response = await apiClient.post<Cohort>(
      `/cohorts/${cohortId}/rollover/`,
      data
    );
    return response.data;
  },
};

export const cohortSubjectAPI = {
  getAll: async (params?: {
    cohort?: number | string;
    subject?: number | string;
  }) => {
    const response = await apiClient.get<CohortSubject[]>('/cohort-subjects/', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<CohortSubject>(`/cohort-subjects/${id}/`);
    return response.data;
  },

  create: async (data: Partial<CohortSubject>) => {
    const response = await apiClient.post<CohortSubject>('/cohort-subjects/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CohortSubject>) => {
    const response = await apiClient.patch<CohortSubject>(`/cohort-subjects/${id}/`, data);
    return response.data;
  },
  getByCohort: async (cohortId: number): Promise<CohortSubject[] | PaginatedResponse<CohortSubject>> => {
    const res = await apiClient.get<CohortSubject[] | PaginatedResponse<CohortSubject>>(
      `/cohort-subjects/?cohort=${cohortId}`
    );
    return res.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/cohort-subjects/${id}/`);
  },
  getUnattended: async (): Promise<{
    id: number;
    cohort_name: string;
    subject_name: string;
    has_active_instructor: boolean;
  }[]> => {
    const response = await apiClient.get('/cohort-subjects/');
    const data = Array.isArray(response.data)
      ? response.data
      : (response.data as { results: unknown[] })?.results ?? [];
    return (data as { has_active_instructor: boolean }[]).filter(
      cs => !cs.has_active_instructor
    ) as {
      id: number;
      cohort_name: string;
      subject_name: string;
      has_active_instructor: boolean;
    }[];
  },
};
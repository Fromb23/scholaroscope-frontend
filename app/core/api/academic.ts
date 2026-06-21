import { apiClient } from './client';
import {
  downloadBlob,
  getDownloadFileName,
  normalizeBlobError,
} from '@/app/core/api/downloads';
import {
  AcademicYear,
  Term,
  TermCalendarEvent,
  Curriculum,
  CurriculumDisableImpactResponse,
  CurriculumDisableRequest,
  CurriculumDisableRequestTransitionPayload,
  Subject,
  Cohort,
  CohortSubject,
  CohortSubjectLearnerListResponse,
  BulkSubjectEnrollResponse,
  BulkSubjectUnenrollResponse,
  RequestCurriculumDisablePayload,
  RequestCurriculumDisableResponse,
  SubjectDetail,
  ListQueryParams,
  CohortDetail,
  TermQueryParams,
  AcademicSetupStatus,
  SubjectCatalogItem,
  SubjectOfferingMutationPayload,
} from '@/app/core/types/academic';
import { CohortSubjectOption } from '@/app/core/types/session';
import { PaginatedResponse } from './sessions';

interface CurriculumQuery {
  organization?: number;
  is_active?: boolean;
}

const KERNEL_COHORT_SUBJECTS_BASE = '/cohort-subjects';

export const academicSetupAPI = {
  getStatus: async (): Promise<AcademicSetupStatus> => {
    const response = await apiClient.get<AcademicSetupStatus>('/academic/setup-status/');
    return response.data;
  },
};

export async function listCohortSubjects(cohortId: number): Promise<CohortSubject[]> {
  const response = await apiClient.get<CohortSubject[] | PaginatedResponse<CohortSubject>>(
    `${KERNEL_COHORT_SUBJECTS_BASE}/`,
    { params: { cohort: cohortId } }
  );

  return Array.isArray(response.data)
    ? response.data
    : response.data.results ?? [];
}

export async function getCohortSubjectLearners(
  cohortSubjectId: number
): Promise<CohortSubjectLearnerListResponse> {
  const response = await apiClient.get<CohortSubjectLearnerListResponse>(
    `${KERNEL_COHORT_SUBJECTS_BASE}/${cohortSubjectId}/learners/`
  );
  return response.data;
}

export async function bulkEnrollCohortSubjectLearners(
  cohortSubjectId: number,
  studentIds: number[]
): Promise<BulkSubjectEnrollResponse> {
  const response = await apiClient.post<BulkSubjectEnrollResponse>(
    `${KERNEL_COHORT_SUBJECTS_BASE}/${cohortSubjectId}/learners/bulk-enroll/`,
    { student_ids: studentIds }
  );
  return response.data;
}

export async function bulkUnenrollCohortSubjectLearners(
  cohortSubjectId: number,
  studentIds: number[]
): Promise<BulkSubjectUnenrollResponse> {
  const response = await apiClient.post<BulkSubjectUnenrollResponse>(
    `${KERNEL_COHORT_SUBJECTS_BASE}/${cohortSubjectId}/learners/bulk-unenroll/`,
    { student_ids: studentIds }
  );
  return response.data;
}

export async function exportCohortSubjectClassListPdf(
  cohortSubjectId: number,
): Promise<void> {
  try {
    const response = await apiClient.get<Blob>(
      `${KERNEL_COHORT_SUBJECTS_BASE}/${cohortSubjectId}/export_class_list_pdf/`,
      {
        responseType: 'blob',
      }
    );
    const fileName = getDownloadFileName(
      response.headers['content-disposition'],
      `class-list-cohort-subject-${cohortSubjectId}.pdf`
    );
    downloadBlob(response.data, fileName);
  } catch (error) {
    await normalizeBlobError(error);
  }
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

  completeCalendarSetup: async (id: number) => {
    const response = await apiClient.post<Term>(`/terms/${id}/calendar/complete/`);
    return response.data;
  },

  reopenCalendarSetup: async (id: number) => {
    const response = await apiClient.post<Term>(`/terms/${id}/calendar/reopen/`);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/terms/${id}/`);
  }
};

export const termCalendarEventAPI = {
  getAll: async (params?: { term?: number; organization?: number }) => {
    const response = await apiClient.get<TermCalendarEvent[]>('/term-calendar-events/', { params });
    return response.data;
  },

  create: async (data: Partial<TermCalendarEvent>) => {
    const response = await apiClient.post<TermCalendarEvent>('/term-calendar-events/', data);
    return response.data;
  },

  update: async (id: number, data: Partial<TermCalendarEvent>) => {
    const response = await apiClient.patch<TermCalendarEvent>(`/term-calendar-events/${id}/`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/term-calendar-events/${id}/`);
  },
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

  getDisableImpact: async (id: number) => {
    const response = await apiClient.get<CurriculumDisableImpactResponse>(`/curricula/${id}/disable-impact/`);
    return response.data;
  },

  requestDisable: async (id: number, payload: RequestCurriculumDisablePayload) => {
    const response = await apiClient.post<RequestCurriculumDisableResponse>(
      `/curricula/${id}/request-disable/`,
      payload
    );
    return response.data;
  },

  reactivate: async (id: number) => {
    const response = await apiClient.post<Curriculum>(`/curricula/${id}/reactivate/`);
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

export const curriculumDisableRequestAPI = {
  getAll: async (params?: {
    organization?: number;
    curriculum?: number;
    mode?: string;
    status?: string;
    ordering?: string;
  }) => {
    const response = await apiClient.get<CurriculumDisableRequest[]>('/curriculum-disable-requests/', { params });
    return Array.isArray(response.data)
      ? response.data
      : (response.data as { results?: CurriculumDisableRequest[] })?.results ?? [];
  },

  getById: async (id: number) => {
    const response = await apiClient.get<CurriculumDisableRequest>(`/curriculum-disable-requests/${id}/`);
    return response.data;
  },

  confirm: async (id: number, payload?: CurriculumDisableRequestTransitionPayload) => {
    const response = await apiClient.post<CurriculumDisableRequest>(
      `/curriculum-disable-requests/${id}/confirm/`,
      payload ?? {}
    );
    return response.data;
  },

  cancel: async (id: number) => {
    const response = await apiClient.post<CurriculumDisableRequest>(`/curriculum-disable-requests/${id}/cancel/`);
    return response.data;
  },

  retry: async (id: number) => {
    const response = await apiClient.post<CurriculumDisableRequest>(`/curriculum-disable-requests/${id}/retry/`);
    return response.data;
  },
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

export const subjectOfferingAPI = {
  getCatalog: async (curriculumId: number): Promise<SubjectCatalogItem[]> => {
    const response = await apiClient.get<SubjectCatalogItem[]>('/academic/subject-catalog/', {
      params: { curriculum: curriculumId },
    });
    return Array.isArray(response.data)
      ? response.data
      : (response.data as { results?: SubjectCatalogItem[] }).results ?? [];
  },

  offer: async (payload: SubjectOfferingMutationPayload): Promise<SubjectCatalogItem> => {
    const response = await apiClient.post<SubjectCatalogItem>('/academic/subject-offerings/', payload);
    return response.data;
  },

  remove: async (offeringId: string): Promise<void> => {
    await apiClient.delete(`/academic/subject-offerings/${encodeURIComponent(offeringId)}/`);
  },
};

// Cohorts
export interface CohortQueryParams extends ListQueryParams {
  academic_year?: number;
  curriculum?: number;
  curriculum_type?: string;
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

  assignSubject: async (
    cohortId: number,
    subjectId: number | null,
    isCompulsory: boolean = true,
    options?: { subjectProfileId?: number | null }
  ) => {
    const payload: Record<string, number | boolean> = {
      is_compulsory: isCompulsory,
    };
    if (subjectId && Number.isInteger(subjectId) && subjectId > 0) {
      payload.subject_id = subjectId;
    }
    if (options?.subjectProfileId && Number.isInteger(options.subjectProfileId) && options.subjectProfileId > 0) {
      payload.subject_profile_id = options.subjectProfileId;
    }
    const response = await apiClient.post<CohortSubject>(
      `/cohorts/${cohortId}/assign_subject/`,
      payload
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

  getSubjectOptions: async (cohortId: number) => {
    const response = await apiClient.get<CohortSubjectOption[]>(`/cohorts/${cohortId}/subject-options/`);
    return response.data;
  },
};

export const cohortSubjectAPI = {
  getAll: async (params?: {
    cohort?: number | string;
    subject?: number | string;
    academic_year?: number | string;
  }) => {
    const response = await apiClient.get<CohortSubject[] | PaginatedResponse<CohortSubject>>(
      `${KERNEL_COHORT_SUBJECTS_BASE}/`,
      { params }
    );
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<CohortSubject>(`${KERNEL_COHORT_SUBJECTS_BASE}/${id}/`);
    return response.data;
  },

  create: async (data: Partial<CohortSubject>) => {
    const response = await apiClient.post<CohortSubject>(`${KERNEL_COHORT_SUBJECTS_BASE}/`, data);
    return response.data;
  },

  update: async (id: number, data: Partial<CohortSubject>) => {
    const response = await apiClient.patch<CohortSubject>(`${KERNEL_COHORT_SUBJECTS_BASE}/${id}/`, data);
    return response.data;
  },
  getByCohort: async (cohortId: number): Promise<CohortSubject[]> => {
    return listCohortSubjects(cohortId);
  },

  delete: async (id: number) => {
    await apiClient.delete(`${KERNEL_COHORT_SUBJECTS_BASE}/${id}/`);
  },
  getUnattended: async (): Promise<{
    id: number;
    cohort_name: string;
    subject_name: string;
    has_active_instructor: boolean;
  }[]> => {
    const response = await apiClient.get(`${KERNEL_COHORT_SUBJECTS_BASE}/`);
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
  listCohortSubjects,
  getLearners: getCohortSubjectLearners,
  bulkEnrollLearners: bulkEnrollCohortSubjectLearners,
  bulkUnenrollLearners: bulkUnenrollCohortSubjectLearners,
};

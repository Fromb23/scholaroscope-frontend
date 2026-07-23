import { apiClient } from './client';
import {
  getDownloadFileName,
  normalizeBlobError,
} from './downloads';
import {
  Student,
  StudentDetailResponse,
  StudentFormData,
  StudentProfileUpdateData,
  StudentStats,
  TransferFormData,
  StudentCohortEnrollment,
  EnrollmentFormData,
  LearnerDeleteEligibility,
  LearnerLifecyclePayload,
} from '../types/student';

export const learnersAPI = {
  // Get all students with optional filters
  getStudents: async (params?: {
    cohort?: number;
    cohort_subject?: number;
    status?: string;
    gender?: string;
    search?: string;
    q?: string;
    admission_number?: string;
    name?: string;
    page?: number;
    page_size?: number;
    ordering?: string;
  }) => {
    const { data } = await apiClient.get<{
      count: number;
      results: Student[];
      next: string | null;
      previous: string | null;
    }>('/students/', { params });
    return data;
  },

  getAllStudents: async (params?: {
    cohort?: number;
    cohort_subject?: number;
    status?: string;
    gender?: string;
    search?: string;
    q?: string;
    admission_number?: string;
    name?: string;
    ordering?: string;
    page_size?: number;
  }): Promise<Student[]> => {
    const pageSize = params?.page_size ?? 100;
    const results: Student[] = [];
    let page = 1;

    while (true) {
      const data = await learnersAPI.getStudents({
        ...params,
        page,
        page_size: pageSize,
      });

      results.push(...(data.results ?? []));

      if (!data.next || results.length >= data.count) {
        break;
      }

      page += 1;
    }

    return results;
  },

  // Get student by ID (detailed)
  getStudent: async (id: number) => {
    const { data } = await apiClient.get<StudentDetailResponse>(`/students/${id}/`);
    return data;
  },

  // Get students by cohort (active enrollments)
  getStudentsByCohort: async (cohortId: number) => {
    const { data } = await apiClient.get<Student[]>('/students/by_cohort/', {
      params: { cohort_id: cohortId }
    });
    return data;
  },

  exportStudents: async (params: {
    cohort?: number;
    cohort_subject?: number;
    organization?: number;
    status?: string;
    search?: string;
    q?: string;
    admission_number?: string;
    name?: string;
    ordering?: string;
    format: 'xlsx';
  }): Promise<{ blob: Blob; fileName: string }> => {
    try {
      const response = await apiClient.get<Blob>('/students/export/', {
        params,
        responseType: 'blob',
      });
      const fallbackFileName = `learners.${params.format}`;
      const fileName = getDownloadFileName(
        response.headers['content-disposition'],
        fallbackFileName,
      );
      return {
        blob: response.data,
        fileName,
      };
    } catch (error) {
      return normalizeBlobError(error);
    }
  },

  // Get students enrolled in multiple cohorts
  getMultiCohortStudents: async () => {
    const { data } = await apiClient.get<Student[]>('/students/multi_cohort/');
    return data;
  },

  // Get student statistics
  getStatistics: async () => {
    const { data } = await apiClient.get<StudentStats>('/students/statistics/');
    return data;
  },

  // Create new student
  createStudent: async (studentData: StudentFormData) => {
    const { data } = await apiClient.post<Student>('/students/', studentData);
    return data;
  },

  // Update student
  updateStudent: async (id: number, studentData: StudentProfileUpdateData) => {
    const { data } = await apiClient.patch<Student>(`/students/${id}/`, studentData);
    return data;
  },

  // Delete student
  deleteStudent: async (id: number) => {
    await apiClient.delete(`/students/${id}/`);
  },

  checkDeleteEligibility: async (id: number): Promise<LearnerDeleteEligibility> => {
    const { data } = await apiClient.get<LearnerDeleteEligibility>(`/students/${id}/delete-eligibility/`);
    return data;
  },

  // Transfer student
  transferStudent: async (id: number, transferData: TransferFormData) => {
    const { data } = await apiClient.post(`/students/${id}/transfer/`, transferData);
    return data;
  },

  withdrawStudent: async (id: number, payload?: LearnerLifecyclePayload) => {
    const { data } = await apiClient.post(`/students/${id}/withdraw/`, payload ?? {});
    return data;
  },

  graduateStudent: async (id: number, payload?: LearnerLifecyclePayload) => {
    const { data } = await apiClient.post(`/students/${id}/graduate/`, payload ?? {});
    return data;
  },

  archiveStudent: async (id: number, payload?: LearnerLifecyclePayload) => {
    const { data } = await apiClient.post(`/students/${id}/archive/`, payload ?? {});
    return data;
  },

  // Update student status
  updateStatus: async (id: number, status: string, deactivateEnrollments: boolean = false, notes?: string) => {
    const { data } = await apiClient.post(`/students/${id}/update_status/`, {
      status,
      deactivate_enrollments: deactivateEnrollments,
      notes,
    });
    return data;
  },

  // Enroll student in a cohort
  enrollStudent: async (
    studentId: number,
    data: EnrollmentFormData & { set_as_primary?: boolean }
  ) => {
    const response = await apiClient.post(
      `/students/${studentId}/enroll/`,
      {
        cohort_id: data.cohort_id,
        enrollment_type: data.enrollment_type || 'PRIMARY',
        effective_from: data.effective_from,
        start_reason: data.start_reason || 'INITIAL_ADMISSION',
        notes: data.notes || '',
        set_as_primary: data.set_as_primary ?? true
      }
    );
    return response.data;
  },

  reenrollStudent: async (
    studentId: number,
    data: EnrollmentFormData
  ) => {
    const response = await apiClient.post(
      `/students/${studentId}/reenroll/`,
      {
        cohort_id: data.cohort_id,
        enrollment_type: data.enrollment_type || 'PRIMARY',
        effective_from: data.effective_from,
        start_reason: data.start_reason || 'RE_ENROLMENT',
        notes: data.notes || '',
        set_as_primary: true
      }
    );
    return response.data;
  },

  // Unenroll student from a cohort
  unenrollStudent: async (
    studentId: number,
    cohortId: number,
    data: {
      end_reason: string;
      effective_to: string;
      notes?: string;
    }
  ) => {
    const response = await apiClient.post(
      `/students/${studentId}/unenroll/`,
      {
        cohort_id: cohortId,
        end_reason: data.end_reason,
        effective_to: data.effective_to,
        notes: data.notes || ''
      }
    );
    return response.data;
  },

  // Get all enrollments for a student
  getStudentEnrollments: async (id: number) => {
    const { data } = await apiClient.get<StudentCohortEnrollment[]>(`/students/${id}/enrollments/`);
    return data;
  },

  // Get active enrollments for a student
  getActiveEnrollments: async (id: number) => {
    const { data } = await apiClient.get<StudentCohortEnrollment[]>(`/students/${id}/active_cohorts/`);
    return data;
  },

  // Get attendance report
  getAttendanceReport: async (id: number, termId?: number) => {
    const params = termId ? { term_id: termId } : {};
    const { data } = await apiClient.get(`/students/${id}/attendance_report/`, { params });
    return data;
  },

  // Get grades report
  getGradesReport: async (id: number, termId?: number) => {
    const params = termId ? { term_id: termId } : {};
    const { data } = await apiClient.get(`/students/${id}/grades_report/`, { params });
    return data;
  },
};

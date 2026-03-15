import { apiClient } from './client';
import {
  Student,
  StudentDetail,
  StudentFormData,
  StudentStats,
  EnrollmentFormData,
  TransferFormData,
  StudentCohortEnrollment
} from '../types/student';

export const learnersAPI = {
  // Get all students with optional filters
  getStudents: async (params?: {
    cohort?: number;
    status?: string;
    gender?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }) => {
    const { data } = await apiClient.get<{
      count: number;
      results: Student[];
      next: string | null;
      previous: string | null;
    }>('/students/', { params });
    return data;
  },

  // Get student by ID (detailed)
  getStudent: async (id: number) => {
    const { data } = await apiClient.get<StudentDetail>(`/students/${id}/`);
    return data;
  },

  // Get students by cohort (active enrollments)
  getStudentsByCohort: async (cohortId: number) => {
    const { data } = await apiClient.get<Student[]>('/students/by_cohort/', {
      params: { cohort_id: cohortId }
    });
    return data;
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
  updateStudent: async (id: number, studentData: Partial<StudentFormData>) => {
    console.log("update student status", studentData);
    const { data } = await apiClient.patch<Student>(`/students/${id}/`, studentData);
    return data;
  },

  // Delete student
  deleteStudent: async (id: number) => {
    await apiClient.delete(`/students/${id}/`);
  },

  // Transfer student
  transferStudent: async (id: number, transferData: TransferFormData) => {
    const { data } = await apiClient.post(`/students/${id}/transfer/`, transferData);
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
    data: {
      cohort_id: number;
      enrollment_type?: string;
      notes?: string;
      set_as_primary?: boolean;
    }
  ) => {
    const response = await apiClient.post(
      `/students/${studentId}/enroll/`,
      {
        cohort_id: data.cohort_id,
        enrollment_type: data.enrollment_type || 'REGULAR',
        notes: data.notes || '',
        set_as_primary: data.set_as_primary || false
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
      notes?: string;
    }
  ) => {
    const response = await apiClient.post(
      `/students/${studentId}/unenroll/`,
      {
        cohort_id: cohortId,
        end_reason: data.end_reason,
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
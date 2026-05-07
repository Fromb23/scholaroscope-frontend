// ============================================================================
// app/api/instructors.ts
// Admin-scoped: all calls are automatically org-filtered by the backend.
// Endpoint base: /api/users/?role=INSTRUCTOR  (reuses UserViewSet)
// Cohort assignment: /api/cohorts/{id}/assign_instructor/ etc.
// ============================================================================

import { apiClient } from './client';
import type { TeachingAssignment } from '@/app/core/types/academic';
import {
    AvailableCohort,
    AvailableCohortSubject,
    CohortAssignment,
    GlobalUser,
    InstructorStats,
    SourceAwareSubjectReference,
    UserCreatePayload,
    UserUpdatePayload,
} from '@/app/core/types/globalUsers';

const KERNEL_COHORT_SUBJECTS_BASE = '/academic/cohort-subjects';



export interface InstructorProfile extends GlobalUser {
    cohort_assignments: CohortAssignment[];
    teaching_assignments?: TeachingAssignment[];
    session_count: number;
    last_session_at: string | null;
}

type SourceAwareInstructorSubject = SourceAwareSubjectReference;

function buildSourceAwareSubjectPayload(subject: SourceAwareInstructorSubject) {
    const subjectSource = subject.source?.trim();
    const subjectId =
        subject.teaching_link_id ??
        subject.cbc_cohort_subject_id ??
        subject.cambridge_cohort_subject_id ??
        subject.subject_id;

    if (!subjectSource) {
        throw new Error('Subject assignment is missing source metadata');
    }

    if (typeof subjectId !== 'number' || !Number.isFinite(subjectId)) {
        throw new Error('Subject assignment is missing a source-aware subject id');
    }

    return {
        subject_source: subjectSource,
        subject_id: subjectId,
    };
}

export const instructorsAPI = {
    // GET /api/users/?role=INSTRUCTOR  — backend scopes to current admin's org
    getAll: async (): Promise<GlobalUser[]> => {
        const response = await apiClient.get<GlobalUser[]>('/users/', {
            params: { role: 'INSTRUCTOR' },
        });
        const data = response.data;
        if (Array.isArray(data)) {
            return data;
        } else if (data && typeof data === 'object' && 'results' in data) {
            return (data as { results: GlobalUser[] }).results ?? [];
        } else {
            return [];
        }
    },

    // GET /api/users/{id}/
    getById: async (id: number): Promise<InstructorProfile> => {
        const response = await apiClient.get<InstructorProfile>(`/users/${id}/`);
        return response.data;
    },

    // POST /api/users/  — role: INSTRUCTOR, org auto-set from admin's token
    create: async (data: UserCreatePayload): Promise<GlobalUser> => {
        const response = await apiClient.post<GlobalUser>('/users/', {
            ...data,
            role: 'INSTRUCTOR',
        });
        return response.data;
    },

    // PATCH /api/users/{id}/
    update: async (id: number, data: UserUpdatePayload): Promise<GlobalUser> => {
        const response = await apiClient.patch<GlobalUser>(`/users/${id}/`, data);
        return response.data;
    },

    // DELETE /api/users/{id}/
    remove: async (id: number): Promise<void> => {
        await apiClient.delete(`/users/${id}/`);
    },

    // POST /api/users/{id}/activate/
    activate: async (id: number): Promise<GlobalUser> => {
        const response = await apiClient.post<GlobalUser>(`/users/${id}/activate/`);
        return response.data;
    },

    // POST /api/users/{id}/deactivate/
    deactivate: async (id: number): Promise<GlobalUser> => {
        const response = await apiClient.post<GlobalUser>(`/users/${id}/deactivate/`);
        return response.data;
    },

    // POST /api/users/{id}/reset_password/
    resetPassword: async (id: number, new_password: string): Promise<void> => {
        await apiClient.post(`/users/${id}/reset_password/`, { new_password });
    },

    // GET /api/users/statistics/?role=INSTRUCTOR
    getStats: async (): Promise<InstructorStats> => {
        const response = await apiClient.get<InstructorStats>('/users/statistics/', {
            params: { role: 'INSTRUCTOR' },
        });
        return response.data;
    },

    // GET /api/cohorts/ — for the assign-to-cohort dropdown
    getCohorts: async (): Promise<AvailableCohort[]> => {
        const response = await apiClient.get('/cohorts/');
        const data = response.data;
        if (Array.isArray(data)) {
            return data as AvailableCohort[];
        } else if (data && typeof data === 'object' && 'results' in data) {
            return (data as { results: AvailableCohort[] }).results ?? [];
        } else {
            return [];
        }
    },
    getCohortSubjects: async (): Promise<AvailableCohortSubject[]> => {
        const response = await apiClient.get(`${KERNEL_COHORT_SUBJECTS_BASE}/`);
        const data = response.data;
        return Array.isArray(data) ? data : (data as { results: AvailableCohortSubject[] }).results ?? [];
    },

    assignCohort: async (instructorId: number, cohortId: number): Promise<void> => {
        await apiClient.post(`/users/${instructorId}/assign_cohort/`, {
            cohort_id: cohortId,
        });
    },

    unassignCohort: async (
        instructorId: number,
        cohortId: number,
        reason?: string,
        notes?: string,
    ): Promise<void> => {
        await apiClient.post(`/users/${instructorId}/unassign_cohort/`, {
            cohort_id: cohortId,
            ...(reason ? { reason } : {}),
            ...(notes ? { notes } : {}),
        });
    },

    assignToCohortSubject: async (
        instructorId: number,
        subject: SourceAwareInstructorSubject,
    ): Promise<void> => {
        await apiClient.post(
            `/users/${instructorId}/assign_cohort_subject/`,
            buildSourceAwareSubjectPayload(subject)
        );
    },

    unassignFromCohortSubject: async (
        instructorId: number,
        subject: SourceAwareInstructorSubject,
        reason?: string,
        notes?: string,
    ): Promise<void> => {
        await apiClient.post(`/users/${instructorId}/unassign_cohort_subject/`, {
            ...buildSourceAwareSubjectPayload(subject),
            reason: reason ?? 'MANUAL',
            notes: notes ?? '',
        });
    },
  getAssignableSubjects: async (instructorId: number): Promise<AvailableCohortSubject[]> => {
    const response = await apiClient.get(`/users/${instructorId}/assignable_subjects/`);
    const data = response.data;

    if (Array.isArray(data)) {
      return data as AvailableCohortSubject[];
    }

    if (data && typeof data === 'object' && 'results' in data) {
      return (data as { results: AvailableCohortSubject[] }).results ?? [];
    }

    return [];
  },
    getInstructorHistory: async (cohortSubjectId: number) => {
        const response = await apiClient.get(
            `${KERNEL_COHORT_SUBJECTS_BASE}/${cohortSubjectId}/instructor_history/`
        );
        return response.data as {
            cohort_subject_id: number;
            subject_name: string;
            cohort_name: string;
            has_active_instructor: boolean;
            history: Array<{
                log_id: number;
                user_email: string;
                user_full_name: string;
                role: string;
                assigned_at: string;
                unassigned_at: string | null;
                is_active: boolean;
                duration_days: number;
                end_reason: string;
                assigned_by: string | null;
                unassigned_by: string | null;
            }>;
        };
    },
};

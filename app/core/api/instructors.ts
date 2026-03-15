// ============================================================================
// app/api/instructors.ts
// Admin-scoped: all calls are automatically org-filtered by the backend.
// Endpoint base: /api/users/?role=INSTRUCTOR  (reuses UserViewSet)
// Cohort assignment: /api/cohorts/{id}/assign_instructor/ etc.
// ============================================================================

import { apiClient } from './client';
import { GlobalUser, UserCreatePayload, UserUpdatePayload } from '@/app/core/types/globalUsers';

export interface InstructorStats {
    total: number;
    active: number;
    inactive: number;
    assigned_to_cohort: number;
    unassigned: number;
}

export interface CohortAssignment {
    cohort_id: number;
    cohort_name: string;
    academic_year: string;
    subject_count: number;
}

export interface InstructorProfile extends GlobalUser {
    cohort_assignments: CohortAssignment[];
    session_count: number;
    last_session_at: string | null;
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
    delete: async (id: number): Promise<void> => {
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
    getCohorts: async (): Promise<{ id: number; name: string; academic_year: string }[]> => {
        const response = await apiClient.get('/cohorts/');
        const data = response.data;
        type Cohort = { id: number; name: string; academic_year: string };
        if (Array.isArray(data)) {
            return data as Cohort[];
        } else if (data && typeof data === 'object' && 'results' in data) {
            return (data as { results: Cohort[] }).results ?? [];
        } else {
            return [];
        }
    },

    // POST /api/cohorts/{cohortId}/assign_instructor/
    assignToCohort: async (instructorId: number, cohortId: number): Promise<void> => {
        await apiClient.post(`/users/${instructorId}/assign_cohort/`, {
            cohort_id: cohortId,
        });
    },

    // POST /api/cohorts/{cohortId}/unassign_instructor/
    unassignFromCohort: async (instructorId: number, cohortId: number): Promise<void> => {
        await apiClient.post(`/users/${instructorId}/unassign_cohort/`, {
            cohort_id: cohortId,
        });
    },
};
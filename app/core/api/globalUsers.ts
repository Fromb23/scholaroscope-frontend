// ============================================================================
// app/api/globalUsers.ts
// Mirrors: UserViewSet endpoints — superadmin sees all users across all orgs
// ============================================================================

import { HistoryEntry, TeachingAssignment } from '../types/academic';
import { apiClient } from './client';
import {
    GlobalUser,
    UserCreatePayload,
    UserUpdatePayload,
    GlobalUserStats,
    UserOrgMembership,
} from '@/app/core/types/globalUsers';

export const globalUsersAPI = {
    // GET /api/users/
    getAll: async (): Promise<GlobalUser[]> => {
        const response = await apiClient.get<GlobalUser[]>('/users/');
        return response.data;
    },

    // GET /api/users/{id}/
    getById: async (id: number): Promise<GlobalUser> => {
        const response = await apiClient.get<GlobalUser>(`/users/${id}/`);
        return response.data;
    },

    // POST /api/users/
    create: async (data: UserCreatePayload & { organization_id?: number }): Promise<GlobalUser> => {
        const response = await apiClient.post<GlobalUser>('/users/', data);
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

    // GET /api/users/statistics/
    getStatistics: async (): Promise<GlobalUserStats> => {
        const response = await apiClient.get<GlobalUserStats>('/users/statistics/');
        return response.data;
    },
    addToOrg: async (userId: number, organizationId: number, role: string): Promise<void> => {
        await apiClient.post(`/users/${userId}/add_to_org/`, {
            organization_id: organizationId,
            role,
        });
    },
    // Add inside globalUsersAPI object
    getMyTeachingLoad: async (): Promise<{
        instructor_id: number;
        organization: string | null;
        total_assigned: number;
        assignments: TeachingAssignment[];
    }> => {
        const response = await apiClient.get('/users/my_teaching_load/');
        return response.data;
    },
    getMyTeachingHistory: async (): Promise<{
        instructor_id: number;
        history: HistoryEntry[];
    }> => {
        const response = await apiClient.get('/users/my_teaching_history/');
        return response.data;
    },
    getMemberships: async (id: number): Promise<UserOrgMembership[]> => {
        const response = await apiClient.get<UserOrgMembership[]>(`/users/${id}/memberships/`);
        return response.data;
    },
    removeFromOrg: async (userId: number, organizationId: number): Promise<void> => {
        await apiClient.post(`/users/${userId}/remove_from_org/`, {
            organization_id: organizationId,
        });
    },
};
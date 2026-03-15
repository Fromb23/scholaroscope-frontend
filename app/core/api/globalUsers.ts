// ============================================================================
// app/api/globalUsers.ts
// Mirrors: UserViewSet endpoints — superadmin sees all users across all orgs
// ============================================================================

import { apiClient } from './client';
import {
    GlobalUser,
    UserCreatePayload,
    UserUpdatePayload,
    GlobalUserStats,
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
    create: async (data: UserCreatePayload): Promise<GlobalUser> => {
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
};
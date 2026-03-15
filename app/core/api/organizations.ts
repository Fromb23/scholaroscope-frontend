// ============================================================================
// app/api/organizations.ts
// Mirrors: GET/POST/PATCH/DELETE /api/organizations/ + custom actions
// ============================================================================

import { apiClient } from './client';
import {
    Organization,
    OrganizationCreatePayload,
    OrganizationUpdatePayload,
    OrganizationStats,
    OrgUser,
} from '@/app/core/types/organization';

export const organizationAPI = {
    // GET /api/organizations/
    getAll: async (): Promise<Organization[]> => {
        const response = await apiClient.get<Organization[]>('/organizations/');
        return response.data;
    },

    // GET /api/organizations/{id}/
    getById: async (id: number): Promise<Organization> => {
        const response = await apiClient.get<Organization>(`/organizations/${id}/`);
        return response.data;
    },

    // POST /api/organizations/
    create: async (data: OrganizationCreatePayload): Promise<Organization> => {
        const response = await apiClient.post<Organization>('/organizations/', data);
        return response.data;
    },

    // PATCH /api/organizations/{id}/
    update: async (id: number, data: OrganizationUpdatePayload): Promise<Organization> => {
        const response = await apiClient.patch<Organization>(`/organizations/${id}/`, data);
        return response.data;
    },

    // DELETE /api/organizations/{id}/
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/organizations/${id}/`);
    },

    // POST /api/organizations/{id}/ with is_active toggle
    // Suspend = set is_active: false | Activate = set is_active: true
    toggleActive: async (id: number, is_active: boolean): Promise<Organization> => {
        const response = await apiClient.patch<Organization>(`/organizations/${id}/`, {
            is_active,
        });
        return response.data;
    },

    // GET /api/organizations/{id}/statistics/
    getStatistics: async (id: number): Promise<OrganizationStats> => {
        const response = await apiClient.get<OrganizationStats>(
            `/organizations/${id}/statistics/`
        );
        return response.data;
    },

    // GET /api/organizations/{id}/users/
    getUsers: async (id: number): Promise<OrgUser[]> => {
        const response = await apiClient.get<OrgUser[]>(`/organizations/${id}/users/`);
        return response.data;
    },
};
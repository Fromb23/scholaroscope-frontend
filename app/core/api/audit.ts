// ============================================================================
// app/core/api/audit.ts
// ============================================================================

import { apiClient } from './client';
import type { AuditLog, AuditLogFilters, AuditStats } from '@/app/plugins/platform/audit/types/auditLogs';

export const auditAPI = {
    getAll: async (filters?: AuditLogFilters): Promise<AuditLog[]> => {
        const response = await apiClient.get<AuditLog[]>('/audit/', { params: filters });
        return response.data;
    },

    getById: async (id: number): Promise<AuditLog> => {
        const response = await apiClient.get<AuditLog>(`/audit/${id}/`);
        return response.data;
    },

    getStats: async (): Promise<AuditStats> => {
        const response = await apiClient.get<AuditStats>('/audit/stats/');
        return response.data;
    },
};
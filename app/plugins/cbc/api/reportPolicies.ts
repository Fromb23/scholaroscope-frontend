import { apiClient } from '@/app/core/api/client';
import type { PaginatedResponse } from '@/app/core/types/api';
import type {
    CbcAssessmentReportResult,
    CbcAssessmentReportResultFilters,
    CbcReportPolicy,
    CbcReportPolicyFilters,
    CbcReportPolicyPayload,
} from '@/app/plugins/cbc/types/reportPolicy';

type ListResponse<T> = T[] | PaginatedResponse<T>;

function unwrap<T>(data: ListResponse<T>): T[] {
    return Array.isArray(data) ? data : data.results ?? [];
}

export const cbcReportPolicyAPI = {
    getAll: async (filters?: CbcReportPolicyFilters): Promise<CbcReportPolicy[]> => {
        const { data } = await apiClient.get<ListResponse<CbcReportPolicy>>('/cbc/report-policies/', {
            params: filters,
        });
        return unwrap(data);
    },

    getById: async (id: number): Promise<CbcReportPolicy> => {
        const { data } = await apiClient.get<CbcReportPolicy>(`/cbc/report-policies/${id}/`);
        return data;
    },

    create: async (payload: CbcReportPolicyPayload): Promise<CbcReportPolicy> => {
        const { data } = await apiClient.post<CbcReportPolicy>('/cbc/report-policies/', payload);
        return data;
    },

    update: async (id: number, payload: Partial<CbcReportPolicyPayload>): Promise<CbcReportPolicy> => {
        const { data } = await apiClient.patch<CbcReportPolicy>(`/cbc/report-policies/${id}/`, payload);
        return data;
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/cbc/report-policies/${id}/`);
    },

    getAssessmentReportResults: async (
        filters?: CbcAssessmentReportResultFilters,
    ): Promise<CbcAssessmentReportResult[]> => {
        const { data } = await apiClient.get<ListResponse<CbcAssessmentReportResult>>(
            '/cbc/assessment-report-results/',
            { params: filters },
        );
        return unwrap(data);
    },
};

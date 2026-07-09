import { apiClient } from '@/app/core/api/client';
import type { PaginatedResponse } from '@/app/core/types/api';
import type {
    CbcAssessmentReportResult,
    CbcAssessmentReportResultFilters,
    CbcReportPolicy,
    CbcReportPolicyApplyScopePayload,
    CbcReportPolicyFilters,
    CbcReportPolicyPayload,
    CbcTermPolicyCoverage,
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

    getTermPlan: async (termId: number): Promise<CbcTermPolicyCoverage> => {
        const { data } = await apiClient.get<CbcTermPolicyCoverage>('/cbc/report-policies/term-plan/', {
            params: { term_id: termId },
        });
        return data;
    },

    saveTermPlan: async (payload: {
        term_id: number;
        selected_policy_ids?: number[];
        use_all_active_policies?: boolean;
        status?: 'DRAFT' | 'ACTIVE' | 'FROZEN';
    }): Promise<CbcTermPolicyCoverage> => {
        const { data } = await apiClient.post<CbcTermPolicyCoverage>('/cbc/report-policies/term-plan/', payload);
        return data;
    },

    reuseForTerm: async (
        id: number,
        payload: { term_id: number; activate?: boolean },
    ): Promise<CbcReportPolicy> => {
        const { data } = await apiClient.post<CbcReportPolicy>(
            `/cbc/report-policies/${id}/reuse-for-term/`,
            payload,
        );
        return data;
    },

    applyToScope: async (
        id: number,
        payload: CbcReportPolicyApplyScopePayload,
    ): Promise<CbcReportPolicy> => {
        const { data } = await apiClient.post<CbcReportPolicy>(
            `/cbc/report-policies/${id}/apply-to-scope/`,
            payload,
        );
        return data;
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

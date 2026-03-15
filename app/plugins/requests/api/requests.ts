// ============================================================================
// app/api/requests.ts
// ============================================================================

import { apiClient } from '@/app/core/api/client';
import {
    Request, RequestDetail, RequestCreatePayload,
    RequestReviewPayload, AddCommentPayload,
    RequestComment, RequestStats,
} from '@/app/plugins/requests/types/requests';
interface Paginated<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}
export const requestsAPI = {
    // GET /api/requests/
    getAll: async (params?: Record<string, string>): Promise<Request[]> => {
        const response = await apiClient.get<Paginated<Request>>(
            '/requests/',
            { params }
        );
        return response.data.results;
    },

    // GET /api/requests/{id}/
    getById: async (id: number): Promise<RequestDetail> => {
        const response = await apiClient.get<RequestDetail>(`/requests/${id}/`);
        return response.data;
    },

    // POST /api/requests/
    create: async (data: RequestCreatePayload): Promise<Request> => {
        const response = await apiClient.post<Request>('/requests/', data);
        return response.data;
    },

    // DELETE /api/requests/{id}/
    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/requests/${id}/`);
    },

    // POST /api/requests/{id}/review/
    review: async (id: number, data: RequestReviewPayload): Promise<Request> => {
        const response = await apiClient.post<Request>(`/requests/${id}/review/`, data);
        return response.data;
    },

    // POST /api/requests/{id}/add_comment/
    addComment: async (id: number, data: AddCommentPayload): Promise<RequestComment> => {
        const response = await apiClient.post<RequestComment>(`/requests/${id}/add_comment/`, data);
        return response.data;
    },

    // GET /api/requests/stats/
    getStats: async (): Promise<RequestStats> => {
        const response = await apiClient.get<RequestStats>('/requests/stats/');
        return response.data;
    },
};



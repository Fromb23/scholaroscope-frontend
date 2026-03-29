// ============================================================================
// core/api/topics.ts
//
// API calls for Topic / Subtopic / TopicSessionLink / SubtopicCoverage.
// Follows the exact pattern of core/api/academic.ts:
//   - uses apiClient from ./client
//   - named export per resource (topicAPI, subtopicAPI, etc.)
//   - returns response.data directly
// ============================================================================

import { apiClient } from './client';
import {
    Topic,
    TopicDetail,
    Subtopic,
    TopicSessionLink,
    SubtopicCoverage,
    CoverageProgress,
    TopicQueryParams,
    SubtopicQueryParams,
    TopicFormData,
    SubtopicFormData,
} from '@/app/core/types/topics';
import { PaginatedResponse } from '@/app/core/types/api';

// ── Topics ────────────────────────────────────────────────────────────────

export const topicAPI = {
    getAll: async (params?: TopicQueryParams) => {
        const response = await apiClient.get<PaginatedResponse<Topic>>('/topics/', { params });
        return response.data;
    },

    getById: async (id: number) => {
        const response = await apiClient.get<TopicDetail>(`/topics/${id}/`);
        return response.data;
    },

    getSubtopics: async (topicId: number) => {
        const response = await apiClient.get<PaginatedResponse<Subtopic>>(`/topics/${topicId}/subtopics/`);
        return response.data;
    },

    create: async (data: TopicFormData) => {
        const response = await apiClient.post<Topic>('/topics/', data);
        return response.data;
    },

    update: async (id: number, data: Partial<TopicFormData>) => {
        const response = await apiClient.patch<Topic>(`/topics/${id}/`, data);
        return response.data;
    },

    delete: async (id: number) => {
        await apiClient.delete(`/topics/${id}/`);
    },
};

// ── Subtopics ─────────────────────────────────────────────────────────────

export const subtopicAPI = {
    getAll: async (params?: SubtopicQueryParams) => {
        const response = await apiClient.get<Subtopic[]>('/subtopics/', { params });
        return response.data;
    },

    getById: async (id: number) => {
        const response = await apiClient.get<Subtopic>(`/subtopics/${id}/`);
        return response.data;
    },

    create: async (data: SubtopicFormData) => {
        const response = await apiClient.post<Subtopic>('/subtopics/', data);
        return response.data;
    },

    update: async (id: number, data: Partial<SubtopicFormData>) => {
        const response = await apiClient.patch<Subtopic>(`/subtopics/${id}/`, data);
        return response.data;
    },

    delete: async (id: number) => {
        await apiClient.delete(`/subtopics/${id}/`);
    },
};

// ── Topic Session Links ───────────────────────────────────────────────────

export const topicSessionLinkAPI = {
    getAll: async (params?: { session?: number; subtopic?: number; covered?: boolean }) => {
        const response = await apiClient.get<PaginatedResponse<TopicSessionLink>>('/topic-session-links/', { params });
        return response.data;
    },

    create: async (data: { session: number; subtopic: number; notes?: string }) => {
        const response = await apiClient.post<TopicSessionLink>('/topic-session-links/', data);
        return response.data;
    },

    markCovered: async (linkId: number) => {
        const response = await apiClient.post<TopicSessionLink>(
            `/topic-session-links/${linkId}/mark_covered/`
        );
        return response.data;
    },

    markUncovered: async (linkId: number) => {
        const response = await apiClient.post<TopicSessionLink>(
            `/topic-session-links/${linkId}/mark_uncovered/`
        );
        return response.data;
    },

    delete: async (id: number) => {
        await apiClient.delete(`/topic-session-links/${id}/`);
    },
};

// ── Subtopic Coverage ─────────────────────────────────────────────────────

export const subtopicCoverageAPI = {
    getAll: async (params?: { cohort_subject?: number; subtopic?: number; is_covered?: boolean }) => {
        const response = await apiClient.get<SubtopicCoverage[]>('/subtopic-coverage/', { params });
        return response.data;
    },

    getProgress: async (cohortSubjectId: number) => {
        const response = await apiClient.get<CoverageProgress>('/subtopic-coverage/progress/', {
            params: { cohort_subject: cohortSubjectId },
        });
        return response.data;
    },
};
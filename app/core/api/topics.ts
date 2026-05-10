// ============================================================================
// core/api/topics.ts
//
// API calls for Topic / Subtopic authoring.
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

// app/plugins/announcements/api/announcements.ts

import { apiClient } from '@/app/core/api/client';
import {
    Announcement, AnnouncementFeedback,
    AnnouncementFormData, UnreadResponse
} from '../types/announcements';

export const announcementAPI = {
    getAll: async (params?: {
        is_active?: boolean;
        target_role?: string;
        is_system?: boolean;
    }): Promise<Announcement[]> => {
        const response = await apiClient.get<Announcement[]>('/announcements/', { params });
        const data = response.data;
        return Array.isArray(data) ? data : (data as any)?.results ?? [];
    },

    getById: async (id: number): Promise<Announcement> => {
        const response = await apiClient.get<Announcement>(`/announcements/${id}/`);
        return response.data;
    },

    getUnread: async (): Promise<UnreadResponse> => {
        const response = await apiClient.get<UnreadResponse>('/announcements/unread/');
        return response.data;
    },

    create: async (data: AnnouncementFormData): Promise<Announcement> => {
        const response = await apiClient.post<Announcement>('/announcements/', data);
        return response.data;
    },

    update: async (id: number, data: Partial<AnnouncementFormData>): Promise<Announcement> => {
        const response = await apiClient.patch<Announcement>(`/announcements/${id}/`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await apiClient.delete(`/announcements/${id}/`);
    },

    markRead: async (id: number): Promise<void> => {
        await apiClient.post(`/announcements/${id}/mark_read/`);
    },

    submitFeedback: async (id: number, response: string): Promise<AnnouncementFeedback> => {
        const res = await apiClient.post<AnnouncementFeedback>(
            `/announcements/${id}/submit_feedback/`,
            { response }
        );
        return res.data;
    },

    getFeedbacks: async (id: number): Promise<AnnouncementFeedback[]> => {
        const response = await apiClient.get<AnnouncementFeedback[]>(
            `/announcements/${id}/feedbacks/`
        );
        return Array.isArray(response.data)
            ? response.data
            : (response.data as any)?.results ?? [];
    },
};
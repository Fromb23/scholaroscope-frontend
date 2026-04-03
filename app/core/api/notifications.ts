// app/core/api/notifications.ts

import { apiClient } from './client';
import type {
    Notification,
    UnreadCountResponse,
    MarkReadPayload,
} from '@/app/core/types/notifications';

export const notificationAPI = {
    getAll: async (): Promise<Notification[]> => {
        const res = await apiClient.get<{ results: Notification[] } | Notification[]>(
            '/notifications/'
        );
        return Array.isArray(res.data)
            ? res.data
            : (res.data as { results: Notification[] }).results ?? [];
    },

    getUnreadCount: async (): Promise<number> => {
        const res = await apiClient.get<UnreadCountResponse>('/notifications/unread_count/');
        return res.data.unread_count;
    },

    markRead: async (ids: number[]): Promise<void> => {
        await apiClient.post('/notifications/mark_read/', {
            notification_ids: ids,
        } as MarkReadPayload);
    },

    markAllRead: async (): Promise<void> => {
        await apiClient.post('/notifications/mark_all_read/');
    },
};

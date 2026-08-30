// app/core/api/notifications.ts

import { apiClient } from './client';
import { unwrapPaginated } from './unwrap';
import { withOperationalScope, type OperationalScopeParams } from '@/app/core/lib/academicScope';
import type {
    Notification,
    UnreadCountResponse,
    MarkReadPayload,
} from '@/app/core/types/notifications';

export const notificationAPI = {
    getAll: async (params?: OperationalScopeParams): Promise<Notification[]> => {
        const res = await apiClient.get<{ results: Notification[] } | Notification[]>(
            '/notifications/', { params: withOperationalScope(params) }
        );
        return unwrapPaginated(res.data);
    },

    getUnreadCount: async (params?: OperationalScopeParams): Promise<number> => {
        const res = await apiClient.get<UnreadCountResponse>('/notifications/unread_count/', {
            params: withOperationalScope(params),
        });
        return res.data.unread_count ?? res.data.count ?? 0;
    },

    markRead: async (ids: number[], params?: OperationalScopeParams): Promise<void> => {
        await apiClient.post('/notifications/mark_read/', {
            notification_ids: ids,
        } as MarkReadPayload, { params: withOperationalScope(params) });
    },

    markAllRead: async (params?: OperationalScopeParams): Promise<void> => {
        await apiClient.post('/notifications/mark_all_read/', undefined, {
            params: withOperationalScope(params),
        });
    },
};

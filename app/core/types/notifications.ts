// app/core/types/notifications.ts

export interface Notification {
    id: number;
    notification_type: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    title: string;
    body: string;
    entity_type: string;
    entity_id: number | null;
    is_read: boolean;
    read_at: string | null;
    created_at: string;
    updated_at?: string | null;
}

export interface UnreadCountResponse {
    unread_count?: number;
    count?: number;
}

export interface MarkReadPayload {
    notification_ids: number[];
}

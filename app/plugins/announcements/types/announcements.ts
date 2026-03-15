// app/plugins/announcements/types/announcements.ts

export type AnnouncementTarget = 'ALL' | 'INSTRUCTOR' | 'ADMIN';
export type FeedbackType = 'NONE' | 'ACKNOWLEDGE' | 'TEXT';

export interface Announcement {
    id: number;
    title: string;
    body: string;
    target_role: AnnouncementTarget;
    is_system: boolean;
    is_active: boolean;
    requires_feedback: boolean;
    feedback_type: FeedbackType;
    feedback_prompt: string;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
    created_by: number | null;
    created_by_name: string | null;
    // Per-user computed
    is_read: boolean;
    has_feedback: boolean;
    // Admin stats
    read_count: number;
    feedback_count: number;
    is_expired: boolean;
}

export interface AnnouncementFeedback {
    id: number;
    announcement: number;
    user: number;
    user_name: string;
    response: string;
    submitted_at: string;
}

export interface UnreadResponse {
    count: number;
    results: Announcement[];
}

export interface AnnouncementFormData {
    title: string;
    body: string;
    target_role: AnnouncementTarget;
    is_system: boolean;
    requires_feedback: boolean;
    feedback_type: FeedbackType;
    feedback_prompt: string;
    expires_at: string;
}
'use client';

import { resolveErrorMessage } from '@/app/core/errors';

// ============================================================================
// app/plugins/announcements/hooks/useAnnouncements.ts
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { announcementAPI } from '../api/announcements';
import { Announcement, AnnouncementFormData } from '../types/announcements';

// ── Full list hook ────────────────────────────────────────────────────────

export const useAnnouncements = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const data = await announcementAPI.getAll();
            setAnnouncements(data);
            setError(null);
        } catch (err: unknown) {
            setError(resolveErrorMessage(err, 'Failed to fetch announcements'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const create = async (data: AnnouncementFormData) => {
        const created = await announcementAPI.create(data);
        setAnnouncements(prev => [created, ...prev]);
        return created;
    };

    const update = async (id: number, data: Partial<AnnouncementFormData>) => {
        const updated = await announcementAPI.update(id, data);
        setAnnouncements(prev => prev.map(a => a.id === id ? updated : a));
        return updated;
    };

    const remove = async (id: number) => {
        await announcementAPI.delete(id);
        setAnnouncements(prev => prev.filter(a => a.id !== id));
    };

    const markRead = async (id: number) => {
        await announcementAPI.markRead(id);
        setAnnouncements(prev =>
            prev.map(a => a.id === id ? { ...a, is_read: true } : a)
        );
    };

    const submitFeedback = async (id: number, response: string) => {
        await announcementAPI.submitFeedback(id, response);
        setAnnouncements(prev =>
            prev.map(a => a.id === id ? { ...a, has_feedback: true } : a)
        );
    };

    return {
        announcements,
        loading,
        error,
        refetch: fetch,
        create,
        update,
        remove,
        markRead,
        submitFeedback,
    };
};

// ── Unread count hook — used for sidebar badge ────────────────────────────

export const useUnreadAnnouncements = (options?: { enabled?: boolean }) => {
    const [count, setCount] = useState(0);
    const [unread, setUnread] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const enabled = options?.enabled ?? true;

    const fetch = useCallback(async () => {
        if (!enabled) {
            setCount(0);
            setUnread([]);
            setLoading(false);
            return;
        }
        try {
            const data = await announcementAPI.getUnread();
            setCount(data.count);
            setUnread(data.results);
        } catch {
            // Fail silently — badge just won't show
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    useEffect(() => { fetch(); }, [fetch]);

    return { count, unread, loading, refetch: fetch };
};

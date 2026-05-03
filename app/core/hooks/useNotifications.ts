// app/core/hooks/useNotifications.ts

import { useState, useEffect, useCallback } from 'react';
import { notificationAPI } from '@/app/core/api/notifications';
import type { Notification } from '@/app/core/types/notifications';

const POLL_INTERVAL = 30_000;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationAPI.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Badge is non-critical.
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationAPI.getAll();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (ids: number[]) => {
    await notificationAPI.markRead(ids);

    setNotifications((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)));

    setUnreadCount((prev) => Math.max(0, prev - ids.length));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationAPI.markAllRead();

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    fetchAll();

    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchAll, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchAll,
    markRead,
    markAllRead,
  };
}

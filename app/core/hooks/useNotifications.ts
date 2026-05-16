// app/core/hooks/useNotifications.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationAPI } from '@/app/core/api/notifications';
import { queueNotificationSound, initializeNotificationSound } from '@/app/core/lib/notificationSound';
import { isSessionNotification } from '@/app/core/lib/notificationUtils';
import type { Notification } from '@/app/core/types/notifications';

const POLL_INTERVAL = 30_000;

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const notificationsRef = useRef<Notification[]>([]);
  const hasEstablishedBaseline = useRef(false);
  const previousUnreadIds = useRef<Set<number>>(new Set<number>());
  const previousUnreadCount = useRef(0);

  const commitNotifications = useCallback((nextNotifications: Notification[], detectNew: boolean) => {
    const unread = nextNotifications.filter((notification) => !notification.is_read);
    const nextUnreadIds = new Set(unread.map((notification) => notification.id));
    const nextUnreadCount = unread.length;

    setNotifications(nextNotifications);
    notificationsRef.current = nextNotifications;
    setUnreadCount(nextUnreadCount);

    if (!detectNew) {
      previousUnreadIds.current = nextUnreadIds;
      previousUnreadCount.current = nextUnreadCount;
      return;
    }

    if (!hasEstablishedBaseline.current) {
      hasEstablishedBaseline.current = true;
      previousUnreadIds.current = nextUnreadIds;
      previousUnreadCount.current = nextUnreadCount;
      return;
    }

    const newUnreadNotifications = unread.filter(
      (notification) => !previousUnreadIds.current.has(notification.id)
    );

    if (newUnreadNotifications.length > 0 || nextUnreadCount > previousUnreadCount.current) {
      queueNotificationSound(
        newUnreadNotifications.some(isSessionNotification) ? 'session' : 'normal',
        newUnreadNotifications.map((notification) => notification.id)
      );
    }

    previousUnreadIds.current = nextUnreadIds;
    previousUnreadCount.current = nextUnreadCount;
  }, []);

  const syncNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const data = await notificationAPI.getAll();
      commitNotifications(data, true);
    } catch {
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [commitNotifications]);

  const fetchAll = useCallback(async () => {
    await syncNotifications(true);
  }, [syncNotifications]);

  const markRead = useCallback(async (ids: number[]) => {
    await notificationAPI.markRead(ids);

    const next = notificationsRef.current.map((notification) =>
      ids.includes(notification.id) ? { ...notification, is_read: true } : notification
    );
    commitNotifications(next, false);
  }, [commitNotifications]);

  const markAllRead = useCallback(async () => {
    await notificationAPI.markAllRead();

    const next = notificationsRef.current.map((notification) => ({ ...notification, is_read: true }));
    commitNotifications(next, false);
  }, [commitNotifications]);

  useEffect(() => {
    initializeNotificationSound();
    void syncNotifications();

    const interval = setInterval(() => {
      void syncNotifications();
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [syncNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchAll,
    markRead,
    markAllRead,
  };
}

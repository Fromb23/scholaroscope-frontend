// app/core/hooks/useNotifications.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationAPI } from '@/app/core/api/notifications';
import { maybeShowBrowserNotification } from '@/app/core/lib/browserNotification';
import { queueNotificationSound, initializeNotificationSound } from '@/app/core/lib/notificationSound';
import { getNotificationSoundKey, isSessionNotification } from '@/app/core/lib/notificationUtils';
import type { Notification } from '@/app/core/types/notifications';

const POLL_INTERVAL = 15_000; // Polling only; true realtime still requires WebSocket/SSE.

function buildNotificationSnapshot(nextNotifications: Notification[]): Map<number, string> {
  return new Map(
    nextNotifications.map((notification) => [notification.id, getNotificationSoundKey(notification)])
  );
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const notificationsRef = useRef<Notification[]>([]);
  const hasEstablishedBaseline = useRef(false);
  const previousSnapshot = useRef<Map<number, string>>(new Map());

  const commitNotifications = useCallback((nextNotifications: Notification[], detectNew: boolean) => {
    const unread = nextNotifications.filter((notification) => !notification.is_read);
    const nextSnapshot = buildNotificationSnapshot(nextNotifications);

    setNotifications(nextNotifications);
    notificationsRef.current = nextNotifications;
    setUnreadCount(unread.length);

    if (!detectNew) {
      previousSnapshot.current = nextSnapshot;
      return;
    }

    if (!hasEstablishedBaseline.current) {
      hasEstablishedBaseline.current = true;
      previousSnapshot.current = nextSnapshot;
      return;
    }

    const newUnreadNotifications = unread.filter(
      (notification) =>
        previousSnapshot.current.get(notification.id) !== getNotificationSoundKey(notification)
    );

    if (newUnreadNotifications.length > 0) {
      queueNotificationSound(
        newUnreadNotifications.some(isSessionNotification) ? 'session' : 'normal',
        newUnreadNotifications.map((notification) => getNotificationSoundKey(notification))
      );

      newUnreadNotifications.forEach((notification) => {
        maybeShowBrowserNotification(notification);
      });
    }

    previousSnapshot.current = nextSnapshot;
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

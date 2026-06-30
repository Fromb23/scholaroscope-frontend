'use client';

// app/components/layout/NotificationBell.tsx
//
// Responsibility: render bell icon with unread badge, dropdown list,
// mark read/all-read actions. No API calls — receives hook output as props.

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useNotifications } from '@/app/core/hooks/useNotifications';
import { getNotificationRoute } from '@/app/core/lib/notificationUtils';
import type { Notification } from '@/app/core/types/notifications';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const priorityDot: Record<string, string> = {
  URGENT: 'bg-[color:var(--color-danger)]',
  HIGH: 'bg-[color:var(--color-warning)]',
  NORMAL: 'bg-[color:var(--color-info)]',
  LOW: 'bg-[color:var(--color-icon-muted)]',
};

function NotificationItem({
  notification,
  onSelect,
}: {
  notification: Notification;
  onSelect: (notification: Notification) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={`flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition-colors theme-hover-surface ${
        notification.is_read ? 'opacity-60' : ''
      }`}
    >
      <span
        className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
          notification.is_read
            ? 'bg-[color:var(--color-border-strong)]'
            : (priorityDot[notification.priority] ?? 'bg-[color:var(--color-info)]')
        }`}
      />
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium leading-snug theme-text">{notification.title}</p>
        {notification.body && (
          <p className="theme-muted mt-0.5 line-clamp-3 break-words text-xs sm:line-clamp-2">{notification.body}</p>
        )}
        <p className="theme-subtle mt-1 text-xs">{timeAgo(notification.updated_at ?? notification.created_at)}</p>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, loading, fetchAll, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((prev) => {
      if (!prev) void fetchAll();
      return !prev;
    });
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllRead();
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationSelect = async (notification: Notification) => {
    const route = getNotificationRoute(notification);

    try {
      if (!notification.is_read) {
        await markRead([notification.id]);
      }
    } catch {
      // Preserve navigation even if read-state sync fails.
    } finally {
      setOpen(false);
    }

    if (route) {
      router.push(route);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="theme-focus-ring relative flex min-h-11 min-w-11 items-center justify-center rounded-lg theme-icon transition-colors theme-hover-surface"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--color-danger)] text-[10px] font-bold text-[color:var(--color-text-inverse)] ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="theme-dropdown fixed left-3 right-3 top-16 z-50 max-h-[70vh] overflow-hidden rounded-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 sm:max-h-none">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b theme-border px-4 py-3">
            <h3 className="min-w-0 text-sm font-semibold theme-text">
              Notifications
              {unreadCount > 0 && (
                <span className="theme-danger-surface ml-2 px-1.5 py-0.5 text-xs rounded-full font-bold">
                  {unreadCount}
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="flex shrink-0 items-center gap-1 text-xs theme-link font-medium disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="h-3 w-3" />
                )}
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-[calc(70vh-4rem)] overflow-y-auto divide-y divide-gray-50 sm:max-h-80">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin theme-icon-muted" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 theme-icon-muted mx-auto mb-2" />
                <p className="theme-subtle text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} onSelect={handleNotificationSelect} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

// app/components/layout/NotificationBell.tsx
//
// Responsibility: render bell icon with unread badge, dropdown list,
// mark read/all-read actions. No API calls — receives hook output as props.

import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useNotifications } from '@/app/core/hooks/useNotifications';
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
    URGENT: 'bg-red-500',
    HIGH: 'bg-orange-400',
    NORMAL: 'bg-blue-400',
    LOW: 'bg-gray-300',
};

function NotificationItem({
    notification,
    onRead,
}: {
    notification: Notification;
    onRead: (id: number) => void;
}) {
    return (
        <div
            onClick={() => !notification.is_read && onRead(notification.id)}
            className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                notification.is_read ? 'opacity-60' : ''
            }`}
        >
            <span
                className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                    notification.is_read
                        ? 'bg-gray-200'
                        : (priorityDot[notification.priority] ?? 'bg-blue-400')
                }`}
            />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 leading-snug">
                    {notification.title}
                </p>
                {notification.body && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {notification.body}
                    </p>
                )}
                <p className="text-xs text-gray-400 mt-1">{timeAgo(notification.created_at)}</p>
            </div>
        </div>
    );
}

export function NotificationBell() {
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
        setOpen(prev => {
            if (!prev) fetchAll();
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

    return (
        <div ref={ref} className="relative">
            <button
                onClick={handleOpen}
                className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-bold">
                                    {unreadCount}
                                </span>
                            )}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                disabled={markingAll}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
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
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                        {loading ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="py-10 text-center">
                                <Bell className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                                <p className="text-sm text-gray-400">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <NotificationItem
                                    key={n.id}
                                    notification={n}
                                    onRead={id => markRead([id])}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// app/plugins/announcements/components/AnnouncementWidget.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Megaphone, Check, ChevronRight, Globe, Building2 } from 'lucide-react';
import { useAnnouncements } from '../hooks/useAnnouncements';
import { announcementAPI } from '../api/announcements';
import { Announcement } from '../types/announcements.ts/announcements';
import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';

function AnnouncementRow({ announcement, onRead }: {
    announcement: Announcement;
    onRead: (id: number) => void;
}) {
    const [submittingRead, setSubmittingRead] = useState(false);

    const handleMarkRead = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (announcement.is_read || submittingRead) return;
        setSubmittingRead(true);
        try {
            await announcementAPI.markRead(announcement.id);
            onRead(announcement.id);
        } finally {
            setSubmittingRead(false);
        }
    };

    return (
        <div className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${announcement.is_read ? 'bg-gray-50' : 'bg-blue-50 border border-blue-100'
            }`}>
            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${announcement.is_system ? 'bg-purple-100' : 'bg-blue-100'
                }`}>
                {announcement.is_system
                    ? <Globe className="h-3.5 w-3.5 text-purple-600" />
                    : <Building2 className="h-3.5 w-3.5 text-blue-600" />
                }
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${announcement.is_read ? 'text-gray-600' : 'text-gray-900'
                        }`}>
                        {announcement.title}
                    </p>
                    {!announcement.is_read && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                    )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{announcement.body}</p>
                <div className="flex items-center gap-2 mt-1.5">
                    {announcement.requires_feedback && !announcement.has_feedback && (
                        <Badge variant="warning" size="sm">Needs response</Badge>
                    )}
                    {!announcement.is_read && (
                        <button
                            onClick={handleMarkRead}
                            disabled={submittingRead}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                            <Check className="h-3 w-3" />
                            Mark read
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export function AnnouncementWidget() {
    const { announcements, loading, markRead } = useAnnouncements();

    const latest = announcements.slice(0, 3);
    const unreadCount = announcements.filter(a => !a.is_read).length;

    if (loading) return (
        <Card>
            <div className="flex items-center gap-3 mb-4">
                <Megaphone className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-semibold text-gray-900">Announcements</h3>
            </div>
            <div className="space-y-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                ))}
            </div>
        </Card>
    );

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Megaphone className="h-5 w-5 text-blue-600" />
                    <h3 className="text-base font-semibold text-gray-900">Announcements</h3>
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <Link
                    href="/announcements"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                    View all <ChevronRight className="h-3.5 w-3.5" />
                </Link>
            </div>

            {latest.length === 0 ? (
                <div className="py-6 text-center">
                    <Megaphone className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No announcements</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {latest.map(a => (
                        <AnnouncementRow
                            key={a.id}
                            announcement={a}
                            onRead={markRead}
                        />
                    ))}
                </div>
            )}
        </Card>
    );
}
'use client';

// ============================================================================
// app/(dashboard)/announcements/page.tsx
//
// Responsibility: fetch via hook, handle modal state, compose components.
// No inline component definitions. No alert(). No direct API calls.
// ============================================================================

import { useState } from 'react';
import { Megaphone, Plus, AlertCircle, MessageSquare } from 'lucide-react';
import { useAnnouncements } from '@/app/plugins/announcements/hooks/useAnnouncements';
import { useAuth } from '@/app/context/AuthContext';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import {
    AnnouncementCard,
    AnnouncementModal,
} from '@/app/plugins/announcements/components/AnnouncementComponents';
import type { Announcement } from '@/app/plugins/announcements/types/announcements';

type Filter = 'all' | 'unread' | 'needs_feedback';

export default function AnnouncementsPage() {
    const { user, activeRole } = useAuth();
    const {
        announcements, loading, error,
        create, update, remove, markRead, submitFeedback,
    } = useAnnouncements();

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Announcement | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [pageError, setPageError] = useState<string | null>(null);

    const isAdmin = activeRole === 'ADMIN' || activeRole === 'SUPERADMIN';
    const isSuperAdmin = !!user?.is_superadmin;

    const filtered = announcements.filter(a => {
        if (filter === 'unread') return !a.is_read;
        if (filter === 'needs_feedback') return a.requires_feedback && !a.has_feedback;
        return true;
    });

    const unreadCount = announcements.filter(a => !a.is_read).length;
    const needsFeedbackCount = announcements.filter(a => a.requires_feedback && !a.has_feedback).length;

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this announcement?')) return;
        try {
            await remove(id);
        } catch {
            setPageError('Failed to delete announcement.');
        }
    };

    const openEdit = (a: Announcement) => { setEditing(a); setShowModal(true); };
    const openCreate = () => { setEditing(null); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditing(null); };

    const tabs: { key: Filter; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'unread', label: `Unread (${unreadCount})` },
        { key: 'needs_feedback', label: `Needs Response (${needsFeedbackCount})` },
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
                    <p className="text-sm text-gray-500 mt-1">Stay informed with the latest updates</p>
                </div>
                {isAdmin && (
                    <Button onClick={openCreate}>
                        <Plus className="h-4 w-4 mr-2" />New Announcement
                    </Button>
                )}
            </div>

            {(error || pageError) && (
                <ErrorBanner
                    message={error ?? pageError ?? ''}
                    onDismiss={() => setPageError(null)}
                />
            )}

            <div className="grid grid-cols-3 gap-4">
                <StatsCard title="Total" value={announcements.length} icon={Megaphone} color="blue" />
                <StatsCard title="Unread" value={unreadCount} icon={AlertCircle} color="yellow" />
                <StatsCard title="Needs Response" value={needsFeedbackCount} icon={MessageSquare} color="red" />
            </div>

            <div className="flex gap-1 bg-gray-100 rounded-xl p-1.5">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${filter === tab.key
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <LoadingSpinner fullScreen={false} message="Loading announcements..." />
            ) : filtered.length === 0 ? (
                <Card>
                    <div className="py-12 text-center">
                        <Megaphone className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No announcements here</p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filtered.map(a => (
                        <AnnouncementCard
                            key={a.id}
                            announcement={a}
                            isAdmin={isAdmin}
                            onMarkRead={markRead}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onFeedback={submitFeedback}
                        />
                    ))}
                </div>
            )}

            {showModal && (
                <AnnouncementModal
                    open={showModal}
                    onClose={closeModal}
                    editing={editing}
                    isSuperAdmin={isSuperAdmin}
                    onCreate={create}
                    onUpdate={update}
                />
            )}
        </div>
    );
}
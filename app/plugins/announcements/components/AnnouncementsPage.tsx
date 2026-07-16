'use client';

// ============================================================================
// app/(dashboard)/announcements/page.tsx
//
// Responsibility: fetch via hook, handle modal state, compose components.
// No inline component definitions. No alert(). No direct API calls.
// ============================================================================

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Megaphone, Plus, AlertCircle, MessageSquare, RotateCcw } from 'lucide-react';
import { useAnnouncements } from '@/app/plugins/announcements/hooks/useAnnouncements';
import { useAuth } from '@/app/context/AuthContext';
import { hasWorkspacePermission } from '@/app/core/lib/productCapabilities';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { ActionMenu } from '@/app/components/ui/ActionMenu';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import {
    AnnouncementCard,
    AnnouncementModal,
} from '@/app/plugins/announcements/components/AnnouncementComponents';
import type { Announcement } from '@/app/plugins/announcements/types/announcements';

type Filter = 'all' | 'unread' | 'needs_feedback';

function parseFilter(value: string | null): Filter {
    if (value === 'unread' || value === 'needs_feedback') {
        return value;
    }

    return 'all';
}

export function AnnouncementsPage() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeRole, capabilities } = useAuth();
    const {
        announcements, loading, error, refetch,
        create, update, remove, markRead, submitFeedback,
    } = useAnnouncements();

    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Announcement | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const filter = parseFilter(searchParams.get('filter'));

    const canManageAnnouncements = hasWorkspacePermission(capabilities, 'announcements.manage');

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

    const openEdit = useCallback((announcement: Announcement) => {
        setEditing(announcement);
        setShowModal(true);
    }, []);
    const openCreate = useCallback(() => {
        setEditing(null);
        setShowModal(true);
    }, []);
    const closeModal = useCallback(() => {
        setShowModal(false);
        setEditing(null);
    }, []);
    const scrollToAnnouncementsList = useCallback(() => {
        document.getElementById('announcements-list')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    }, []);
    const handleFilterChange = useCallback((nextFilter: Filter) => {
        const nextSearchParams = new URLSearchParams(searchParams.toString());

        if (nextFilter === 'all') {
            nextSearchParams.delete('filter');
        } else {
            nextSearchParams.set('filter', nextFilter);
        }

        const nextUrl = nextSearchParams.toString()
            ? `${pathname}?${nextSearchParams.toString()}`
            : pathname;

        router.replace(nextUrl, { scroll: false });
    }, [pathname, router, searchParams]);

    const tabs: { key: Filter; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'unread', label: `Unread (${unreadCount})` },
        { key: 'needs_feedback', label: `Needs Response (${needsFeedbackCount})` },
    ];
    const assistantContext = useMemo(() => ({
        pageKey: 'announcements_overview',
        pageTitle: 'Announcements',
        state: {
            is_loading: loading,
            is_empty: !loading && filtered.length === 0,
            unread_count: unreadCount,
            can_create_announcement: canManageAnnouncements,
            role: activeRole ?? null,
        },
        visibleActions: [
            {
                label: 'Refresh announcements',
                type: 'page_action' as const,
                target: 'refresh_announcements',
                handler: refetch,
            },
            ...(canManageAnnouncements
                ? [{
                    label: 'Create announcement',
                    type: 'page_action' as const,
                    target: 'create_announcement',
                    handler: openCreate,
                }]
                : []),
            ...(filtered.length > 0
                ? [{
                    label: 'View announcement',
                    type: 'page_action' as const,
                    target: 'view_announcement_list',
                    handler: scrollToAnnouncementsList,
                }]
                : []),
        ],
        nextSafeAction: filtered.length > 0
            ? {
                label: 'View announcement',
                type: 'page_action' as const,
                target: 'view_announcement_list',
                handler: scrollToAnnouncementsList,
            }
            : {
                label: 'Refresh announcements',
                type: 'page_action' as const,
                target: 'refresh_announcements',
                handler: refetch,
            },
        workflowStep: unreadCount > 0 ? 'review_announcements' : 'announcements_overview',
        emptyStateReason: !loading && filtered.length === 0
            ? 'No announcements match the current view.'
            : undefined,
    }), [
        activeRole,
        filtered.length,
        canManageAnnouncements,
        loading,
        openCreate,
        refetch,
        scrollToAnnouncementsList,
        unreadCount,
    ]);

    useAssistantPageContext(assistantContext);

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
                    <p className="text-sm text-gray-500 mt-1">Stay informed with the latest updates</p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    {canManageAnnouncements ? (
                        <Button onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-2" />New Announcement
                        </Button>
                    ) : null}
                    <ActionMenu
                        hideLabelOnMobile
                        items={[
                            {
                                label: 'Refresh announcements',
                                onSelect: () => {
                                    void refetch();
                                },
                                icon: <RotateCcw className="h-4 w-4" />,
                            },
                        ]}
                    />
                </div>
            </div>

            {(error || pageError) && (
                <ErrorBanner
                    message={error ?? pageError ?? ''}
                    onDismiss={() => setPageError(null)}
                    autoDismissMs={pageError ? 5000 : false}
                />
            )}

            <div className="md:hidden">
                <div className="flex gap-3 overflow-x-auto pb-1">
                    {[
                        { label: 'Total', value: announcements.length, icon: Megaphone, tone: 'text-blue-700 bg-blue-50 border-blue-200' },
                        { label: 'Unread', value: unreadCount, icon: AlertCircle, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
                        { label: 'Needs Response', value: needsFeedbackCount, icon: MessageSquare, tone: 'text-red-700 bg-red-50 border-red-200' },
                    ].map((stat) => {
                        const Icon = stat.icon;

                        return (
                            <div
                                key={stat.label}
                                className={`min-w-[9rem] rounded-xl border px-3 py-3 ${stat.tone}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span className="text-xs font-medium">{stat.label}</span>
                                </div>
                                <div className="mt-2 text-xl font-semibold">{stat.value}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <StatStrip mdColumns={3}>
                <StatsCard title="Total" value={announcements.length} icon={Megaphone} color="blue" />
                <StatsCard title="Unread" value={unreadCount} icon={AlertCircle} color="yellow" />
                <StatsCard title="Needs Response" value={needsFeedbackCount} icon={MessageSquare} color="red" />
            </StatStrip>

            <div className="sm:hidden">
                <Select
                    label="Show"
                    value={filter}
                    onChange={(event) => handleFilterChange(event.target.value as Filter)}
                    options={tabs.map((tab) => ({
                        value: tab.key,
                        label: tab.label,
                    }))}
                />
            </div>

            <div className="hidden gap-1 rounded-xl bg-gray-100 p-1.5 sm:flex">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => handleFilterChange(tab.key)}
                        className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${filter === tab.key
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
                <div id="announcements-list" className="space-y-3">
                    {filtered.map(a => (
                        <AnnouncementCard
                            key={a.id}
                            announcement={a}
                            isAdmin={canManageAnnouncements}
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
                    allowSystemAnnouncement={false}
                    onCreate={create}
                    onUpdate={update}
                />
            )}
        </div>
    );
}

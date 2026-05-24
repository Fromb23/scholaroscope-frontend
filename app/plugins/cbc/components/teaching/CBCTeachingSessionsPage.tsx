'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    BookOpen,
    Calendar,
    Filter,
    Search,
    Target,
} from 'lucide-react';
import { useCBCTeachingSessionsPage } from '@/app/plugins/cbc/hooks/useCBCTeachingSessionsPage';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import {
    CBCNav,
    CBCBreadcrumb,
    CBCError,
    CBCLoading,
    SessionStatusBadge,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';

const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: 'All statuses' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'MISSED', label: 'Missed' },
];

export function CBCTeachingSessionsPage() {
    const router = useRouter();
    const page = useCBCTeachingSessionsPage();
    const primarySession = page.filtered[0];
    const assistantContext = {
        pageKey: 'cbc_teaching_sessions',
        pageTitle: 'CBC Sessions',
        state: {
            is_loading: page.isLoading,
            is_empty: !page.isLoading && page.filtered.length === 0,
            has_sessions: page.filtered.length > 0,
            session_status: page.statusFilter || null,
            has_subject_filter: false,
            has_cohort_filter: false,
        },
        visibleActions: [
            {
                label: 'Open CBC Teaching',
                type: 'navigate' as const,
                href: '/cbc/teaching',
            },
            {
                label: 'Browse CBC',
                type: 'navigate' as const,
                href: '/cbc/browser',
            },
            {
                label: 'Open CBC Progress',
                type: 'navigate' as const,
                href: '/cbc/progress',
            },
            {
                label: 'Open CBC Results',
                type: 'navigate' as const,
                href: '/cbc/assessment-results',
            },
            ...(primarySession
                ? [{
                    label: 'Open CBC Session',
                    type: 'navigate' as const,
                    href: `/cbc/teaching/sessions/${primarySession.id}/outcomes`,
                }]
                : []),
        ],
        nextSafeAction: primarySession
            ? {
                label: 'Open CBC Session',
                type: 'navigate' as const,
                href: `/cbc/teaching/sessions/${primarySession.id}/outcomes`,
            }
            : {
                label: 'Open CBC Teaching',
                type: 'navigate' as const,
                href: '/cbc/teaching',
            },
        workflowStep: primarySession ? 'open_cbc_session' : 'cbc_session_filters',
        emptyStateReason: !page.isLoading && page.filtered.length === 0
            ? 'No CBC sessions match the current filters.'
            : undefined,
    };

    useAssistantPageContext(assistantContext);

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Teaching', href: '/cbc/teaching' },
                { label: 'All Lessons' },
            ]} />

            <div className="flex items-center gap-3">
                <Link
                    href="/cbc/teaching"
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Back to teaching"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Lessons</h1>
                    <p className="text-gray-500 mt-0.5">View recent lessons and open what was taught.</p>
                </div>
            </div>

            {page.error && <CBCError error={page.error} onRetry={page.refetch} />}

            <Card>
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[240px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={page.search}
                                onChange={event => page.setSearch(event.target.value)}
                                placeholder="Subject, class, or title…"
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Filter className="h-4 w-4 inline mr-1" />Period
                        </label>
                        <select
                            value={page.days}
                            onChange={event => page.setDays(Number(event.target.value))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={7}>Last 7 days</option>
                            <option value={14}>Last 14 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={60}>Last 60 days</option>
                            <option value={90}>Last 90 days</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={page.statusFilter}
                            onChange={event => page.setStatusFilter(event.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {STATUS_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            <Card>
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Lessons</h2>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {page.filtered.length} lesson{page.filtered.length !== 1 ? 's' : ''} found
                        </p>
                    </div>
                    <Badge variant="blue" size="md">{page.filtered.length}</Badge>
                </div>

                {page.isLoading ? (
                    <CBCLoading />
                ) : page.filtered.length === 0 ? (
                    <div className="py-16 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-gray-500 mb-1">No lessons found</p>
                        <p className="text-sm text-gray-400">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {page.filtered.map(session => (
                            <button
                                key={session.id}
                                onClick={() => router.push(`/cbc/teaching/sessions/${session.id}/outcomes`)}
                                className="w-full flex items-center justify-between p-5 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                            >
                                <div className="flex items-center gap-5 min-w-0 flex-1">
                                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 shrink-0">
                                        <BookOpen className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap mb-1">
                                            <h3 className="font-semibold text-gray-900 truncate">
                                                {session.subject_name ?? 'Lesson'}
                                            </h3>
                                            <Badge variant="purple" size="sm">
                                                {new Date(session.session_date).toLocaleDateString('en-GB', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric',
                                                })}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-500 truncate mb-1">{session.cohort_name}</p>
                                        <div className="flex items-center gap-3">
                                            <SessionStatusBadge status={session.status} />
                                            {(session.outcome_links_count ?? 0) > 0 && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Target className="h-3.5 w-3.5" />
                                                    {session.outcome_links_count} learning goal{session.outcome_links_count !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}

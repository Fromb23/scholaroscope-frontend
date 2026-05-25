'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    BookOpen,
    Calendar,
    Clock,
    FileText,
    Plus,
    Target,
    ArrowRight,
} from 'lucide-react';
import { useTodaySessions, useRecentSessions } from '@/app/plugins/cbc/hooks/useCBC';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import {
    CBCNav,
    CBCError,
    CBCLoading,
    SessionStatusBadge,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

function formatDate(value: string) {
    return new Date(value).toLocaleDateString('en-GB', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

export function CBCTeachingPage() {
    const router = useRouter();
    const { data: todaySessions = [], isLoading: loadingToday, error: todayError } = useTodaySessions();
    const { data: recentSessions = [], isLoading: loadingRecent } = useRecentSessions(7);
    const primarySession = todaySessions[0] ?? recentSessions[0];
    const assistantContext = useMemo(() => ({
        pageKey: 'cbc_teaching',
        pageTitle: 'Teaching Workspace',
        state: {
            is_loading: loadingToday || loadingRecent,
            is_empty: !loadingToday && !loadingRecent && todaySessions.length === 0 && recentSessions.length === 0,
            has_sessions: todaySessions.length + recentSessions.length > 0,
            has_subject_filter: false,
            has_cohort_filter: false,
        },
        visibleActions: [
            {
                label: 'Open CBC Sessions',
                type: 'navigate' as const,
                href: '/cbc/teaching/sessions',
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
                label: 'Open CBC Sessions',
                type: 'navigate' as const,
                href: '/cbc/teaching/sessions',
            },
        workflowStep: primarySession ? 'continue_cbc_session' : 'cbc_teaching_overview',
        emptyStateReason: !loadingToday && !loadingRecent && todaySessions.length === 0 && recentSessions.length === 0
            ? 'No CBC teaching sessions are visible yet.'
            : undefined,
    }), [loadingRecent, loadingToday, primarySession, recentSessions.length, todaySessions.length]);

    useAssistantPageContext(assistantContext);

    return (
        <div className="space-y-6">
            <CBCNav />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold theme-text">Teaching Workspace</h1>
                    <p className="mt-1 theme-muted">
                        Manage lessons, record what was taught, and track class performance
                    </p>
                </div>
                <Link href="/cbc/teaching/sessions" className="w-full sm:w-auto">
                    <Button variant="primary" size="md" className="w-full sm:w-auto">
                        <Calendar className="mr-2 h-4 w-4" />All Lessons
                    </Button>
                </Link>
            </div>

            {todayError && <CBCError error={todayError} />}

            <Card>
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="theme-info-surface rounded-lg p-2.5">
                            <Clock className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold theme-text">Today&apos;s Lessons</h2>
                            <p className="text-sm theme-muted">
                                {new Date().toLocaleDateString('en-GB', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </p>
                        </div>
                    </div>
                    <Badge variant="blue" size="lg">
                        {todaySessions.length} lesson{todaySessions.length !== 1 ? 's' : ''}
                    </Badge>
                </div>

                {loadingToday ? (
                    <CBCLoading message="Loading today's lessons…" />
                ) : todaySessions.length === 0 ? (
                    <div className="py-12 text-center">
                        <Calendar className="mx-auto mb-3 h-12 w-12 theme-subtle" />
                        <p className="mb-4 theme-muted">No lessons scheduled for today</p>
                        <Link href="/lesson-plans/new">
                            <Button variant="primary" size="sm">
                                <Plus className="mr-2 h-4 w-4" />Plan a lesson
                            </Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {todaySessions.map(session => (
                            <button
                                key={session.id}
                                onClick={() => router.push(`/cbc/teaching/sessions/${session.id}/outcomes`)}
                                className="theme-border theme-focus-ring theme-hover-border-strong flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all hover:bg-blue-500/10"
                            >
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <div className="theme-info-surface shrink-0 rounded-lg border border-blue-500/20 p-3">
                                        <BookOpen className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate font-semibold theme-text">
                                            {session.subject_name ?? 'Lesson'}
                                        </h3>
                                        <p className="truncate text-sm theme-muted">{session.cohort_name}</p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <SessionStatusBadge status={session.status} />
                                            {(session.outcome_links_count ?? 0) > 0 && (
                                                <span className="flex items-center gap-1 text-xs theme-muted">
                                                    <Target className="h-3.5 w-3.5" />
                                                    {session.outcome_links_count} learning goal{session.outcome_links_count !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <ArrowRight className="h-5 w-5 shrink-0 theme-subtle" />
                            </button>
                        ))}
                    </div>
                )}
            </Card>

            <Card>
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-2.5">
                            <FileText className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold theme-text">Recent Lessons</h2>
                            <p className="text-sm theme-muted">Last 7 days</p>
                        </div>
                    </div>
                </div>

                {loadingRecent ? (
                    <CBCLoading />
                ) : recentSessions.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-sm theme-muted">No recent lessons</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentSessions.slice(0, 6).map(session => (
                            <Link
                                key={session.id}
                                href={`/cbc/teaching/sessions/${session.id}/outcomes`}
                                className="theme-border theme-focus-ring theme-hover-border-strong block rounded-xl border p-4 transition-all hover:bg-purple-500/10"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <Badge variant="purple" size="sm">{formatDate(session.session_date)}</Badge>
                                    <SessionStatusBadge status={session.status} />
                                </div>
                                <h3 className="mb-1 truncate font-medium theme-text">
                                    {session.subject_name ?? 'General'}
                                </h3>
                                <p className="truncate text-sm theme-muted">{session.cohort_name}</p>
                            </Link>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}

'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, ClipboardCheck, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { LoadingMessage, PageSkeleton } from '@/app/components/ui/loading';
import { AcademicSetupDashboard } from '@/app/core/components/academic/setup/AcademicSetupDashboard';
import { useAdminDashboard } from '@/app/core/hooks/useAdminDashboard';
import { useAcademicSetupStatus } from '@/app/core/hooks/useAcademicSetupStatus';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { InstructorDashboard } from '@/app/core/components/dashboard/InstructorDashboard';
import type { Session } from '@/app/core/types/session';
import type { Assessment } from '@/app/core/types/assessment';
import type {
    DashboardAcademicContext,
    DashboardAttentionItem,
    DashboardWeekIndicator,
} from '@/app/core/hooks/useAdminDashboard';

const cardClass = 'theme-card rounded-2xl border theme-border bg-[color:var(--color-surface)] p-5 shadow-sm';

function formatDate(value: string | null): string {
    if (!value) return 'Date not set';
    return new Date(value).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function titleCase(value: string): string {
    return value
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
}

function sessionState(session: Session): string {
    return session.workflow_summary?.lifecycle_label ?? titleCase(session.status);
}

function AcademicContextStrip({ contexts }: { contexts: DashboardAcademicContext[] }) {
    if (contexts.length === 0) {
        return (
            <div className={`${cardClass} text-sm theme-muted`}>
                No active academic context is configured.
            </div>
        );
    }

    return (
        <div className="grid gap-3 md:grid-cols-2">
            {contexts.map(context => (
                <div key={context.key} className={`${cardClass} flex items-center gap-3`}>
                    <CalendarDays className="h-5 w-5 text-[color:var(--color-primary)]" />
                    <div>
                        <p className="text-sm font-semibold theme-text">{context.termName}</p>
                        <p className="text-xs theme-muted">
                            {context.curriculumName} · {context.yearName}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

function TodayTeachingActivity({ sessions }: { sessions: Session[] }) {
    return (
        <section className={cardClass}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold theme-text">Today&apos;s teaching activity</h2>
                    <p className="text-sm theme-muted">Sessions returned by the teaching sessions API.</p>
                </div>
                <Link href="/sessions/today" className="text-sm font-medium theme-link">View all</Link>
            </div>

            {sessions.length === 0 ? (
                <p className="text-sm theme-muted">No teaching sessions scheduled today.</p>
            ) : (
                <div className="space-y-3">
                    {sessions.slice(0, 6).map(session => (
                        <Link
                            key={session.id}
                            href={`/sessions/${session.id}`}
                            className="block rounded-xl border theme-border p-3 transition hover:bg-[color:var(--color-surface-muted)]"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="font-medium theme-text">{session.subject_name}</p>
                                    <p className="text-sm theme-muted">{session.cohort_name}</p>
                                </div>
                                <span className="rounded-full px-2 py-1 text-xs font-medium theme-info-surface">
                                    {sessionState(session)}
                                </span>
                            </div>
                            <p className="mt-2 text-xs theme-subtle">
                                {session.start_time ?? 'Time not set'} · {session.venue || 'Venue not set'}
                            </p>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}

function NeedsAttention({ items }: { items: DashboardAttentionItem[] }) {
    return (
        <section className={cardClass}>
            <div className="mb-4">
                <h2 className="text-lg font-semibold theme-text">Needs attention</h2>
                <p className="text-sm theme-muted">Actionable items from existing administrative data.</p>
            </div>

            {items.length === 0 ? (
                <p className="text-sm theme-muted">No pending operational items found.</p>
            ) : (
                <div className="space-y-3">
                    {items.map(item => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className="flex items-center justify-between gap-3 rounded-xl border theme-border p-3 transition hover:bg-[color:var(--color-surface-muted)]"
                        >
                            <span>
                                <span className="block text-sm font-medium theme-text">{item.label}</span>
                                <span className="block text-xs theme-muted">{item.detail}</span>
                            </span>
                            <ExternalLink className="h-4 w-4 theme-subtle" />
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}

function ThisWeekIndicators({ indicators }: { indicators: DashboardWeekIndicator[] }) {
    if (indicators.length === 0) return null;

    return (
        <section className={cardClass}>
            <h2 className="mb-4 text-lg font-semibold theme-text">This week</h2>
            <div className="grid gap-3 md:grid-cols-3">
                {indicators.map(indicator => {
                    const percentage = Math.round((indicator.numerator / indicator.denominator) * 100);
                    return (
                        <div key={indicator.id} className="rounded-xl border theme-border p-3">
                            <p className="text-sm font-medium theme-text">{indicator.label}</p>
                            <p className="mt-2 text-2xl font-semibold theme-text">{percentage}%</p>
                            <p className="text-xs theme-muted">
                                {indicator.numerator} of {indicator.denominator}
                            </p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function UpcomingAssessments({ assessments }: { assessments: Assessment[] }) {
    if (assessments.length === 0) return null;

    return (
        <section className={cardClass}>
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold theme-text">Upcoming assessments</h2>
                <Link href="/assessments" className="text-sm font-medium theme-link">Open assessments</Link>
            </div>
            <div className="space-y-3">
                {assessments.map(assessment => (
                    <Link
                        key={assessment.id}
                        href={`/assessments/${assessment.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border theme-border p-3 transition hover:bg-[color:var(--color-surface-muted)]"
                    >
                        <span>
                            <span className="block text-sm font-medium theme-text">{assessment.name}</span>
                            <span className="block text-xs theme-muted">
                                {assessment.subject_name} · {assessment.cohort_name}
                            </span>
                        </span>
                        <span className="text-sm font-medium theme-text">{formatDate(assessment.assessment_date)}</span>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function QuickActions() {
    return (
        <section className="grid gap-3 sm:grid-cols-2">
            <Link className={`${cardClass} flex items-center gap-3`} href="/sessions/today">
                <ClipboardCheck className="h-5 w-5 text-[color:var(--color-primary)]" />
                <span className="text-sm font-semibold theme-text">Review today&apos;s sessions</span>
            </Link>
            <Link className={`${cardClass} flex items-center gap-3`} href="/assessments">
                <CalendarDays className="h-5 w-5 text-[color:var(--color-primary)]" />
                <span className="text-sm font-semibold theme-text">Open assessment schedule</span>
            </Link>
        </section>
    );
}

export function AdminDashboard() {
    const router = useRouter();
    const { user, activeOrg, activeRole } = useAuth();
    const instructorAccess = useInstructorCohortAccess();
    const academicSetupQuery = useAcademicSetupStatus({
        enabled: activeRole === 'ADMIN' && Boolean(activeOrg),
    });

    const {
        sessions,
        currentTerm,
        academicContexts,
        attentionItems,
        weekIndicators,
        upcomingAssessments,
        lastRefresh,
        isLoading,
        refresh,
    } = useAdminDashboard();
    const setupStatus = academicSetupQuery.data ?? null;
    const setupIncomplete = Boolean(setupStatus && !setupStatus.complete);
    const assistantContext = useMemo(() => ({
        pageKey: 'admin_dashboard',
        pageTitle: 'Admin Dashboard',
        state: {
            is_loading: isLoading,
            setup_incomplete: setupIncomplete,
            has_current_term: Boolean(currentTerm),
            sessions_today: sessions.length,
        },
        visibleActions: setupIncomplete
            ? [
                {
                    label: setupStatus?.next_action.label ?? 'Open Academic Setup',
                    type: 'navigate' as const,
                    href: setupStatus?.next_action.href ?? '/academic',
                },
            ]
            : [
                { label: 'Review Today’s Sessions', type: 'navigate' as const, href: '/sessions/today' },
                { label: 'Open Assessments', type: 'navigate' as const, href: '/assessments' },
            ],
        nextSafeAction: setupIncomplete
            ? {
                label: setupStatus?.next_action.label ?? 'Open Academic Setup',
                type: 'navigate' as const,
                href: setupStatus?.next_action.href ?? '/academic',
            }
            : { label: 'Review Today’s Sessions', type: 'navigate' as const, href: '/sessions/today' },
        workflowStep: setupIncomplete ? 'academic_setup' : 'school_operations',
        emptyStateReason: setupIncomplete
            ? 'Complete academic setup before operational dashboards unlock.'
            : (!isLoading && !currentTerm
                ? 'No current term is active yet.'
                : undefined),
    }), [currentTerm, isLoading, sessions.length, setupIncomplete, setupStatus]);

    useAssistantPageContext(assistantContext);

    useEffect(() => {
        if (activeRole && activeRole !== 'ADMIN') {
            router.push('/dashboard');
        }
    }, [activeRole, router]);

    if (!user || activeRole === null) return null;
    if (activeRole !== 'ADMIN') return null;
    if (academicSetupQuery.isLoading && !setupStatus) {
        return (
            <div className="space-y-6">
                <LoadingMessage title={`Checking setup for ${activeOrg?.name ?? 'your workspace'}...`} />
                <PageSkeleton variant="dashboard" />
            </div>
        );
    }
    if (setupStatus && !setupStatus.complete) {
        return <AcademicSetupDashboard status={setupStatus} title="Complete Academic Setup" />;
    }
    if (instructorAccess.isSelfManagedTeachingAdmin) {
        return <InstructorDashboard />;
    }
    if (isLoading) {
        return (
            <div className="space-y-6">
                <LoadingMessage title={`Preparing ${activeOrg?.name ?? 'your workspace'} dashboard...`} />
                <PageSkeleton variant="dashboard" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-semibold theme-text">
                            {activeOrg?.name ?? 'Institution dashboard'}
                        </h1>
                        <p className="text-sm theme-muted">
                            Operational view from current sessions, assessments and academic setup data.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={refresh}
                        className="inline-flex items-center gap-2 rounded-xl border theme-border px-4 py-2 text-sm font-medium theme-text transition hover:bg-[color:var(--color-surface-muted)]"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Updated {lastRefresh.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </button>
                </div>
                <AcademicContextStrip contexts={academicContexts} />
            </header>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <TodayTeachingActivity sessions={sessions} />
                <NeedsAttention items={attentionItems} />
            </div>

            <ThisWeekIndicators indicators={weekIndicators} />
            <UpcomingAssessments assessments={upcomingAssessments} />
            <QuickActions />
        </div>
    );
}

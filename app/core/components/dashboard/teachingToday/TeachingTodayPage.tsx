'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Button } from '@/app/components/ui/Button';
import { useAuth } from '@/app/context/AuthContext';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useTeachingToday } from '@/app/core/hooks/useTeachingToday';
import { TeachingTodayAfterTeachingPanel } from './TeachingTodayAfterTeachingPanel';
import { TeachingTodayCalendarNotice } from './TeachingTodayCalendarNotice';
import { TeachingTodayHeader } from './TeachingTodayHeader';
import { TeachingTodayIncompletePanel } from './TeachingTodayIncompletePanel';
import { TeachingTodayNowPanel } from './TeachingTodayNowPanel';
import { TeachingTodaySetupBlockedState } from './TeachingTodaySetupBlockedState';
import { TeachingTodayTimeline } from './TeachingTodayTimeline';

export function TeachingTodayPage() {
    const router = useRouter();
    const { user, activeRole } = useAuth();
    const instructorAccess = useInstructorCohortAccess();
    const {
        context,
        loading,
        error,
        lastRefresh,
        refresh,
    } = useTeachingToday();
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (activeRole && activeRole !== 'INSTRUCTOR') {
            router.push('/dashboard');
        }
    }, [activeRole, router]);

    const pageLoading = loading || instructorAccess.isLoading;
    const setupBlocked = context.learningDayState === 'SETUP_BLOCKED';
    const promoteIncompletePanel = context.incomplete.length >= 5 && context.timeline.length <= 1;

    const assistantContext = useMemo(() => ({
        pageKey: 'teaching_today',
        pageTitle: 'Teaching Today',
        state: {
            is_loading: pageLoading,
            learning_day_state: context.learningDayState,
            today_sessions: context.timeline.length,
            incomplete_records: context.incomplete.length,
            pending_assessment_review: context.afterTeaching.pendingAssessmentReviewCount,
            has_teaching_assignments: context.teachingLoad.length > 0,
        },
        visibleActions: [
            { label: "Open today's sessions", type: 'navigate' as const, href: '/sessions/today' },
            { label: 'Prepare lesson', type: 'navigate' as const, href: '/lesson-plans/new' },
        ],
        nextSafeAction: context.nextAction
            ? {
                label: context.nextAction.primaryLabel,
                type: 'navigate' as const,
                href: context.nextAction.primaryHref,
            }
            : { label: "Open today's sessions", type: 'navigate' as const, href: '/sessions/today' },
        workflowStep: setupBlocked ? 'setup_blocked' : context.learningDayState.toLowerCase(),
        emptyStateReason: !pageLoading && context.timeline.length === 0
            ? 'No sessions are scheduled for today.'
            : undefined,
    }), [
        context.afterTeaching.pendingAssessmentReviewCount,
        context.incomplete.length,
        context.learningDayState,
        context.nextAction,
        context.teachingLoad.length,
        context.timeline.length,
        pageLoading,
        setupBlocked,
    ]);

    useAssistantPageContext(assistantContext);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refresh();
        } finally {
            setRefreshing(false);
        }
    };

    if (!user || activeRole === null) return null;
    if (activeRole !== 'INSTRUCTOR') return null;
    if (pageLoading) return <LoadingSpinner message="Opening Teaching Today..." />;

    return (
        <div className="mx-auto max-w-7xl space-y-5 px-0 sm:space-y-6">
            <TeachingTodayHeader
                context={context}
                lastRefresh={lastRefresh}
                onRefresh={() => void handleRefresh()}
                refreshing={refreshing}
            />

            {error ? (
                <section className="rounded-lg border border-yellow-200 theme-warning-surface p-4" aria-live="polite">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-warning)]" />
                            <div>
                                <p className="text-sm font-semibold theme-text">
                                    Some Teaching Today information could not be refreshed.
                                </p>
                                <p className="mt-1 text-sm theme-muted">{error}</p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full sm:w-auto"
                            onClick={() => void handleRefresh()}
                            disabled={refreshing}
                        >
                            Retry
                        </Button>
                    </div>
                </section>
            ) : null}

            {setupBlocked ? (
                <>
                    <TeachingTodaySetupBlockedState setupStatus={context.setupStatus} />
                    {context.incomplete.length > 0 ? (
                        <TeachingTodayIncompletePanel items={context.incomplete} />
                    ) : null}
                    {context.afterTeaching.pendingAssessmentReviewCount > 0 ? (
                        <TeachingTodayAfterTeachingPanel afterTeaching={context.afterTeaching} />
                    ) : null}
                </>
            ) : (
                <>
                    <TeachingTodayCalendarNotice context={context} />
                    <TeachingTodayNowPanel action={context.nextAction} />
                    {promoteIncompletePanel ? (
                        <>
                            <TeachingTodayIncompletePanel items={context.incomplete} />
                            <section className="grid gap-5 xl:grid-cols-12 xl:gap-6" aria-label="Today teaching follow-up">
                                <div className="xl:col-span-7">
                                    <TeachingTodayTimeline context={context} />
                                </div>
                                <div className="xl:col-span-5">
                                    <TeachingTodayAfterTeachingPanel afterTeaching={context.afterTeaching} />
                                </div>
                            </section>
                        </>
                    ) : (
                        <section className="grid gap-5 xl:grid-cols-12 xl:gap-6" aria-label="Today teaching diary">
                            <div className="space-y-5 xl:col-span-7 xl:space-y-6">
                                <TeachingTodayTimeline context={context} />
                                <TeachingTodayAfterTeachingPanel afterTeaching={context.afterTeaching} />
                            </div>
                            <aside className="space-y-5 xl:col-span-5 xl:space-y-6">
                                <TeachingTodayIncompletePanel items={context.incomplete} />
                            </aside>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}

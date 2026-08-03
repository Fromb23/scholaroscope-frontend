'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Button } from '@/app/components/ui/Button';
import { useAuth } from '@/app/context/AuthContext';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useAcademicLifecycleContext } from '@/app/core/hooks/useAcademic';
import { useTeachingToday } from '@/app/core/hooks/useTeachingToday';
import { getTeachingTodaySectionVisibility } from '@/app/core/lib/teachingTodayVisibility';
import { AcademicTransitionPrompt } from '@/app/core/components/academic/AcademicTransitionPrompt';
import { AcademicBreakDashboard } from './AcademicBreakDashboard';
import { TeachingTodayAfterTeachingPanel } from './TeachingTodayAfterTeachingPanel';
import { TeachingTodayCalendarNotice } from './TeachingTodayCalendarNotice';
import { TeachingTodayHeader } from './TeachingTodayHeader';
import { TeachingTodayIncompletePanel } from './TeachingTodayIncompletePanel';
import { TeachingTodayNowPanel } from './TeachingTodayNowPanel';
import { TeachingTodaySetupBlockedState } from './TeachingTodaySetupBlockedState';
import { TeachingTodayTimeline } from './TeachingTodayTimeline';

export function TeachingTodayPage() {
    const router = useRouter();
    const { user, activeOperatingContext, capabilities } = useAuth();
    const instructorAccess = useInstructorCohortAccess();
    const {
        context,
        loading,
        error,
        lastRefresh,
        refresh,
    } = useTeachingToday();
    const academicLifecycleQuery = useAcademicLifecycleContext({
        enabled: activeOperatingContext === 'MY_TEACHING' && Boolean(capabilities.can_teach),
    });
    const [refreshing, setRefreshing] = useState(false);
    const isTeachingActor = instructorAccess.isTeachingActor;

    useEffect(() => {
        if (activeOperatingContext === 'MY_TEACHING' && !isTeachingActor) {
            router.push('/dashboard');
        }
    }, [activeOperatingContext, isTeachingActor, router]);

    const pageLoading = loading || instructorAccess.isLoading;
    const setupBlocked = context.learningDayState === 'SETUP_BLOCKED';
    const academicBreakVariant = context.todayMode?.mode === 'MIDTERM_BREAK'
        ? 'break'
        : context.todayMode?.mode === 'MIDTERM_EXAM'
            ? 'exam'
            : null;
    const promoteIncompletePanel = context.incomplete.length >= 5 && context.timeline.length <= 1;
    const sectionVisibility = useMemo(
        () => getTeachingTodaySectionVisibility(context),
        [context]
    );
    const showQuietEmptyState = sectionVisibility.showQuietEmptyState && !error;

    const assistantContext = useMemo(() => ({
        pageKey: 'teaching_today',
        pageTitle: academicBreakVariant === 'break' ? 'Midterm Break' : academicBreakVariant === 'exam' ? 'Midterm Exams' : 'Teaching Today',
        state: {
            is_loading: pageLoading,
            learning_day_state: context.learningDayState,
            today_sessions: context.timeline.length,
            incomplete_records: context.incomplete.length,
            pending_assessment_review: context.afterTeaching.pendingAssessmentReviewCount,
            has_teaching_assignments: context.teachingLoad.length > 0,
            academic_today_mode: context.todayMode?.mode ?? 'UNKNOWN',
        },
        visibleActions: [
            ...(sectionVisibility.hasTodaySessions
                ? [{ label: "Open today's sessions", type: 'navigate' as const, href: '/sessions/today' }]
                : []),
            ...(context.actionEligibility.createNewWorkAllowed
                ? [{ label: 'Prepare lesson', type: 'navigate' as const, href: '/lesson-plans/new' }]
                : []),
            ...(context.teachingLoad.length > 0
                ? [{ label: 'View classes', type: 'navigate' as const, href: '/academic/cohorts' }]
                : []),
        ],
        nextSafeAction: sectionVisibility.hasActionableWork && context.nextAction
            ? {
                label: context.nextAction.primaryLabel,
                type: 'navigate' as const,
                href: context.nextAction.primaryHref,
            }
            : undefined,
        workflowStep: setupBlocked ? 'setup_blocked' : context.learningDayState.toLowerCase(),
        emptyStateReason: !pageLoading && !error && context.timeline.length === 0
            ? 'No sessions are scheduled for today.'
            : undefined,
    }), [
        academicBreakVariant,
        context.actionEligibility.createNewWorkAllowed,
        context.afterTeaching.pendingAssessmentReviewCount,
        context.incomplete.length,
        context.learningDayState,
        context.nextAction,
        context.teachingLoad.length,
        context.timeline.length,
        context.todayMode?.mode,
        error,
        pageLoading,
        sectionVisibility.hasActionableWork,
        sectionVisibility.hasTodaySessions,
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

    if (!user || activeOperatingContext !== 'MY_TEACHING') return null;
    if (!isTeachingActor) return null;
    if (pageLoading) return <LoadingSpinner message="Opening Teaching Today..." />;

    if (academicBreakVariant) {
        return (
            <AcademicBreakDashboard
                context={context}
                lastRefresh={lastRefresh}
                onRefresh={() => void handleRefresh()}
                refreshing={refreshing}
                variant={academicBreakVariant}
            />
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-5 px-0 sm:space-y-6">
            <TeachingTodayHeader
                context={context}
                lastRefresh={lastRefresh}
                onRefresh={() => void handleRefresh()}
                refreshing={refreshing}
            />

            {!sectionVisibility.hasPageLifecycleNotice ? (
                <AcademicTransitionPrompt
                    context={academicLifecycleQuery.data}
                    actor={instructorAccess.isSelfManagedTeachingAdmin ? 'self_managed' : 'instructor'}
                />
            ) : null}

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
                    {sectionVisibility.showIncompletePanel ? (
                        <TeachingTodayIncompletePanel items={context.incomplete} />
                    ) : null}
                    {sectionVisibility.showAfterTeachingPanel ? (
                        <TeachingTodayAfterTeachingPanel afterTeaching={context.afterTeaching} />
                    ) : null}
                </>
            ) : (
                <>
                    <TeachingTodayCalendarNotice context={context} />
                    {sectionVisibility.showNowPanel ? (
                        <TeachingTodayNowPanel action={context.nextAction} />
                    ) : null}
                    {showQuietEmptyState ? (
                        <section className="rounded-2xl border theme-border theme-card p-5 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold theme-text">
                                        No teaching work needs attention today.
                                    </p>
                                    <p className="mt-1 text-sm theme-muted">
                                        There are no sessions, incomplete records or follow-up items for the selected day.
                                    </p>
                                </div>
                                {context.teachingLoad.length > 0 ? (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => router.push('/academic/cohorts')}
                                    >
                                        View classes
                                    </Button>
                                ) : null}
                            </div>
                        </section>
                    ) : null}
                    {promoteIncompletePanel && sectionVisibility.showIncompletePanel ? (
                        <>
                            <TeachingTodayIncompletePanel items={context.incomplete} />
                            {sectionVisibility.showTimeline || sectionVisibility.showAfterTeachingPanel ? (
                                <section className="grid gap-5 xl:grid-cols-12 xl:gap-6" aria-label="Today teaching follow-up">
                                    {sectionVisibility.showTimeline ? (
                                        <div className="xl:col-span-7">
                                            <TeachingTodayTimeline context={context} />
                                        </div>
                                    ) : null}
                                    {sectionVisibility.showAfterTeachingPanel ? (
                                        <div className="xl:col-span-5">
                                            <TeachingTodayAfterTeachingPanel afterTeaching={context.afterTeaching} />
                                        </div>
                                    ) : null}
                                </section>
                            ) : null}
                        </>
                    ) : (
                        sectionVisibility.showTimeline
                        || sectionVisibility.showAfterTeachingPanel
                        || sectionVisibility.showIncompletePanel
                    ) ? (
                        <section className="grid gap-5 xl:grid-cols-12 xl:gap-6" aria-label="Today teaching diary">
                            {sectionVisibility.showTimeline || sectionVisibility.showAfterTeachingPanel ? (
                                <div className="space-y-5 xl:col-span-7 xl:space-y-6">
                                    {sectionVisibility.showTimeline ? (
                                        <TeachingTodayTimeline context={context} />
                                    ) : null}
                                    {sectionVisibility.showAfterTeachingPanel ? (
                                        <TeachingTodayAfterTeachingPanel afterTeaching={context.afterTeaching} />
                                    ) : null}
                                </div>
                            ) : null}
                            {sectionVisibility.showIncompletePanel ? (
                                <aside className="space-y-5 xl:col-span-5 xl:space-y-6">
                                    <TeachingTodayIncompletePanel items={context.incomplete} />
                                </aside>
                            ) : null}
                        </section>
                    ) : null}
                </>
            )}
        </div>
    );
}

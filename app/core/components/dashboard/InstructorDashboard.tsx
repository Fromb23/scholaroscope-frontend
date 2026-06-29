'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, BookOpen, CalendarCheck, ClipboardList, GraduationCap, Settings, Users } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ActionMenu, type ActionMenuItem } from '@/app/components/ui/ActionMenu';
import { LoadingMessage, PageSkeleton } from '@/app/components/ui/loading';
import { useInstructorDashboard } from '@/app/core/hooks/useInstructorDashboard';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useSessionLifecycleReminders } from '@/app/core/hooks/useSessionLifecycleReminders';
import { SessionReminderPanelContent } from '@/app/core/components/dashboard/SessionReminderPanel';
import { TeacherNextActionPanel } from '@/app/core/components/dashboard/TeacherNextActionPanel';
import {
    InstructorHeader,
    InstructorAlertsBanner,
    TodayScheduleCard,
    LearnersAtRisk,
    AssessmentsSummaryCard,
} from '@/app/core/components/dashboard/InstructorDashboardWidgets';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import {
    buildTeachingActionQueue,
    type TeachingActionItem,
    type TeachingActionQueue,
} from '@/app/core/lib/teachingActionQueue';

export interface FreelanceDashboardAction {
    label: string;
    href: string;
}

export function getFreelanceDashboardPrimaryActions(): FreelanceDashboardAction[] {
    return [
        { label: 'Lesson preparations', href: '/lesson-plans' },
        { label: 'My classes', href: '/academic/cohorts' },
        { label: 'Teaching record', href: '/sessions' },
        { label: 'Reports / progress', href: '/reports/instructor' },
    ];
}

export function getFreelanceDashboardMoreActions(): FreelanceDashboardAction[] {
    return [
        { label: 'Academic Setup', href: '/academic' },
        { label: 'Manage class subjects', href: '/academic/cohorts' },
        { label: 'Learners', href: '/learners' },
        { label: 'Settings', href: '/admin/settings' },
    ];
}

const freelanceActionIcons = {
    'Lesson preparations': <ClipboardList className="h-4 w-4" />,
    'My classes': <GraduationCap className="h-4 w-4" />,
    'Teaching record': <CalendarCheck className="h-4 w-4" />,
    'Reports / progress': <BarChart3 className="h-4 w-4" />,
} satisfies Record<string, ReactNode>;

const freelanceMoreActionIcons = {
    'Academic Setup': <BookOpen className="h-4 w-4" />,
    'Manage class subjects': <GraduationCap className="h-4 w-4" />,
    Learners: <Users className="h-4 w-4" />,
    Settings: <Settings className="h-4 w-4" />,
} satisfies Record<string, ReactNode>;

function TeachingFollowUpQueue({ queue }: { queue: TeachingActionQueue }) {
    const followUps = queue.supportingActions.slice(0, 5);

    if (followUps.length === 0) {
        return null;
    }

    return (
        <Card className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold theme-text">Polite follow-up queue</h2>
                    <p className="mt-1 text-sm theme-muted">
                        These items remain here until they are completed, stored, finalized, cancelled, or dismissed.
                    </p>
                </div>
                <Badge variant="orange">
                    {queue.unfinishedWorkCount} unfinished
                </Badge>
            </div>
            <div className="space-y-2">
                {followUps.map((action) => (
                    <Link
                        key={action.dedupeKey}
                        href={action.primaryHref}
                        className="block rounded-lg border theme-border theme-surface-muted px-4 py-3 transition-colors theme-hover-surface"
                    >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold theme-text">{action.title}</p>
                                <p className="mt-1 line-clamp-2 text-xs theme-muted">{action.description}</p>
                            </div>
                            <Badge
                                variant={action.urgency === 'danger' ? 'red' : action.urgency === 'warning' ? 'orange' : 'blue'}
                                size="sm"
                                className="self-start sm:self-center"
                            >
                                {action.stageLabel}
                            </Badge>
                        </div>
                    </Link>
                ))}
            </div>
        </Card>
    );
}

function TeachingWorkspaceCard({
    actions,
    moreActions,
    quiet,
}: {
    actions: FreelanceDashboardAction[];
    moreActions: ActionMenuItem[];
    quiet: boolean;
}) {
    return (
        <Card className={quiet ? 'theme-success-surface' : 'theme-surface-muted'}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h2 className="text-base font-semibold theme-text">My teaching workspace</h2>
                    <p className="mt-1 text-sm theme-muted">
                        {quiet
                            ? 'No urgent teaching action is waiting. Setup and workspace tools are ready.'
                            : 'Daily teaching work stays first. Setup and workspace controls remain available under More.'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {actions.map((action, index) => (
                        <Link
                            key={action.label}
                            href={action.href}
                            className={quiet || index <= 1 ? 'inline-flex' : 'hidden sm:inline-flex'}
                        >
                            <Button
                                variant={quiet && index === 0 ? 'primary' : 'secondary'}
                                size="sm"
                            >
                                {freelanceActionIcons[action.label as keyof typeof freelanceActionIcons]}
                                {action.label}
                            </Button>
                        </Link>
                    ))}
                    <ActionMenu
                        items={moreActions}
                        buttonLabel="More"
                        ariaLabel="Open more workspace actions"
                        align="right"
                        hideLabelOnMobile={false}
                    />
                </div>
            </div>
        </Card>
    );
}


export function InstructorDashboard() {
    const router = useRouter();
    const { user, activeOrg, activeRole } = useAuth();
    const instructorAccess = useInstructorCohortAccess();
    const isTeachingDashboardActor = instructorAccess.isTeachingActor;

    const {
        metrics, alerts, sessions, teachingCohorts,
        currentTerm, currentYear,
        lastRefresh, isLoading, refresh, teachingLoad,
        attendanceRiskLoading, attendanceRiskError,
        pendingReviewRows,
        assignmentWork,
    } = useInstructorDashboard();
    const sessionReminderState = useSessionLifecycleReminders();

    const hasTeachingAssignments = teachingLoad.length > 0;
    const dashboardLoading = isLoading || instructorAccess.isLoading || sessionReminderState.loading;
    const freelancePrimaryActions = useMemo(() => getFreelanceDashboardPrimaryActions(), []);
    const freelanceMoreActions = useMemo<ActionMenuItem[]>(
        () => getFreelanceDashboardMoreActions().map((action) => ({
            label: action.label,
            href: action.href,
            icon: freelanceMoreActionIcons[action.label as keyof typeof freelanceMoreActionIcons],
        })),
        [],
    );
    const teachingActionQueue = useMemo(
        () => buildTeachingActionQueue({
            sessions,
            sessionReminders: sessionReminderState.reminders,
            assignmentWork,
            pendingAssessmentRows: pendingReviewRows,
            pendingAssessmentReviewCount: metrics.assessments.needsGrading,
            learnerSupportCount: metrics.performance.needsSupport,
            attendanceRiskCount: metrics.attendance.riskLearnerCount,
            teachingLoadCount: teachingLoad.length,
            workspaceShortcuts: instructorAccess.isSelfManagedTeachingAdmin
                ? freelancePrimaryActions.map((action) => ({
                    id: action.label.toLowerCase().replace(/\W+/g, '-'),
                    label: action.label,
                    href: action.href,
                    description: 'Open this workspace area.',
                }))
                : undefined,
        }),
        [
            assignmentWork,
            freelancePrimaryActions,
            instructorAccess.isSelfManagedTeachingAdmin,
            metrics.assessments.needsGrading,
            metrics.attendance.riskLearnerCount,
            metrics.performance.needsSupport,
            pendingReviewRows,
            sessionReminderState.reminders,
            sessions,
            teachingLoad.length,
        ]
    );
    const hiddenSecondaryActions = useMemo(
        () => teachingActionQueue.primaryAction?.secondaryActions.slice(1).map((action) => action.label) ?? [],
        [teachingActionQueue.primaryAction]
    );
    const assistantContext = useMemo(() => ({
        pageKey: 'instructor_dashboard',
        pageTitle: 'Teaching Today',
        state: {
            is_loading: dashboardLoading,
            has_teaching_assignments: hasTeachingAssignments,
            today_lessons: sessions.length,
            needs_grading: metrics.assessments.needsGrading,
            needs_support: metrics.performance.needsSupport,
            current_stage: teachingActionQueue.primaryAction?.stageLabel ?? 'Quiet',
            primary_next_action: teachingActionQueue.primaryAction?.primaryLabel ?? null,
            hidden_secondary_actions: hiddenSecondaryActions,
            unfinished_work_count: teachingActionQueue.unfinishedWorkCount,
            dashboard_quiet: teachingActionQueue.quiet,
        },
        visibleActions: teachingActionQueue.actions.slice(0, 4).map((action: TeachingActionItem) => ({
            label: action.primaryLabel,
            type: 'navigate' as const,
            href: action.primaryHref,
        })),
        nextSafeAction: teachingActionQueue.primaryAction
            ? {
                label: teachingActionQueue.primaryAction.primaryLabel,
                type: 'navigate' as const,
                href: teachingActionQueue.primaryAction.primaryHref,
            }
            : { label: 'View My Classes', type: 'navigate' as const, href: '/academic/cohorts' },
        workflowStep: teachingActionQueue.quiet ? 'quiet_dashboard' : 'active_teaching_memory',
        emptyStateReason: !dashboardLoading && !hasTeachingAssignments
            ? 'No teaching assignments are visible yet.'
            : undefined,
    }), [
        dashboardLoading,
        hasTeachingAssignments,
        metrics.assessments.needsGrading,
        metrics.performance.needsSupport,
        sessions.length,
        teachingActionQueue,
        hiddenSecondaryActions,
    ]);

    useAssistantPageContext(assistantContext);

    useEffect(() => {
        if (activeRole && !isTeachingDashboardActor) {
            router.push('/dashboard');
        }
    }, [activeRole, isTeachingDashboardActor, router]);

    if (!user || activeRole === null) return null;
    if (!isTeachingDashboardActor) return null;
    if (dashboardLoading) {
        return (
            <div className="max-w-[1800px] mx-auto space-y-6">
                <LoadingMessage title={`Preparing ${activeOrg?.name ?? 'your'} teaching dashboard...`} />
                <PageSkeleton variant="dashboard" />
            </div>
        );
    }

    return (
        <div className="max-w-[1800px] mx-auto space-y-6">
            <InstructorHeader
                firstName={user.first_name || 'Teacher'}
                termName={currentTerm?.name ?? 'No active term'}
                yearName={currentYear?.name ?? String(new Date().getFullYear())}
                lastRefresh={lastRefresh}
                onRefresh={refresh}
            />
            <TeacherNextActionPanel
                queue={teachingActionQueue}
                alerts={alerts}
                metrics={metrics}
                teachingCohorts={teachingCohorts}
                currentTerm={currentTerm}
                currentYear={currentYear}
                todayLessonCount={sessions.length}
            />
            <TeachingFollowUpQueue queue={teachingActionQueue} />
            <SessionReminderPanelContent
                reminders={sessionReminderState.reminders}
                needsClosingCount={sessionReminderState.needsClosingCount}
                unfinishedCount={sessionReminderState.unfinishedCount}
                loading={sessionReminderState.loading}
                error={sessionReminderState.error}
                refetch={sessionReminderState.refetch}
                queue={teachingActionQueue}
            />
            <InstructorAlertsBanner alerts={alerts} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <TodayScheduleCard sessions={sessions} queue={teachingActionQueue} />
                    <LearnersAtRisk
                        needsSupport={metrics.performance.needsSupport}
                        attendanceRiskCount={metrics.attendance.riskCount}
                        attendanceRiskLearnerCount={metrics.attendance.riskLearnerCount}
                        attendanceRiskLoading={attendanceRiskLoading}
                        attendanceRiskError={attendanceRiskError}
                    />
                </div>
                <AssessmentsSummaryCard
                    needsGrading={metrics.assessments.needsGrading}
                    upcomingAssessments={metrics.assessments.upcoming}
                    pendingReviewRows={pendingReviewRows}
                    queue={teachingActionQueue}
                />
            </div>
            {instructorAccess.isSelfManagedTeachingAdmin ? (
                <TeachingWorkspaceCard
                    actions={freelancePrimaryActions}
                    moreActions={freelanceMoreActions}
                    quiet={teachingActionQueue.quiet}
                />
            ) : null}
        </div>
    );
}

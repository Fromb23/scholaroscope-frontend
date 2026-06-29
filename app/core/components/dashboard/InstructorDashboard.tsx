'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    AlertCircle,
    BarChart3,
    BookOpen,
    CalendarCheck,
    CalendarDays,
    ClipboardList,
    FileText,
    GraduationCap,
    Paperclip,
    Settings,
    Users,
} from 'lucide-react';
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
    shouldRenderLearnerRiskMemory,
    shouldRenderAssessmentsSummaryCard,
} from '@/app/core/components/dashboard/InstructorDashboardWidgets';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import {
    buildTeachingActionQueue,
    type TeachingActionItem,
    type TeachingActionQueue,
} from '@/app/core/lib/teachingActionQueue';
import type { AssignmentTeachingTodayItem } from '@/app/core/types/assignments';

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
    const followUps = queue.supportingActions
        .filter((action) => action.objectType !== 'assignment')
        .slice(0, 5);

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

const ASSIGNMENT_WORK_VISIBLE_LIMIT = 5;

function isLessonOriginatedAssignment(item: AssignmentTeachingTodayItem): boolean {
    return item.source === 'lesson_preparation' || item.lesson_plan !== null;
}

function getAssignmentSourceLabel(item: AssignmentTeachingTodayItem): string {
    if (isLessonOriginatedAssignment(item)) {
        return 'Prepared from lesson plan';
    }

    if (item.source === 'session') {
        return 'Created from lesson';
    }

    if (item.source === 'quick_follow_up') {
        return 'Quick follow-up';
    }

    return 'Assignment work';
}

function getAssignmentWorkStageLabel(item: AssignmentTeachingTodayItem): string {
    if (item.evidence_blocked || item.next_action === 'RECORD_EVIDENCE') {
        return 'Evidence pending';
    }

    if (item.next_action === 'STORE_RECORD') {
        return 'Ready to store';
    }

    switch (item.next_action) {
        case 'ISSUE_ASSIGNMENT':
            return 'Prepared learner task';
        case 'RECORD_SUBMISSION':
            return item.counts.submissions > 0 ? 'Needs learner responses' : 'Issued learner task';
        case 'REVIEW_WORK':
            return 'Needs review';
        case 'FINISH_LEARNER_WORK':
            return 'Issued learner task';
        default:
            break;
    }

    switch (item.lifecycle_stage) {
        case 'PREPARING':
            return 'Prepared learner task';
        case 'ISSUED':
            return 'Issued learner task';
        case 'REVIEWING':
            return 'Needs review';
        case 'STORED':
            return 'Stored';
        default:
            return item.teacher_stage_label;
    }
}

function getAssignmentWorkOpenReason(item: AssignmentTeachingTodayItem): string {
    if (item.evidence_blocked || item.next_action === 'RECORD_EVIDENCE') {
        return 'Evidence needs attention before this record can be stored.';
    }

    switch (item.next_action) {
        case 'ISSUE_ASSIGNMENT':
            return 'This learner task was prepared but has not been issued.';
        case 'RECORD_SUBMISSION':
            return 'Learners are expected to respond. Record responses when work is collected.';
        case 'REVIEW_WORK':
            return 'Learner responses are waiting for review.';
        case 'STORE_RECORD':
            return 'Reviewed learner work is ready to store as evidence.';
        case 'MANAGE_GROUPS':
            return 'Assignment groups need setup before learners can work.';
        case 'MARK_PARTICIPATION':
            return 'Group participation needs confirmation before review is complete.';
        case 'FINISH_LEARNER_WORK':
            return 'Learner work is still open. Close it when responses are collected.';
        default:
            return item.next_action_label
                ? `${item.teacher_stage_label}: ${item.next_action_label}.`
                : `${item.teacher_stage_label} still needs attention.`;
    }
}

function formatAssignmentWorkDate(value: string | null): string | null {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function getAssignmentWorkListHref(actions: TeachingActionItem[]): string {
    const cohortIds = new Set(
        actions
            .map((action) => action.assignmentWork?.cohort.id)
            .filter((cohortId): cohortId is number => typeof cohortId === 'number')
    );

    if (cohortIds.size === 1) {
        return `/academic/cohorts/${Array.from(cohortIds)[0]}/assignments`;
    }

    return '/academic/cohorts';
}

function TeachingAssignmentWorkPanel({ queue }: { queue: TeachingActionQueue }) {
    const assignmentActions = queue.actions.filter((action) => (
        action.objectType === 'assignment'
        && action.assignmentWork
        && action.assignmentWork.lifecycle_stage !== 'STORED'
    ));

    if (assignmentActions.length === 0) {
        return null;
    }

    const visibleActions = assignmentActions.slice(0, ASSIGNMENT_WORK_VISIBLE_LIMIT);
    const collapsedCount = Math.max(assignmentActions.length - visibleActions.length, 0);
    const allAssignmentWorkHref = getAssignmentWorkListHref(assignmentActions);

    return (
        <Card className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-[color:var(--color-primary)]" />
                        <h2 className="text-base font-semibold theme-text">Active learner tasks</h2>
                    </div>
                    <p className="mt-1 text-sm theme-muted">
                        Open assignment work carried from preparation, issuing, responses, review, evidence, and storage.
                    </p>
                </div>
                <Badge variant="blue">
                    {assignmentActions.length} open
                </Badge>
            </div>

            <div className="space-y-3">
                {visibleActions.map((action) => {
                    const item = action.assignmentWork;
                    if (!item) {
                        return null;
                    }

                    const isPrimaryActionObject = queue.primaryAction?.objectKey === action.objectKey;
                    const lessonOriginated = isLessonOriginatedAssignment(item);
                    const dueDate = formatAssignmentWorkDate(item.due_at);
                    const sourceLabel = getAssignmentSourceLabel(item);
                    const stageLabel = getAssignmentWorkStageLabel(item);
                    const blocker = item.evidence_blocked
                        ? item.evidence_blocked_reason || 'Evidence needs attention before this record can be stored.'
                        : item.blocking_items[0] ?? null;
                    const menuItems: ActionMenuItem[] = action.secondaryActions.map((secondaryAction) => ({
                        label: secondaryAction.label,
                        href: secondaryAction.href,
                        destructive: secondaryAction.destructive,
                    }));

                    return (
                        <div
                            key={action.dedupeKey}
                            className="rounded-lg border theme-border theme-surface-muted px-4 py-3"
                        >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 flex-1 space-y-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="break-words text-sm font-semibold theme-text">{item.title}</p>
                                            {lessonOriginated ? (
                                                <p className="mt-1 text-sm theme-muted">
                                                    Learner task from lesson preparation
                                                </p>
                                            ) : null}
                                        </div>
                                        <Badge
                                            variant={lessonOriginated ? 'green' : 'blue'}
                                            size="sm"
                                            className="shrink-0 self-start"
                                        >
                                            {sourceLabel}
                                        </Badge>
                                    </div>

                                    <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Subject</p>
                                            <p className="mt-1 break-words font-medium theme-text">{item.subject.name}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Class</p>
                                            <p className="mt-1 break-words font-medium theme-text">{item.cohort.name}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Stage</p>
                                            <p className="mt-1 break-words font-medium theme-text">{stageLabel}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Next</p>
                                            <p className="mt-1 break-words font-medium theme-text">{action.primaryLabel}</p>
                                        </div>
                                    </div>

                                    <p className="text-sm theme-muted">
                                        {getAssignmentWorkOpenReason(item)}
                                    </p>

                                    <div className="flex flex-col gap-2 text-xs theme-muted sm:flex-row sm:flex-wrap sm:items-center">
                                        <span className="inline-flex min-w-0 items-center gap-1.5">
                                            <BookOpen className="h-3.5 w-3.5 shrink-0 theme-subtle" />
                                            <span className="min-w-0 break-words">
                                                {item.subject.name} with {item.cohort.name}
                                            </span>
                                        </span>
                                        {dueDate ? (
                                            <span className="inline-flex min-w-0 items-center gap-1.5">
                                                <CalendarDays className="h-3.5 w-3.5 shrink-0 theme-subtle" />
                                                <span>Due {dueDate}</span>
                                            </span>
                                        ) : null}
                                        {item.lesson_plan ? (
                                            <span className="inline-flex min-w-0 items-center gap-1.5">
                                                <FileText className="h-3.5 w-3.5 shrink-0 theme-subtle" />
                                                <span className="min-w-0 break-words">{item.lesson_plan.title}</span>
                                            </span>
                                        ) : null}
                                        {item.requires_attachments ? (
                                            <span className="inline-flex min-w-0 items-center gap-1.5">
                                                <Paperclip className="h-3.5 w-3.5 shrink-0 theme-subtle" />
                                                <span>Attachment evidence expected</span>
                                            </span>
                                        ) : null}
                                    </div>

                                    {blocker ? (
                                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                            <span>{blocker}</span>
                                        </div>
                                    ) : null}
                                </div>

                                <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[190px]">
                                    {isPrimaryActionObject ? (
                                        <div className="rounded-lg border theme-border bg-white/70 px-3 py-2 text-center text-sm font-medium theme-text">
                                            Shown above
                                        </div>
                                    ) : (
                                        <Link href={action.primaryHref} className="w-full">
                                            <Button type="button" className="w-full">
                                                {action.primaryLabel}
                                            </Button>
                                        </Link>
                                    )}
                                    {menuItems.length > 0 ? (
                                        <ActionMenu
                                            items={menuItems}
                                            buttonLabel="More"
                                            ariaLabel={`Open more actions for ${item.title}`}
                                            className="w-full"
                                            menuClassName="w-full"
                                            hideLabelOnMobile={false}
                                        />
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {collapsedCount > 0 ? (
                <div className="flex flex-col gap-3 rounded-lg border theme-border theme-surface-elevated px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm theme-muted">
                        {collapsedCount} more learner task{collapsedCount === 1 ? '' : 's'} still need attention.
                    </p>
                    <Link href={allAssignmentWorkHref} className="w-full sm:w-auto">
                        <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto">
                            View all assignment work
                        </Button>
                    </Link>
                </div>
            ) : null}
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
        metrics, alerts, sessions, assessments, teachingCohorts,
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
            assessments,
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
            assessments,
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
    const hasActiveAssignmentWork = useMemo(
        () => teachingActionQueue.actions.some((action) => action.objectType === 'assignment'),
        [teachingActionQueue.actions]
    );
    const showTodayScheduleMemory = sessions.length > 0;
    const showLearnerRiskMemory = shouldRenderLearnerRiskMemory({
        needsSupport: metrics.performance.needsSupport,
        attendanceRiskCount: metrics.attendance.riskCount,
        attendanceRiskLearnerCount: metrics.attendance.riskLearnerCount,
    });
    const showAssessmentMemory = shouldRenderAssessmentsSummaryCard({
        needsGrading: metrics.assessments.needsGrading,
        pendingReviewRows,
        queue: teachingActionQueue,
    });
    const showMemoryGrid = showTodayScheduleMemory || showLearnerRiskMemory || showAssessmentMemory;
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
            <TeachingAssignmentWorkPanel queue={teachingActionQueue} />
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
            {showMemoryGrid ? (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {showTodayScheduleMemory || showLearnerRiskMemory ? (
                        <div className="xl:col-span-2 space-y-6">
                            {showTodayScheduleMemory ? (
                                <TodayScheduleCard sessions={sessions} queue={teachingActionQueue} />
                            ) : null}
                            {showLearnerRiskMemory ? (
                                <LearnersAtRisk
                                    needsSupport={metrics.performance.needsSupport}
                                    attendanceRiskCount={metrics.attendance.riskCount}
                                    attendanceRiskLearnerCount={metrics.attendance.riskLearnerCount}
                                    attendanceRiskLoading={attendanceRiskLoading}
                                    attendanceRiskError={attendanceRiskError}
                                />
                            ) : null}
                        </div>
                    ) : null}
                    {showAssessmentMemory ? (
                        <AssessmentsSummaryCard
                            needsGrading={metrics.assessments.needsGrading}
                            upcomingAssessments={metrics.assessments.upcoming}
                            pendingReviewRows={pendingReviewRows}
                            queue={teachingActionQueue}
                        />
                    ) : null}
                </div>
            ) : null}
            {instructorAccess.isSelfManagedTeachingAdmin ? (
                <TeachingWorkspaceCard
                    actions={freelancePrimaryActions}
                    moreActions={freelanceMoreActions}
                    quiet={teachingActionQueue.quiet && !hasActiveAssignmentWork}
                />
            ) : null}
        </div>
    );
}

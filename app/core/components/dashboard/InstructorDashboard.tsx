'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, BookOpen, CalendarCheck, ClipboardList, GraduationCap, Settings, Users } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ActionMenu, type ActionMenuItem } from '@/app/components/ui/ActionMenu';
import { LoadingMessage, PageSkeleton } from '@/app/components/ui/loading';
import { useInstructorDashboard } from '@/app/core/hooks/useInstructorDashboard';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { SessionReminderPanel } from '@/app/core/components/dashboard/SessionReminderPanel';
import { TeacherNextActionPanel } from '@/app/core/components/dashboard/TeacherNextActionPanel';
import {
    InstructorHeader,
    InstructorAlertsBanner,
    TodayScheduleCard,
    LearnersAtRisk,
    AssessmentsSummaryCard,
} from '@/app/core/components/dashboard/InstructorDashboardWidgets';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';

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
    } = useInstructorDashboard();

    const hasTeachingAssignments = teachingLoad.length > 0;
    const dashboardLoading = isLoading || instructorAccess.isLoading;
    const freelancePrimaryActions = useMemo(() => getFreelanceDashboardPrimaryActions(), []);
    const freelanceMoreActions = useMemo<ActionMenuItem[]>(
        () => getFreelanceDashboardMoreActions().map((action) => ({
            label: action.label,
            href: action.href,
            icon: freelanceMoreActionIcons[action.label as keyof typeof freelanceMoreActionIcons],
        })),
        [],
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
        },
        visibleActions: [
            { label: 'Prepare lesson', type: 'navigate' as const, href: '/lesson-plans/new' },
            { label: 'View My Classes', type: 'navigate' as const, href: '/academic/cohorts' },
        ],
        nextSafeAction: hasTeachingAssignments
            ? { label: 'Prepare lesson', type: 'navigate' as const, href: '/lesson-plans/new' }
            : { label: 'View My Classes', type: 'navigate' as const, href: '/academic/cohorts' },
        workflowStep: hasTeachingAssignments ? 'teaching_overview' : 'awaiting_assignments',
        emptyStateReason: !dashboardLoading && !hasTeachingAssignments
            ? 'No teaching assignments are visible yet.'
            : undefined,
    }), [
        dashboardLoading,
        hasTeachingAssignments,
        metrics.assessments.needsGrading,
        metrics.performance.needsSupport,
        sessions.length,
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
            {instructorAccess.isSelfManagedTeachingAdmin ? (
                <Card>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-base font-semibold theme-text">My teaching workspace</h2>
                            <p className="mt-1 text-sm theme-muted">
                                Daily teaching work stays first. Setup and workspace controls remain available under More.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {freelancePrimaryActions.map((action, index) => (
                                <Link
                                    key={action.label}
                                    href={action.href}
                                    className={index > 1 ? 'hidden sm:inline-flex' : 'inline-flex'}
                                >
                                    <Button
                                        variant={index === 0 ? 'primary' : 'secondary'}
                                        size="sm"
                                    >
                                        {freelanceActionIcons[action.label as keyof typeof freelanceActionIcons]}
                                        {action.label}
                                    </Button>
                                </Link>
                            ))}
                            <ActionMenu
                                items={freelanceMoreActions}
                                buttonLabel="More"
                                ariaLabel="Open more workspace actions"
                                align="right"
                                hideLabelOnMobile={false}
                            />
                        </div>
                    </div>
                </Card>
            ) : null}
            <TeacherNextActionPanel
                sessions={sessions}
                alerts={alerts}
                metrics={metrics}
                teachingCohorts={teachingCohorts}
                currentTerm={currentTerm}
                currentYear={currentYear}
                teachingLoad={teachingLoad}
                pendingReviewRows={pendingReviewRows}
            />
            <SessionReminderPanel />
            <InstructorAlertsBanner alerts={alerts} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <TodayScheduleCard sessions={sessions} />
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
                />
            </div>
        </div>
    );
}

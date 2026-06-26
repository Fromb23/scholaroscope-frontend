'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
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

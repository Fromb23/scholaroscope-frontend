'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Target } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useInstructorDashboard } from '@/app/core/hooks/useInstructorDashboard';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import { useMyRequests } from '@/app/plugins/requests/hooks/useRequests';
import { SessionReminderPanel } from '@/app/core/components/dashboard/SessionReminderPanel';
import { TeacherNextActionPanel } from '@/app/core/components/dashboard/TeacherNextActionPanel';
import {
    InstructorHeader,
    InstructorAlertsBanner,
    InstructorKeyMetrics,
    TodayScheduleCard,
    LearnersAtRisk,
    MyCohortsCard,
    InstructorQuickActions,
    AssessmentsSummaryCard,
    MyRequestsCard,
    CurriculumToolCard,
    TeachingStats,
    TeachingHistoryCard,
} from '@/app/core/components/dashboard/InstructorDashboardWidgets';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';


export function InstructorDashboard() {
    const router = useRouter();
    const { user, activeRole } = useAuth();
    const { hasPlugin, loading: pluginsLoading } = usePlugins();
    const instructorAccess = useInstructorCohortAccess();
    const { requests, loading: requestsLoading, error: requestsError } = useMyRequests();

    const {
        metrics, alerts, sessions, teachingCohorts,
        currentTerm, currentYear,
        lastRefresh, isLoading, refresh, teachingLoad, teachingHistory,
        attendanceRiskLoading, attendanceRiskError,
    } = useInstructorDashboard();

    const hasTeachingAssignments = teachingLoad.length > 0;
    const showCBCTools = hasPlugin('cbc') &&
        instructorAccess.hasCBCAccess &&
        teachingCohorts.some(cohort => cohort.curriculum_type === 'CBE');
    const showCambridgeTools = hasPlugin('cambridge') &&
        instructorAccess.hasCambridgeAccess &&
        teachingCohorts.some(cohort => cohort.curriculum_type === 'CAMBRIDGE');
    const dashboardLoading = isLoading || instructorAccess.isLoading || pluginsLoading;
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
        if (activeRole && activeRole !== 'INSTRUCTOR') {
            router.push('/dashboard');
        }
    }, [activeRole, router]);

    if (!user || activeRole === null) return null;
    if (activeRole !== 'INSTRUCTOR') return null;
    if (dashboardLoading) return <LoadingSpinner message="Loading your dashboard..." />;

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
            />
            <SessionReminderPanel />
            <InstructorAlertsBanner alerts={alerts} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    <TodayScheduleCard sessions={sessions} />
                </div>
                <InstructorQuickActions
                    needsGrading={metrics.assessments.needsGrading}
                    todayLessons={metrics.sessions.today}
                />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    <MyCohortsCard cohorts={teachingCohorts} />
                </div>
                <AssessmentsSummaryCard
                    needsGrading={metrics.assessments.needsGrading}
                    upcomingAssessments={metrics.assessments.upcoming}
                />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                    <LearnersAtRisk
                        needsSupport={metrics.performance.needsSupport}
                        attendanceRiskCount={metrics.attendance.riskCount}
                        attendanceRiskLearnerCount={metrics.attendance.riskLearnerCount}
                        attendanceRiskLoading={attendanceRiskLoading}
                        attendanceRiskError={attendanceRiskError}
                    />
                </div>
                <MyRequestsCard
                    requests={requests}
                    loading={requestsLoading}
                    error={requestsError}
                />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <TeachingHistoryCard history={teachingHistory} />
                    <InstructorKeyMetrics metrics={metrics} />
                </div>
                <div className="space-y-6">
                    {showCBCTools && (
                        <CurriculumToolCard
                            title="CBC Teaching"
                            description="Open CBC teaching and progress tools for your assigned cohorts."
                            icon={Target}
                            primaryAction={{ label: 'Open Teaching', path: '/cbc/teaching' }}
                            secondaryAction={{ label: 'View Progress', path: '/cbc/progress' }}
                        />
                    )}
                    {showCambridgeTools && (
                        <CurriculumToolCard
                            title="Cambridge Teaching"
                            description="Open Cambridge teaching and progress tools for your assigned cohorts."
                            icon={BookOpen}
                            primaryAction={{ label: 'Open Subjects', path: '/cambridge/subjects' }}
                            secondaryAction={{ label: 'View Progress', path: '/cambridge/progress' }}
                        />
                    )}
                    {hasTeachingAssignments && (
                        <TeachingStats
                            attendance={metrics.attendance.todayRate}
                            sessions={metrics.sessions.today}
                            assessments={metrics.assessments.upcoming}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

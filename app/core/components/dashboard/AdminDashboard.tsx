// app/(dashboard)/dashboard/admin/page.tsx
'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AcademicSetupDashboard } from '@/app/core/components/academic/setup/AcademicSetupDashboard';
import { useAdminDashboard } from '@/app/core/hooks/useAdminDashboard';
import { useAcademicSetupStatus } from '@/app/core/hooks/useAcademicSetupStatus';
import {
    DashboardHeader,
    AlertsBanner,
    KeyMetrics,
    AttendanceWidget,
    PerformanceWidget,
    AssessmentPipeline,
    QuickActions,
    TodaySessionsWidget,
    SystemOverview,
} from '@/app/core/components/dashboard/AdminDashboardWidgets';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { Slot } from '@/app/core/registry/slots';

export function AdminDashboard() {
    const router = useRouter();
    const { user, activeOrg, activeRole } = useAuth();
    const academicSetupQuery = useAcademicSetupStatus({
        enabled: activeRole === 'ADMIN' && Boolean(activeOrg),
    });

    const {
        metrics, alerts, sessions, cohorts,
        currentTerm, currentYear,
        lastRefresh, isLoading, refresh,
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
                { label: 'Open Academic Setup', type: 'navigate' as const, href: '/academic' },
                { label: 'Review Requests', type: 'navigate' as const, href: '/requests' },
            ],
        nextSafeAction: setupIncomplete
            ? {
                label: setupStatus?.next_action.label ?? 'Open Academic Setup',
                type: 'navigate' as const,
                href: setupStatus?.next_action.href ?? '/academic',
            }
            : { label: 'Open Academic Setup', type: 'navigate' as const, href: '/academic' },
        workflowStep: setupIncomplete ? 'academic_setup' : 'school_overview',
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
        return <LoadingSpinner message="Loading your workspace setup..." />;
    }
    if (setupStatus && !setupStatus.complete) {
        return <AcademicSetupDashboard status={setupStatus} title="Complete Academic Setup" />;
    }
    if (isLoading) return <LoadingSpinner message="Loading your dashboard..." />;

    return (
        <div className="space-y-6">
            <DashboardHeader
                firstName={user.first_name || 'Admin'}
                termName={currentTerm?.name ?? 'No active term'}
                yearName={currentYear?.name ?? String(new Date().getFullYear())}
                lastRefresh={lastRefresh}
                onRefresh={refresh}
            />

            <AlertsBanner alerts={alerts} />

            {/* KPI row */}
            <KeyMetrics metrics={metrics} />

            {/* Main content — 3 column grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Left column — primary actions */}
                <div className="xl:col-span-2 space-y-6">
                    <Slot name="admin.dashboard.pendingApprovals" />

                    {/* Attendance + Performance side by side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AttendanceWidget
                            rate={metrics.attendance.todayRate}
                            sessionsToday={metrics.sessions.today}
                        />
                        <PerformanceWidget
                            averageScore={metrics.performance.averageScore}
                            needsSupport={metrics.performance.needsSupport}
                        />
                    </div>

                    <AssessmentPipeline assessments={metrics.assessments} />
                </div>

                {/* Right column — supporting widgets */}
                <div className="space-y-6">
                    <QuickActions needsGrading={metrics.assessments.needsGrading} />
                    <TodaySessionsWidget sessions={sessions} />
                    <SystemOverview
                        cohortCount={cohorts.length}
                        assessmentCount={metrics.assessments.total}
                        studentCount={metrics.students.total}
                    />
                </div>
            </div>
        </div>
    );
}

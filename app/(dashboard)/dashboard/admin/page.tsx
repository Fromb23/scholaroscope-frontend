// app/(dashboard)/dashboard/admin/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useAdminDashboard } from '@/app/core/hooks/useAdminDashboard';
import { useRequests, useRequestStats } from '@/app/plugins/requests/hooks/useRequests';
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
    PendingApprovals,
    SyllabusProgressCard,
} from '@/app/core/components/dashboard/AdminDashboardWidgets';

export default function AdminDashboard() {
    const router = useRouter();
    const { user, activeRole } = useAuth();

    const {
        metrics, alerts, sessions, cohorts,
        currentTerm, currentYear,
        lastRefresh, isLoading, refresh, syllabusProgress,
    } = useAdminDashboard();
    const { requests, loading: requestsLoading } = useRequests({ status: 'PENDING' });
    const { stats: requestStats } = useRequestStats();

    useEffect(() => {
        if (activeRole && activeRole !== 'ADMIN') {
            router.push('/dashboard');
        }
    }, [activeRole, router]);

    if (!user || activeRole === null) return null;
    if (activeRole !== 'ADMIN') return null;
    if (isLoading) return <LoadingSpinner message="Loading your dashboard..." />;

    return (
        <div className="space-y-6">
            <DashboardHeader
                firstName={user.first_name || 'Admin'}
                termName={currentTerm?.name ?? 'No active term'}
                yearName={currentYear?.name ?? String(new Date().getFullYear())}
                lastRefresh={lastRefresh}
                alertCount={alerts.length}
                onRefresh={refresh}
            />

            <AlertsBanner alerts={alerts} />

            {/* KPI row */}
            <KeyMetrics metrics={metrics} />

            {/* Main content — 3 column grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Left column — primary actions */}
                <div className="xl:col-span-2 space-y-6">
                    <PendingApprovals
                        requests={requests}
                        loading={requestsLoading}
                        pendingCount={requestStats?.pending ?? 0}
                    />

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
                    <SyllabusProgressCard progress={syllabusProgress} />
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
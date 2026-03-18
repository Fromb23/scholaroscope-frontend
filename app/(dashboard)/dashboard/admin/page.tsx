// app/(dashboard)/dashboard/admin/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useAdminDashboard } from '@/app/core/hooks/useAdminDashboard';
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
} from '@/app/core/components/dashboard/AdminDashboardWidgets';

export default function AdminDashboard() {
    const router = useRouter();
    const { user, activeRole } = useAuth();

    const {
        metrics, alerts, sessions, cohorts,
        currentTerm, currentYear,
        lastRefresh, isLoading, refresh,
    } = useAdminDashboard();

    useEffect(() => {
        if (activeRole && activeRole !== 'ADMIN') {
            router.push('/dashboard');
        }
    }, [activeRole, router]);

    // Not yet resolved — wait
    if (!user || activeRole === null) return null;

    // Wrong role — guard while redirect fires
    if (activeRole !== 'ADMIN') return null;

    if (isLoading) return <LoadingSpinner message="Loading your dashboard..." />;

    return (
        <>
            <DashboardHeader
                firstName={user.first_name || 'Admin'}
                termName={currentTerm?.name ?? 'No active term'}
                yearName={currentYear?.name ?? String(new Date().getFullYear())}
                lastRefresh={lastRefresh}
                alertCount={alerts.length}
                onRefresh={refresh}
            />
            <AlertsBanner alerts={alerts} />
            <KeyMetrics metrics={metrics} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                <div className="xl:col-span-2 space-y-6">
                    <PendingApprovals />
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
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl p-6 border border-blue-200">
                <p className="text-center text-gray-700">
                    <span className="font-bold text-blue-600">🚀 More Features Coming Soon:</span>{' '}
                    Request management, instructor activity monitoring, approval workflows,
                    grade policy controls, and advanced analytics.
                </p>
            </div>
        </>
    );
}
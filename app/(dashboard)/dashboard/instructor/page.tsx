'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { useInstructorDashboard } from '@/app/core/hooks/useInstructorDashboard';
import {
    InstructorHeader,
    InstructorAlertsBanner,
    InstructorKeyMetrics,
    TodayScheduleCard,
    LearnersAtRisk,
    MyCohortsCard,
    InstructorQuickActions,
    MyRequestsCard,
    CBCProgressCard,
    TeachingStats,
    TeachingLoadCard,
    TeachingHistoryCard,
} from '@/app/core/components/dashboard/InstructorDashboardWidgets';


export default function InstructorDashboard() {
    const router = useRouter();
    const { user, activeRole } = useAuth();

    const {
        metrics, alerts, sessions, cohorts,
        currentTerm, currentYear,
        lastRefresh, isLoading, refresh, teachingLoad, teachingHistory
    } = useInstructorDashboard();

    useEffect(() => {
        if (activeRole && activeRole !== 'INSTRUCTOR') {
            router.push('/dashboard');
        }
    }, [activeRole, router]);

    if (!user || activeRole === null) return null;
    if (activeRole !== 'INSTRUCTOR') return null;
    if (isLoading) return <LoadingSpinner message="Loading your dashboard..." />;

    return (
        <div className="max-w-[1800px] mx-auto space-y-6">
            <InstructorHeader
                firstName={user.first_name || 'Teacher'}
                termName={currentTerm?.name ?? 'No active term'}
                yearName={currentYear?.name ?? String(new Date().getFullYear())}
                lastRefresh={lastRefresh}
                alertCount={alerts.length}
                onRefresh={refresh}
            />
            <InstructorAlertsBanner alerts={alerts} />
            <InstructorKeyMetrics metrics={metrics} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <TeachingLoadCard assignments={teachingLoad} />
                    <TeachingHistoryCard history={teachingHistory} />
                    <TodayScheduleCard sessions={sessions} />
                    <LearnersAtRisk
                        frequentlyAbsent={metrics.attendance.frequentlyAbsent}
                        needsSupport={metrics.performance.needsSupport}
                    />
                    <MyCohortsCard cohorts={cohorts} />
                </div>
                <div className="space-y-6">
                    <InstructorQuickActions needsGrading={metrics.assessments.needsGrading} />
                    <MyRequestsCard />
                    <CBCProgressCard />
                    <TeachingStats
                        attendance={metrics.attendance.todayRate}
                        sessions={metrics.sessions.today}
                        assessments={metrics.assessments.upcoming}
                    />
                </div>
            </div>
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-6 border border-green-200">
                <p className="text-center text-gray-700">
                    <span className="font-bold text-green-600">More Features Coming Soon:</span>{' '}
                    Learner progress tracking, personalized teaching insights, lesson planning tools,
                    and collaborative features.
                </p>
            </div>
        </div>
    );
}
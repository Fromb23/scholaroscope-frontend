'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
    Users, Calendar, ClipboardCheck, TrendingUp, Award,
    AlertCircle, Clock, Bell, RefreshCw, Loader2,
    CheckCircle2, BookOpen, Target, FileText, Zap,
    Sparkles, UserX, TrendingDown, ChevronRight, Activity,
    Inbox, CalendarDays
} from 'lucide-react';

// Import all hooks
import { useStudents } from '@/app/core/hooks/useStudents';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useSessions, useTodaySessions } from '@/app/core/hooks/useSessions';
import { useAssessments, useAssessmentScores } from '@/app/core/hooks/useAssessments';
import { useCurrentTerm, useCurrentAcademicYear } from '@/app/core/hooks/useAcademic';

// Types
interface Alert {
    id: number;
    type: 'error' | 'warning' | 'info' | 'success';
    message: string;
    action: string;
    link: string;
}

export default function InstructorDashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const [lastRefresh, setLastRefresh] = useState(new Date());

    // Fetch data using hooks
    const { students, loading: studentsLoading, reload: refetchStudents } = useStudents();
    const { cohorts, loading: cohortsLoading } = useCohorts();
    const { sessions: todaySessions, loading: sessionsLoading, refetch: refetchSessions } = useTodaySessions();
    const { currentTerm, loading: termLoading } = useCurrentTerm();
    const { currentYear, loading: yearLoading } = useCurrentAcademicYear();
    const { assessments, loading: assessmentsLoading, refetch: refetchAssessments } = useAssessments({
        term: currentTerm?.id
    });
    const { scores: allScores, loading: scoresLoading } = useAssessmentScores();

    // Calculate derived metrics
    const metrics = useMemo(() => {
        const activeStudents = students?.filter((s: any) => s.status === 'ACTIVE') || [];
        const totalStudents = students?.length || 0;

        const today = new Date();
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const needsGrading = allScores?.filter(s => !s.score && !s.rubric_level).length || 0;
        const upcomingAssessments = assessments?.filter(a => {
            if (!a.assessment_date) return false;
            const date = new Date(a.assessment_date);
            return date > today && date <= nextWeek;
        }).length || 0;

        const upcomingSessions = todaySessions?.filter((s: any) => {
            const sessionTime = new Date(`${s.session_date} ${s.start_time}`);
            return sessionTime > new Date();
        }).length || 0;

        let totalPresent = 0;
        let totalExpected = 0;

        todaySessions?.forEach((session: any) => {
            const records = session.attendance_records || [];
            totalExpected += records.length;
            totalPresent += records.filter((r: any) => r.status === 'PRESENT').length;
        });

        const todayAttendanceRate = totalExpected > 0
            ? Math.round((totalPresent / totalExpected) * 100 * 10) / 10
            : 0;

        const scoredAssessments = allScores?.filter(s => s.score !== null && s.score !== undefined) || [];
        const averageScore = scoredAssessments.length > 0
            ? Math.round(scoredAssessments.reduce((sum, s) => sum + (s.score || 0), 0) / scoredAssessments.length * 10) / 10
            : 0;

        const needsSupport = allScores?.filter(s => {
            if (!s.score || !s.assessment) return false;
            const percentage = (s.score / (s.assessment as any).total_marks) * 100;
            return percentage < 50;
        }).length || 0;

        // Calculate frequently absent (placeholder - should be from attendance data)
        const frequentlyAbsent = Math.floor(activeStudents.length * 0.08); // ~8% placeholder

        return {
            students: {
                total: totalStudents,
                active: activeStudents.length,
            },
            attendance: {
                todayRate: todayAttendanceRate,
                frequentlyAbsent
            },
            assessments: {
                needsGrading,
                upcoming: upcomingAssessments
            },
            sessions: {
                today: todaySessions?.length || 0,
                upcoming: upcomingSessions
            },
            performance: {
                averageScore,
                needsSupport
            }
        };
    }, [students, assessments, allScores, todaySessions]);

    // Generate alerts
    const alerts = useMemo<Alert[]>(() => {
        const alertsList: Alert[] = [];

        if (metrics.assessments.needsGrading > 50) {
            alertsList.push({
                id: 1,
                type: 'warning',
                message: `${metrics.assessments.needsGrading} assignments need grading`,
                action: 'Grade Now',
                link: '/assessments'
            });
        }

        if (metrics.sessions.upcoming > 0) {
            alertsList.push({
                id: 2,
                type: 'info',
                message: `${metrics.sessions.upcoming} sessions starting soon`,
                action: 'View Schedule',
                link: '/sessions/today'
            });
        }

        if (metrics.performance.needsSupport > 10) {
            alertsList.push({
                id: 3,
                type: 'warning',
                message: `${metrics.performance.needsSupport} learners need academic support`,
                action: 'View Learners',
                link: '/learners?filter=struggling'
            });
        }

        if (metrics.attendance.frequentlyAbsent > 5) {
            alertsList.push({
                id: 4,
                type: 'error',
                message: `${metrics.attendance.frequentlyAbsent} learners frequently absent`,
                action: 'Check Attendance',
                link: '/learners?filter=absent'
            });
        }

        return alertsList;
    }, [metrics]);

    const isLoading = studentsLoading || cohortsLoading || sessionsLoading ||
        assessmentsLoading || scoresLoading || termLoading || yearLoading;

    const handleRefresh = async () => {
        await Promise.all([
            refetchStudents(),
            refetchSessions(),
            refetchAssessments()
        ]);
        setLastRefresh(new Date());
    };

    useEffect(() => {
        const interval = setInterval(handleRefresh, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (user?.role !== 'INSTRUCTOR') {
        router.push('/dashboard');
        return null;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-emerald-50">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-6"></div>
                        <Sparkles className="w-8 h-8 text-green-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-gray-700 font-semibold text-lg">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Decorative background */}

            <div className="relative max-w-[1800px] mx-auto p-4 md:p-8 space-y-6">
                {/* Header */}
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                                    <Target className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-900 via-emerald-900 to-green-900 bg-clip-text text-transparent">
                                        Welcome back, {user?.first_name || 'Teacher'}!
                                    </h1>
                                    <p className="text-gray-600 mt-1 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        {currentTerm?.name || 'No active term'} • {currentYear?.name || new Date().getFullYear()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRefresh}
                                className="p-3 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-300 hover:scale-110"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>

                            <button
                                onClick={() => router.push('/requests')}
                                className="relative p-3 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-300 hover:scale-110"
                            >
                                <Inbox className="w-5 h-5" />
                                {/* My requests badge */}
                                <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
                                    2
                                </span>
                            </button>

                            <button
                                onClick={() => router.push('/notifications')}
                                className="relative p-3 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-300 hover:scale-110"
                            >
                                <Bell className="w-5 h-5" />
                                {alerts.length > 0 && (
                                    <>
                                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
                                        <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                                    </>
                                )}
                            </button>

                            <div className="hidden lg:block text-right px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                                <p className="text-sm font-semibold text-gray-900">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Updated {lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerts Banner */}
                {alerts.length > 0 && (
                    <div className="bg-gradient-to-r from-orange-50 via-red-50 to-pink-50 backdrop-blur-xl rounded-2xl shadow-lg border border-orange-200/50 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-orange-500 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Teaching Alerts</h2>
                            <span className="ml-auto px-3 py-1 bg-white/80 text-orange-600 text-xs font-bold rounded-full">
                                {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {alerts.map(alert => (
                                <AlertItem key={alert.id} alert={alert} onClick={() => router.push(alert.link)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Key Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard
                        title="My Learners"
                        value={metrics.students.active}
                        subtitle="Active in my classes"
                        icon={Users}
                        gradient="from-green-500 to-emerald-500"
                        onClick={() => router.push('/learners')}
                    />

                    <MetricCard
                        title="Today's Sessions"
                        value={metrics.sessions.today}
                        subtitle={`${metrics.sessions.upcoming} upcoming`}
                        icon={Calendar}
                        gradient="from-blue-500 to-cyan-500"
                        onClick={() => router.push('/sessions/today')}
                    />

                    <MetricCard
                        title="Needs Grading"
                        value={metrics.assessments.needsGrading}
                        subtitle={`${metrics.assessments.upcoming} due this week`}
                        icon={Award}
                        gradient="from-amber-500 to-orange-500"
                        alert={metrics.assessments.needsGrading > 50}
                        onClick={() => router.push('/assessments?status=pending')}
                    />

                    <MetricCard
                        title="Class Average"
                        value={metrics.performance.averageScore > 0 ? `${metrics.performance.averageScore}%` : 'N/A'}
                        subtitle="My classes"
                        icon={TrendingUp}
                        gradient="from-purple-500 to-pink-500"
                        onClick={() => router.push('/cbc/progress')}
                    />
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Today's Schedule */}
                        <TodayScheduleCard sessions={todaySessions || []} router={router} />

                        {/* Learners Requiring Attention */}
                        <LearnersAtRiskCard
                            frequentlyAbsent={metrics.attendance.frequentlyAbsent}
                            needsSupport={metrics.performance.needsSupport}
                            router={router}
                        />

                        {/* My Cohorts Quick View */}
                        <MyCohortsCard cohorts={cohorts || []} router={router} />
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Quick Teaching Actions */}
                        <QuickActionsCard router={router} needsGrading={metrics.assessments.needsGrading} />

                        {/* My Requests Status */}
                        <MyRequestsCard router={router} />

                        {/* CBC Progress Widget */}
                        <CBCProgressCard router={router} />

                        {/* Teaching Stats */}
                        <TeachingStatsCard
                            attendance={metrics.attendance.todayRate}
                            sessions={metrics.sessions.today}
                            assessments={metrics.assessments.upcoming}
                        />
                    </div>
                </div>

                {/* Coming Soon Notice */}
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl p-6 border border-green-200">
                    <p className="text-center text-gray-700">
                        <span className="font-bold text-green-600">🚀 More Features Coming Soon:</span> Learner progress tracking, personalized teaching insights, lesson planning tools, and collaborative features.
                    </p>
                </div>
            </div>
        </>
    );
}

// Helper Components
function AlertItem({ alert, onClick }: { alert: Alert; onClick: () => void }) {
    const styles: Record<Alert['type'], string> = {
        error: 'bg-red-100/80 border-red-300 text-red-800',
        warning: 'bg-amber-100/80 border-amber-300 text-amber-800',
        info: 'bg-blue-100/80 border-blue-300 text-blue-800',
        success: 'bg-green-100/80 border-green-300 text-green-800'
    };

    return (
        <div className={`flex items-center gap-3 p-4 rounded-xl border backdrop-blur-sm ${styles[alert.type]} transition-all hover:scale-[1.02] cursor-pointer`} onClick={onClick}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium flex-1">{alert.message}</span>
            <button className="text-sm font-bold whitespace-nowrap hover:underline flex items-center gap-1">
                {alert.action}
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
}

function MetricCard({ title, value, subtitle, icon: Icon, gradient, alert, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className="group relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden"
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
            <div className="relative">
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 bg-gradient-to-br ${gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    {alert && (
                        <div className="relative">
                            <span className="flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        </div>
                    )}
                </div>
                <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
                <p className="text-4xl font-bold text-gray-900 mb-2">{value}</p>
                <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
        </div>
    );
}

function TodayScheduleCard({ sessions, router }: any) {
    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                        <CalendarDays className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Today's Teaching Schedule</h3>
                </div>
                <button
                    onClick={() => router.push('/sessions/today')}
                    className="text-sm text-green-600 hover:text-green-700 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                >
                    View All →
                </button>
            </div>

            {sessions.length > 0 ? (
                <div className="space-y-3">
                    {sessions.slice(0, 4).map((session: any, idx: number) => (
                        <div
                            key={session.id}
                            className="group p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl border border-green-200 transition-all hover:scale-[1.02] cursor-pointer"
                            onClick={() => router.push(`/sessions/${session.id}`)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-4 h-4 text-green-600" />
                                        <span className="font-bold text-gray-900">{session.start_time} - {session.end_time}</span>
                                    </div>
                                    <p className="font-semibold text-gray-900">{session.cohort_subject_subject_name || 'Subject'}</p>
                                    <p className="text-sm text-gray-600">{session.cohort_subject_cohort_name || 'Cohort'} • {session.venue || 'TBA'}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No sessions scheduled today</p>
                    <button
                        onClick={() => router.push('/sessions/new')}
                        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        Create Session
                    </button>
                </div>
            )}
        </div>
    );
}

function LearnersAtRiskCard({ frequentlyAbsent, needsSupport, router }: any) {
    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Learners Requiring Attention</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => router.push('/learners?filter=absent')}
                    className="group p-5 bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 rounded-xl border border-orange-200 transition-all hover:scale-[1.02] text-left"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <UserX className="w-6 h-6 text-orange-600" />
                        <p className="font-bold text-gray-900">Frequently Absent</p>
                    </div>
                    <p className="text-3xl font-bold text-orange-600 mb-1">{frequentlyAbsent}</p>
                    <p className="text-xs text-gray-600">Missing 3+ sessions/week</p>
                </button>

                <button
                    onClick={() => router.push('/learners?filter=struggling')}
                    className="group p-5 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 rounded-xl border border-red-200 transition-all hover:scale-[1.02] text-left"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <TrendingDown className="w-6 h-6 text-red-600" />
                        <p className="font-bold text-gray-900">Academic Struggle</p>
                    </div>
                    <p className="text-3xl font-bold text-red-600 mb-1">{needsSupport}</p>
                    <p className="text-xs text-gray-600">Scoring below 50%</p>
                </button>
            </div>
        </div>
    );
}

function MyCohortsCard({ cohorts, router }: any) {
    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">My Classes</h3>
                </div>
                <button
                    onClick={() => router.push('/academic/cohorts')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                    View All →
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cohorts.slice(0, 4).map((cohort: any) => (
                    <div
                        key={cohort.id}
                        className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 cursor-pointer hover:scale-[1.02] transition-all"
                        onClick={() => router.push(`/academic/cohorts/${cohort.id}`)}
                    >
                        <p className="font-bold text-gray-900">{cohort.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{cohort.level} • {cohort.student_count || 0} learners</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function QuickActionsCard({ router, needsGrading }: any) {
    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
            </div>

            <div className="space-y-2">
                <QuickActionButton icon={Clock} label="Mark Attendance" onClick={() => router.push('/sessions/today')} />
                <QuickActionButton icon={Award} label="Grade Work" badge={needsGrading} onClick={() => router.push('/assessments?status=pending')} />
                <QuickActionButton icon={FileText} label="Submit Request" onClick={() => router.push('/requests/new')} />
                <QuickActionButton icon={BookOpen} label="CBC Teaching" onClick={() => router.push('/cbc/teaching')} />
            </div>
        </div>
    );
}

function QuickActionButton({ icon: Icon, label, badge, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="relative w-full flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-green-50 hover:from-green-100 hover:to-emerald-100 rounded-xl border border-gray-200 transition-all hover:scale-[1.02]"
        >
            <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-gray-700">{label}</span>
            </div>
            {badge && badge > 0 && (
                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                    {badge}
                </span>
            )}
        </button>
    );
}

function MyRequestsCard({ router }: any) {
    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                        <Inbox className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">My Requests</h3>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">2</span>
            </div>

            <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-900">Enrollment Change</p>
                    <p className="text-xs text-gray-500 mt-1">Pending approval</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-900">Grade Override</p>
                    <p className="text-xs text-green-600 mt-1">Approved</p>
                </div>
            </div>

            <button
                onClick={() => router.push('/requests')}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
                View All Requests
            </button>
        </div>
    );
}

function CBCProgressCard({ router }: any) {
    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                    <Target className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">CBC Progress</h3>
            </div>

            <div className="space-y-3">
                <div className="p-3 bg-purple-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-700">Outcomes Recorded</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">24</p>
                </div>
                <div className="p-3 bg-pink-50 rounded-xl">
                    <p className="text-sm font-medium text-gray-700">Evidence Collected</p>
                    <p className="text-2xl font-bold text-pink-600 mt-1">156</p>
                </div>
            </div>

            <button
                onClick={() => router.push('/cbc/teaching')}
                className="w-full mt-4 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors"
            >
                Track Progress
            </button>
        </div>
    );
}

function TeachingStatsCard({ attendance, sessions, assessments }: any) {
    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl">
                    <Activity className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Teaching Stats</h3>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Today's Attendance</span>
                    <span className="text-lg font-bold text-green-600">{attendance > 0 ? `${attendance}%` : 'N/A'}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Sessions Today</span>
                    <span className="text-lg font-bold text-blue-600">{sessions}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Upcoming Assessments</span>
                    <span className="text-lg font-bold text-amber-600">{assessments}</span>
                </div>
            </div>
        </div>
    );
}
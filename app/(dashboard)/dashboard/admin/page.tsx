'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import {
    Users, Calendar, ClipboardCheck, TrendingUp, Award,
    AlertCircle, Clock, Bell, RefreshCw, Loader2,
    CheckCircle2, Inbox, UserCog, Activity, Target,
    BookOpen, FileBarChart, Settings, Zap, ChevronRight,
    Sparkles, BarChart3
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

export default function AdminDashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const [lastRefresh, setLastRefresh] = useState(new Date());

    // Fetch data using hooks
    const { students, loading: studentsLoading, reload: reloadStudents } = useStudents();
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

        const pendingAssessments = assessments?.filter(a => !a.assessment_date).length || 0;
        const upcomingAssessments = assessments?.filter(a => {
            if (!a.assessment_date) return false;
            const date = new Date(a.assessment_date);
            return date > today && date <= nextWeek;
        }).length || 0;

        const completedAssessments = assessments?.filter(a => {
            if (!a.assessment_date) return false;
            const date = new Date(a.assessment_date);
            return date >= weekAgo && date <= today;
        }).length || 0;

        const needsGrading = allScores?.filter(s => !s.score && !s.rubric_level).length || 0;

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

        return {
            students: {
                total: totalStudents,
                active: activeStudents.length,
            },
            attendance: {
                todayRate: todayAttendanceRate,
            },
            assessments: {
                total: assessments?.length || 0,
                pending: pendingAssessments,
                upcoming: upcomingAssessments,
                needsGrading,
                completed: completedAssessments
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

        if (metrics.assessments.needsGrading > 100) {
            alertsList.push({
                id: 1,
                type: 'warning',
                message: `${metrics.assessments.needsGrading} assessment scores need grading`,
                action: 'Grade Now',
                link: '/assessments'
            });
        }

        if (metrics.attendance.todayRate > 0 && metrics.attendance.todayRate < 80) {
            alertsList.push({
                id: 2,
                type: 'error',
                message: `Today's attendance is low at ${metrics.attendance.todayRate}%`,
                action: 'View Details',
                link: '/sessions'
            });
        }

        if (metrics.assessments.upcoming > 0) {
            alertsList.push({
                id: 3,
                type: 'info',
                message: `${metrics.assessments.upcoming} assessments due this week`,
                action: 'View Schedule',
                link: '/assessments'
            });
        }

        if (metrics.performance.needsSupport > 20) {
            alertsList.push({
                id: 4,
                type: 'warning',
                message: `${metrics.performance.needsSupport} students scoring below 50%`,
                action: 'View Students',
                link: '/learners?filter=struggling'
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

    if (user?.role !== 'ADMIN') {
        router.push('/dashboard');
        return null;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
                        <Sparkles className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-gray-700 font-semibold text-lg">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                                <Activity className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 bg-clip-text text-transparent">
                                    Welcome back, {user?.first_name || 'Admin'}!
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
                            className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 hover:scale-110"
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => router.push('/requests')}
                            className="relative p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 hover:scale-110"
                        >
                            <Inbox className="w-5 h-5" />
                            <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                5
                            </span>
                        </button>

                        <button
                            onClick={() => router.push('/notifications')}
                            className="relative p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 hover:scale-110"
                        >
                            <Bell className="w-5 h-5" />
                            {alerts.length > 0 && (
                                <>
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                                </>
                            )}
                        </button>

                        <div className="hidden lg:block text-right px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
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
                <div className="bg-gradient-to-r from-orange-50 via-red-50 to-pink-50 backdrop-blur-xl rounded-2xl shadow-lg border border-orange-200/50 p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-orange-500 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Action Required</h2>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <MetricCard
                    title="Total Students"
                    value={metrics.students.total.toLocaleString()}
                    subtitle={`${metrics.students.active} actively enrolled`}
                    icon={Users}
                    gradient="from-blue-500 to-cyan-500"
                    onClick={() => router.push('/learners')}
                />

                <MetricCard
                    title="Attendance Today"
                    value={metrics.attendance.todayRate > 0 ? `${metrics.attendance.todayRate}%` : 'N/A'}
                    subtitle={`${metrics.sessions.today} sessions tracked`}
                    icon={ClipboardCheck}
                    gradient="from-green-500 to-emerald-500"
                    alert={metrics.attendance.todayRate > 0 && metrics.attendance.todayRate < 80}
                    onClick={() => router.push('/sessions')}
                />

                <MetricCard
                    title="Needs Grading"
                    value={metrics.assessments.needsGrading}
                    subtitle={`${metrics.assessments.upcoming} due this week`}
                    icon={Award}
                    gradient="from-amber-500 to-orange-500"
                    alert={metrics.assessments.needsGrading > 100}
                    onClick={() => router.push('/assessments')}
                />

                <MetricCard
                    title="Class Average"
                    value={metrics.performance.averageScore > 0 ? `${metrics.performance.averageScore}%` : 'N/A'}
                    subtitle="Overall performance"
                    icon={TrendingUp}
                    gradient="from-purple-500 to-pink-500"
                    onClick={() => router.push('/reports')}
                />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
                {/* Left Column */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Pending Approvals */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                                    <Inbox className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Pending Approvals</h3>
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">5</span>
                            </div>
                            <button
                                onClick={() => router.push('/requests')}
                                className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                            >
                                View All →
                            </button>
                        </div>

                        <div className="space-y-3">
                            <RequestItem
                                type="enrollment"
                                message="John Doe enrollment change request"
                                time="5 mins ago"
                                onClick={() => router.push('/requests')}
                            />
                            <RequestItem
                                type="status"
                                message="3 learner status update requests"
                                time="2 hours ago"
                                onClick={() => router.push('/requests')}
                            />
                        </div>
                    </div>

                    {/* Performance Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AttendanceCard
                            rate={metrics.attendance.todayRate}
                            sessionsToday={metrics.sessions.today}
                        />
                        <PerformanceCard
                            averageScore={metrics.performance.averageScore}
                            needsSupport={metrics.performance.needsSupport}
                        />
                    </div>

                    {/* Assessment Pipeline */}
                    <AssessmentPipelineCard metrics={metrics.assessments} />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <QuickActionsCard router={router} needsGrading={metrics.assessments.needsGrading} />

                    {/* Today's Sessions */}
                    <TodaySessionsCard sessions={todaySessions || []} router={router} />

                    {/* System Overview */}
                    <SystemOverviewCard
                        cohorts={cohorts?.length || 0}
                        assessments={metrics.assessments.total}
                        students={metrics.students.total}
                    />
                </div>
            </div>

            {/* Coming Soon Notice */}
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl p-6 border border-blue-200">
                <p className="text-center text-gray-700">
                    <span className="font-bold text-blue-600">🚀 More Features Coming Soon:</span> Request management system, instructor activity monitoring, approval workflows, grade policy controls, and advanced analytics.
                </p>
            </div>
        </>
    );
}

// Helper Components (keep all the same helper components from your original file)
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

function RequestItem({ type, message, time, onClick }: any) {
    return (
        <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 rounded-xl border border-orange-200 transition-all hover:scale-[1.02] cursor-pointer" onClick={onClick}>
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="font-medium text-gray-900">{message}</p>
                    <p className="text-xs text-gray-500 mt-1">{time}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-orange-600" />
            </div>
        </div>
    );
}

function AttendanceCard({ rate, sessionsToday }: any) {
    const isGood = rate >= 80;
    const isWarning = rate >= 60 && rate < 80;

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${isGood ? 'bg-green-500' : isWarning ? 'bg-amber-500' : 'bg-red-500'}`}>
                    <ClipboardCheck className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Attendance</h3>
            </div>

            <div className="text-center py-6">
                <p className="text-5xl font-bold text-gray-900 mb-2">
                    {rate > 0 ? `${rate}%` : 'N/A'}
                </p>
                <p className="text-sm text-gray-600">{sessionsToday} sessions today</p>
            </div>
        </div>
    );
}

function PerformanceCard({ averageScore, needsSupport }: any) {
    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Performance</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                    <p className="text-3xl font-bold text-blue-600">
                        {averageScore > 0 ? `${averageScore}%` : 'N/A'}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">Average</p>
                </div>

                <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl">
                    <p className="text-3xl font-bold text-orange-600">{needsSupport}</p>
                    <p className="text-xs text-gray-600 mt-2">At Risk</p>
                </div>
            </div>
        </div>
    );
}

function AssessmentPipelineCard({ metrics }: any) {
    const stages = [
        { label: 'Pending', value: metrics.pending, color: 'bg-yellow-500' },
        { label: 'Upcoming', value: metrics.upcoming, color: 'bg-blue-500' },
        { label: 'Needs Grading', value: metrics.needsGrading, color: 'bg-orange-500' },
        { label: 'Completed', value: metrics.completed, color: 'bg-green-500' }
    ];

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                    <Award className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Assessment Pipeline</h3>
            </div>

            <div className="space-y-3">
                {stages.map((stage, idx) => (
                    <div key={idx}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{stage.label}</span>
                            <span className="text-sm font-bold text-gray-900">{stage.value}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                                style={{ width: `${Math.min((stage.value / metrics.total) * 100, 100)}%` }}
                            ></div>
                        </div>
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
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <QuickActionButton icon={ClipboardCheck} label="Attendance" onClick={() => router.push('/sessions/today')} />
                <QuickActionButton icon={Calendar} label="New Session" onClick={() => router.push('/sessions/new')} />
                <QuickActionButton icon={Award} label="Grade" badge={needsGrading} onClick={() => router.push('/assessments')} />
                <QuickActionButton icon={Users} label="Add Student" onClick={() => router.push('/learners/new')} />
                <QuickActionButton icon={FileBarChart} label="Reports" onClick={() => router.push('/reports')} />
                <QuickActionButton icon={Settings} label="Settings" onClick={() => router.push('/admin/settings')} />
            </div>
        </div>
    );
}

function QuickActionButton({ icon: Icon, label, badge, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="relative p-4 bg-gradient-to-br from-gray-50 to-blue-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl border border-gray-200 transition-all hover:scale-105 flex flex-col items-center gap-2"
        >
            <Icon className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-semibold text-gray-700">{label}</span>
            {badge && badge > 0 && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {badge}
                </div>
            )}
        </button>
    );
}

function TodaySessionsCard({ sessions, router }: any) {
    const upcomingSessions = sessions.slice(0, 3);

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                        <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Today's Sessions</h3>
                </div>
                <button
                    onClick={() => router.push('/sessions')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                >
                    View All →
                </button>
            </div>

            {upcomingSessions.length > 0 ? (
                <div className="space-y-3">
                    {upcomingSessions.map((session: any) => (
                        <div
                            key={session.id}
                            className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl border border-blue-200 transition-all cursor-pointer"
                            onClick={() => router.push(`/sessions/${session.id}`)}
                        >
                            <p className="font-bold text-gray-900">{session.cohort_subject_subject_name || 'Subject'}</p>
                            <p className="text-sm text-gray-600 mt-1">{session.cohort_subject_cohort_name || 'Cohort'}</p>
                            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {session.start_time}
                                </span>
                                <span>{session.venue || 'TBA'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No sessions today</p>
                </div>
            )}
        </div>
    );
}

function SystemOverviewCard({ cohorts, assessments, students }: any) {
    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl">
                    <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">System Overview</h3>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Active Cohorts</span>
                    <span className="text-xl font-bold text-blue-600">{cohorts}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Total Assessments</span>
                    <span className="text-xl font-bold text-purple-600">{assessments}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Enrolled Students</span>
                    <span className="text-xl font-bold text-green-600">{students}</span>
                </div>
            </div>
        </div>
    );
}

function refetchStudents(): any {
    throw new Error('Function not implemented.');
}

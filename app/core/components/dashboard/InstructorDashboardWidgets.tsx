'use client';

// ============================================================================
// app/core/components/dashboard/InstructorDashboardWidgets.tsx
//
// Instructor-specific dashboard widgets — typed props, no any.
// Reuses MetricCard and AlertsBanner from AdminDashboardWidgets.
// ============================================================================

import { useRouter } from 'next/navigation';
import {
    Calendar, Clock, Award, TrendingUp, Users,
    AlertCircle, Bell, RefreshCw, Inbox,
    Target, FileText, Zap, BookOpen, Activity,
    ChevronRight, UserX, TrendingDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Session } from '@/app/core/types/session';
import type { Cohort, HistoryEntry, TeachingAssignment } from '@/app/core/types/academic';
import type { InstructorMetrics } from '@/app/core/hooks/useInstructorDashboard';
import type { DashboardAlert } from '@/app/core/hooks/useAdminDashboard';

// ── InstructorHeader ──────────────────────────────────────────────────────

interface InstructorHeaderProps {
    firstName: string;
    termName: string;
    yearName: string;
    lastRefresh: Date;
    alertCount: number;
    onRefresh: () => void;
}

export function InstructorHeader({
    firstName, termName, yearName,
    lastRefresh, alertCount, onRefresh,
}: InstructorHeaderProps) {
    const router = useRouter();

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                        <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-900 via-emerald-900 to-green-900 bg-clip-text text-transparent">
                            Welcome back, {firstName}!
                        </h1>
                        <p className="text-gray-600 mt-1 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {termName} • {yearName}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onRefresh}
                        className="p-3 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-300 hover:scale-110"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => router.push('/requests')}
                        className="relative p-3 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                    >
                        <Inbox className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">2</span>
                    </button>

                    <button
                        onClick={() => router.push('/notifications')}
                        className="relative p-3 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                    >
                        <Bell className="w-5 h-5" />
                        {alertCount > 0 && (
                            <>
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
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
    );
}

// ── InstructorAlertsBanner ────────────────────────────────────────────────

interface InstructorAlertsBannerProps {
    alerts: DashboardAlert[];
}

export function InstructorAlertsBanner({ alerts }: InstructorAlertsBannerProps) {
    const router = useRouter();
    if (alerts.length === 0) return null;

    const styles: Record<DashboardAlert['type'], string> = {
        error: 'bg-red-100/80 border-red-300 text-red-800',
        warning: 'bg-amber-100/80 border-amber-300 text-amber-800',
        info: 'bg-blue-100/80 border-blue-300 text-blue-800',
        success: 'bg-green-100/80 border-green-300 text-green-800',
    };

    return (
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
                    <div
                        key={alert.id}
                        onClick={() => router.push(alert.link)}
                        className={`flex items-center gap-3 p-4 rounded-xl border backdrop-blur-sm cursor-pointer transition-all hover:scale-[1.02] ${styles[alert.type]}`}
                    >
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium flex-1">{alert.message}</span>
                        <span className="text-sm font-bold whitespace-nowrap flex items-center gap-1">
                            {alert.action}<ChevronRight className="w-4 h-4" />
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── InstructorKeyMetrics ──────────────────────────────────────────────────

interface InstructorKeyMetricsProps {
    metrics: InstructorMetrics;
}

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle: string;
    icon: LucideIcon;
    gradient: string;
    alert?: boolean;
    onClick: () => void;
}

function MetricCard({ title, value, subtitle, icon: Icon, gradient, alert, onClick }: MetricCardProps) {
    return (
        <div
            onClick={onClick}
            className="group relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden"
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
            <div className="relative">
                <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 bg-gradient-to-br ${gradient} rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    {alert && (
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                        </span>
                    )}
                </div>
                <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
                <p className="text-4xl font-bold text-gray-900 mb-2">{value}</p>
                <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
        </div>
    );
}

export function InstructorKeyMetrics({ metrics }: InstructorKeyMetricsProps) {
    const router = useRouter();

    return (
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
    );
}

// ── TodayScheduleCard ─────────────────────────────────────────────────────

interface TodayScheduleCardProps {
    sessions: Session[];
}

export function TodayScheduleCard({ sessions }: TodayScheduleCardProps) {
    const router = useRouter();
    const preview = sessions.slice(0, 4);

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                        <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Today&apos;s Teaching Schedule</h3>
                </div>
                <button
                    onClick={() => router.push('/sessions/today')}
                    className="text-sm text-green-600 hover:text-green-700 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
                >
                    View All →
                </button>
            </div>

            {preview.length > 0 ? (
                <div className="space-y-3">
                    {preview.map(session => (
                        <div
                            key={session.id}
                            onClick={() => router.push(`/sessions/${session.id}`)}
                            className="group p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl border border-green-200 transition-all hover:scale-[1.02] cursor-pointer"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-4 h-4 text-green-600" />
                                        <span className="font-bold text-gray-900">
                                            {session.start_time ?? 'TBA'} – {session.end_time ?? 'TBA'}
                                        </span>
                                    </div>
                                    <p className="font-semibold text-gray-900">{session.subject_name}</p>
                                    <p className="text-sm text-gray-600">{session.cohort_name} • {session.venue || 'TBA'}</p>
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

// ── LearnersAtRisk ────────────────────────────────────────────────────────

interface LearnersAtRiskProps {
    frequentlyAbsent: number;
    needsSupport: number;
}

export function LearnersAtRisk({ frequentlyAbsent, needsSupport }: LearnersAtRiskProps) {
    const router = useRouter();

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
                    className="p-5 bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 rounded-xl border border-orange-200 transition-all hover:scale-[1.02] text-left"
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
                    className="p-5 bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 rounded-xl border border-red-200 transition-all hover:scale-[1.02] text-left"
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

// ── MyCohortsCard ─────────────────────────────────────────────────────────

interface MyCohortsCardProps {
    cohorts: Cohort[];
}

export function MyCohortsCard({ cohorts }: MyCohortsCardProps) {
    const router = useRouter();
    const preview = cohorts.slice(0, 4);

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
                {preview.map(cohort => (
                    <div
                        key={cohort.id}
                        onClick={() => router.push(`/academic/cohorts/${cohort.id}`)}
                        className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 cursor-pointer hover:scale-[1.02] transition-all"
                    >
                        <p className="font-bold text-gray-900">{cohort.name}</p>
                        <p className="text-sm text-gray-600 mt-1">{cohort.level}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── InstructorQuickActions ────────────────────────────────────────────────

interface InstructorQuickActionsProps {
    needsGrading: number;
}

export function InstructorQuickActions({ needsGrading }: InstructorQuickActionsProps) {
    const router = useRouter();

    const actions: { icon: LucideIcon; label: string; path: string; badge?: number }[] = [
        { icon: Clock, label: 'Mark Attendance', path: '/sessions/today' },
        { icon: Award, label: 'Grade Work', path: '/assessments?status=pending', badge: needsGrading },
        { icon: FileText, label: 'Submit Request', path: '/requests/new' },
        { icon: BookOpen, label: 'CBC Teaching', path: '/cbc/teaching' },
    ];

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
            </div>
            <div className="space-y-2">
                {actions.map(action => (
                    <button
                        key={action.label}
                        onClick={() => router.push(action.path)}
                        className="relative w-full flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-green-50 hover:from-green-100 hover:to-emerald-100 rounded-xl border border-gray-200 transition-all hover:scale-[1.02]"
                    >
                        <div className="flex items-center gap-3">
                            <action.icon className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-semibold text-gray-700">{action.label}</span>
                        </div>
                        {action.badge && action.badge > 0 && (
                            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                                {action.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── MyRequestsCard ────────────────────────────────────────────────────────

export function MyRequestsCard() {
    const router = useRouter();

    // Hardcoded — replace with useRequests hook when available
    const requests = [
        { title: 'Enrollment Change', status: 'Pending approval', color: 'bg-blue-50' },
        { title: 'Grade Override', status: 'Approved', color: 'bg-green-50' },
    ];

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
                {requests.map(r => (
                    <div key={r.title} className={`p-3 ${r.color} rounded-xl`}>
                        <p className="text-sm font-medium text-gray-900">{r.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{r.status}</p>
                    </div>
                ))}
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

// ── CBCProgressCard ───────────────────────────────────────────────────────

export function CBCProgressCard() {
    const router = useRouter();

    // Hardcoded — replace with useCBCProgress hook when available
    const stats = [
        { label: 'Outcomes Recorded', value: 24, color: 'bg-purple-50', textColor: 'text-purple-600' },
        { label: 'Evidence Collected', value: 156, color: 'bg-pink-50', textColor: 'text-pink-600' },
    ];

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                    <Target className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">CBC Progress</h3>
            </div>
            <div className="space-y-3">
                {stats.map(s => (
                    <div key={s.label} className={`p-3 ${s.color} rounded-xl`}>
                        <p className="text-sm font-medium text-gray-700">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.textColor} mt-1`}>{s.value}</p>
                    </div>
                ))}
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

// ── TeachingStats ─────────────────────────────────────────────────────────

interface TeachingStatsProps {
    attendance: number;
    sessions: number;
    assessments: number;
}

export function TeachingStats({ attendance, sessions, assessments }: TeachingStatsProps) {
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
                    <span className="text-sm font-medium text-gray-700">Today&apos;s Attendance</span>
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

// ── TeachingLoadCard ─────────────────────────────────────────────────────

interface TeachingLoadCardProps {
    assignments: TeachingAssignment[];
}

export function TeachingLoadCard({ assignments }: TeachingLoadCardProps) {
    const router = useRouter();
    const currentYear = assignments.filter(a => a.is_current_year);

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl">
                        <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">My Teaching Load</h3>
                </div>
                <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs font-bold rounded-full">
                    {currentYear.length} subject{currentYear.length !== 1 ? 's' : ''}
                </span>
            </div>

            {currentYear.length === 0 ? (
                <div className="py-8 text-center">
                    <BookOpen className="w-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No subjects assigned yet</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {currentYear.map(a => (
                        <div
                            key={a.cohort_subject_id}
                            onClick={() => router.push(`/academic/topics/browser`)}
                            className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 rounded-xl border border-teal-200 transition-all hover:scale-[1.02] cursor-pointer"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">{a.subject_name}</p>
                                    <p className="text-xs text-gray-500">
                                        {a.cohort_name} · {a.level}
                                        {a.start_date && (
                                            <span className="ml-1 text-teal-500">
                                                · since {new Date(a.start_date).toLocaleDateString('en-GB', {
                                                    day: '2-digit', month: 'short',
                                                })}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <span className="text-sm font-bold text-teal-600">{a.percentage}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                                    style={{ width: `${a.percentage}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{a.covered} / {a.total} subtopics covered</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── TeachingHistoryCard ───────────────────────────────────────────────────

interface TeachingHistoryCardProps {
    history: HistoryEntry[];
}

export function TeachingHistoryCard({ history }: TeachingHistoryCardProps) {
    const past = history.filter(h => !h.is_active);
    if (past.length === 0) return null;

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-gray-500 to-slate-600 rounded-xl">
                    <Clock className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Teaching History</h3>
                <span className="ml-auto px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                    {past.length} past
                </span>
            </div>
            <div className="space-y-2">
                {past.slice(0, 5).map((h, index) => (
                    <div key={h.log_id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-300 font-mono">#{past.length - index}</span>
                                    <p className="text-sm font-medium text-gray-900 truncate">{h.subject_name}</p>
                                </div>
                                <p className="text-xs text-gray-500">{h.cohort_name} · {h.academic_year}</p>
                                <p className="text-xs text-blue-500 mt-0.5">{h.organization_name}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xs text-gray-400">
                                    {new Date(h.assigned_at).toLocaleDateString('en-GB', {
                                        day: '2-digit', month: 'short', year: '2-digit',
                                    })}
                                    {h.unassigned_at && (
                                        <> → {new Date(h.unassigned_at).toLocaleDateString('en-GB', {
                                            day: '2-digit', month: 'short', year: '2-digit',
                                        })}</>
                                    )}
                                </p>
                                <p className="text-xs text-gray-300 mt-0.5">{h.duration_days}d</p>
                                {h.end_reason && (
                                    <p className="text-xs text-orange-400 mt-0.5">{h.end_reason}</p>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
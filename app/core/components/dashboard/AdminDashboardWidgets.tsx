'use client';

// ============================================================================
// app/core/components/dashboard/AdminDashboardWidgets.tsx
//
// All typed sub-components for the admin dashboard.
// No any. No API calls. Receives typed props only.
// ============================================================================

import { useRouter } from 'next/navigation';
import {
    Users, Calendar, ClipboardCheck, TrendingUp, Award,
    AlertCircle, Clock, Bell, RefreshCw, Inbox,
    Activity, FileBarChart, Settings, Zap, ChevronRight,
    BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DashboardAlert, DashboardMetrics } from '@/app/core/hooks/useAdminDashboard';
import type { Session } from '@/app/core/types/session';

// ── DashboardHeader ───────────────────────────────────────────────────────

interface DashboardHeaderProps {
    firstName: string;
    termName: string;
    yearName: string;
    lastRefresh: Date;
    alertCount: number;
    onRefresh: () => void;
}

export function DashboardHeader({
    firstName, termName, yearName,
    lastRefresh, alertCount, onRefresh,
}: DashboardHeaderProps) {
    const router = useRouter();

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 p-8 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-900 bg-clip-text text-transparent">
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
                        className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 hover:scale-110"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => router.push('/requests')}
                        className="relative p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                        <Inbox className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">5</span>
                    </button>

                    <button
                        onClick={() => router.push('/notifications')}
                        className="relative p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                        <Bell className="w-5 h-5" />
                        {alertCount > 0 && (
                            <>
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
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
    );
}

// ── AlertsBanner ──────────────────────────────────────────────────────────

interface AlertsBannerProps {
    alerts: DashboardAlert[];
}

export function AlertsBanner({ alerts }: AlertsBannerProps) {
    const router = useRouter();
    if (alerts.length === 0) return null;

    const styles: Record<DashboardAlert['type'], string> = {
        error: 'bg-red-100/80 border-red-300 text-red-800',
        warning: 'bg-amber-100/80 border-amber-300 text-amber-800',
        info: 'bg-blue-100/80 border-blue-300 text-blue-800',
        success: 'bg-green-100/80 border-green-300 text-green-800',
    };

    return (
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

// ── MetricCard ────────────────────────────────────────────────────────────

interface MetricCardProps {
    title: string;
    value: string | number;
    subtitle: string;
    icon: LucideIcon;
    gradient: string;
    alert?: boolean;
    onClick: () => void;
}

export function MetricCard({ title, value, subtitle, icon: Icon, gradient, alert, onClick }: MetricCardProps) {
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

// ── KeyMetrics ────────────────────────────────────────────────────────────

interface KeyMetricsProps {
    metrics: DashboardMetrics;
}

export function KeyMetrics({ metrics }: KeyMetricsProps) {
    const router = useRouter();

    return (
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
    );
}

// ── AttendanceWidget ──────────────────────────────────────────────────────

interface AttendanceWidgetProps {
    rate: number;
    sessionsToday: number;
}

export function AttendanceWidget({ rate, sessionsToday }: AttendanceWidgetProps) {
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

// ── PerformanceWidget ─────────────────────────────────────────────────────

interface PerformanceWidgetProps {
    averageScore: number;
    needsSupport: number;
}

export function PerformanceWidget({ averageScore, needsSupport }: PerformanceWidgetProps) {
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

// ── AssessmentPipeline ────────────────────────────────────────────────────

interface AssessmentPipelineProps {
    assessments: DashboardMetrics['assessments'];
}

export function AssessmentPipeline({ assessments }: AssessmentPipelineProps) {
    const stages = [
        { label: 'Pending', value: assessments.pending, color: 'bg-yellow-500' },
        { label: 'Upcoming', value: assessments.upcoming, color: 'bg-blue-500' },
        { label: 'Needs Grading', value: assessments.needsGrading, color: 'bg-orange-500' },
        { label: 'Completed', value: assessments.completed, color: 'bg-green-500' },
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
                {stages.map(stage => (
                    <div key={stage.label}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{stage.label}</span>
                            <span className="text-sm font-bold text-gray-900">{stage.value}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                                style={{ width: `${Math.min(assessments.total > 0 ? (stage.value / assessments.total) * 100 : 0, 100)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── QuickActions ──────────────────────────────────────────────────────────

interface QuickActionsProps {
    needsGrading: number;
}

interface ActionButton {
    icon: LucideIcon;
    label: string;
    path: string;
    badge?: number;
}

export function QuickActions({ needsGrading }: QuickActionsProps) {
    const router = useRouter();

    const actions: ActionButton[] = [
        { icon: ClipboardCheck, label: 'Attendance', path: '/sessions/today' },
        { icon: Calendar, label: 'New Session', path: '/sessions/new' },
        { icon: Award, label: 'Grade', path: '/assessments', badge: needsGrading },
        { icon: Users, label: 'Add Student', path: '/learners/new' },
        { icon: FileBarChart, label: 'Reports', path: '/reports' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ];

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {actions.map(action => (
                    <button
                        key={action.label}
                        onClick={() => router.push(action.path)}
                        className="relative p-4 bg-gradient-to-br from-gray-50 to-blue-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl border border-gray-200 transition-all hover:scale-105 flex flex-col items-center gap-2"
                    >
                        <action.icon className="w-5 h-5 text-blue-600" />
                        <span className="text-xs font-semibold text-gray-700">{action.label}</span>
                        {action.badge && action.badge > 0 && (
                            <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                {action.badge}
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── TodaySessionsWidget ───────────────────────────────────────────────────

interface TodaySessionsWidgetProps {
    sessions: Session[];
}

export function TodaySessionsWidget({ sessions }: TodaySessionsWidgetProps) {
    const router = useRouter();
    const preview = sessions.slice(0, 3);

    return (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                        <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Today&apos;s Sessions</h3>
                </div>
                <button
                    onClick={() => router.push('/sessions')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
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
                            className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl border border-blue-200 transition-all cursor-pointer"
                        >
                            <p className="font-bold text-gray-900">{session.subject_name}</p>
                            <p className="text-sm text-gray-600 mt-1">{session.cohort_name}</p>
                            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />{session.start_time ?? 'TBA'}
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

// ── SystemOverview ────────────────────────────────────────────────────────

interface SystemOverviewProps {
    cohortCount: number;
    assessmentCount: number;
    studentCount: number;
}

export function SystemOverview({ cohortCount, assessmentCount, studentCount }: SystemOverviewProps) {
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
                    <span className="text-xl font-bold text-blue-600">{cohortCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Total Assessments</span>
                    <span className="text-xl font-bold text-purple-600">{assessmentCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Enrolled Students</span>
                    <span className="text-xl font-bold text-green-600">{studentCount}</span>
                </div>
            </div>
        </div>
    );
}

// ── PendingApprovals ──────────────────────────────────────────────────────

export function PendingApprovals() {
    const router = useRouter();

    // Hardcoded pending items — replace with useApprovals hook when available
    const items = [
        { message: 'John Doe enrollment change request', time: '5 mins ago' },
        { message: '3 learner status update requests', time: '2 hours ago' },
    ];

    return (
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
                {items.map((item, i) => (
                    <div
                        key={i}
                        onClick={() => router.push('/requests')}
                        className="p-4 bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 rounded-xl border border-orange-200 transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-between"
                    >
                        <div>
                            <p className="font-medium text-gray-900">{item.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{item.time}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-orange-600" />
                    </div>
                ))}
            </div>
        </div>
    );
}
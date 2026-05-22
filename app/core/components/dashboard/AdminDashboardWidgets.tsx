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
    AlertCircle, Clock, RefreshCw, Inbox,
    Activity, FileBarChart, Settings, Zap, ChevronRight,
    BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DashboardAlert, DashboardMetrics } from '@/app/core/hooks/useAdminDashboard';
import type { Session } from '@/app/core/types/session';
import { themeClasses } from '@/app/core/theme/themeClasses';

const dashboardHeaderCardClass = `${themeClasses.dashboardCard} rounded-3xl p-8`;
const dashboardCardClass = `${themeClasses.dashboardCard} p-6`;
const dashboardMetricCardClass = `${themeClasses.dashboardMetricCard} cursor-pointer overflow-hidden p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl`;
const dashboardActionRowClass = `${themeClasses.dashboardActionRow} p-4`;

// ── DashboardHeader ───────────────────────────────────────────────────────

interface DashboardHeaderProps {
    firstName: string;
    termName: string;
    yearName: string;
    lastRefresh: Date;
    onRefresh: () => void;
}

export function DashboardHeader({
    firstName, termName, yearName,
    lastRefresh, onRefresh,
}: DashboardHeaderProps) {
    return (
        <div className={`${dashboardHeaderCardClass} mb-6`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold theme-text">
                            Welcome back, {firstName}!
                        </h1>
                        <p className="theme-muted mt-1 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {termName} • {yearName}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onRefresh}
                        className="theme-focus-ring theme-button-ghost theme-hover-info rounded-xl p-3 transition-all duration-300 hover:scale-110"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>

                    <div className={`${themeClasses.dashboardMutedPanel} hidden px-4 py-2 text-right lg:block`}>
                        <p className="text-sm font-semibold theme-text">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs theme-muted">
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

    const styles: Record<DashboardAlert['type'], { container: string; accent: string }> = {
        error: {
            container: 'theme-danger-surface',
            accent: 'text-[color:var(--color-danger)]',
        },
        warning: {
            container: 'theme-warning-surface',
            accent: 'text-[color:var(--color-warning)]',
        },
        info: {
            container: 'theme-info-surface',
            accent: 'text-[color:var(--color-primary)]',
        },
        success: {
            container: 'theme-success-surface',
            accent: 'text-[color:var(--color-success)]',
        },
    };

    return (
        <div className={`${themeClasses.warningSurface} mb-6 p-6`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold theme-text">Action Required</h2>
                <span className="ml-auto rounded-full px-3 py-1 text-xs font-bold theme-warning-surface text-[color:var(--color-warning)]">
                    {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
                </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alerts.map(alert => (
                    <div
                        key={alert.id}
                        onClick={() => router.push(alert.link)}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl p-4 transition-all hover:scale-[1.02] ${styles[alert.type].container}`}
                    >
                        <AlertCircle className={`w-5 h-5 flex-shrink-0 ${styles[alert.type].accent}`} />
                        <span className="flex-1 text-sm font-medium theme-text">{alert.message}</span>
                        <span className={`flex items-center gap-1 whitespace-nowrap text-sm font-bold ${styles[alert.type].accent}`}>
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
            className={`group relative ${dashboardMetricCardClass}`}
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
                <p className="mb-2 text-sm font-medium theme-muted">{title}</p>
                <p className="mb-2 text-4xl font-bold theme-text">{value}</p>
                <p className="text-xs theme-subtle">{subtitle}</p>
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
        <div className={dashboardCardClass}>
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${isGood ? 'bg-green-500' : isWarning ? 'bg-amber-500' : 'bg-red-500'}`}>
                    <ClipboardCheck className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold theme-text">Attendance</h3>
            </div>
            <div className="text-center py-6">
                <p className="mb-2 text-5xl font-bold theme-text">
                    {rate > 0 ? `${rate}%` : 'N/A'}
                </p>
                <p className="text-sm theme-muted">{sessionsToday} sessions today</p>
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
        <div className={dashboardCardClass}>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold theme-text">Performance</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl p-4 text-center theme-info-surface">
                    <p className="text-3xl font-bold text-blue-600">
                        {averageScore > 0 ? `${averageScore}%` : 'N/A'}
                    </p>
                    <p className="mt-2 text-xs theme-muted">Average</p>
                </div>
                <div className="rounded-xl p-4 text-center theme-warning-surface">
                    <p className="text-3xl font-bold text-orange-600">{needsSupport}</p>
                    <p className="mt-2 text-xs theme-muted">At Risk</p>
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
        <div className={dashboardCardClass}>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                    <Award className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold theme-text">Assessment Pipeline</h3>
            </div>
            <div className="space-y-3">
                {stages.map(stage => (
                    <div key={stage.label}>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium theme-muted">{stage.label}</span>
                            <span className="text-sm font-bold theme-text">{stage.value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full theme-surface-muted">
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
        { icon: Calendar, label: 'Plan a Lesson', path: '/lesson-plans/new' },
        { icon: Award, label: 'Grade', path: '/assessments', badge: needsGrading },
        { icon: Users, label: 'Add Student', path: '/learners/new' },
        { icon: FileBarChart, label: 'Reports', path: '/reports' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ];

    return (
        <div className={dashboardCardClass}>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold theme-text">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {actions.map(action => (
                    <button
                        key={action.label}
                        onClick={() => router.push(action.path)}
                        className={`${dashboardActionRowClass} relative flex flex-col items-center gap-2 hover:scale-105`}
                    >
                        <action.icon className="w-5 h-5 text-[color:var(--color-primary)]" />
                        <span className="text-xs font-semibold theme-text">{action.label}</span>
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
        <div className={dashboardCardClass}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                        <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold theme-text">Today&apos;s Sessions</h3>
                </div>
                <button
                    onClick={() => router.push('/sessions')}
                    className="flex items-center gap-1 text-sm font-semibold theme-link transition-all hover:gap-2"
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
                            className="cursor-pointer rounded-xl p-4 theme-info-surface transition-all hover:shadow-md"
                        >
                            <p className="font-bold theme-text">{session.subject_name}</p>
                            <p className="mt-1 text-sm theme-muted">{session.cohort_name}</p>
                            <div className="mt-2 flex items-center justify-between text-xs theme-subtle">
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
                    <Calendar className="mx-auto mb-3 h-12 w-12 theme-subtle" />
                    <p className="text-sm theme-muted">No sessions today</p>
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
        <div className={dashboardCardClass}>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl">
                    <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold theme-text">System Overview</h3>
            </div>
            <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl p-3 theme-info-surface">
                    <span className="text-sm font-medium theme-text">Active Cohorts</span>
                    <span className="text-xl font-bold text-blue-600">{cohortCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl p-3 theme-surface-muted">
                    <span className="text-sm font-medium theme-text">Total Assessments</span>
                    <span className="text-xl font-bold text-purple-600">{assessmentCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl p-3 theme-success-surface">
                    <span className="text-sm font-medium theme-text">Enrolled Students</span>
                    <span className="text-xl font-bold text-green-600">{studentCount}</span>
                </div>
            </div>
        </div>
    );
}

// ── PendingApprovals ──────────────────────────────────────────────────────

interface PendingRequest {
    id: number;
    title: string;
    submitted_by_name: string;
    created_at: string;
}

interface PendingApprovalsProps {
    requests: PendingRequest[];
    loading: boolean;
    pendingCount: number;
}

export function PendingApprovals({ requests, loading, pendingCount }: PendingApprovalsProps) {
    const router = useRouter();

    return (
        <div className={dashboardCardClass}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                        <Inbox className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold theme-text">Pending Approvals</h3>
                    {pendingCount > 0 && (
                        <span className="rounded-full px-2 py-1 text-xs font-bold theme-danger-surface text-[color:var(--color-danger)]">
                            {pendingCount} pending
                        </span>
                    )}
                </div>
                <button
                    onClick={() => router.push('/requests')}
                    className="flex items-center gap-1 text-sm font-semibold theme-link transition-all hover:gap-2"
                >
                    View All →
                </button>
            </div>

            <div className="space-y-3">
                {loading ? (
                    <p className="py-2 text-sm theme-subtle">Loading…</p>
                ) : requests.length === 0 ? (
                    <p className="py-2 text-sm theme-muted">No pending approvals.</p>
                ) : (
                    requests.slice(0, 5).map(req => (
                        <div
                            key={req.id}
                            onClick={() => router.push('/requests')}
                            className="flex cursor-pointer items-center justify-between rounded-xl p-4 theme-warning-surface transition-all hover:scale-[1.02] hover:shadow-md"
                        >
                            <div>
                                <p className="font-medium theme-text">{req.title}</p>
                                <p className="mt-1 text-xs theme-subtle">
                                    {req.submitted_by_name} · {new Date(req.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-[color:var(--color-warning)]" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

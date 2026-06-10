'use client';

// ============================================================================
// app/core/components/dashboard/InstructorDashboardWidgets.tsx
//
// Instructor-specific dashboard widgets — typed props, no any.
// Reuses MetricCard and AlertsBanner from AdminDashboardWidgets.
// ============================================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Calendar, Clock, Award, TrendingUp, Users,
    AlertCircle, RefreshCw, Inbox,
    Target, FileText, Zap, Activity,
    ChevronRight, UserX, TrendingDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Session } from '@/app/core/types/session';
import type {
    HistoryEntry,
    TeachingCohortSummary,
} from '@/app/core/types/academic';
import type { InstructorMetrics } from '@/app/core/hooks/useInstructorDashboard';
import type { AssessmentScore } from '@/app/core/types/assessment';
import type { DashboardAlert } from '@/app/core/hooks/useAdminDashboard';
import { themeClasses } from '@/app/core/theme/themeClasses';

const dashboardHeaderCardClass = `${themeClasses.dashboardCard} rounded-3xl p-8`;
const dashboardCardClass = `${themeClasses.dashboardCard} p-6`;
const dashboardMetricCardClass = `${themeClasses.dashboardMetricCard} cursor-pointer overflow-hidden p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl`;
const dashboardMutedPanelClass = `${themeClasses.dashboardMutedPanel} p-4`;
const dashboardActionRowClass = `${themeClasses.dashboardActionRow} p-3`;

function getTodayScheduleActionLabel(session: Session) {
    if (session.schedule_state === 'IN_PROGRESS_OVERDUE' || session.needs_completion) {
        return 'End lesson';
    }

    if (session.status === 'IN_PROGRESS') {
        return 'Continue lesson';
    }

    if (session.schedule_state === 'SCHEDULED_READY' || session.can_start_now) {
        return 'Start lesson';
    }

    if (session.schedule_state === 'SCHEDULED_OVERDUE') {
        return 'Start late';
    }

    return 'Open lesson';
}

// ── InstructorHeader ──────────────────────────────────────────────────────

interface InstructorHeaderProps {
    firstName: string;
    termName: string;
    yearName: string;
    lastRefresh: Date;
    onRefresh: () => void;
}

export function InstructorHeader({
    firstName, termName, yearName,
    lastRefresh, onRefresh,
}: InstructorHeaderProps) {
    return (
        <div className={dashboardHeaderCardClass}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                        <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold theme-text">
                            Welcome back, {firstName}!
                        </h1>
                        <p className="theme-muted mt-1 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {termName} - {yearName}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onRefresh}
                        className="theme-focus-ring theme-button-ghost theme-hover-success rounded-xl p-3 transition-all duration-300 hover:scale-110"
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

// ── InstructorAlertsBanner ────────────────────────────────────────────────

interface InstructorAlertsBannerProps {
    alerts: DashboardAlert[];
}

export function InstructorAlertsBanner({ alerts }: InstructorAlertsBannerProps) {
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
        <div className={`${themeClasses.warningSurface} p-6`}>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-bold theme-text">Teaching Alerts</h2>
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
                title="Today's Lessons"
                value={metrics.sessions.today}
                subtitle={`${metrics.sessions.upcoming} upcoming`}
                icon={Calendar}
                gradient="from-blue-500 to-cyan-500"
                onClick={() => router.push('/sessions')}
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
                onClick={() => router.push('/assessments')}
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
        <div className={dashboardCardClass}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                        <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold theme-text">Today&apos;s Teaching Schedule</h3>
                </div>
                <button
                    onClick={() => router.push('/sessions')}
                    className="flex items-center gap-1 text-sm font-semibold text-[color:var(--color-success)] transition-all hover:gap-2 hover:opacity-80"
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
                            className="group cursor-pointer rounded-xl p-4 theme-success-surface transition-all hover:scale-[1.02] hover:shadow-md"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-4 h-4 text-[color:var(--color-success)]" />
                                        <span className="font-bold theme-text">
                                            {session.start_time ?? 'TBA'} - {session.end_time ?? 'TBA'}
                                        </span>
                                    </div>
                                    <p className="font-semibold theme-text">{session.subject_name}</p>
                                    <p className="text-sm theme-muted">{session.cohort_name} - {session.venue || 'TBA'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="hidden text-sm font-semibold text-[color:var(--color-success)] md:inline">
                                        {getTodayScheduleActionLabel(session)}
                                    </span>
                                    <ChevronRight className="w-5 h-5 theme-subtle transition-colors group-hover:text-[color:var(--color-success)]" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-12 text-center">
                    <Calendar className="mx-auto mb-3 h-12 w-12 theme-subtle" />
                    <p className="text-sm font-medium theme-text">No lessons scheduled today.</p>
                    <p className="mt-1 text-sm theme-muted">
                        Prepare a lesson or review your assigned classes before the next teaching day.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <button
                            onClick={() => router.push('/lesson-plans/new')}
                            className="theme-focus-ring theme-button-primary rounded-lg px-4 py-2 text-sm font-semibold"
                        >
                            Prepare a lesson
                        </button>
                        <button
                            onClick={() => router.push('/academic/cohorts')}
                            className="theme-focus-ring theme-button-secondary rounded-lg px-4 py-2 text-sm font-semibold"
                        >
                            View my classes
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── LearnersAtRisk ────────────────────────────────────────────────────────

interface LearnersAtRiskProps {
    needsSupport: number;
    attendanceRiskCount: number;
    attendanceRiskLearnerCount: number;
    attendanceRiskLoading: boolean;
    attendanceRiskError: string | null;
}

export function LearnersAtRisk({
    needsSupport,
    attendanceRiskCount,
    attendanceRiskLearnerCount,
    attendanceRiskLoading,
    attendanceRiskError,
}: LearnersAtRiskProps) {
    const router = useRouter();
    const attendanceRiskPath = '/reports/instructor/attendance-risk';
    const attendanceRiskValue = attendanceRiskLearnerCount > 0
        ? attendanceRiskLearnerCount
        : attendanceRiskCount;
    const attendanceRiskDisabled = attendanceRiskLoading || attendanceRiskError !== null;

    return (
        <div className={dashboardCardClass}>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold theme-text">Learners Requiring Attention</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={() => {
                        if (!attendanceRiskDisabled) {
                            router.push(attendanceRiskPath);
                        }
                    }}
                    disabled={attendanceRiskDisabled}
                    className={`p-5 rounded-xl border text-left transition-all ${
                        attendanceRiskDisabled
                            ? 'theme-warning-surface cursor-default'
                            : 'theme-warning-surface hover:scale-[1.02] hover:shadow-md'
                    }`}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <UserX className="w-6 h-6 text-[color:var(--color-warning)]" />
                        <p className="font-bold theme-text">Attendance Risk</p>
                    </div>
                    {attendanceRiskLoading ? (
                        <div className="space-y-2">
                            <div className="h-8 w-20 rounded bg-orange-200/70 animate-pulse" />
                            <div className="h-3 w-40 rounded bg-orange-100 animate-pulse" />
                        </div>
                    ) : attendanceRiskError ? (
                        <>
                            <p className="text-sm font-medium theme-text">Could not load attendance risk</p>
                            <p className="mt-1 text-xs theme-muted">
                                Try refreshing the dashboard.
                            </p>
                        </>
                    ) : attendanceRiskCount === 0 ? (
                        <>
                            <p className="text-sm font-medium theme-text">No current attendance risk</p>
                            <p className="mt-1 text-xs theme-muted">
                                Based on completed lessons
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="mb-1 text-3xl font-bold text-[color:var(--color-warning)]">{attendanceRiskValue}</p>
                            <p className="text-xs theme-muted">
                                Missing your lessons frequently
                            </p>
                        </>
                    )}
                </button>

                <button
                    onClick={() => router.push('/learners?filter=struggling')}
                    className="rounded-xl p-5 text-left theme-danger-surface transition-all hover:scale-[1.02] hover:shadow-md"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <TrendingDown className="w-6 h-6 text-[color:var(--color-danger)]" />
                        <p className="font-bold theme-text">Academic Struggle</p>
                    </div>
                    <p className="text-3xl font-bold text-red-600 mb-1">{needsSupport}</p>
                    <p className="text-xs theme-muted">Scoring below 50%</p>
                </button>
            </div>
        </div>
    );
}

// ── MyCohortsCard ─────────────────────────────────────────────────────────

interface MyCohortsCardProps {
    cohorts: TeachingCohortSummary[];
}

export function MyCohortsCard({ cohorts }: MyCohortsCardProps) {
    const router = useRouter();
    const preview = cohorts.slice(0, 4);

    return (
        <div className={dashboardCardClass}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold theme-text">My Teaching Load</h3>
                </div>
                <button
                    onClick={() => router.push('/academic/cohorts')}
                    className="text-sm font-semibold theme-link"
                >
                    View All →
                </button>
            </div>
            {preview.length === 0 ? (
                <div className="py-10 text-center">
                    <Users className="mx-auto mb-3 h-10 w-10 theme-subtle" />
                    <p className="text-sm font-medium theme-text">Your teaching load is not assigned yet.</p>
                    <p className="mt-1 text-sm theme-muted">
                        Once your administrator assigns classes or subjects, they will appear here.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {preview.map(cohort => (
                        <div
                            key={cohort.cohort_id}
                            onClick={() => router.push(`/academic/cohorts/${cohort.cohort_id}`)}
                            className="cursor-pointer rounded-xl p-4 theme-info-surface transition-all hover:scale-[1.02] hover:shadow-md"
                        >
                            <p className="font-bold theme-text">{cohort.cohort_name}</p>
                            <p className="mt-1 text-sm theme-muted">
                                {[cohort.level, cohort.curriculum_type].filter(Boolean).join(' · ') || 'Teaching cohort'}
                            </p>
                            <p className="mt-2 text-xs font-medium text-[color:var(--color-primary)]">
                                {cohort.subject_count} subject{cohort.subject_count !== 1 ? 's' : ''}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs theme-subtle">
                                {cohort.subjects.map((subject) => subject.subject_name).join(', ')}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── NoCohortsAssignedCard ────────────────────────────────────────────────

export function NoCohortsAssignedCard() {
    return (
        <div className={dashboardCardClass}>
            <div className="py-10 text-center">
                <Users className="mx-auto mb-3 h-12 w-12 theme-subtle" />
                <p className="text-lg font-semibold theme-text">Your teaching load is not assigned yet.</p>
                <p className="mt-2 text-sm theme-muted">
                    Once your administrator assigns classes or subjects, your lessons, learners, and progress tools will appear here.
                </p>
            </div>
        </div>
    );
}

// ── InstructorQuickActions ────────────────────────────────────────────────

interface InstructorQuickActionsProps {
    needsGrading: number;
    todayLessons: number;
}

export function InstructorQuickActions({ needsGrading, todayLessons }: InstructorQuickActionsProps) {
    const router = useRouter();

    const actions: { icon: LucideIcon; label: string; path: string; badge?: number }[] = [
        { icon: Calendar, label: "Today's lessons", path: '/sessions', badge: todayLessons },
        { icon: FileText, label: 'Prepare lesson', path: '/lesson-plans/new' },
        { icon: Award, label: 'Grade work', path: '/assessments?status=pending', badge: needsGrading },
        { icon: Users, label: 'My learners', path: '/learners' },
        { icon: Inbox, label: 'Submit request', path: '/requests/new' },
    ];

    return (
        <div className={dashboardCardClass}>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold theme-text">Quick Actions</h3>
            </div>
            <div className="space-y-2">
                {actions.map(action => (
                    <button
                        key={action.label}
                        onClick={() => router.push(action.path)}
                        className={`${dashboardActionRowClass} relative flex w-full items-center justify-between hover:scale-[1.02]`}
                    >
                        <div className="flex items-center gap-3">
                            <action.icon className="w-5 h-5 text-[color:var(--color-success)]" />
                            <span className="text-sm font-semibold theme-text">{action.label}</span>
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

interface AssessmentsSummaryCardProps {
    needsGrading: number;
    upcomingAssessments: number;
    pendingReviewRows: AssessmentScore[];
}

export function AssessmentsSummaryCard({
    needsGrading,
    upcomingAssessments,
    pendingReviewRows,
}: AssessmentsSummaryCardProps) {
    const router = useRouter();
    const previewRows = pendingReviewRows.slice(0, 4);

    return (
        <div className={dashboardCardClass}>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                    <Award className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold theme-text">Assessments &amp; Grading</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() => router.push('/assessments?status=pending')}
                    className="rounded-xl p-4 text-left theme-warning-surface transition-all hover:scale-[1.02] hover:shadow-md"
                >
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Needs review</p>
                    <p className="mt-2 text-3xl font-bold text-amber-700">{needsGrading}</p>
                    <p className="mt-1 text-xs theme-muted">
                        {needsGrading > 0 ? 'Open your review queue.' : 'No review queue right now.'}
                    </p>
                </button>
                <button
                    type="button"
                    onClick={() => router.push('/assessments')}
                    className="rounded-xl p-4 text-left theme-info-surface transition-all hover:scale-[1.02] hover:shadow-md"
                >
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Upcoming</p>
                    <p className="mt-2 text-3xl font-bold text-blue-700">{upcomingAssessments}</p>
                    <p className="mt-1 text-xs theme-muted">
                        Assessment{upcomingAssessments === 1 ? '' : 's'} due in the next week.
                    </p>
                </button>
            </div>
            <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold theme-text">Review queue</p>
                    {needsGrading > previewRows.length ? (
                        <span className="text-xs theme-muted">
                            Showing {previewRows.length} of {needsGrading}
                        </span>
                    ) : null}
                </div>
                {previewRows.length > 0 ? (
                    <div className="space-y-2">
                        {previewRows.map((score) => (
                            <button
                                key={score.id}
                                type="button"
                                onClick={() => router.push(`/assessments/${score.assessment}?focus=score-entry&student=${score.student}`)}
                                className="w-full rounded-xl border theme-border bg-white/70 px-4 py-3 text-left transition-all hover:scale-[1.01] hover:shadow-sm"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold theme-text">
                                            {score.student_name}
                                        </p>
                                        <p className="truncate text-xs theme-muted">
                                            {score.assessment_name}
                                        </p>
                                    </div>
                                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                                        {score.status_display || 'Pending review'}
                                    </span>
                                </div>
                                <p className="mt-2 text-xs theme-muted">
                                    {score.score == null && score.rubric_level == null
                                        ? 'Score, rubric level, or review status still needs to be recorded.'
                                        : 'Open this learner row to finish the review.'}
                                </p>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border theme-border bg-white/70 px-4 py-3 text-sm theme-muted">
                        No learner rows are waiting for review right now.
                    </div>
                )}
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                    type="button"
                    onClick={() => {
                        const firstPendingRow = previewRows[0];
                        if (firstPendingRow) {
                            router.push(`/assessments/${firstPendingRow.assessment}?focus=score-entry&student=${firstPendingRow.student}`);
                            return;
                        }
                        router.push('/assessments');
                    }}
                    className="theme-focus-ring theme-button-primary w-full rounded-lg px-4 py-2 text-sm font-semibold sm:w-auto"
                >
                    {previewRows.length > 0 ? 'Review now' : 'Open assessments'}
                </button>
                <button
                    type="button"
                    onClick={() => router.push('/assessments')}
                    className="theme-focus-ring theme-button-secondary w-full rounded-lg px-4 py-2 text-sm font-semibold sm:w-auto"
                >
                    View assessments
                </button>
            </div>
        </div>
    );
}

// ── MyRequestsCard ────────────────────────────────────────────────────────

interface RequestSummary {
    id: number;
    title: string;
    status_display: string;
    request_type_display: string;
}

interface MyRequestsCardProps {
    requests: RequestSummary[];
    loading: boolean;
    error: string | null;
}

export function MyRequestsCard({ requests, loading, error }: MyRequestsCardProps) {
    const router = useRouter();
    const recentRequests = requests.slice(0, 3);

    return (
        <div className={dashboardCardClass}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                        <Inbox className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold theme-text">My Requests</h3>
                </div>
                {requests.length > 0 && (
                    <span className="rounded-full px-2 py-1 text-xs font-bold theme-info-surface text-[color:var(--color-primary)]">
                        {requests.length}
                    </span>
                )}
            </div>

            {loading ? (
                <p className="py-4 text-sm theme-muted">Loading requests…</p>
            ) : error ? (
                <p className="py-4 text-sm theme-muted">Requests are unavailable right now.</p>
            ) : recentRequests.length === 0 ? (
                <p className="py-4 text-sm theme-muted">No requests submitted yet.</p>
            ) : (
                <>
                    <div className="space-y-3">
                        {recentRequests.map(request => (
                            <Link
                                key={request.id}
                                href={`/requests/${request.id}`}
                                className="block rounded-xl p-3 theme-info-surface transition-colors hover:opacity-90"
                            >
                                <p className="text-sm font-medium theme-text">{request.title}</p>
                                <p className="mt-1 text-xs theme-subtle">
                                    {request.status_display} · {request.request_type_display}
                                </p>
                            </Link>
                        ))}
                    </div>
                    <button
                        onClick={() => router.push('/requests')}
                        className="theme-focus-ring theme-button-primary mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold"
                    >
                        View All Requests
                    </button>
                </>
            )}
        </div>
    );
}

// ── CurriculumToolCard ────────────────────────────────────────────────────

interface CurriculumToolCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    primaryAction: {
        label: string;
        path: string;
    };
    secondaryAction?: {
        label: string;
        path: string;
    };
}

export function CurriculumToolCard({
    title,
    description,
    icon: Icon,
    primaryAction,
    secondaryAction,
}: CurriculumToolCardProps) {
    const router = useRouter();

    return (
        <div className={dashboardCardClass}>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                    <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold theme-text">{title}</h3>
            </div>
            <p className="mb-4 text-sm theme-muted">{description}</p>
            <div className="space-y-2">
                <button
                    onClick={() => router.push(primaryAction.path)}
                    className="theme-focus-ring w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
                >
                    {primaryAction.label}
                </button>
                {secondaryAction && (
                    <button
                        onClick={() => router.push(secondaryAction.path)}
                        className="theme-focus-ring theme-button-secondary w-full rounded-lg px-4 py-2 text-sm font-semibold"
                    >
                        {secondaryAction.label}
                    </button>
                )}
            </div>
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
        <div className={dashboardCardClass}>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-slate-500 to-gray-600 rounded-xl">
                    <Activity className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold theme-text">Teaching Stats</h3>
            </div>
            <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl p-3 theme-success-surface">
                    <span className="text-sm font-medium theme-text">Today&apos;s Attendance</span>
                    <span className="text-lg font-bold text-green-600">{attendance > 0 ? `${attendance}%` : 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl p-3 theme-info-surface">
                    <span className="text-sm font-medium theme-text">Sessions Today</span>
                    <span className="text-lg font-bold text-blue-600">{sessions}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl p-3 theme-warning-surface">
                    <span className="text-sm font-medium theme-text">Upcoming Assessments</span>
                    <span className="text-lg font-bold text-amber-600">{assessments}</span>
                </div>
            </div>
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
        <div className={dashboardCardClass}>
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-gray-500 to-slate-600 rounded-xl">
                    <Clock className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold theme-text">Teaching History</h3>
                <span className={`${themeClasses.dashboardStatusSurface} ml-auto px-2 py-1 text-xs font-bold theme-muted`}>
                    {past.length} past
                </span>
            </div>
            <div className="space-y-2">
                {past.slice(0, 5).map((h, index) => (
                    <div key={h.log_id} className={`${dashboardMutedPanelClass} p-3`}>
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs theme-subtle">#{past.length - index}</span>
                                    <p className="truncate text-sm font-medium theme-text">{h.subject_name}</p>
                                </div>
                                <p className="text-xs theme-muted">{h.cohort_name} · {h.academic_year}</p>
                                <p className="text-xs text-blue-500 mt-0.5">{h.organization_name}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xs theme-subtle">
                                    {new Date(h.assigned_at).toLocaleDateString('en-GB', {
                                        day: '2-digit', month: 'short', year: '2-digit',
                                    })}
                                    {h.unassigned_at && (
                                        <> → {new Date(h.unassigned_at).toLocaleDateString('en-GB', {
                                            day: '2-digit', month: 'short', year: '2-digit',
                                        })}</>
                                    )}
                                </p>
                                <p className="mt-0.5 text-xs theme-subtle">{h.duration_days}d</p>
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

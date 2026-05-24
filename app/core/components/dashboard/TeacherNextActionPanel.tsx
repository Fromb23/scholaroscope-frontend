'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertCircle,
    Award,
    BookOpen,
    Calendar,
    CheckCircle2,
    FileText,
    PlayCircle,
    Target,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import type { DashboardAlert } from '@/app/core/hooks/useAdminDashboard';
import type { InstructorMetrics } from '@/app/core/hooks/useInstructorDashboard';
import { themeClasses } from '@/app/core/theme/themeClasses';
import type { TeachingAssignment, TeachingCohortSummary } from '@/app/core/types/academic';
import type { Session } from '@/app/core/types/session';

type ActionTone = 'info' | 'success' | 'warning' | 'danger';

interface NextAction {
    key: string;
    title: string;
    description: string;
    primaryLabel: string;
    primaryPath: string;
    secondaryLabel?: string;
    secondaryPath?: string;
    icon: LucideIcon;
    tone: ActionTone;
    session?: Session;
}

interface TeacherNextActionPanelProps {
    sessions: Session[];
    alerts: DashboardAlert[];
    metrics: InstructorMetrics;
    teachingCohorts: TeachingCohortSummary[];
    currentTerm?: { name?: string | null } | null;
    currentYear?: { name?: string | null } | null;
    teachingLoad: TeachingAssignment[];
}

function parseSessionTimestamp(session: Session): number {
    const timestamp = new Date(`${session.session_date}T${session.start_time ?? '00:00:00'}`).getTime();
    return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function formatSessionDate(value: string): string {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

function formatSessionTime(value: string | null): string {
    if (!value) {
        return 'Time not set';
    }

    const parsed = new Date(`1970-01-01T${value}`);
    if (Number.isNaN(parsed.getTime())) {
        return value.slice(0, 5);
    }

    return parsed.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

const toneStyles: Record<ActionTone, { accent: string; icon: string; surface: string; badge: string }> = {
    info: {
        accent: 'text-[color:var(--color-primary)]',
        icon: 'from-blue-500 to-cyan-500',
        surface: 'theme-info-surface',
        badge: 'blue',
    },
    success: {
        accent: 'text-[color:var(--color-success)]',
        icon: 'from-green-500 to-emerald-600',
        surface: 'theme-success-surface',
        badge: 'green',
    },
    warning: {
        accent: 'text-[color:var(--color-warning)]',
        icon: 'from-amber-500 to-orange-600',
        surface: 'theme-warning-surface',
        badge: 'orange',
    },
    danger: {
        accent: 'text-[color:var(--color-danger)]',
        icon: 'from-red-500 to-rose-600',
        surface: 'theme-danger-surface',
        badge: 'red',
    },
};

function buildNextAction({
    sessions,
    metrics,
    teachingLoad,
}: Pick<TeacherNextActionPanelProps, 'sessions' | 'metrics' | 'teachingLoad'>): NextAction {
    const orderedSessions = [...sessions].sort((left, right) => parseSessionTimestamp(left) - parseSessionTimestamp(right));
    const overdueLesson = orderedSessions.find((session) => (
        session.schedule_state === 'IN_PROGRESS_OVERDUE' || Boolean(session.needs_completion)
    ));

    if (overdueLesson) {
        return {
            key: 'complete-overdue-lesson',
            title: 'Complete this lesson',
            description: `${overdueLesson.subject_name} with ${overdueLesson.cohort_name} is still open. Review attendance and finish your teaching record.`,
            primaryLabel: 'Complete lesson',
            primaryPath: `/sessions/${overdueLesson.id}`,
            secondaryLabel: 'Review attendance',
            secondaryPath: `/sessions/${overdueLesson.id}`,
            icon: CheckCircle2,
            tone: 'danger',
            session: overdueLesson,
        };
    }

    const openLesson = orderedSessions.find((session) => session.status === 'IN_PROGRESS');
    if (openLesson) {
        return {
            key: 'continue-open-lesson',
            title: 'Continue your lesson',
            description: `${openLesson.subject_name} with ${openLesson.cohort_name} is already in progress. Finish attendance, confirm what was taught, and close the lesson when class ends.`,
            primaryLabel: 'Continue lesson',
            primaryPath: `/sessions/${openLesson.id}`,
            secondaryLabel: 'Review attendance',
            secondaryPath: `/sessions/${openLesson.id}`,
            icon: PlayCircle,
            tone: 'warning',
            session: openLesson,
        };
    }

    const readyLesson = orderedSessions.find((session) => (
        session.schedule_state === 'SCHEDULED_READY'
        || session.schedule_state === 'SCHEDULED_OVERDUE'
        || session.can_start_now
    ));
    if (readyLesson) {
        return {
            key: 'start-next-lesson',
            title: readyLesson.schedule_state === 'SCHEDULED_OVERDUE'
                ? 'Start this lesson'
                : 'Start your next lesson',
            description: `${readyLesson.subject_name} with ${readyLesson.cohort_name} is up next${readyLesson.venue ? ` in ${readyLesson.venue}` : ''}.`,
            primaryLabel: readyLesson.schedule_state === 'SCHEDULED_OVERDUE'
                ? 'Open lesson'
                : 'Start lesson',
            primaryPath: `/sessions/${readyLesson.id}`,
            secondaryLabel: readyLesson.lesson_plan_id ? 'Use this plan in class' : 'Prepare lesson',
            secondaryPath: readyLesson.lesson_plan_id ? `/lesson-plans/${readyLesson.lesson_plan_id}` : '/lesson-plans/new',
            icon: Calendar,
            tone: 'success',
            session: readyLesson,
        };
    }

    const sessionMissingPlan = orderedSessions.find((session) => !session.lesson_plan_id);
    if (sessionMissingPlan) {
        return {
            key: 'prepare-next-lesson',
            title: 'Prepare your next lesson',
            description: `${sessionMissingPlan.subject_name} with ${sessionMissingPlan.cohort_name} does not have a lesson preparation linked yet.`,
            primaryLabel: 'Prepare lesson',
            primaryPath: '/lesson-plans/new',
            secondaryLabel: 'View my lessons',
            secondaryPath: '/sessions',
            icon: FileText,
            tone: 'info',
            session: sessionMissingPlan,
        };
    }

    if (metrics.assessments.needsGrading > 0) {
        return {
            key: 'grade-pending-work',
            title: 'Grade pending work',
            description: `${metrics.assessments.needsGrading} assessment${metrics.assessments.needsGrading === 1 ? '' : 's'} still need your review.`,
            primaryLabel: 'Grade work',
            primaryPath: '/assessments?status=pending',
            secondaryLabel: 'Open assessments',
            secondaryPath: '/assessments',
            icon: Award,
            tone: 'warning',
        };
    }

    const supportCount = Math.max(metrics.performance.needsSupport, metrics.attendance.riskLearnerCount);
    if (supportCount > 0) {
        return {
            key: 'review-learners-needing-support',
            title: 'Check learners needing support',
            description: `${supportCount} learner${supportCount === 1 ? '' : 's'} need follow-up from attendance or recent performance.`,
            primaryLabel: 'View learners',
            primaryPath: '/learners',
            secondaryLabel: 'Attendance risk',
            secondaryPath: '/reports/instructor/attendance-risk',
            icon: Users,
            tone: 'warning',
        };
    }

    if (teachingLoad.length === 0) {
        return {
            key: 'no-teaching-load',
            title: 'Your teaching load is not assigned yet',
            description: 'Your teaching load is not assigned yet. Once your administrator assigns classes or subjects, your lessons and learner tools will appear here.',
            primaryLabel: 'Submit request',
            primaryPath: '/requests/new',
            secondaryLabel: 'View teaching load',
            secondaryPath: '/academic/cohorts',
            icon: BookOpen,
            tone: 'info',
        };
    }

    return {
        key: 'normal-state',
        title: sessions.length > 0 ? "View today's lessons" : 'View your teaching load',
        description: sessions.length > 0
            ? "Everything urgent is clear right now. Open today's lessons and keep your teaching day moving."
            : 'Your schedule is clear for now. Review your assigned classes and prepare what is coming next.',
        primaryLabel: sessions.length > 0 ? "Open today's lessons" : 'View teaching load',
        primaryPath: sessions.length > 0 ? '/sessions' : '/academic/cohorts',
        secondaryLabel: 'Prepare lesson',
        secondaryPath: '/lesson-plans/new',
        icon: Target,
        tone: 'success',
    };
}

export function TeacherNextActionPanel({
    sessions,
    alerts,
    metrics,
    teachingCohorts,
    currentTerm,
    currentYear,
    teachingLoad,
}: TeacherNextActionPanelProps) {
    const router = useRouter();
    const action = useMemo(
        () => buildNextAction({ sessions, metrics, teachingLoad }),
        [metrics, sessions, teachingLoad]
    );
    const tone = toneStyles[action.tone];
    const supportCount = Math.max(metrics.performance.needsSupport, metrics.attendance.riskLearnerCount);
    const summaryItems = [
        { label: 'Today', value: sessions.length, icon: Calendar },
        { label: 'Classes', value: teachingCohorts.length, icon: BookOpen },
        { label: 'Grading', value: metrics.assessments.needsGrading, icon: Award },
        { label: 'Support', value: supportCount, icon: AlertCircle },
    ];
    const termLabel = [currentTerm?.name, currentYear?.name].filter(Boolean).join(' - ');

    return (
        <div className={`${themeClasses.dashboardCard} overflow-hidden p-0`}>
            <div className="border-b px-5 py-5 theme-border sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            <div className={`rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg ${tone.icon}`}>
                                <action.icon className="h-6 w-6" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl font-semibold theme-text">What should I do now?</h2>
                                    <Badge variant={tone.badge as 'blue' | 'green' | 'orange' | 'red'}>
                                        Next action
                                    </Badge>
                                </div>
                                <p className="mt-1 text-sm theme-muted">
                                    {termLabel || 'Teaching workflow'}
                                    {alerts.length > 0 ? ` - ${alerts.length} alert${alerts.length === 1 ? '' : 's'} in view` : ''}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[420px]">
                        {summaryItems.map((item) => (
                            <div key={item.label} className={`${themeClasses.dashboardMutedPanel} px-3 py-3`}>
                                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide theme-subtle">
                                    <item.icon className="h-3.5 w-3.5" />
                                    <span>{item.label}</span>
                                </div>
                                <p className="mt-2 text-lg font-semibold theme-text">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6">
                <div className={`${tone.surface} rounded-2xl p-4`}>
                    <p className={`text-sm font-medium ${tone.accent}`}>{action.title}</p>
                    <p className="mt-2 text-base font-semibold theme-text">{action.description}</p>

                    {action.session ? (
                        <div className={`${themeClasses.dashboardPanel} mt-4 grid gap-3 px-4 py-3 md:grid-cols-3`}>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Class</p>
                                <p className="mt-1 text-sm font-semibold theme-text">{action.session.cohort_name}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Time</p>
                                <p className="mt-1 text-sm font-semibold theme-text">
                                    {formatSessionDate(action.session.session_date)} - {formatSessionTime(action.session.start_time)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Lesson</p>
                                <p className="mt-1 text-sm font-semibold theme-text">
                                    {action.session.title || action.session.subject_name}
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Button
                        type="button"
                        size="lg"
                        className="w-full sm:w-auto"
                        onClick={() => router.push(action.primaryPath)}
                    >
                        {action.primaryLabel}
                    </Button>
                    {action.secondaryLabel && action.secondaryPath ? (
                        <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            className="w-full sm:w-auto"
                            onClick={() => router.push(action.secondaryPath as string)}
                        >
                            {action.secondaryLabel}
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

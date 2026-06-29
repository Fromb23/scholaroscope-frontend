'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    AlertCircle,
    Award,
    BookOpen,
    Calendar,
    CheckCircle2,
    ClipboardList,
    FileText,
    PlayCircle,
    Target,
    Users,
} from 'lucide-react';
import { ActionMenu, type ActionMenuItem } from '@/app/components/ui/ActionMenu';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import type { DashboardAlert } from '@/app/core/hooks/useAdminDashboard';
import type { InstructorMetrics } from '@/app/core/hooks/useInstructorDashboard';
import type {
    TeachingActionItem,
    TeachingActionQueue,
    TeachingActionUrgency,
} from '@/app/core/lib/teachingActionQueue';
import { themeClasses } from '@/app/core/theme/themeClasses';
import type { TeachingCohortSummary } from '@/app/core/types/academic';

type ActionTone = TeachingActionUrgency;

interface TeacherNextActionPanelProps {
    queue: TeachingActionQueue;
    alerts: DashboardAlert[];
    metrics: InstructorMetrics;
    teachingCohorts: TeachingCohortSummary[];
    currentTerm?: { name?: string | null } | null;
    currentYear?: { name?: string | null } | null;
    todayLessonCount: number;
}

const toneStyles: Record<ActionTone, { accent: string; icon: string; surface: string; badge: 'blue' | 'green' | 'orange' | 'red' }> = {
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

function TeachingActionIcon({
    action,
    className,
}: {
    action: TeachingActionItem | null;
    className: string;
}) {
    if (!action) return <Target className={className} />;

    if (action.objectType === 'assignment') return <ClipboardList className={className} />;
    if (action.objectType === 'assessment') return <Award className={className} />;
    if (action.objectType === 'lesson_plan') return <FileText className={className} />;
    if (action.objectType === 'learner_support') return <Users className={className} />;

    if (action.primaryLabel.toLowerCase().includes('end')) return <CheckCircle2 className={className} />;
    if (action.primaryLabel.toLowerCase().includes('continue')) return <PlayCircle className={className} />;
    if (action.primaryLabel.toLowerCase().includes('start')) return <Calendar className={className} />;

    return <BookOpen className={className} />;
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

function ActionContext({ action }: { action: TeachingActionItem }) {
    if (action.session) {
        return (
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
        );
    }

    if (action.assignmentWork) {
        return (
            <div className={`${themeClasses.dashboardPanel} mt-4 grid gap-3 px-4 py-3 md:grid-cols-3`}>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Class</p>
                    <p className="mt-1 text-sm font-semibold theme-text">{action.assignmentWork.cohort.name}</p>
                </div>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Subject</p>
                    <p className="mt-1 text-sm font-semibold theme-text">{action.assignmentWork.subject.name}</p>
                </div>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Stage</p>
                    <p className="mt-1 text-sm font-semibold theme-text">{action.stageLabel}</p>
                </div>
            </div>
        );
    }

    if (action.assessmentScore) {
        return (
            <div className={`${themeClasses.dashboardPanel} mt-4 grid gap-3 px-4 py-3 md:grid-cols-3`}>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Assessment</p>
                    <p className="mt-1 text-sm font-semibold theme-text">{action.assessmentScore.assessment_name}</p>
                </div>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Learner</p>
                    <p className="mt-1 text-sm font-semibold theme-text">{action.assessmentScore.student_name}</p>
                </div>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Stage</p>
                    <p className="mt-1 text-sm font-semibold theme-text">{action.stageLabel}</p>
                </div>
            </div>
        );
    }

    if (action.assessment) {
        return (
            <div className={`${themeClasses.dashboardPanel} mt-4 grid gap-3 px-4 py-3 md:grid-cols-3`}>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Assessment</p>
                    <p className="mt-1 text-sm font-semibold theme-text">{action.assessment.name}</p>
                </div>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Class</p>
                    <p className="mt-1 text-sm font-semibold theme-text">{action.assessment.cohort_name}</p>
                </div>
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide theme-subtle">Stage</p>
                    <p className="mt-1 text-sm font-semibold theme-text">{action.stageLabel}</p>
                </div>
            </div>
        );
    }

    return null;
}

export function TeacherNextActionPanel({
    queue,
    alerts,
    metrics,
    teachingCohorts,
    currentTerm,
    currentYear,
    todayLessonCount,
}: TeacherNextActionPanelProps) {
    const router = useRouter();
    const action = queue.primaryAction;
    const tone = toneStyles[action?.urgency ?? 'success'];
    const supportCount = Math.max(metrics.performance.needsSupport, metrics.attendance.riskLearnerCount);
    const summaryItems = [
        { label: 'Today', value: todayLessonCount, icon: Calendar, visible: todayLessonCount > 0 },
        { label: 'Classes', value: teachingCohorts.length, icon: BookOpen, visible: teachingCohorts.length > 0 },
        { label: 'Grading', value: metrics.assessments.needsGrading, icon: Award, visible: metrics.assessments.needsGrading > 0 },
        { label: 'Support', value: supportCount, icon: AlertCircle, visible: supportCount > 0 },
    ].filter((item) => item.visible);
    const termLabel = [currentTerm?.name, currentYear?.name].filter(Boolean).join(' - ');
    const firstSecondary = action?.secondaryActions[0] ?? null;
    const moreActionItems = useMemo<ActionMenuItem[]>(() => {
        if (!action) return [];

        const secondaryItems = action.secondaryActions.slice(1).map((item) => ({
            label: item.label,
            href: item.href,
            destructive: item.destructive,
        }));
        const relatedItems = queue.relatedPrimaryActions.map((item) => ({
            label: item.primaryLabel,
            href: item.primaryHref,
        }));

        return [...secondaryItems, ...relatedItems];
    }, [action, queue.relatedPrimaryActions]);

    return (
        <div className={`${themeClasses.dashboardCard} overflow-hidden p-0`}>
            <div className="border-b px-5 py-5 theme-border sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            <div className={`rounded-2xl bg-gradient-to-br p-3 text-white shadow-lg ${tone.icon}`}>
                                <TeachingActionIcon action={action} className="h-6 w-6" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl font-semibold theme-text">What should I do now?</h2>
                                    <Badge variant={tone.badge}>Next action</Badge>
                                    {action ? (
                                        <Badge variant="blue">{action.stageLabel}</Badge>
                                    ) : null}
                                </div>
                                <p className="mt-1 text-sm theme-muted">
                                    {termLabel || 'Teaching workflow'}
                                    {alerts.length > 0 ? ` - ${alerts.length} alert${alerts.length === 1 ? '' : 's'} in view` : ''}
                                </p>
                            </div>
                        </div>
                    </div>

                    {summaryItems.length > 0 ? (
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
                    ) : null}
                </div>
            </div>

            <div className="space-y-5 px-5 py-5 sm:px-6">
                <div className={`${tone.surface} rounded-2xl p-4`}>
                    <p className={`text-sm font-medium ${tone.accent}`}>
                        {action?.title ?? 'Nothing needs action right now'}
                    </p>
                    <p className="mt-2 text-base font-semibold theme-text">
                        {action?.description ?? 'Unfinished teaching work is clear for now.'}
                    </p>
                    {action ? <ActionContext action={action} /> : null}
                </div>

                {action ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <Button
                            type="button"
                            size="lg"
                            className="w-full sm:w-auto"
                            onClick={() => router.push(action.primaryHref)}
                        >
                            {action.primaryLabel}
                        </Button>
                        {firstSecondary ? (
                            <Button
                                type="button"
                                variant="secondary"
                                size="lg"
                                className="w-full sm:w-auto"
                                onClick={() => router.push(firstSecondary.href)}
                            >
                                {firstSecondary.label}
                            </Button>
                        ) : null}
                        <ActionMenu
                            items={moreActionItems}
                            buttonLabel="More"
                            ariaLabel="Open more actions for this teaching item"
                            size="lg"
                            align="left"
                            hideLabelOnMobile={false}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}

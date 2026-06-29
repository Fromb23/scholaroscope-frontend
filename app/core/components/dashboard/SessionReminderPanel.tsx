'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, BookOpen, Calendar, Clock, Loader2 } from 'lucide-react';
import { ActionMenu, type ActionMenuItem } from '@/app/components/ui/ActionMenu';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { useSessionLifecycleReminders } from '@/app/core/hooks/useSessionLifecycleReminders';
import {
    getSessionTeachingObjectKey,
    type TeachingActionItem,
    type TeachingActionQueue,
} from '@/app/core/lib/teachingActionQueue';
import type { SessionLifecycleReminder } from '@/app/core/types/session';

function formatSessionDate(value: string): string {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

function formatTime(value: string | null): string {
    if (!value) return 'TBA';

    const date = new Date(`1970-01-01T${value}`);
    if (Number.isNaN(date.getTime())) {
        return value.slice(0, 5);
    }

    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

function getReviewAttendancePath(sessionId: number): string {
    return `/sessions/${sessionId}`;
}

const reminderStyles: Record<SessionLifecycleReminder['severity'], string> = {
    info: 'theme-info-surface',
    warning: 'theme-warning-surface',
    danger: 'theme-danger-surface',
};

interface ReminderSummaryItemProps {
    label: string;
    value: number;
}

function ReminderSummaryItem({ label, value }: ReminderSummaryItemProps) {
    return (
        <div className="rounded-lg border theme-border theme-surface-muted px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide theme-subtle">{label}</p>
            <p className="mt-1 text-base font-semibold theme-text">{value}</p>
        </div>
    );
}

interface SessionReminderCardProps {
    reminder: SessionLifecycleReminder;
    queueAction: TeachingActionItem | null;
    isPrimaryActionObject: boolean;
    onOpen: (href: string) => void;
}

function SessionReminderCard({
    reminder,
    queueAction,
    isPrimaryActionObject,
    onOpen,
}: SessionReminderCardProps) {
    const { session } = reminder;
    const attendance = session.attendance_count;
    const fallbackHref = `/sessions/${session.id}?notice=session-current-step`;
    const primaryLabel = queueAction?.primaryLabel ?? 'Open lesson';
    const primaryHref = queueAction?.primaryHref ?? fallbackHref;
    const menuItems: ActionMenuItem[] = [
        ...(queueAction?.secondaryActions.map((action) => ({
            label: action.label,
            href: action.href,
            destructive: action.destructive,
        })) ?? []),
        {
            label: 'Open lesson',
            href: fallbackHref,
        },
        {
            label: 'Review attendance',
            href: `${getReviewAttendancePath(session.id)}?section=attendance&notice=session-current-step`,
        },
    ].filter((item, index, items) => (
        items.findIndex((candidate) => candidate.label === item.label && candidate.href === item.href) === index
    ));

    return (
        <div className="p-4 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                            <p className="break-words text-lg font-semibold theme-text">
                                {session.subject_name}
                            </p>
                            <p className="mt-1 break-words text-sm theme-muted">
                                {session.cohort_name}
                            </p>
                        </div>
                        <Badge
                            variant={
                                reminder.severity === 'danger'
                                    ? 'red'
                                    : reminder.severity === 'warning'
                                        ? 'orange'
                                        : 'blue'
                            }
                            className="shrink-0 self-start"
                        >
                            {reminder.label}
                        </Badge>
                    </div>

                    <div className="flex flex-col gap-2 text-sm theme-muted sm:flex-row sm:flex-wrap sm:items-center">
                        <div className="flex min-w-0 items-center gap-2">
                            <Calendar className="h-4 w-4 shrink-0 theme-subtle" />
                            <span className="min-w-0 break-words">{formatSessionDate(session.session_date)}</span>
                        </div>
                        <div className="flex min-w-0 items-center gap-2">
                            <Clock className="h-4 w-4 shrink-0 theme-subtle" />
                            <span className="min-w-0 break-words">
                                {formatTime(session.start_time)} - {formatTime(session.end_time)}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        <ReminderSummaryItem label="Present" value={attendance.present} />
                        <ReminderSummaryItem label="Late" value={attendance.late} />
                        <ReminderSummaryItem label="Absent" value={attendance.absent} />
                        <ReminderSummaryItem label="Unmarked" value={attendance.unmarked} />
                    </div>
                </div>

                <div className="flex w-full flex-col gap-2 xl:w-auto xl:min-w-[220px]">
                    {isPrimaryActionObject ? (
                        <div className="rounded-lg border theme-border bg-white/70 px-3 py-2 text-sm font-medium theme-text">
                            Action shown above
                        </div>
                    ) : (
                        <Button
                            type="button"
                            className="w-full"
                            onClick={() => onOpen(primaryHref)}
                        >
                            {primaryLabel}
                        </Button>
                    )}
                    <ActionMenu
                        items={menuItems}
                        buttonLabel="More"
                        ariaLabel={`Open more actions for ${session.subject_name}`}
                        className="w-full"
                        menuClassName="w-full"
                        hideLabelOnMobile={false}
                    />
                </div>
            </div>
        </div>
    );
}

interface SessionReminderPanelContentProps {
    reminders: SessionLifecycleReminder[];
    needsClosingCount: number;
    unfinishedCount: number;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    queue?: TeachingActionQueue;
}

export function SessionReminderPanelContent({
    reminders,
    needsClosingCount,
    unfinishedCount,
    loading,
    error,
    refetch,
    queue,
}: SessionReminderPanelContentProps) {
    const router = useRouter();

    const openCount = useMemo(
        () => reminders.filter((reminder) => reminder.type === 'OPEN_LESSON').length,
        [reminders]
    );

    const handleOpen = (href: string) => {
        router.push(href);
    };

    if (loading && reminders.length === 0) {
        return (
            <Card className="rounded-2xl p-5 theme-info-surface">
                <div className="flex items-center gap-3 text-sm theme-muted">
                    <Loader2 className="h-4 w-4 animate-spin text-[color:var(--color-primary)]" />
                    Checking open lessons...
                </div>
            </Card>
        );
    }

    if (error && reminders.length === 0) {
        return (
            <Card className="rounded-2xl p-5 theme-danger-surface">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-danger)]" />
                        <div>
                            <p className="font-semibold theme-text">Could not load lesson reminders.</p>
                            <p className="text-sm theme-muted">{error}</p>
                        </div>
                    </div>
                    <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => void refetch()}>
                        Retry
                    </Button>
                </div>
            </Card>
        );
    }

    if (!loading && reminders.length === 0) {
        return null;
    }

    return (
        <>
            <Card className="overflow-hidden rounded-2xl p-0">
                <div className="border-b px-4 py-4 theme-border sm:px-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex items-center gap-3">
                                <div className="rounded-xl p-2 theme-info-surface text-[color:var(--color-primary)]">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-lg font-semibold theme-text">Lessons needing attention</h2>
                                    <p className="text-sm theme-muted">
                                        Open or unfinished lessons that still need your attention.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 lg:min-w-[300px]">
                            <ReminderSummaryItem label="Needs completion" value={needsClosingCount} />
                            <ReminderSummaryItem label="Open lesson" value={openCount} />
                            <ReminderSummaryItem label="Unfinished" value={unfinishedCount} />
                        </div>
                    </div>

                    {error && reminders.length > 0 && (
                        <div className="mt-4 flex flex-col gap-3 rounded-lg px-4 py-3 text-sm theme-warning-surface sm:flex-row sm:items-center sm:justify-between">
                            <span>Some lesson reminders may be out of date.</span>
                            <Button
                                type="button"
                                variant="secondary"
                                className="w-full sm:w-auto"
                                onClick={() => void refetch()}
                            >
                                Refresh
                            </Button>
                        </div>
                    )}
                </div>

                <div className="divide-y theme-border">
                    {reminders.map((reminder) => (
                        <div key={reminder.session.id} className={reminderStyles[reminder.severity]}>
                            <SessionReminderCard
                                reminder={reminder}
                                queueAction={queue?.actions.find((action) => (
                                    action.objectKey === getSessionTeachingObjectKey(reminder.session.id)
                                )) ?? null}
                                isPrimaryActionObject={queue?.primaryAction?.objectKey === getSessionTeachingObjectKey(reminder.session.id)}
                                onOpen={handleOpen}
                            />
                        </div>
                    ))}
                </div>
            </Card>
        </>
    );
}

export function SessionReminderPanel({ queue }: { queue?: TeachingActionQueue }) {
    const reminderState = useSessionLifecycleReminders();

    return (
        <SessionReminderPanelContent
            reminders={reminderState.reminders}
            needsClosingCount={reminderState.needsClosingCount}
            unfinishedCount={reminderState.unfinishedCount}
            loading={reminderState.loading}
            error={reminderState.error}
            refetch={reminderState.refetch}
            queue={queue}
        />
    );
}

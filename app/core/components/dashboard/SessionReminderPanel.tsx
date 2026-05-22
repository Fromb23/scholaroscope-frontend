'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, BookOpen, Calendar, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { EndLessonReviewModal } from '@/app/core/components/sessions/EndLessonReviewModal';
import { useSessionLifecycleReminders } from '@/app/core/hooks/useSessionLifecycleReminders';
import type { Session, SessionLifecycleReminder } from '@/app/core/types/session';

interface FeedbackState {
    tone: 'success' | 'error';
    message: string;
}

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
    onContinue: (sessionId: number) => void;
    onReviewAttendance: (sessionId: number) => void;
    onEndLesson: (reminder: SessionLifecycleReminder) => void;
}

function SessionReminderCard({
    reminder,
    onContinue,
    onReviewAttendance,
    onEndLesson,
}: SessionReminderCardProps) {
    const { session } = reminder;
    const attendance = session.attendance_count;

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
                    <Button
                        type="button"
                        className="w-full"
                        onClick={() => onContinue(session.id)}
                    >
                        Continue lesson
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={() => onReviewAttendance(session.id)}
                    >
                        Review attendance
                    </Button>
                    <Button
                        type="button"
                        variant="danger"
                        className="w-full"
                        onClick={() => onEndLesson(reminder)}
                    >
                        End lesson
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function SessionReminderPanel() {
    const router = useRouter();
    const {
        reminders,
        needsClosingCount,
        unfinishedCount,
        loading,
        error,
        refetch,
        completeSession,
    } = useSessionLifecycleReminders();
    const [selectedReminder, setSelectedReminder] = useState<SessionLifecycleReminder | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);

    const openCount = useMemo(
        () => reminders.filter((reminder) => reminder.type === 'OPEN_LESSON').length,
        [reminders]
    );

    useEffect(() => {
        if (!feedback) return undefined;

        const timeout = window.setTimeout(() => {
            setFeedback(null);
        }, 4000);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [feedback]);

    const handleContinue = (sessionId: number) => {
        router.push(`/sessions/${sessionId}`);
    };

    const handleReviewAttendance = (sessionId: number) => {
        router.push(getReviewAttendancePath(sessionId));
    };

    const handleReviewFromModal = (session: Session) => {
        setSelectedReminder(null);
        router.push(getReviewAttendancePath(session.id));
    };

    const handleEndLesson = (reminder: SessionLifecycleReminder) => {
        setModalError(null);
        setSelectedReminder(reminder);
    };

    const handleConfirmEndLesson = async () => {
        if (!selectedReminder) return;

        setIsSubmitting(true);
        setModalError(null);

        try {
            await completeSession(selectedReminder.session.id);
            setSelectedReminder(null);
            setFeedback({ tone: 'success', message: 'Lesson ended.' });
        } catch {
            const message = 'Could not end lesson. Review attendance and try again.';
            setModalError(message);
            setFeedback({ tone: 'error', message });
        } finally {
            setIsSubmitting(false);
        }
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
                                    <h2 className="text-lg font-semibold theme-text">Lesson reminders</h2>
                                    <p className="text-sm theme-muted">
                                        Open lessons that still need your attention.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 lg:min-w-[300px]">
                            <ReminderSummaryItem label="Needs closing" value={needsClosingCount} />
                            <ReminderSummaryItem label="Open lesson" value={openCount} />
                            <ReminderSummaryItem label="Unfinished lesson" value={unfinishedCount} />
                        </div>
                    </div>

                    {feedback && (
                        <div
                            role="status"
                            aria-live="polite"
                            className={`mt-4 rounded-lg px-4 py-3 text-sm ${
                                feedback.tone === 'success'
                                    ? 'theme-success-surface text-[color:var(--color-success)]'
                                    : 'theme-danger-surface text-[color:var(--color-danger)]'
                            }`}
                        >
                            {feedback.message}
                        </div>
                    )}

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
                                onContinue={handleContinue}
                                onReviewAttendance={handleReviewAttendance}
                                onEndLesson={handleEndLesson}
                            />
                        </div>
                    ))}
                </div>
            </Card>

            <EndLessonReviewModal
                isOpen={selectedReminder !== null}
                session={selectedReminder?.session ?? null}
                isSubmitting={isSubmitting}
                errorMessage={modalError}
                onClose={() => {
                    if (isSubmitting) return;
                    setSelectedReminder(null);
                    setModalError(null);
                }}
                onReviewAttendance={handleReviewFromModal}
                onConfirm={handleConfirmEndLesson}
            />
        </>
    );
}

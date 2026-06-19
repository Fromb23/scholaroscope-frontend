'use client';

import Link from 'next/link';
import { CalendarX, Clock, MapPin } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import type { TeachingTodayContext } from '@/app/core/hooks/useTeachingToday';
import type { Session } from '@/app/core/types/session';
import {
    formatSessionTimeRange,
    getLessonPlanLabel,
    getSessionActionLabel,
    getSessionStatusVariant,
} from './teachingTodayFormat';

interface TeachingTodayTimelineProps {
    context: TeachingTodayContext;
}

function getEmptyState(context: TeachingTodayContext): { title: string; body: string } {
    if (context.learningDayState === 'SETUP_BLOCKED') {
        return {
            title: 'Teaching programme is not ready yet.',
            body: 'Lessons will appear here after the school programme has enough setup to map daily teaching activity.',
        };
    }

    if (context.learningDayState === 'NO_ACTIVE_TERM') {
        return {
            title: 'No active term for today.',
            body: 'The diary cannot map normal teaching sessions until a current term is available.',
        };
    }

    if (!context.normalTeachingExpected) {
        return {
            title: 'No normal teaching sessions expected today.',
            body: 'The school calendar changes the usual teaching flow. Any unfinished records still appear in the incomplete work panel.',
        };
    }

    return {
        title: 'No lessons scheduled today.',
        body: 'Use the quiet time for preparation or pending teaching records if any appear below.',
    };
}

function SessionTimelineItem({ session }: { session: Session }) {
    const actionLabel = getSessionActionLabel(session);
    const isActionDisabled = actionLabel === 'Completed' || actionLabel.startsWith('Opens ');

    return (
        <article className="rounded-lg border theme-border bg-white/70 p-3 sm:p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="flex items-center gap-2 text-sm font-semibold theme-text">
                            <Clock className="h-4 w-4 shrink-0 theme-subtle" />
                            {formatSessionTimeRange(session)}
                        </p>
                        <Badge variant={getSessionStatusVariant(session)}>{session.schedule_state.replaceAll('_', ' ')}</Badge>
                        <Badge variant="default">{session.session_type_display || session.session_type}</Badge>
                    </div>

                    <div className="mt-3 min-w-0">
                        <h3 className="break-words text-base font-semibold theme-text">
                            {session.subject_name}
                        </h3>
                        <p className="mt-1 break-words text-sm theme-muted">
                            {session.cohort_name}
                        </p>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 text-sm theme-muted sm:flex-row sm:flex-wrap sm:items-center">
                        <span className="flex min-w-0 items-center gap-2">
                            <MapPin className="h-4 w-4 shrink-0 theme-subtle" />
                            <span className="min-w-0 break-words">{session.venue || 'Venue TBA'}</span>
                        </span>
                        <span className="min-w-0 break-words">
                            {getLessonPlanLabel(session)}
                        </span>
                    </div>
                </div>

                <div className="flex w-full flex-col gap-2 lg:w-44">
                    <Link
                        href={`/sessions/${session.id}`}
                        className={`theme-focus-ring inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isActionDisabled ? 'theme-button-secondary' : 'theme-button-primary'
                        }`}
                    >
                        {actionLabel}
                    </Link>
                    {session.lesson_plan_id ? (
                        <Link
                            href={`/lesson-plans/${session.lesson_plan_id}`}
                            className="theme-focus-ring inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium theme-button-secondary"
                        >
                            Review plan
                        </Link>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

export function TeachingTodayTimeline({ context }: TeachingTodayTimelineProps) {
    const emptyState = getEmptyState(context);

    return (
        <section className="theme-card rounded-lg border theme-border p-4 sm:p-5" aria-labelledby="teaching-today-timeline">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 id="teaching-today-timeline" className="text-lg font-semibold theme-text">
                        Today&apos;s timeline
                    </h2>
                    <p className="mt-1 text-sm theme-muted">
                        All sessions scheduled for today, ordered by start time.
                    </p>
                </div>
                {context.timeline.length > 0 ? (
                    <Badge variant="default">
                        {context.timeline.length} session{context.timeline.length === 1 ? '' : 's'}
                    </Badge>
                ) : null}
            </div>

            {context.timeline.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed theme-border p-6 text-center">
                    <CalendarX className="mx-auto h-8 w-8 theme-subtle" />
                    <p className="mt-3 text-sm font-semibold theme-text">{emptyState.title}</p>
                    <p className="mx-auto mt-1 max-w-xl text-sm theme-muted">{emptyState.body}</p>
                </div>
            ) : (
                <div className="mt-5 space-y-3">
                    {context.timeline.map((session) => (
                        <SessionTimelineItem key={session.id} session={session} />
                    ))}
                </div>
            )}
        </section>
    );
}

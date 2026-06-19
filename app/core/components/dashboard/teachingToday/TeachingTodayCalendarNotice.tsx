'use client';

import { AlertCircle, CalendarClock } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import type { TeachingTodayContext } from '@/app/core/hooks/useTeachingToday';
import {
    eventTypeLabels,
    formatShortDateKey,
    learningDayBadgeVariants,
    learningDayLabels,
} from './teachingTodayFormat';

interface TeachingTodayCalendarNoticeProps {
    context: TeachingTodayContext;
}

function getNoticeCopy(context: TeachingTodayContext): { title: string; body: string } | null {
    switch (context.learningDayState) {
        case 'SETUP_BLOCKED':
            return null;
        case 'NO_ACTIVE_TERM':
            return {
                title: 'No active term is mapped for today',
                body: 'Daily teaching activity cannot be mapped to a term yet. Any unfinished teaching records that are already available still appear below.',
            };
        case 'EXAM_DAY':
            return {
                title: 'Today is marked for exams',
                body: 'Use this diary for exam sessions, attendance, and pending records. Normal lesson preparation should not dominate today.',
            };
        case 'MIDTERM_BREAK':
            return {
                title: 'Midterm break is on the school calendar',
                body: 'No normal teaching sessions are expected. Unfinished or forgotten lesson records still need attention if they appear below.',
            };
        case 'HOLIDAY':
        case 'PUBLIC_HOLIDAY':
            return {
                title: `${learningDayLabels[context.learningDayState]} on the school calendar`,
                body: 'No normal teaching sessions are expected today. This page will still show unfinished records that should not be forgotten.',
            };
        case 'SCHOOL_EVENT':
            return {
                title: 'School calendar event today',
                body: context.calendarAffectsLearning
                    ? 'The event may disrupt the normal teaching flow. Follow the timeline only where sessions are still expected.'
                    : 'The event is noted for context. Normal teaching may continue unless your school has adjusted the schedule.',
            };
        case 'CLOSING_PERIOD':
            return {
                title: 'Closing period on the calendar',
                body: 'Normal teaching may be reduced. Prioritize closing lesson records and pending assessment work when classes are done.',
            };
        case 'NORMAL_TEACHING_DAY':
        default:
            return context.calendarEventsToday.length > 0
                ? {
                    title: 'Calendar context for today',
                    body: 'There is a calendar event today. Check whether it changes your normal teaching flow.',
                }
                : null;
    }
}

export function TeachingTodayCalendarNotice({ context }: TeachingTodayCalendarNoticeProps) {
    const copy = getNoticeCopy(context);

    if (!copy) {
        return null;
    }

    return (
        <section className="theme-card rounded-lg border theme-border p-4 sm:p-5" aria-labelledby="teaching-today-calendar-notice">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-3">
                    <div className="mt-0.5 rounded-lg p-2 theme-warning-surface text-[color:var(--color-warning)]">
                        {context.learningDayState === 'NO_ACTIVE_TERM'
                            ? <AlertCircle className="h-5 w-5" />
                            : <CalendarClock className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 id="teaching-today-calendar-notice" className="text-base font-semibold theme-text">
                                {copy.title}
                            </h2>
                            <Badge variant={learningDayBadgeVariants[context.learningDayState]}>
                                {learningDayLabels[context.learningDayState]}
                            </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 theme-muted">{copy.body}</p>
                    </div>
                </div>

                {context.calendarEventsToday.length > 0 ? (
                    <div className="w-full space-y-2 lg:max-w-md">
                        {context.calendarEventsToday.map((event) => (
                            <div key={event.id} className="teaching-today-nested-card rounded-lg px-3 py-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="min-w-0 break-words text-sm font-medium theme-text">
                                        {event.title}
                                    </p>
                                    <Badge variant="default" size="sm">
                                        {eventTypeLabels[event.event_type]}
                                    </Badge>
                                </div>
                                <p className="mt-1 text-xs theme-subtle">
                                    {event.start_date === event.end_date
                                        ? formatShortDateKey(event.start_date)
                                        : `${formatShortDateKey(event.start_date)} - ${formatShortDateKey(event.end_date)}`}
                                    {event.affects_learning ? ' - affects learning flow' : ' - calendar note'}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </section>
    );
}

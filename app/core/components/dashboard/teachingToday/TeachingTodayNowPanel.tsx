'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, CalendarDays, ClipboardCheck, Clock, MapPin } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import type { TeachingTodayAction } from '@/app/core/hooks/useTeachingToday';
import {
    actionToneClasses,
    formatSessionTimeRange,
} from './teachingTodayFormat';

interface TeachingTodayNowPanelProps {
    action: TeachingTodayAction | null;
}

function ActionLink({
    href,
    children,
    variant = 'primary',
}: {
    href: string;
    children: ReactNode;
    variant?: 'primary' | 'secondary';
}) {
    return (
        <Link
            href={href}
            className={`theme-focus-ring inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:w-auto ${
                variant === 'primary' ? 'theme-button-primary' : 'theme-button-secondary'
            }`}
        >
            {children}
        </Link>
    );
}

export function TeachingTodayNowPanel({ action }: TeachingTodayNowPanelProps) {
    if (!action) {
        return (
            <section className="theme-card rounded-lg border theme-border p-4 sm:p-5" aria-labelledby="teaching-today-now">
                <h2 id="teaching-today-now" className="text-lg font-semibold theme-text">
                    What needs action now?
                </h2>
                <p className="mt-2 text-sm theme-muted">No immediate teaching action is available.</p>
            </section>
        );
    }

    const tone = actionToneClasses[action.tone];

    return (
        <section
            className={`rounded-lg border p-4 sm:p-5 ${tone.surface} ${tone.border}`}
            aria-labelledby="teaching-today-now"
        >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 id="teaching-today-now" className="text-lg font-semibold theme-text">
                            What needs action now?
                        </h2>
                        <Badge variant={tone.badge}>Next action</Badge>
                    </div>
                    <p className="mt-3 text-xl font-semibold leading-7 theme-text">
                        {action.title}
                    </p>
                    <p className="mt-2 max-w-3xl text-sm leading-6 theme-muted">
                        {action.description}
                    </p>

                    {action.session ? (
                        <div className="teaching-today-nested-card mt-4 grid gap-3 rounded-lg p-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase theme-subtle">Subject</p>
                                <p className="mt-1 break-words text-sm font-semibold theme-text">
                                    {action.session.subject_name}
                                </p>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase theme-subtle">Class</p>
                                <p className="mt-1 break-words text-sm font-semibold theme-text">
                                    {action.session.cohort_name}
                                </p>
                            </div>
                            <div className="min-w-0">
                                <p className="flex items-center gap-1 text-xs font-medium uppercase theme-subtle">
                                    <Clock className="h-3.5 w-3.5" />
                                    Time
                                </p>
                                <p className="mt-1 text-sm font-semibold theme-text">
                                    {formatSessionTimeRange(action.session)}
                                </p>
                            </div>
                            <div className="min-w-0">
                                <p className="flex items-center gap-1 text-xs font-medium uppercase theme-subtle">
                                    <MapPin className="h-3.5 w-3.5" />
                                    Venue
                                </p>
                                <p className="mt-1 break-words text-sm font-semibold theme-text">
                                    {action.session.venue || 'TBA'}
                                </p>
                            </div>
                        </div>
                    ) : null}

                    {action.assignmentWork ? (
                        <div className="teaching-today-nested-card mt-4 grid gap-3 rounded-lg p-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase theme-subtle">Subject</p>
                                <p className="mt-1 break-words text-sm font-semibold theme-text">
                                    {action.assignmentWork.subject.name}
                                </p>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase theme-subtle">Class</p>
                                <p className="mt-1 break-words text-sm font-semibold theme-text">
                                    {action.assignmentWork.cohort.name}
                                </p>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase theme-subtle">Stage</p>
                                <p className="mt-1 text-sm font-semibold theme-text">
                                    {action.assignmentWork.teacher_stage_label}
                                </p>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium uppercase theme-subtle">Due</p>
                                <p className="mt-1 break-words text-sm font-semibold theme-text">
                                    {action.assignmentWork.due_at
                                        ? new Date(action.assignmentWork.due_at).toLocaleString()
                                        : 'Not set'}
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-56">
                    <ActionLink href={action.primaryHref}>
                        <ClipboardCheck className="h-4 w-4" />
                        {action.primaryLabel}
                        <ArrowRight className="h-4 w-4" />
                    </ActionLink>
                    {action.secondaryHref && action.secondaryLabel ? (
                        <ActionLink href={action.secondaryHref} variant="secondary">
                            <CalendarDays className="h-4 w-4" />
                            {action.secondaryLabel}
                        </ActionLink>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

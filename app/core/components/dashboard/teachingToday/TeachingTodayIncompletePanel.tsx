'use client';

import Link from 'next/link';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import type {
    TeachingTodayIncompleteGroup,
    TeachingTodayIncompleteItem,
} from '@/app/core/hooks/useTeachingToday';
import {
    formatSessionTimeRange,
    incompleteGroupLabels,
} from './teachingTodayFormat';

interface TeachingTodayIncompletePanelProps {
    items: TeachingTodayIncompleteItem[];
}

const groupOrder: TeachingTodayIncompleteGroup[] = [
    'STILL_OPEN',
    'NEEDS_COMPLETION',
    'FORGOTTEN_PREVIOUS_DAY',
    'NEEDS_ATTENTION_BEFORE_END',
];

const severityRowClass: Record<TeachingTodayIncompleteItem['severity'], string> = {
    info: 'teaching-today-row-info',
    warning: 'teaching-today-row-warning',
    danger: 'teaching-today-row-danger',
};

const severityBadge: Record<TeachingTodayIncompleteItem['severity'], 'blue' | 'orange' | 'red'> = {
    info: 'blue',
    warning: 'orange',
    danger: 'red',
};

const fallbackActionSummary: Record<TeachingTodayIncompleteGroup, string> = {
    STILL_OPEN: 'Keep the active lesson record current',
    NEEDS_COMPLETION: 'Needs closure decision',
    FORGOTTEN_PREVIOUS_DAY: 'Needs closure decision',
    NEEDS_ATTENTION_BEFORE_END: 'Start, reschedule, or cancel',
};

function IncompleteItemRow({ item }: { item: TeachingTodayIncompleteItem }) {
    const actionSummary = item.missing.length > 0
        ? item.missing.join(' - ')
        : fallbackActionSummary[item.group];

    return (
        <article className={`teaching-today-nested-card rounded-lg p-3 ${severityRowClass[item.severity]}`}>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Badge variant={severityBadge[item.severity]} size="sm">{item.title}</Badge>
                        <span className="text-xs font-medium theme-subtle">
                            {item.session.session_date} - {formatSessionTimeRange(item.session)}
                        </span>
                    </div>
                    <p className="mt-2 break-words text-sm font-semibold theme-text">
                        {item.session.subject_name}
                        <span className="font-normal theme-muted"> - {item.session.cohort_name}</span>
                    </p>
                    <p className="mt-1 break-words text-sm theme-muted">{actionSummary}</p>
                </div>

                <Link
                    href={item.actionHref}
                    className="theme-focus-ring inline-flex min-h-10 w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium theme-button-primary md:w-44"
                >
                    {item.actionLabel}
                </Link>
            </div>
        </article>
    );
}

export function TeachingTodayIncompletePanel({ items }: TeachingTodayIncompletePanelProps) {
    const grouped = groupOrder
        .map((group) => ({
            group,
            items: items.filter((item) => item.group === group),
        }))
        .filter((entry) => entry.items.length > 0);

    return (
        <section className="theme-card rounded-lg border theme-border p-4 sm:p-5" aria-labelledby="teaching-today-incomplete">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 id="teaching-today-incomplete" className="text-lg font-semibold theme-text">
                        Incomplete or forgotten
                    </h2>
                    <p className="mt-1 text-sm theme-muted">
                        Lesson records that still need a clear decision or closure.
                    </p>
                </div>
                <Badge variant={items.length > 0 ? 'orange' : 'green'}>
                    {items.length} item{items.length === 1 ? '' : 's'}
                </Badge>
            </div>

            {items.length === 0 ? (
                <div className="teaching-today-nested-card mt-5 rounded-lg border-dashed p-6 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-[color:var(--color-success)]" />
                    <p className="mt-3 text-sm font-semibold theme-text">
                        No unfinished teaching records are waiting here.
                    </p>
                    <p className="mx-auto mt-1 max-w-xl text-sm theme-muted">
                        Open lessons, overdue starts, and previous-day unfinished records will appear in this section.
                    </p>
                </div>
            ) : (
                <div className="mt-5 space-y-4">
                    {grouped.map((entry) => (
                        <div key={entry.group} className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <AlertTriangle className="h-4 w-4 theme-subtle" />
                                <h3 className="text-sm font-semibold theme-text">
                                    {incompleteGroupLabels[entry.group]}
                                </h3>
                                <Badge variant="default" size="sm">
                                    {entry.items.length}
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                {entry.items.map((item) => (
                                    <IncompleteItemRow key={item.id} item={item} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

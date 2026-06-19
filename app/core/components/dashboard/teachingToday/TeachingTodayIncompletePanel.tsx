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

const severitySurface: Record<TeachingTodayIncompleteItem['severity'], string> = {
    info: 'theme-info-surface',
    warning: 'theme-warning-surface',
    danger: 'theme-danger-surface',
};

const severityBadge: Record<TeachingTodayIncompleteItem['severity'], 'blue' | 'orange' | 'red'> = {
    info: 'blue',
    warning: 'orange',
    danger: 'red',
};

function IncompleteItemRow({ item }: { item: TeachingTodayIncompleteItem }) {
    return (
        <article className={`rounded-lg border theme-border p-3 sm:p-4 ${severitySurface[item.severity]}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={severityBadge[item.severity]}>{item.title}</Badge>
                        <span className="text-xs theme-subtle">
                            {item.session.session_date} - {formatSessionTimeRange(item.session)}
                        </span>
                    </div>
                    <p className="mt-3 break-words text-sm font-semibold theme-text">
                        {item.session.subject_name} - {item.session.cohort_name}
                    </p>
                    <p className="mt-1 text-sm leading-6 theme-muted">{item.detail}</p>

                    {item.missing.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {item.missing.map((missing) => (
                                <Badge key={missing} variant="default" size="sm">
                                    {missing}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-3 text-xs theme-subtle">
                            Open the lesson record for the exact closure steps.
                        </p>
                    )}
                </div>

                <Link
                    href={item.actionHref}
                    className="theme-focus-ring inline-flex min-h-10 w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium theme-button-primary lg:w-44"
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
                <div className="mt-5 rounded-lg border border-dashed theme-border p-6 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-[color:var(--color-success)]" />
                    <p className="mt-3 text-sm font-semibold theme-text">
                        No unfinished teaching records are waiting here.
                    </p>
                    <p className="mx-auto mt-1 max-w-xl text-sm theme-muted">
                        Open lessons, overdue starts, and previous-day unfinished records will appear in this section.
                    </p>
                </div>
            ) : (
                <div className="mt-5 space-y-5">
                    {grouped.map((entry) => (
                        <div key={entry.group} className="space-y-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 theme-subtle" />
                                <h3 className="text-sm font-semibold theme-text">
                                    {incompleteGroupLabels[entry.group]}
                                </h3>
                            </div>
                            <div className="space-y-3">
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

'use client';

import { CalendarDays, RefreshCw } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import type { TeachingTodayContext } from '@/app/core/hooks/useTeachingToday';
import {
    formatDateKey,
    learningDayBadgeVariants,
    learningDayLabels,
} from './teachingTodayFormat';

interface TeachingTodayHeaderProps {
    context: TeachingTodayContext;
    lastRefresh: Date;
    onRefresh: () => void;
    refreshing?: boolean;
}

export function TeachingTodayHeader({
    context,
    lastRefresh,
    onRefresh,
    refreshing = false,
}: TeachingTodayHeaderProps) {
    const contexts = context.academicContexts;
    return (
        <header className="theme-card rounded-lg border theme-border p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg p-2 theme-info-surface text-[color:var(--color-primary)]">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-semibold theme-text sm:text-3xl">
                                Teaching Today
                            </h1>
                            <p className="mt-1 text-sm theme-muted">
                                {formatDateKey(context.todayKey)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                    <div className="flex flex-wrap gap-2">
                        {contexts.length === 0 ? (
                            <>
                                <Badge variant="default">No academic year</Badge>
                                <Badge variant="default">No active term</Badge>
                                <Badge variant="blue">Week unavailable</Badge>
                            </>
                        ) : contexts.length === 1 ? (
                            <>
                                <Badge variant="default">
                                    {contexts[0].academicYearName}
                                </Badge>
                                <Badge variant="default">
                                    {contexts[0].termName ?? 'No active term'}
                                </Badge>
                                <Badge variant="blue">
                                    {contexts[0].currentWeek ? `Week ${contexts[0].currentWeek}` : 'Week unavailable'}
                                </Badge>
                            </>
                        ) : contexts.map((academicContext) => (
                            <Badge key={academicContext.key} variant="default">
                                {academicContext.curriculumName ? `${academicContext.curriculumName}: ` : ''}
                                {academicContext.academicYearName}
                                {academicContext.termName ? ` - ${academicContext.termName}` : ''}
                                {academicContext.currentWeek ? ` - Week ${academicContext.currentWeek}` : ''}
                            </Badge>
                        ))}
                        <Badge variant={learningDayBadgeVariants[context.learningDayState]}>
                            {learningDayLabels[context.learningDayState]}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                        <p className="text-xs theme-subtle">
                            Updated {lastRefresh.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                            })}
                        </p>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onRefresh}
                            disabled={refreshing}
                            aria-label="Refresh Teaching Today"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}

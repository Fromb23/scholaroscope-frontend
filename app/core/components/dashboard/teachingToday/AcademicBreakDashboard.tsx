'use client';

import Link from 'next/link';
import {
    ArrowRight,
    BookOpenCheck,
    CalendarClock,
    ClipboardCheck,
    FileText,
    Leaf,
    RefreshCw,
    Sparkles,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import type { TeachingTodayContext } from '@/app/core/hooks/useTeachingToday';
import type { Session } from '@/app/core/types/session';
import {
    buildAssignmentReviewHref,
    buildMidtermInsightsHref,
    buildMidtermReturnHref,
    buildMidtermSchemesHref,
    buildPendingLessonCleanupHref,
    buildPendingLessonItemHref,
    deriveMidtermInsights,
} from '@/app/core/lib/midtermBreak';
import { formatDateKey, formatShortDateKey } from './teachingTodayFormat';

interface AcademicBreakDashboardProps {
    context: TeachingTodayContext;
    lastRefresh: Date;
    onRefresh: () => void;
    refreshing?: boolean;
    variant: 'break' | 'exam';
}

function isPausedSession(session: Session): boolean {
    return session.schedule_state === 'SCHEDULED_PAUSED';
}

function ActionCard({ href, title, body, disabled = false }: { href: string | null; title: string; body: string; disabled?: boolean }) {
    const content = (
        <>
            <div>
                <p className="text-base font-semibold theme-text">{title}</p>
                <p className="mt-2 text-sm leading-6 theme-muted">{body}</p>
            </div>
            <div className="mt-4 flex items-center text-sm font-medium theme-link">
                {disabled ? 'Not needed right now' : 'Open when ready'}
                {!disabled ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
            </div>
        </>
    );

    if (!href || disabled) {
        return (
            <div className="teaching-today-nested-card rounded-2xl p-5 opacity-75">
                {content}
            </div>
        );
    }

    return (
        <Link href={href} className="teaching-today-nested-card block rounded-2xl p-5 transition-colors theme-hover-surface">
            {content}
        </Link>
    );
}

export function AcademicBreakModeBanner({ context, lastRefresh, onRefresh, refreshing = false, variant }: AcademicBreakDashboardProps) {
    const event = context.todayMode?.event;
    const isExam = variant === 'exam';
    const title = isExam ? 'Midterm Exams' : 'Midterm Break';
    const copy = isExam
        ? 'Assessment and reporting work is ready when you need it.'
        : 'Enjoy the break. A few things are ready when you want to review them.';

    return (
        <section className="overflow-hidden rounded-3xl border border-blue-200 bg-[linear-gradient(135deg,#eef7ff_0%,#f7fbef_52%,#fff8ed_100%)] p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-2xl bg-white/80 p-3 text-blue-700 shadow-sm">
                            {isExam ? <ClipboardCheck className="h-6 w-6" /> : <Leaf className="h-6 w-6" />}
                        </span>
                        <div>
                            <p className="text-sm font-medium text-blue-900">{formatDateKey(context.todayKey)}</p>
                            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                                {title}
                            </h1>
                        </div>
                    </div>
                    <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">{copy}</p>
                    <p className="mt-3 text-sm font-medium text-slate-700">No normal classes are expected today.</p>
                </div>

                <div className="w-full rounded-3xl bg-white/85 p-5 shadow-sm lg:max-w-md">
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="blue">{context.currentTerm?.name ?? 'Current term'}</Badge>
                        {context.currentWeek ? <Badge variant="default">Week {context.currentWeek}</Badge> : null}
                    </div>
                    {event ? (
                        <div className="mt-4 space-y-2 text-sm text-slate-700">
                            <p className="font-semibold text-slate-950">{event.title}</p>
                            <p>
                                {event.start_date === event.end_date
                                    ? formatShortDateKey(event.start_date)
                                    : `${formatShortDateKey(event.start_date)} - ${formatShortDateKey(event.end_date)}`}
                            </p>
                            {context.todayMode?.resumes_on ? (
                                <p>Learning resumes on {formatShortDateKey(context.todayMode.resumes_on)}.</p>
                            ) : null}
                        </div>
                    ) : null}
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-blue-100 pt-4">
                        <p className="text-xs text-slate-500">
                            Updated {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                        <Button type="button" variant="ghost" size="sm" onClick={onRefresh} disabled={refreshing}>
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}

export function BreakCleanupActions({ context, variant }: { context: TeachingTodayContext; variant: 'break' | 'exam' }) {
    const rows = context.incomplete.slice(0, 4);
    const isExam = variant === 'exam';
    const assignmentHref = buildAssignmentReviewHref(context);

    return (
        <section className="theme-card rounded-2xl border theme-border p-4 sm:p-6" aria-labelledby="break-actions">
            <div className="max-w-2xl">
                <h2 id="break-actions" className="text-xl font-semibold theme-text">When you are ready</h2>
                <p className="mt-2 text-sm leading-6 theme-muted">
                    {isExam
                        ? 'Use this space for marks, records, and reports when the timing is right.'
                        : 'A few things are ready for review. They can wait until you have a quiet moment.'}
                </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
                <ActionCard
                    href={buildPendingLessonCleanupHref(context)}
                    title="Finish pending lesson reflections"
                    body="Open only the lesson records that still need a reflection or closing step."
                />
                <ActionCard
                    href={assignmentHref}
                    title="Review assignments"
                    body={assignmentHref
                        ? 'Open the assignment workspace for the most relevant class subject.'
                        : 'No assignments are waiting for review.'}
                    disabled={!assignmentHref}
                />
                <ActionCard
                    href={buildMidtermReturnHref('/assessments?status=pending')}
                    title={isExam ? 'Record assessment marks' : 'Review assessments'}
                    body="Assessment records remain available during the break."
                />
                <ActionCard
                    href={buildMidtermReturnHref('/reports/instructor')}
                    title="Open teacher reports"
                    body="Review the term picture without normal class activity around it."
                />
            </div>

            {rows.length > 0 ? (
                <div className="mt-6 space-y-2">
                    {rows.map((item) => (
                        <Link key={item.id} href={buildPendingLessonItemHref(item)} className="teaching-today-nested-card block rounded-xl p-4 transition-colors theme-hover-surface">
                            <p className="text-sm font-semibold theme-text">{item.session.subject_name}</p>
                            <p className="mt-1 text-sm theme-muted">
                                This lesson record can be finished when you are ready.
                            </p>
                        </Link>
                    ))}
                </div>
            ) : null}
        </section>
    );
}

export function MidtermInsightsPanel({ context }: { context: TeachingTodayContext }) {
    const insights = deriveMidtermInsights(context, 4);

    return (
        <section className="theme-card rounded-2xl border theme-border p-4 sm:p-6" aria-labelledby="midterm-insights">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl p-2 theme-info-surface text-[color:var(--color-primary)]">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 id="midterm-insights" className="text-xl font-semibold theme-text">A few things Scholaroscope noticed</h2>
                        <p className="mt-1 text-sm leading-6 theme-muted">
                            These are drawn from your current teaching context.
                        </p>
                    </div>
                </div>
                <Link href={buildMidtermInsightsHref()} className="shrink-0">
                    <Button variant="secondary" size="sm">View more insights</Button>
                </Link>
            </div>

            {insights.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed theme-border p-6 text-sm theme-muted">
                    Nothing urgent is waiting. Enjoy the break.
                </div>
            ) : (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    {insights.map((insight) => (
                        <Link
                            key={insight.id}
                            href={insight.href}
                            className={`teaching-today-nested-card block rounded-2xl p-5 transition-colors theme-hover-surface ${insight.featured ? 'lg:col-span-2' : ''}`}
                        >
                            <div className="flex h-full flex-col justify-between gap-4">
                                <div>
                                    <p className="text-base font-semibold theme-text">{insight.title}</p>
                                    <p className="mt-2 text-sm leading-6 theme-muted">{insight.body}</p>
                                </div>
                                <p className="flex items-center text-sm font-medium theme-link">
                                    {insight.actionLabel}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}

export function AfterBreakRecoverySuggestions({ context }: { context: TeachingTodayContext }) {
    const firstTeachingAssignment = context.teachingLoad[0];
    const resumeLabel = firstTeachingAssignment
        ? `Resume ${firstTeachingAssignment.cohort_name} ${firstTeachingAssignment.subject_name} from the next planned topic.`
        : 'Resume teaching from the next planned topic.';

    return (
        <section className="theme-card rounded-2xl border theme-border p-4 sm:p-6" aria-labelledby="after-break">
            <div className="flex items-start gap-3">
                <div className="rounded-xl p-2 theme-success-surface text-[color:var(--color-success)]">
                    <BookOpenCheck className="h-5 w-5" />
                </div>
                <div>
                    <h2 id="after-break" className="text-xl font-semibold theme-text">After the break</h2>
                    <p className="mt-1 text-sm leading-6 theme-muted">
                        Scholaroscope will help you pick up from the next useful teaching step.
                    </p>
                </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="teaching-today-nested-card rounded-xl p-4">
                    <p className="text-sm font-semibold theme-text">{resumeLabel}</p>
                </div>
                <Link href={buildMidtermSchemesHref(context)} className="teaching-today-nested-card rounded-xl p-4 transition-colors theme-hover-surface">
                    <p className="text-sm font-semibold theme-text">Check the next scheme week before classes resume.</p>
                </Link>
                <Link href={buildMidtermInsightsHref()} className="teaching-today-nested-card rounded-xl p-4 transition-colors theme-hover-surface">
                    <p className="text-sm font-semibold theme-text">View learner and class notes from before the break.</p>
                </Link>
            </div>
        </section>
    );
}

export function BeforeBreakPanel({ context }: { context: TeachingTodayContext }) {
    const pausedSessions = context.timeline.filter(isPausedSession).length;

    return (
        <section className="theme-card rounded-2xl border theme-border p-4 sm:p-6">
            <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 h-5 w-5 theme-subtle" />
                <div>
                    <h2 className="text-xl font-semibold theme-text">Before the break</h2>
                    <p className="mt-1 text-sm leading-6 theme-muted">
                        {pausedSessions > 0
                            ? `${pausedSessions} normal class${pausedSessions === 1 ? ' is' : 'es are'} on the timetable today. No action is needed for them during the break.`
                            : 'No normal classes are expected today.'}
                    </p>
                </div>
            </div>
        </section>
    );
}

export function AcademicBreakDashboard(props: AcademicBreakDashboardProps) {
    return (
        <div className="mx-auto max-w-7xl space-y-5 px-0 sm:space-y-6">
            <AcademicBreakModeBanner {...props} />
            <section className="grid gap-5 xl:grid-cols-12 xl:gap-6">
                <div className="space-y-5 xl:col-span-7">
                    <BreakCleanupActions context={props.context} variant={props.variant} />
                    <AfterBreakRecoverySuggestions context={props.context} />
                </div>
                <aside className="space-y-5 xl:col-span-5">
                    <MidtermInsightsPanel context={props.context} />
                    <BeforeBreakPanel context={props.context} />
                    <section className="theme-card rounded-2xl border theme-border p-4 sm:p-6">
                        <div className="flex items-start gap-3">
                            <FileText className="mt-0.5 h-5 w-5 theme-subtle" />
                            <div>
                                <h2 className="text-xl font-semibold theme-text">Reports</h2>
                                <p className="mt-1 text-sm leading-6 theme-muted">
                                    Reports remain available for a calm look at attendance, assessments, and class progress.
                                </p>
                                <Link href={buildMidtermReturnHref('/reports/instructor')} className="mt-4 inline-flex items-center text-sm font-medium theme-link">
                                    Open reports
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </section>
                </aside>
            </section>
        </div>
    );
}

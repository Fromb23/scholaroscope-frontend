'use client';

import Link from 'next/link';
import { BookOpenCheck, CalendarClock, ClipboardCheck, FileText, Leaf, RefreshCw, Sparkles } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import type { TeachingTodayContext } from '@/app/core/hooks/useTeachingToday';
import type { Session } from '@/app/core/types/session';
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

function isOpenCleanupSession(session: Session): boolean {
    return session.status === 'IN_PROGRESS' || Boolean(session.needs_completion);
}

function ActionCard({ href, title, body }: { href: string; title: string; body: string }) {
    return (
        <Link href={href} className="teaching-today-nested-card block rounded-xl p-4 transition-colors theme-hover-surface">
            <p className="text-sm font-semibold theme-text">{title}</p>
            <p className="mt-1 text-sm leading-6 theme-muted">{body}</p>
        </Link>
    );
}

export function AcademicBreakModeBanner({ context, lastRefresh, onRefresh, refreshing = false, variant }: AcademicBreakDashboardProps) {
    const event = context.todayMode?.event;
    const isExam = variant === 'exam';
    const title = isExam ? 'Midterm Exams' : 'Midterm Break';
    const copy = isExam
        ? 'Midterm exams are active. Teaching is paused while assessment and reporting take priority.'
        : 'Teaching is paused for the midterm break. Enjoy the rest - Scholaroscope is quietly reviewing your term progress.';

    return (
        <section className="overflow-hidden rounded-2xl border border-blue-200 bg-[linear-gradient(135deg,#eef7ff_0%,#f7fbef_52%,#fff8ed_100%)] p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-2xl bg-white/80 p-3 text-blue-700 shadow-sm">
                            {isExam ? <ClipboardCheck className="h-6 w-6" /> : <Leaf className="h-6 w-6" />}
                        </span>
                        <div>
                            <p className="text-sm font-medium text-blue-900">{formatDateKey(context.todayKey)}</p>
                            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                                {title}
                            </h1>
                        </div>
                    </div>
                    <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">{copy}</p>
                    <p className="mt-2 text-sm font-medium text-slate-700">No normal teaching sessions are expected today.</p>
                </div>

                <div className="w-full rounded-2xl bg-white/80 p-4 shadow-sm lg:max-w-sm">
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="blue">{context.currentTerm?.name ?? 'Current term'}</Badge>
                        <Badge variant="green">Teaching paused</Badge>
                        {context.todayMode?.allows_cleanup ? <Badge variant="default">Cleanup available</Badge> : null}
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
                                <p>Learning resumes after {formatShortDateKey(context.todayMode.resumes_on)}.</p>
                            ) : null}
                        </div>
                    ) : null}
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-blue-100 pt-3">
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

export function MidtermIntelligencePanel({ context, variant }: { context: TeachingTodayContext; variant: 'break' | 'exam' }) {
    const pausedCount = context.timeline.filter(isPausedSession).length;
    const openRecordCount = context.incomplete.length + context.timeline.filter(isOpenCleanupSession).length;
    const reviewCount = context.afterTeaching.pendingAssessmentReviewCount;
    const isExam = variant === 'exam';

    return (
        <section className="theme-card rounded-xl border theme-border p-4 sm:p-5" aria-labelledby="midterm-intelligence">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 id="midterm-intelligence" className="text-lg font-semibold theme-text">
                        {isExam ? 'Academic Intelligence' : 'Midterm Reflection'}
                    </h2>
                    <p className="mt-1 text-sm leading-6 theme-muted">
                        {isExam
                            ? 'Assessment and reporting tools are ready when you want to review exam progress.'
                            : 'Scholaroscope is keeping the term picture calm while learning is paused.'}
                    </p>
                </div>
                <Badge variant="blue">Soft review mode</Badge>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="teaching-today-nested-card rounded-xl p-4">
                    <p className="text-2xl font-semibold theme-text">{pausedCount}</p>
                    <p className="mt-1 text-sm theme-muted">normal session{pausedCount === 1 ? '' : 's'} paused today</p>
                </div>
                <div className="teaching-today-nested-card rounded-xl p-4">
                    <p className="text-2xl font-semibold theme-text">{openRecordCount}</p>
                    <p className="mt-1 text-sm theme-muted">lesson record{openRecordCount === 1 ? '' : 's'} waiting for attention</p>
                </div>
                <div className="teaching-today-nested-card rounded-xl p-4">
                    <p className="text-2xl font-semibold theme-text">{reviewCount}</p>
                    <p className="mt-1 text-sm theme-muted">assessment row{reviewCount === 1 ? '' : 's'} not yet reviewed</p>
                </div>
                <div className="teaching-today-nested-card rounded-xl p-4">
                    <p className="text-2xl font-semibold theme-text">{context.teachingLoad.length}</p>
                    <p className="mt-1 text-sm theme-muted">class subject{context.teachingLoad.length === 1 ? '' : 's'} in your teaching picture</p>
                </div>
            </div>
        </section>
    );
}

export function BreakCleanupReminders({ context, variant }: { context: TeachingTodayContext; variant: 'break' | 'exam' }) {
    const rows = context.incomplete.slice(0, 4);
    const pausedSessions = context.timeline.filter(isPausedSession);
    const isExam = variant === 'exam';

    return (
        <section className="theme-card rounded-xl border theme-border p-4 sm:p-5" aria-labelledby="break-cleanup">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 id="break-cleanup" className="text-lg font-semibold theme-text">When you are ready</h2>
                    <p className="mt-1 text-sm leading-6 theme-muted">
                        {isExam
                            ? 'Use this time for marks, exam records, and reports without normal lesson pressure.'
                            : 'A few records may need attention, but normal teaching pressure is paused.'}
                    </p>
                </div>
                <Badge variant={rows.length > 0 ? 'orange' : 'green'}>{rows.length} gentle reminder{rows.length === 1 ? '' : 's'}</Badge>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
                <ActionCard href="/sessions" title="Finish pending lesson reflections" body="Close already taught lesson records when you have a quiet moment." />
                <ActionCard href="/assignments" title="Review assignments" body="Review learner work before learning resumes, if that helps your flow." />
                <ActionCard href="/assessments?status=pending" title={isExam ? 'Record assessment marks' : 'Mark assessments'} body="Assessment records remain available during the academic pause." />
                <ActionCard href="/reports/instructor" title="View reports and learner concerns" body="Before the break, these learners may have needed attention." />
            </div>

            {rows.length > 0 ? (
                <div className="mt-5 space-y-2">
                    {rows.map((item) => (
                        <Link key={item.id} href={item.actionHref} className="teaching-today-nested-card block rounded-lg p-3 transition-colors theme-hover-surface">
                            <p className="text-sm font-semibold theme-text">{item.session.subject_name}</p>
                            <p className="mt-1 text-sm theme-muted">
                                This lesson record can be finished when you are ready.
                            </p>
                        </Link>
                    ))}
                </div>
            ) : null}

            {pausedSessions.length > 0 ? (
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                    <p className="text-sm font-semibold text-blue-950">Paused for midterm break</p>
                    <p className="mt-1 text-sm leading-6 text-blue-900">
                        Teaching resumes after the break. These normal sessions are kept out of normal teaching pressure.
                    </p>
                </div>
            ) : null}
        </section>
    );
}

export function AfterBreakRecoverySuggestions({ context }: { context: TeachingTodayContext }) {
    const firstTeachingAssignment = context.teachingLoad[0];
    const resumeLabel = firstTeachingAssignment
        ? `Resume ${firstTeachingAssignment.cohort_name} ${firstTeachingAssignment.subject_name} from the next planned topic.`
        : 'Resume teaching from the next planned topic.';

    return (
        <section className="theme-card rounded-xl border theme-border p-4 sm:p-5" aria-labelledby="after-break">
            <div className="flex items-start gap-3">
                <div className="rounded-xl p-2 theme-success-surface text-[color:var(--color-success)]">
                    <BookOpenCheck className="h-5 w-5" />
                </div>
                <div>
                    <h2 id="after-break" className="text-lg font-semibold theme-text">After the break</h2>
                    <p className="mt-1 text-sm leading-6 theme-muted">
                        Scholaroscope will help you recover the remaining work after teaching resumes.
                    </p>
                </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="teaching-today-nested-card rounded-xl p-4">
                    <p className="text-sm font-semibold theme-text">{resumeLabel}</p>
                </div>
                <div className="teaching-today-nested-card rounded-xl p-4">
                    <p className="text-sm font-semibold theme-text">Rebalance affected scheme weeks because midterm paused learning.</p>
                </div>
                <div className="teaching-today-nested-card rounded-xl p-4">
                    <p className="text-sm font-semibold theme-text">Follow up learners flagged before the break.</p>
                </div>
            </div>
        </section>
    );
}

export function ReportsAndIntelligencePanel({ variant }: { variant: 'break' | 'exam' }) {
    const isExam = variant === 'exam';
    return (
        <section className="theme-card rounded-xl border theme-border p-4 sm:p-5" aria-labelledby="reports-intelligence">
            <div className="flex items-start gap-3">
                <div className="rounded-xl p-2 theme-info-surface text-[color:var(--color-primary)]">
                    {isExam ? <FileText className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                </div>
                <div>
                    <h2 id="reports-intelligence" className="text-lg font-semibold theme-text">Reports & intelligence</h2>
                    <p className="mt-1 text-sm leading-6 theme-muted">
                        {isExam
                            ? 'Exam reports, pending grading, and learner performance summaries take priority.'
                            : 'Reports stay available for calm review, cleanup, and after-break planning.'}
                    </p>
                </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <ActionCard href="/reports/instructor" title="Instructor reports" body="Review the term picture without normal lesson pressure." />
                <ActionCard href="/reports/attendance" title="Attendance concerns" body="Before the break, these learners had attendance concerns." />
                <ActionCard href="/assessments?status=pending" title="Assessment review" body="Check marks and learner performance when ready." />
                <ActionCard href="/schemes" title="Adjust schemes" body="Some planned work may need rebalancing after the break." />
            </div>
        </section>
    );
}

export function AcademicBreakDashboard(props: AcademicBreakDashboardProps) {
    return (
        <div className="mx-auto max-w-7xl space-y-5 px-0 sm:space-y-6">
            <AcademicBreakModeBanner {...props} />
            <MidtermIntelligencePanel context={props.context} variant={props.variant} />
            <section className="grid gap-5 xl:grid-cols-12 xl:gap-6">
                <div className="space-y-5 xl:col-span-7">
                    <BreakCleanupReminders context={props.context} variant={props.variant} />
                    <AfterBreakRecoverySuggestions context={props.context} />
                </div>
                <aside className="space-y-5 xl:col-span-5">
                    <ReportsAndIntelligencePanel variant={props.variant} />
                    <section className="theme-card rounded-xl border theme-border p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                            <CalendarClock className="mt-0.5 h-5 w-5 theme-subtle" />
                            <div>
                                <h2 className="text-lg font-semibold theme-text">Before the break</h2>
                                <p className="mt-1 text-sm leading-6 theme-muted">
                                    Midterm paused normal teaching. Some planned work may need rebalancing after the break.
                                </p>
                            </div>
                        </div>
                    </section>
                </aside>
            </section>
        </div>
    );
}

'use client';

import Link from 'next/link';
import { ClipboardList, Inbox } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import type { TeachingTodayContext } from '@/app/core/hooks/useTeachingToday';
import type { PendingAssessmentReviewWork } from '@/app/core/types/assessment';
import type { AssignmentTeachingTodayItem } from '@/app/core/types/assignments';

interface TeachingTodayAfterTeachingPanelProps {
    afterTeaching: TeachingTodayContext['afterTeaching'];
}

function getAssessmentReviewHref(row: PendingAssessmentReviewWork): string {
    return `/assessments/${row.assessment_id}?focus=score-entry`;
}

function getAssignmentReminderLabel(item: AssignmentTeachingTodayItem): string {
    if (item.evidence_blocked || item.reminder_type === 'ASSIGNMENT_EVIDENCE_PENDING') {
        return item.evidence_blocked ? 'Evidence blocked' : 'Evidence pending';
    }

    switch (item.next_action) {
        case 'ISSUE_ASSIGNMENT':
            return 'Issue prepared learner task';
        case 'RECORD_SUBMISSION':
            return 'Record learner responses';
        case 'REVIEW_WORK':
            return 'Review learner work';
        case 'STORE_RECORD':
            return 'Store reviewed assignment';
        default:
            return item.next_action_label;
    }
}

function getAssignmentBadgeVariant(item: AssignmentTeachingTodayItem): 'green' | 'orange' | 'red' | 'blue' {
    if (item.evidence_blocked || item.urgency === 'blocked') return 'red';
    if (item.urgency === 'overdue' || item.counts.pending_reviews > 0 || item.counts.missing > 0) return 'orange';
    if (item.next_action === 'STORE_RECORD') return 'green';
    return 'blue';
}

export function TeachingTodayAfterTeachingPanel({ afterTeaching }: TeachingTodayAfterTeachingPanelProps) {
    const rows = afterTeaching.pendingAssessments.slice(0, 5);
    const pendingCount = afterTeaching.pendingAssessmentReviewCount;
    const pendingAssessmentCount = afterTeaching.pendingAssessments.length;
    const assignmentRows = afterTeaching.assignmentWork.slice(0, 5);
    const hasAssignmentWork = assignmentRows.length > 0;
    const hasAssessmentWork = pendingCount > 0;

    return (
        <section className="theme-card rounded-lg border theme-border p-4 sm:p-5" aria-labelledby="teaching-today-after">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 id="teaching-today-after" className="text-lg font-semibold theme-text">
                        After teaching
                    </h2>
                    <p className="mt-1 text-sm theme-muted">
                        Handle these records when lessons are done.
                    </p>
                </div>
                {pendingCount > 0 || hasAssignmentWork ? (
                <Badge variant="orange">
                    Pending records
                </Badge>
                ) : null}
            </div>

            {hasAssignmentWork ? (
                <div className="mt-5 space-y-3">
                    {assignmentRows.map((item) => (
                        <Link
                            key={item.assignment_id}
                            href={item.next_action_href}
                            className="teaching-today-nested-card block rounded-lg p-3 transition-colors theme-hover-surface"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="break-words text-sm font-semibold theme-text">
                                        {item.title}
                                    </p>
                                    <p className="mt-1 break-words text-sm theme-muted">
                                        {item.subject.name} - {item.cohort.name}
                                    </p>
                                </div>
                                <Badge variant={getAssignmentBadgeVariant(item)} size="sm" className="self-start sm:self-center">
                                    {getAssignmentReminderLabel(item)}
                                </Badge>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : null}

            {!hasAssessmentWork && !hasAssignmentWork ? (
                <div className="teaching-today-nested-card mt-5 rounded-lg border-dashed p-4">
                    <div className="flex items-start gap-3">
                        <Inbox className="mt-0.5 h-5 w-5 theme-subtle" />
                        <div>
                            <p className="text-sm font-semibold theme-text">No assignment or assessment queue right now.</p>
                            <p className="mt-1 text-sm theme-muted">
                                Assignment responses, evidence status, and assessment rows that need review will appear here after lessons.
                            </p>
                        </div>
                    </div>
                </div>
            ) : rows.length === 0 && hasAssessmentWork ? (
                <div className="teaching-today-nested-card teaching-today-row-warning mt-5 rounded-lg p-4">
                    <p className="text-sm font-semibold theme-text">
                        {pendingCount} assessment record{pendingCount === 1 ? '' : 's'} need review.
                    </p>
                    <p className="mt-1 text-sm theme-muted">
                        Open the assessment queue to see the pending assessment work.
                    </p>
                    <Link
                        href="/assessments?status=pending"
                        className="theme-focus-ring mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium theme-button-primary sm:w-auto"
                    >
                        Open assessments
                    </Link>
                </div>
            ) : rows.length > 0 ? (
                <div className="mt-5 space-y-3">
                    {rows.map((row) => (
                        <Link
                            key={row.assessment_id}
                            href={getAssessmentReviewHref(row)}
                            className="teaching-today-nested-card block rounded-lg p-3 transition-colors theme-hover-surface"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="break-words text-sm font-semibold theme-text">
                                        {row.assessment_name}
                                    </p>
                                    <p className="mt-1 break-words text-sm theme-muted">
                                        {row.subject_name} - {row.cohort_name}
                                    </p>
                                </div>
                                <Badge variant="orange" size="sm" className="self-start sm:self-center">
                                    {row.pending_learner_count} learner record{row.pending_learner_count === 1 ? '' : 's'} pending
                                </Badge>
                            </div>
                        </Link>
                    ))}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs theme-subtle">
                            Showing {rows.length} of {pendingCount} pending record{pendingCount === 1 ? '' : 's'}.
                            {pendingAssessmentCount !== pendingCount ? ` ${pendingAssessmentCount} assessment${pendingAssessmentCount === 1 ? '' : 's'} in queue.` : ''}
                        </p>
                        <Link
                            href="/assessments?status=pending"
                            className="theme-focus-ring inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium theme-button-secondary sm:w-auto"
                        >
                            <ClipboardList className="h-4 w-4" />
                            Open full queue
                        </Link>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

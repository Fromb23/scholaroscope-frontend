'use client';

import Link from 'next/link';
import { ClipboardList, Inbox } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import type { TeachingTodayContext } from '@/app/core/hooks/useTeachingToday';
import type { AssessmentScore } from '@/app/core/types/assessment';

interface TeachingTodayAfterTeachingPanelProps {
    afterTeaching: TeachingTodayContext['afterTeaching'];
}

function getAssessmentReviewHref(row: AssessmentScore): string {
    return `/assessments/${row.assessment}?focus=score-entry&student=${row.student}`;
}

export function TeachingTodayAfterTeachingPanel({ afterTeaching }: TeachingTodayAfterTeachingPanelProps) {
    const rows = afterTeaching.pendingReviewRows.slice(0, 5);
    const pendingCount = afterTeaching.pendingAssessmentReviewCount;

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
                {pendingCount > 0 ? (
                    <Badge variant="orange">
                        Pending records
                    </Badge>
                ) : null}
            </div>

            {pendingCount === 0 ? (
                <div className="teaching-today-nested-card mt-5 rounded-lg border-dashed p-4">
                    <div className="flex items-start gap-3">
                        <Inbox className="mt-0.5 h-5 w-5 theme-subtle" />
                        <div>
                            <p className="text-sm font-semibold theme-text">No assessment review queue right now.</p>
                            <p className="mt-1 text-sm theme-muted">
                                Assessment rows that need grading or review will appear here after lessons.
                            </p>
                        </div>
                    </div>
                </div>
            ) : rows.length === 0 ? (
                <div className="teaching-today-nested-card teaching-today-row-warning mt-5 rounded-lg p-4">
                    <p className="text-sm font-semibold theme-text">
                        {pendingCount} assessment record{pendingCount === 1 ? '' : 's'} need review.
                    </p>
                    <p className="mt-1 text-sm theme-muted">
                        Open the assessment queue to see the learner rows.
                    </p>
                    <Link
                        href="/assessments?status=pending"
                        className="theme-focus-ring mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium theme-button-primary sm:w-auto"
                    >
                        Open assessments
                    </Link>
                </div>
            ) : (
                <div className="mt-5 space-y-3">
                    {rows.map((row) => (
                        <Link
                            key={row.id}
                            href={getAssessmentReviewHref(row)}
                            className="teaching-today-nested-card block rounded-lg p-3 transition-colors theme-hover-surface"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="break-words text-sm font-semibold theme-text">
                                        {row.student_name}
                                    </p>
                                    <p className="mt-1 break-words text-sm theme-muted">
                                        {row.assessment_name} - {row.subject_name}
                                    </p>
                                </div>
                                <Badge variant="orange" size="sm" className="self-start sm:self-center">
                                    {row.status_display || 'Pending review'}
                                </Badge>
                            </div>
                        </Link>
                    ))}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs theme-subtle">
                            Showing {rows.length} of {pendingCount} pending record{pendingCount === 1 ? '' : 's'}.
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
            )}
        </section>
    );
}

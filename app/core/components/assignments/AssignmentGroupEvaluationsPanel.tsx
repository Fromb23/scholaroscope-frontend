'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AssignmentGroupReviewForm } from '@/app/core/components/assignments/AssignmentGroupReviewForm';
import {
    formatDateTime,
    getSubmissionStatusBadgeVariant,
} from '@/app/core/components/assignments/assignmentUtils';
import {
    useAssignmentGroupEvaluations,
    useAssignmentGroupSubmissions,
} from '@/app/core/hooks/useAssignments';
import type { RubricLevel } from '@/app/core/types/assessment';
import type {
    Assignment,
    AssignmentGroup,
    AssignmentGroupEvaluation,
} from '@/app/core/types/assignments';

interface AssignmentGroupEvaluationsPanelProps {
    assignment: Assignment;
    groups: AssignmentGroup[];
    groupsLoading: boolean;
    rubricLevels?: RubricLevel[];
}

function GroupEvaluationSection({
    assignment,
    group,
    expanded,
    onToggle,
    rubricLevels,
    evaluationsBySubmissionId,
}: {
    assignment: Assignment;
    group: AssignmentGroup;
    expanded: boolean;
    onToggle: () => void;
    rubricLevels: RubricLevel[];
    evaluationsBySubmissionId: Map<number, AssignmentGroupEvaluation>;
}) {
    const submissionsQuery = useAssignmentGroupSubmissions(group.id, { enabled: expanded });
    const submissions = useMemo(() => (
        [...submissionsQuery.submissions].sort((left, right) => (
            new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime()
        ))
    ), [submissionsQuery.submissions]);

    const memberCount = group.member_count ?? group.members?.length ?? 0;
    const submissionCount = group.submission_count ?? submissions.length;
    const evaluationCount = group.evaluation_count ?? 0;

    return (
        <Card className="overflow-hidden p-0">
            <button
                type="button"
                onClick={onToggle}
                className="theme-focus-ring theme-hover-surface flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors"
            >
                <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                        {expanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 theme-subtle" />
                        ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 theme-subtle" />
                        )}
                        <h2 className="truncate text-base font-semibold theme-text">{group.name}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                        <span className="theme-muted">{memberCount} members</span>
                        <span className="theme-muted">{submissionCount} submissions</span>
                        <span className="theme-muted">{evaluationCount} reviewed</span>
                        {group.latest_evaluated_at ? (
                            <span className="theme-subtle">
                                Latest review {formatDateTime(group.latest_evaluated_at)}
                            </span>
                        ) : (
                            <span className="theme-subtle">No review yet</span>
                        )}
                    </div>
                </div>
            </button>

            {expanded ? (
                <div className="border-t theme-border px-5 py-4">
                    {submissionsQuery.loading ? (
                        <LoadingSpinner fullScreen={false} message={`Loading submissions for ${group.name}...`} />
                    ) : submissionsQuery.error ? (
                        <ErrorBanner
                            message={submissionsQuery.error}
                            onDismiss={() => void submissionsQuery.refetch()}
                        />
                    ) : submissions.length === 0 ? (
                        <div className="rounded-lg border border-dashed theme-border px-4 py-6 text-sm theme-muted">
                            No submissions have been recorded for this group yet.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {submissions.map((submission) => {
                                const evaluation = evaluationsBySubmissionId.get(submission.id) ?? null;

                                return (
                                    <div key={submission.id} className="rounded-lg border theme-border p-4">
                                        <div className="space-y-4">
                                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-base font-semibold theme-text">
                                                            {submission.group_name}
                                                        </h3>
                                                        <Badge
                                                            variant={getSubmissionStatusBadgeVariant(submission.status)}
                                                            size="sm"
                                                        >
                                                            {submission.status}
                                                        </Badge>
                                                        {evaluation?.evidence_created ? (
                                                            <Badge variant="green" size="sm">Evidence created</Badge>
                                                        ) : null}
                                                    </div>
                                                    <p className="text-sm theme-muted">
                                                        Submitted {formatDateTime(submission.submitted_at)}
                                                    </p>
                                                </div>

                                                {evaluation?.evaluated_at ? (
                                                    <div className="text-sm theme-subtle">
                                                        Latest review {formatDateTime(evaluation.evaluated_at)}
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div className="rounded-lg border theme-border theme-surface-muted p-4">
                                                <div className="text-sm font-medium theme-text">Submission record</div>
                                                <p className="mt-2 whitespace-pre-wrap text-sm theme-text">
                                                    {submission.text_response || 'No text notes recorded.'}
                                                </p>
                                            </div>

                                            <AssignmentGroupReviewForm
                                                assignment={assignment}
                                                group={group}
                                                submission={submission}
                                                evaluation={evaluation}
                                                rubricLevels={rubricLevels}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : null}
        </Card>
    );
}

export function AssignmentGroupEvaluationsPanel({
    assignment,
    groups,
    groupsLoading,
    rubricLevels = [],
}: AssignmentGroupEvaluationsPanelProps) {
    const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
    const evaluationsQuery = useAssignmentGroupEvaluations({
        assignment: assignment.id,
    }, {
        enabled: groups.length > 0,
    });

    const evaluationsBySubmissionId = useMemo(() => (
        new Map(
            evaluationsQuery.evaluations.map((evaluation) => [evaluation.group_submission, evaluation])
        )
    ), [evaluationsQuery.evaluations]);

    if (groupsLoading) {
        return (
            <Card>
                <LoadingSpinner fullScreen={false} message="Loading groups..." />
            </Card>
        );
    }

    if (groups.length === 0) {
        return (
            <Card>
                <div className="py-10 text-center text-sm theme-muted">
                    No groups yet. Create groups before reviewing group work.
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {evaluationsQuery.error ? (
                <ErrorBanner
                    message={evaluationsQuery.error}
                    onDismiss={() => void evaluationsQuery.refetch()}
                />
            ) : null}

            {evaluationsQuery.loading ? (
                <Card>
                    <LoadingSpinner fullScreen={false} message="Loading group evaluations..." />
                </Card>
            ) : null}

            {groups.map((group) => (
                <GroupEvaluationSection
                    key={group.id}
                    assignment={assignment}
                    group={group}
                    expanded={expandedGroupId === group.id}
                    onToggle={() => setExpandedGroupId((current) => current === group.id ? null : group.id)}
                    rubricLevels={rubricLevels}
                    evaluationsBySubmissionId={evaluationsBySubmissionId}
                />
            ))}
        </div>
    );
}

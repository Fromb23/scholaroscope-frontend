'use client';

import { useMemo } from 'react';
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
    rubricLevels,
    evaluationsBySubmissionId,
}: {
    assignment: Assignment;
    group: AssignmentGroup;
    rubricLevels: RubricLevel[];
    evaluationsBySubmissionId: Map<number, AssignmentGroupEvaluation>;
}) {
    const submissionsQuery = useAssignmentGroupSubmissions(group.id);
    const submissions = useMemo(() => (
        [...submissionsQuery.submissions].sort((left, right) => (
            new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime()
        ))
    ), [submissionsQuery.submissions]);

    if (submissionsQuery.loading) {
        return (
            <Card>
                <LoadingSpinner fullScreen={false} message={`Loading submissions for ${group.name}...`} />
            </Card>
        );
    }

    if (submissionsQuery.error) {
        return (
            <Card>
                <ErrorBanner message={submissionsQuery.error} onDismiss={() => void submissionsQuery.refetch()} />
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="text-sm font-medium text-gray-900">{group.name}</div>
                <div className="text-sm text-gray-500">
                    {(group.member_count ?? group.members?.length ?? 0)} members
                </div>
            </div>

            {submissions.length === 0 ? (
                <Card>
                    <div className="py-8 text-center text-sm text-gray-500">
                        No submissions have been recorded for this group yet.
                    </div>
                </Card>
            ) : (
                submissions.map((submission) => {
                    const evaluation = evaluationsBySubmissionId.get(submission.id) ?? null;

                    return (
                        <Card key={submission.id}>
                            <div className="space-y-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {submission.group_name}
                                            </h3>
                                            <Badge variant={getSubmissionStatusBadgeVariant(submission.status)} size="sm">
                                                {submission.status}
                                            </Badge>
                                            {evaluation?.evidence_created ? (
                                                <Badge variant="green" size="sm">Evidence created</Badge>
                                            ) : null}
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            Submitted {formatDateTime(submission.submitted_at)}
                                        </p>
                                    </div>

                                    {evaluation?.evaluated_at ? (
                                        <div className="text-sm text-gray-500">
                                            Latest review {formatDateTime(evaluation.evaluated_at)}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <div className="text-sm font-medium text-gray-900">Submission record</div>
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
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
                        </Card>
                    );
                })
            )}
        </div>
    );
}

export function AssignmentGroupEvaluationsPanel({
    assignment,
    groups,
    groupsLoading,
    rubricLevels = [],
}: AssignmentGroupEvaluationsPanelProps) {
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
                <div className="py-10 text-center text-sm text-gray-500">
                    No groups yet. Create groups to organize this assignment.
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {evaluationsQuery.error ? (
                <ErrorBanner message={evaluationsQuery.error} onDismiss={() => void evaluationsQuery.refetch()} />
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
                    rubricLevels={rubricLevels}
                    evaluationsBySubmissionId={evaluationsBySubmissionId}
                />
            ))}
        </div>
    );
}

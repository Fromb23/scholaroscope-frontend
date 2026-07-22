'use client';

import { useMemo } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AssignmentGroupReviewForm } from '@/app/core/components/assignments/AssignmentGroupReviewForm';
import { AssignmentWorkUnitNavigation } from '@/app/core/components/assignments/AssignmentWorkUnitNavigation';
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
    activeGroupId?: number | null;
    currentIndex?: number;
    totalCount?: number;
    onPrevious?: () => void;
    onNext?: () => void;
    onSaved?: () => void | Promise<void>;
    onSaveAndNext?: () => void | Promise<void>;
    pending?: boolean;
    readOnly?: boolean;
}

export function AssignmentGroupEvaluationsPanel({
    assignment,
    groups,
    groupsLoading,
    rubricLevels = [],
    activeGroupId = null,
    currentIndex = 0,
    totalCount,
    onPrevious = () => undefined,
    onNext = () => undefined,
    onSaved,
    onSaveAndNext,
    pending = false,
    readOnly = false,
}: AssignmentGroupEvaluationsPanelProps) {
    const activeGroup = useMemo(() => (
        groups.find((group) => group.id === activeGroupId) ?? groups[0] ?? null
    ), [activeGroupId, groups]);
    const submissionsQuery = useAssignmentGroupSubmissions(activeGroup?.id ?? null, {
        enabled: Boolean(activeGroup?.id),
    });
    const evaluationsQuery = useAssignmentGroupEvaluations({
        assignment: assignment.id,
        group: activeGroup?.id,
    }, {
        enabled: Boolean(activeGroup?.id),
    });
    const currentSubmission = useMemo(() => (
        [...submissionsQuery.submissions].sort((left, right) => (
            new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime()
        ))[0] ?? null
    ), [submissionsQuery.submissions]);
    const evaluationsBySubmissionId = useMemo(() => (
        new Map<number, AssignmentGroupEvaluation>(
            evaluationsQuery.evaluations.map((evaluation) => [evaluation.group_submission, evaluation])
        )
    ), [evaluationsQuery.evaluations]);
    const currentEvaluation = currentSubmission
        ? evaluationsBySubmissionId.get(currentSubmission.id) ?? null
        : null;

    if (groupsLoading) {
        return (
            <Card>
                <LoadingSpinner fullScreen={false} message="Loading groups..." />
            </Card>
        );
    }

    if (groups.length === 0 || !activeGroup) {
        return (
            <Card>
                <div className="py-10 text-center text-sm theme-muted">
                    Create groups and record group submissions before reviewing group work.
                </div>
            </Card>
        );
    }

    return (
        <Card className="space-y-4">
            <AssignmentWorkUnitNavigation
                label="Group"
                currentIndex={currentIndex}
                totalCount={totalCount ?? groups.length}
                onPrevious={onPrevious}
                onNext={onNext}
                disabled={pending}
                queueDescription={activeGroup.name}
            />

            {submissionsQuery.error ? (
                <ErrorBanner
                    message={submissionsQuery.error}
                    onDismiss={() => void submissionsQuery.refetch()}
                />
            ) : null}

            {evaluationsQuery.error ? (
                <ErrorBanner
                    message={evaluationsQuery.error}
                    onDismiss={() => void evaluationsQuery.refetch()}
                />
            ) : null}

            {(submissionsQuery.loading || evaluationsQuery.loading) ? (
                <LoadingSpinner fullScreen={false} message={`Loading review data for ${activeGroup.name}...`} />
            ) : null}

            <div className="rounded-lg border theme-border theme-surface-elevated p-4">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold theme-text">{activeGroup.name}</h2>
                    <span className="text-sm theme-muted">
                        {activeGroup.member_count ?? activeGroup.members?.length ?? 0} members
                    </span>
                    {currentSubmission ? (
                        <Badge variant={getSubmissionStatusBadgeVariant(currentSubmission.status)} size="sm">
                            {currentSubmission.status}
                        </Badge>
                    ) : (
                        <Badge variant="default" size="sm">No submission</Badge>
                    )}
                    {currentEvaluation ? (
                        <Badge variant="green" size="sm">Reviewed</Badge>
                    ) : null}
                </div>
                {currentSubmission ? (
                    <p className="mt-1 text-xs theme-muted">
                        Submitted {formatDateTime(currentSubmission.submitted_at)}
                    </p>
                ) : (
                    <p className="mt-1 text-xs theme-muted">
                        Record a group submission before reviewing this group.
                    </p>
                )}
            </div>

            {currentSubmission ? (
                <>
                    <div className="space-y-2 rounded-lg border theme-border theme-surface-muted p-4">
                        <div className="text-sm font-medium theme-text">Recorded group response</div>
                        <p className="whitespace-pre-wrap text-sm leading-6 theme-muted">
                            {currentSubmission.text_response || 'No text response submitted.'}
                        </p>
                        <p className="text-xs theme-muted">
                            Attachments {currentSubmission.attachment_metadata.length}
                        </p>
                    </div>

                    <AssignmentGroupReviewForm
                        assignment={assignment}
                        group={activeGroup}
                        submission={currentSubmission}
                        evaluation={currentEvaluation}
                        rubricLevels={rubricLevels}
                        onSaved={onSaved}
                        onSaveAndNext={onSaveAndNext}
                        pending={pending}
                        readOnly={readOnly}
                    />
                </>
            ) : (
                <div className="rounded-lg border border-dashed theme-border px-4 py-6 text-sm theme-muted">
                    No submissions have been recorded for this group yet.
                </div>
            )}
        </Card>
    );
}

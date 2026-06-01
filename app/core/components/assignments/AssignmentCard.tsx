'use client';

import Link from 'next/link';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import {
    formatDate,
    getAssignmentDeliveryBadgeVariant,
    getAssignmentDeliveryLabel,
    getAssignmentEvaluationBadgeVariant,
    getAssignmentEvaluationLabel,
    getAssignmentStatusBadgeVariant,
    getAssignmentStatusLabel,
    isAssignmentDueSoon,
    isAssignmentOverdue,
} from '@/app/core/components/assignments/assignmentUtils';
import type { Assignment } from '@/app/core/types/assignments';

function getDueState(assignment: Assignment): {
    label: string;
    variant: 'default' | 'yellow' | 'red' | 'purple';
} {
    if (assignment.status === 'ARCHIVED') {
        return { label: 'Stored', variant: 'purple' };
    }

    if (assignment.status === 'CLOSED') {
        return { label: 'Reviewing', variant: 'yellow' };
    }

    if (!assignment.due_at) {
        return { label: 'No due date', variant: 'default' };
    }

    if (isAssignmentOverdue(assignment)) {
        return { label: 'Overdue', variant: 'red' };
    }

    if (isAssignmentDueSoon(assignment)) {
        return { label: 'Due soon', variant: 'yellow' };
    }

    return { label: 'On schedule', variant: 'default' };
}

function getProgressSummary(assignment: Assignment): {
    label: string;
    detail: string;
} {
    if (assignment.delivery_mode === 'GROUP') {
        return {
            label: `${assignment.group_evaluation_count}/${assignment.group_submission_count} evaluated`,
            detail: assignment.group_count > 0
                ? `${assignment.group_count} groups`
                : 'Group workflow ready',
        };
    }

    return {
        label: `${assignment.reviewed_count}/${assignment.submissions_count} reviewed`,
        detail: `${assignment.recipients_count} recipients · ${assignment.missing_count} missing`,
    };
}

export function AssignmentCard({
    assignment,
    detailHref,
    onEdit,
}: {
    assignment: Assignment;
    detailHref: string;
    onEdit: (assignment: Assignment) => void;
}) {
    const dueState = getDueState(assignment);
    const progressSummary = getProgressSummary(assignment);

    return (
        <Card
            className={`p-4 sm:p-5 ${
                assignment.status === 'ARCHIVED'
                    ? 'border-purple-200 bg-purple-50/40'
                    : assignment.status === 'DRAFT'
                        ? 'border-dashed'
                        : ''
            }`}
        >
            <div className="space-y-4">
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getAssignmentStatusBadgeVariant(assignment.status)} size="sm">
                            {getAssignmentStatusLabel(assignment.status)}
                        </Badge>
                        <Badge variant={getAssignmentDeliveryBadgeVariant(assignment.delivery_mode)} size="sm">
                            {getAssignmentDeliveryLabel(assignment.delivery_mode)}
                        </Badge>
                        <Badge variant={getAssignmentEvaluationBadgeVariant(assignment.evaluation_type)} size="sm">
                            {getAssignmentEvaluationLabel(assignment.evaluation_type)}
                        </Badge>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-base font-semibold leading-6 text-gray-900 line-clamp-2">
                            {assignment.title}
                        </h2>
                        <p className="text-sm leading-6 text-gray-600 line-clamp-3">
                            {assignment.instructions || 'No instructions provided.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                        <span className="font-medium text-gray-700">{assignment.subject_name}</span>
                        <span>{assignment.cohort_name}</span>
                        <span>{assignment.curriculum_name}</span>
                    </div>
                </div>

                <div className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2">
                    <div className="space-y-1">
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Due
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                                {formatDate(assignment.due_at)}
                            </span>
                            <Badge variant={dueState.variant} size="sm">
                                {dueState.label}
                            </Badge>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Progress
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                            {progressSummary.label}
                        </div>
                        <div className="text-sm text-gray-500">{progressSummary.detail}</div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Link href={detailHref} className="w-full sm:w-auto">
                        <Button size="sm" className="w-full sm:w-auto">
                            View Assignment
                        </Button>
                    </Link>
                    {assignment.status === 'DRAFT' ? (
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => onEdit(assignment)}
                        >
                            Edit preparation
                        </Button>
                    ) : null}
                </div>
            </div>
        </Card>
    );
}

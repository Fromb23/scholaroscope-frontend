'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import {
    formatDateTime,
    getSubmissionStatusBadgeVariant,
} from '@/app/core/components/assignments/assignmentUtils';
import {
    useAssignmentGroupSubmissions,
    useCreateAssignmentGroupSubmission,
} from '@/app/core/hooks/useAssignments';
import type {
    Assignment,
    AssignmentGroup,
    AssignmentGroupSubmissionStatus,
} from '@/app/core/types/assignments';

interface AssignmentGroupSubmissionsPanelProps {
    assignment: Assignment;
    groups: AssignmentGroup[];
    groupsLoading: boolean;
}

const GROUP_SUBMISSION_STATUS_OPTIONS: Array<{
    value: AssignmentGroupSubmissionStatus;
    label: string;
}> = [
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'LATE', label: 'Late' },
    { value: 'RETURNED', label: 'Returned' },
    { value: 'RESUBMITTED', label: 'Resubmitted' },
    { value: 'REVIEWED', label: 'Reviewed' },
];

function toDateTimeLocalValue(value: Date): string {
    const offset = value.getTimezoneOffset();
    return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function GroupSubmissionCard({
    group,
}: {
    group: AssignmentGroup;
}) {
    const submissionsQuery = useAssignmentGroupSubmissions(group.id);
    const createMutation = useCreateAssignmentGroupSubmission();
    const [submittedAt, setSubmittedAt] = useState(() => toDateTimeLocalValue(new Date()));
    const [status, setStatus] = useState<AssignmentGroupSubmissionStatus>('SUBMITTED');
    const [textResponse, setTextResponse] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const latestSubmission = useMemo(() => {
        return [...submissionsQuery.submissions].sort((left, right) => (
            new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime()
        ))[0] ?? null;
    }, [submissionsQuery.submissions]);

    const handleRecordSubmission = async () => {
        setFormError(null);
        setSuccessMessage(null);

        try {
            await createMutation.mutateAsync({
                groupId: group.id,
                data: {
                    submitted_at: submittedAt ? new Date(submittedAt).toISOString() : undefined,
                    status,
                    text_response: textResponse.trim(),
                },
            });
            setTextResponse('');
            setSubmittedAt(toDateTimeLocalValue(new Date()));
            setStatus('SUBMITTED');
            setSuccessMessage('Group submission recorded.');
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to record group submission.');
        }
    };

    return (
        <Card>
            <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
                        <p className="text-sm text-gray-500">
                            {(group.member_count ?? group.members?.length ?? 0)} members
                        </p>
                    </div>

                    {latestSubmission ? (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={getSubmissionStatusBadgeVariant(latestSubmission.status)} size="sm">
                                    {latestSubmission.status}
                                </Badge>
                                <span className="text-sm font-medium text-gray-900">
                                    Latest submission
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">
                                {formatDateTime(latestSubmission.submitted_at)}
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500">
                            No submission recorded yet.
                        </div>
                    )}
                </div>

                {formError ? (
                    <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
                ) : null}

                {submissionsQuery.error ? (
                    <ErrorBanner message={submissionsQuery.error} onDismiss={() => void submissionsQuery.refetch()} />
                ) : null}

                {successMessage ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                        {successMessage}
                    </div>
                ) : null}

                {submissionsQuery.loading ? (
                    <LoadingSpinner fullScreen={false} message="Loading group submissions..." />
                ) : null}

                {latestSubmission?.text_response ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                        {latestSubmission.text_response}
                    </div>
                ) : null}

                <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                    <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">Record submission</div>
                        <p className="text-sm text-gray-500">
                            Use this when the teacher is logging offline classwork, presentations, projects, or collected books.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <Input
                            label="Submitted At"
                            type="datetime-local"
                            value={submittedAt}
                            onChange={(event) => setSubmittedAt(event.target.value)}
                        />
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select
                                value={status}
                                onChange={(event) => setStatus(event.target.value as AssignmentGroupSubmissionStatus)}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {GROUP_SUBMISSION_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Teacher Notes</label>
                        <textarea
                            value={textResponse}
                            onChange={(event) => setTextResponse(event.target.value)}
                            rows={4}
                            placeholder="Record what the group submitted or presented."
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="button"
                            onClick={handleRecordSubmission}
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? 'Saving...' : 'Record Submission'}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}

export function AssignmentGroupSubmissionsPanel({
    assignment,
    groups,
    groupsLoading,
}: AssignmentGroupSubmissionsPanelProps) {
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
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                {assignment.title} is recorded as group work. Teachers can log offline work here without requiring student portal submission.
            </div>

            {groups.map((group) => (
                <GroupSubmissionCard key={group.id} group={group} />
            ))}
        </div>
    );
}

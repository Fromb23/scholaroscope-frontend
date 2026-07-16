'use client';

import { resolveErrorMessage } from '@/app/core/errors';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
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

const textareaClassName = [
    'theme-focus-ring theme-input theme-surface-elevated w-full rounded-lg px-4 py-3',
    'placeholder:text-[color:var(--color-text-subtle)]',
].join(' ');

const selectClassName = [
    'theme-focus-ring theme-input theme-surface-elevated w-full rounded-lg px-4 py-3',
].join(' ');

function toDateTimeLocalValue(value: Date): string {
    const offset = value.getTimezoneOffset();
    return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function GroupSubmissionCard({
    assignment,
    group,
    expanded,
    onToggle,
}: {
    assignment: Assignment;
    group: AssignmentGroup;
    expanded: boolean;
    onToggle: () => void;
}) {
    const submissionsQuery = useAssignmentGroupSubmissions(group.id, { enabled: expanded });
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

    const latestSubmissionAt = latestSubmission?.submitted_at ?? group.latest_submission_at ?? null;
    const latestSubmissionStatus = latestSubmission?.status ?? group.latest_submission_status ?? null;
    const memberCount = group.member_count ?? group.members?.length ?? 0;

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
            setFormError(resolveErrorMessage(err, 'Failed to record group submission.'));
        }
    };

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
                        {latestSubmissionStatus ? (
                            <Badge variant={getSubmissionStatusBadgeVariant(latestSubmissionStatus)} size="sm">
                                {latestSubmissionStatus}
                            </Badge>
                        ) : (
                            <span className="theme-subtle">No submission yet</span>
                        )}
                        {latestSubmissionAt ? (
                            <span className="theme-subtle">Latest {formatDateTime(latestSubmissionAt)}</span>
                        ) : null}
                    </div>
                </div>

                {!latestSubmissionStatus && !expanded ? (
                    <span className="inline-flex items-center gap-2 rounded-lg border theme-border px-3 py-2 text-sm font-medium theme-text">
                        <FileText className="h-4 w-4" />
                        Record submission
                    </span>
                ) : null}
            </button>

            {expanded ? (
                <div className="border-t theme-border px-5 py-4">
                    <div className="space-y-4">
                        {formError ? (
                            <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
                        ) : null}

                        {submissionsQuery.error ? (
                            <ErrorBanner
                                message={submissionsQuery.error}
                                onDismiss={() => void submissionsQuery.refetch()}
                            />
                        ) : null}

                        {successMessage ? (
                            <div className="theme-success-surface rounded-lg px-4 py-3 text-sm">
                                {successMessage}
                            </div>
                        ) : null}

                        {submissionsQuery.loading ? (
                            <LoadingSpinner fullScreen={false} message={`Loading submissions for ${group.name}...`} />
                        ) : null}

                        {latestSubmission ? (
                            <div className="rounded-lg border theme-border theme-surface-muted p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-sm font-medium theme-text">Latest submission</div>
                                    <Badge variant={getSubmissionStatusBadgeVariant(latestSubmission.status)} size="sm">
                                        {latestSubmission.status}
                                    </Badge>
                                </div>
                                <p className="mt-1 text-sm theme-muted">
                                    Recorded {formatDateTime(latestSubmission.submitted_at)}
                                </p>
                                <p className="mt-3 whitespace-pre-wrap text-sm theme-text">
                                    {latestSubmission.text_response || 'No text notes recorded.'}
                                </p>
                            </div>
                        ) : !submissionsQuery.loading ? (
                            <div className="rounded-lg border border-dashed theme-border px-4 py-3 text-sm theme-muted">
                                No submission has been recorded for this group yet.
                            </div>
                        ) : null}

                        <div className="rounded-lg border theme-border p-4">
                            <div className="space-y-1">
                                <div className="text-sm font-medium theme-text">Record submission</div>
                                <p className="text-sm theme-muted">
                                    {assignment.title} can be logged here when the teacher is capturing offline work, presentations, or collected books.
                                </p>
                            </div>

                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                <Input
                                    label="Submitted At"
                                    type="datetime-local"
                                    value={submittedAt}
                                    onChange={(event) => setSubmittedAt(event.target.value)}
                                />
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium theme-text">Status</label>
                                    <select
                                        value={status}
                                        onChange={(event) => setStatus(event.target.value as AssignmentGroupSubmissionStatus)}
                                        className={selectClassName}
                                    >
                                        {GROUP_SUBMISSION_STATUS_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                <label className="block text-sm font-medium theme-text">Teacher Notes</label>
                                <textarea
                                    value={textResponse}
                                    onChange={(event) => setTextResponse(event.target.value)}
                                    rows={4}
                                    placeholder="Record what the group submitted or presented."
                                    className={textareaClassName}
                                />
                            </div>

                            <div className="mt-4 flex flex-col sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    onClick={handleRecordSubmission}
                                    disabled={createMutation.isPending}
                                    className="w-full sm:w-auto"
                                >
                                    {createMutation.isPending ? 'Saving submission...' : 'Save submission'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </Card>
    );
}

export function AssignmentGroupSubmissionsPanel({
    assignment,
    groups,
    groupsLoading,
}: AssignmentGroupSubmissionsPanelProps) {
    const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);

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
                    No groups yet. Create groups before recording group submissions.
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="theme-info-surface rounded-lg px-4 py-3 text-sm">
                {assignment.title} is tracked as group work. Expand one group at a time to review the latest submission or record a new one.
            </div>

            {groups.map((group) => (
                <GroupSubmissionCard
                    key={group.id}
                    assignment={assignment}
                    group={group}
                    expanded={expandedGroupId === group.id}
                    onToggle={() => setExpandedGroupId((current) => current === group.id ? null : group.id)}
                />
            ))}
        </div>
    );
}

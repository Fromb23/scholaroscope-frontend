'use client';

import { resolveErrorMessage } from '@/app/core/errors';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AssignmentWorkUnitNavigation } from '@/app/core/components/assignments/AssignmentWorkUnitNavigation';
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
    AssignmentGroupSubmission,
} from '@/app/core/types/assignments';

interface AssignmentGroupSubmissionsPanelProps {
    assignment: Assignment;
    groups: AssignmentGroup[];
    groupsLoading: boolean;
    activeGroupId?: number | null;
    currentIndex?: number;
    totalCount?: number;
    onPrevious?: () => void;
    onNext?: () => void;
    onSaved?: (submission: AssignmentGroupSubmission) => void | Promise<void>;
    onSaveAndNext?: (submission: AssignmentGroupSubmission) => void | Promise<void>;
    pending?: boolean;
    readOnly?: boolean;
}

const textareaClassName = [
    'theme-focus-ring theme-input theme-surface-elevated w-full rounded-lg px-4 py-3',
    'placeholder:text-[color:var(--color-text-subtle)]',
].join(' ');

export function AssignmentGroupSubmissionsPanel({
    assignment,
    groups,
    groupsLoading,
    activeGroupId = null,
    currentIndex = 0,
    totalCount,
    onPrevious = () => undefined,
    onNext = () => undefined,
    onSaved,
    onSaveAndNext,
    pending = false,
    readOnly = false,
}: AssignmentGroupSubmissionsPanelProps) {
    const activeGroup = useMemo(() => (
        groups.find((group) => group.id === activeGroupId) ?? groups[0] ?? null
    ), [activeGroupId, groups]);
    const submissionsQuery = useAssignmentGroupSubmissions(activeGroup?.id ?? null, {
        enabled: Boolean(activeGroup?.id),
    });
    const createMutation = useCreateAssignmentGroupSubmission();
    const [textResponse, setTextResponse] = useState('');
    const [hydrationKey, setHydrationKey] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const currentSubmission = useMemo(() => (
        [...submissionsQuery.submissions].sort((left, right) => (
            new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime()
        ))[0] ?? null
    ), [submissionsQuery.submissions]);
    const activeHydrationKey = [
        assignment.id,
        activeGroup?.id ?? 'none',
        currentSubmission?.id ?? 'none',
        currentSubmission?.updated_at ?? 'none',
    ].join(':');
    const saving = pending || createMutation.isPending;

    useEffect(() => {
        if (hydrationKey === activeHydrationKey) return;
        setTextResponse(currentSubmission?.text_response ?? '');
        setFormError(null);
        setHydrationKey(activeHydrationKey);
    }, [activeHydrationKey, currentSubmission, hydrationKey]);

    const dirty = textResponse !== (currentSubmission?.text_response ?? '');

    const save = async (advance: boolean) => {
        if (!activeGroup) return;
        setFormError(null);

        try {
            const submission = await createMutation.mutateAsync({
                groupId: activeGroup.id,
                data: {
                    text_response: textResponse.trim(),
                },
            });
            setHydrationKey([
                assignment.id,
                activeGroup.id,
                submission.id,
                submission.updated_at,
            ].join(':'));
            await onSaved?.(submission);
            if (advance) {
                await onSaveAndNext?.(submission);
            }
        } catch (err) {
            setFormError(resolveErrorMessage(err, 'Failed to record group submission.'));
        }
    };

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
                    No groups yet. Create groups before recording group submissions.
                </div>
            </Card>
        );
    }

    return (
        <Card className="space-y-4">
            <div className="theme-info-surface rounded-lg px-4 py-3 text-sm">
                {assignment.title} is tracked as group work. Record one group at a time and use Previous/Next to move through the work queue.
            </div>

            <AssignmentWorkUnitNavigation
                label="Group"
                currentIndex={currentIndex}
                totalCount={totalCount ?? groups.length}
                onPrevious={onPrevious}
                onNext={onNext}
                disabled={saving || dirty}
                queueDescription={dirty ? 'Save or close/discard changes before navigating.' : activeGroup.name}
            />

            {formError ? (
                <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
            ) : null}

            {submissionsQuery.error ? (
                <ErrorBanner
                    message={submissionsQuery.error}
                    onDismiss={() => void submissionsQuery.refetch()}
                />
            ) : null}

            {submissionsQuery.loading ? (
                <LoadingSpinner fullScreen={false} message={`Loading submissions for ${activeGroup.name}...`} />
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
                        <Badge variant="default" size="sm">No submission yet</Badge>
                    )}
                </div>
                {currentSubmission ? (
                    <p className="mt-1 text-xs theme-muted">
                        Submitted {formatDateTime(currentSubmission.submitted_at)} · Updated {formatDateTime(currentSubmission.updated_at)}
                    </p>
                ) : (
                    <p className="mt-1 text-xs theme-muted">
                        Server will record submitted time and status when saved.
                    </p>
                )}
            </div>

            <div className="space-y-3 rounded-lg border theme-border theme-surface-muted p-4">
                <div className="text-sm font-medium theme-text">Group members</div>
                {activeGroup.members?.length ? (
                    <div className="grid gap-2 md:grid-cols-2">
                        {activeGroup.members.map((member) => (
                            <div key={member.id} className="rounded-lg border theme-border theme-surface-elevated px-3 py-2">
                                <div className="text-sm font-medium theme-text">{member.student_name}</div>
                                <div className="text-xs theme-subtle">{member.admission_number} · {member.participation_status_display}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm theme-muted">No group members have been added.</p>
                )}
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium theme-text">Teacher Notes</label>
                <textarea
                    value={textResponse}
                    onChange={(event) => setTextResponse(event.target.value)}
                    rows={4}
                    disabled={readOnly || saving}
                    placeholder="Record what the group submitted or presented."
                    className={textareaClassName}
                />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                    type="button"
                    onClick={() => void save(false)}
                    disabled={readOnly || saving}
                    className="w-full sm:w-auto"
                >
                    {saving ? 'Saving submission...' : 'Save'}
                </Button>
                <Button
                    type="button"
                    onClick={() => void save(true)}
                    disabled={readOnly || saving || currentIndex >= (totalCount ?? groups.length) - 1}
                    className="w-full sm:w-auto"
                >
                    Save & Next
                </Button>
            </div>
        </Card>
    );
}

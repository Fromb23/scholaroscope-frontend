'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { Input } from '@/app/components/ui/Input';
import { ResponsiveActionSheet } from '@/app/components/ui/actions';
import type { AppError } from '@/app/core/errors';
import type { Assignment, AssignmentDeletionState } from '@/app/core/types/assignments';

interface AssignmentDeletionWorkflowModalProps {
    assignment: Assignment;
    deletion: AssignmentDeletionState | null;
    open: boolean;
    onClose: () => void;
    onRestoreEvidence: () => Promise<void>;
    onDelete: (payload: { confirmation_title: string; reason: string }) => Promise<void>;
    pending?: boolean;
    error?: AppError | null;
}

function countLabel(value: number, singular: string, plural = `${singular}s`) {
    return `${value} ${value === 1 ? singular : plural}`;
}

export function AssignmentDeletionWorkflowModal({
    assignment,
    deletion,
    open,
    onClose,
    onRestoreEvidence,
    onDelete,
    pending = false,
    error = null,
}: AssignmentDeletionWorkflowModalProps) {
    const [confirmationTitle, setConfirmationTitle] = useState('');
    const [reason, setReason] = useState('');
    const impact = deletion?.impact;
    const reasonRequired = assignment.status !== 'DRAFT';
    const titleMatches = confirmationTitle === assignment.title;
    const reasonValid = !reasonRequired || reason.trim().length > 0;
    const canConfirmDelete = Boolean(deletion?.can_delete) && titleMatches && reasonValid && !pending;
    const primaryBlockedReason = deletion?.blockers[0] ?? null;
    const needsEvidenceRestore = Boolean(deletion?.requires_evidence_restore);
    const needsRestoreToReview = Boolean(deletion?.requires_restore_to_review);
    const footer = useMemo(() => (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
                Cancel
            </Button>
            {needsEvidenceRestore ? (
                <Button type="button" variant="secondary" onClick={() => void onRestoreEvidence()} disabled={pending}>
                    {pending ? 'Restoring evidence...' : 'Restore submitted evidence'}
                </Button>
            ) : null}
            <Button
                type="button"
                variant="danger"
                onClick={() => void onDelete({
                    confirmation_title: confirmationTitle,
                    reason,
                })}
                disabled={!canConfirmDelete}
            >
                {pending ? 'Deleting...' : 'Delete assignment'}
            </Button>
        </div>
    ), [
        canConfirmDelete,
        confirmationTitle,
        needsEvidenceRestore,
        onClose,
        onDelete,
        onRestoreEvidence,
        pending,
        reason,
    ]);

    return (
        <ResponsiveActionSheet
            open={open}
            onClose={onClose}
            title="Delete assignment"
            description="Deletion is permanent and uses the server-derived assignment lifecycle state."
            size="lg"
            closeDisabled={pending}
            footer={footer}
            state={primaryBlockedReason ? 'warning' : 'idle'}
            closeLabel="Close deletion workflow"
        >
            <div className="space-y-5">
                {error ? <AppErrorBanner error={error} /> : null}

                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4" />
                        <div>
                            <div className="font-semibold">Permanent deletion</div>
                            <p className="mt-1">
                                This removes the assignment and its workflow records after backend prevalidation.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold theme-text">{assignment.title}</h3>
                        <Badge variant="default">{assignment.status}</Badge>
                    </div>
                    <p className="text-sm theme-muted">
                        {assignment.subject_name} · {assignment.cohort_name}
                    </p>
                </div>

                {impact ? (
                    <dl className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border theme-border p-3">
                            <dt className="text-xs theme-subtle">Recipients / groups</dt>
                            <dd className="mt-1 text-sm font-medium theme-text">
                                {countLabel(impact.recipients, 'recipient')} · {countLabel(impact.groups, 'group')}
                            </dd>
                        </div>
                        <div className="rounded-lg border theme-border p-3">
                            <dt className="text-xs theme-subtle">Responses</dt>
                            <dd className="mt-1 text-sm font-medium theme-text">
                                {impact.individual_submissions + impact.group_submissions}
                            </dd>
                        </div>
                        <div className="rounded-lg border theme-border p-3">
                            <dt className="text-xs theme-subtle">Evaluations</dt>
                            <dd className="mt-1 text-sm font-medium theme-text">{impact.evaluations}</dd>
                        </div>
                        <div className="rounded-lg border theme-border p-3">
                            <dt className="text-xs theme-subtle">Generated evidence</dt>
                            <dd className="mt-1 text-sm font-medium theme-text">{impact.evidence_records}</dd>
                        </div>
                    </dl>
                ) : null}

                {needsRestoreToReview ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        Restore this stored assignment to review before deleting it.
                    </div>
                ) : null}

                {deletion?.blockers.length ? (
                    <div className="space-y-2 rounded-lg border theme-border p-4">
                        <div className="text-sm font-semibold theme-text">Backend blockers</div>
                        <ul className="list-disc space-y-1 pl-5 text-sm theme-muted">
                            {deletion.blockers.map((blocker) => (
                                <li key={blocker}>{blocker}</li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                <Input
                    label="Type the exact assignment title"
                    value={confirmationTitle}
                    onChange={(event) => setConfirmationTitle(event.target.value)}
                    disabled={pending}
                    error={confirmationTitle && !titleMatches ? 'Title does not match.' : undefined}
                />

                <div className="space-y-2">
                    <label className="block text-sm font-medium theme-text">
                        Deletion reason{reasonRequired ? '' : ' (optional)'}
                    </label>
                    <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        disabled={pending}
                        rows={3}
                        className="theme-focus-ring theme-input theme-surface-elevated w-full rounded-lg px-4 py-3"
                        placeholder={reasonRequired ? 'Required for issued or reviewed assignments.' : 'Optional for drafts.'}
                    />
                </div>
            </div>
        </ResponsiveActionSheet>
    );
}

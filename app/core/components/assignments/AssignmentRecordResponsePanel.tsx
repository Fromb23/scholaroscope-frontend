'use client';

import { resolveErrorMessage } from '@/app/core/errors';

import { useEffect, useMemo, useState } from 'react';
import { Paperclip, UserCheck } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { useCreateAssignmentSubmission } from '@/app/core/hooks/useAssignments';
import type {
    Assignment,
    AssignmentAttachmentSlot,
    AssignmentRecipient,
    AssignmentSubmission,
} from '@/app/core/types/assignments';

function recipientStatusLabel(recipient: AssignmentRecipient): string {
    if (recipient.status === 'NOT_APPLICABLE_PRE_ENROLMENT') {
        return 'Not applicable';
    }
    if (recipient.status === 'CATCH_UP_ASSIGNED' || recipient.is_catch_up) {
        return 'Catch-up work assigned';
    }
    return recipient.status_display ?? recipient.status.replace(/_/g, ' ');
}

interface AssignmentRecordResponsePanelProps {
    assignment: Assignment;
    recipients: AssignmentRecipient[];
    submissions: AssignmentSubmission[];
    onClose: () => void;
    onSaved?: (submission: AssignmentSubmission) => void | Promise<void>;
}

function toDateTimeLocalValue(value: Date): string {
    const offset = value.getTimezoneOffset();
    return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function slotAcceptedTypeLabel(slot: AssignmentAttachmentSlot): string {
    if (!slot.accepted_types?.length) return 'Any evidence type';
    return slot.accepted_types.join(', ');
}

export function AssignmentRecordResponsePanel({
    assignment,
    recipients,
    submissions,
    onClose,
    onSaved,
}: AssignmentRecordResponsePanelProps) {
    const createMutation = useCreateAssignmentSubmission();
    const [selectedStudent, setSelectedStudent] = useState('');
    const [submittedAt, setSubmittedAt] = useState(() => toDateTimeLocalValue(new Date()));
    const [textResponse, setTextResponse] = useState('');
    const [attachmentNote, setAttachmentNote] = useState('');
    const [attachmentSlotNotes, setAttachmentSlotNotes] = useState<Record<string, string>>({});
    const [formError, setFormError] = useState<string | null>(null);

    const defaultRecipient = useMemo(() => {
        const submittedStudentIds = new Set(submissions.map((submission) => submission.student));
        const applicableRecipients = recipients.filter(
            (recipient) => recipient.status !== 'NOT_APPLICABLE_PRE_ENROLMENT',
        );
        return (
            applicableRecipients.find((recipient) => !submittedStudentIds.has(recipient.student))
            ?? applicableRecipients.find((recipient) => (
                recipient.status === 'ASSIGNED' || recipient.status === 'CATCH_UP_ASSIGNED'
            ))
            ?? applicableRecipients[0]
            ?? null
        );
    }, [recipients, submissions]);

    const learnerOptions = useMemo(() => [
        { value: '', label: 'Select learner' },
        ...[...recipients]
            .filter((recipient) => recipient.status !== 'NOT_APPLICABLE_PRE_ENROLMENT')
            .sort((left, right) => left.student_name.localeCompare(right.student_name))
            .map((recipient) => ({
                value: String(recipient.student),
                label: `${recipient.student_name} · ${recipient.admission_number} · ${recipientStatusLabel(recipient)}`,
            })),
    ], [recipients]);

    useEffect(() => {
        setSelectedStudent(defaultRecipient ? String(defaultRecipient.student) : '');
        setSubmittedAt(toDateTimeLocalValue(new Date()));
        setTextResponse('');
        setAttachmentNote('');
        setAttachmentSlotNotes({});
        setFormError(null);
    }, [defaultRecipient, assignment.id]);

    const attachmentSlots = assignment.attachment_slots ?? [];
    const hasAttachmentSlots = attachmentSlots.length > 0;

    const handleSave = async () => {
        setFormError(null);

        if (!selectedStudent) {
            setFormError('Select the learner whose response you are recording.');
            return;
        }

        try {
            const slotMetadata = attachmentSlots.flatMap((slot) => {
                const note = attachmentSlotNotes[slot.key]?.trim();
                if (!note) return [];
                return [{
                    slot_key: slot.key,
                    slot_label: slot.label,
                    note,
                    accepted_types: slot.accepted_types ?? [],
                    source: 'teacher_recorded_placeholder',
                }];
            });
            const legacyMetadata = !hasAttachmentSlots && attachmentNote.trim()
                ? [{ note: attachmentNote.trim(), source: 'teacher_recorded_placeholder' }]
                : [];
            const submission = await createMutation.mutateAsync({
                assignment: assignment.id,
                student: Number(selectedStudent),
                submitted_at: submittedAt ? new Date(submittedAt).toISOString() : undefined,
                text_response: textResponse.trim(),
                attachment_metadata: [...slotMetadata, ...legacyMetadata],
            });
            await onSaved?.(submission);
        } catch (err) {
            setFormError(resolveErrorMessage(err, 'Failed to record learner response.'));
        }
    };

    return (
        <Card className="theme-info-surface space-y-4" role="region" aria-label="Record learner response">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 theme-subtle" />
                        <h2 className="text-lg font-semibold theme-text">Record learner response</h2>
                    </div>
                    <p className="text-sm theme-muted">
                        Use this when you are capturing classwork, oral answers, notebook checks, homework, or practical work for {assignment.title}.
                    </p>
                </div>

                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="w-full sm:w-auto">
                    Close
                </Button>
            </div>

            {formError ? (
                <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
            ) : null}

            {recipients.length === 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Issue this assignment to learners before recording responses.
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Select
                            label="Learner"
                            value={selectedStudent}
                            onChange={(event) => setSelectedStudent(event.target.value)}
                            options={learnerOptions}
                        />
                        <Input
                            label="Submitted At"
                            type="datetime-local"
                            value={submittedAt}
                            onChange={(event) => setSubmittedAt(event.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium theme-text">Response note / learner response</label>
                        <textarea
                            value={textResponse}
                            onChange={(event) => setTextResponse(event.target.value)}
                            rows={5}
                            placeholder="Record what the learner submitted, said, presented, or completed."
                            className="theme-focus-ring theme-input theme-surface-elevated w-full rounded-lg px-4 py-3"
                        />
                    </div>

                    {hasAttachmentSlots ? (
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 text-sm font-medium theme-text">
                                <Paperclip className="h-4 w-4 theme-subtle" />
                                Expected attachment / evidence slots
                            </label>
                            <div className="grid gap-3 md:grid-cols-2">
                                {attachmentSlots.map((slot) => (
                                    <div key={slot.key} className="rounded-lg border theme-border p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold theme-text">
                                                {slot.label}
                                            </p>
                                            {slot.required ? (
                                                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                                                    Required
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="mt-1 text-xs theme-subtle">
                                            {slotAcceptedTypeLabel(slot)}
                                            {slot.max_files ? ` · Up to ${slot.max_files}` : ''}
                                        </p>
                                        <textarea
                                            value={attachmentSlotNotes[slot.key] ?? ''}
                                            onChange={(event) => setAttachmentSlotNotes((previous) => ({
                                                ...previous,
                                                [slot.key]: event.target.value,
                                            }))}
                                            rows={2}
                                            placeholder="Record the collected file, book check, photo set, or evidence note."
                                            className="theme-focus-ring theme-input theme-surface-elevated mt-2 w-full rounded-lg px-3 py-2"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium theme-text">
                                <Paperclip className="h-4 w-4 theme-subtle" />
                                Attachment note
                            </label>
                            <textarea
                                value={attachmentNote}
                                onChange={(event) => setAttachmentNote(event.target.value)}
                                rows={2}
                                placeholder="Optional placeholder for collected books, photos, files, or practical evidence."
                                className="theme-focus-ring theme-input theme-surface-elevated w-full rounded-lg px-4 py-3"
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={createMutation.isPending}
                            className="w-full sm:w-auto"
                        >
                            {createMutation.isPending ? 'Saving response...' : 'Save response'}
                        </Button>
                    </div>
                </>
            )}
        </Card>
    );
}

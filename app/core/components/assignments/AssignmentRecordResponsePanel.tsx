'use client';

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
    AssignmentRecipient,
    AssignmentSubmission,
} from '@/app/core/types/assignments';

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
    const [formError, setFormError] = useState<string | null>(null);

    const defaultRecipient = useMemo(() => {
        const submittedStudentIds = new Set(submissions.map((submission) => submission.student));
        return (
            recipients.find((recipient) => !submittedStudentIds.has(recipient.student))
            ?? recipients.find((recipient) => recipient.status === 'ASSIGNED')
            ?? recipients[0]
            ?? null
        );
    }, [recipients, submissions]);

    const learnerOptions = useMemo(() => [
        { value: '', label: 'Select learner' },
        ...[...recipients]
            .sort((left, right) => left.student_name.localeCompare(right.student_name))
            .map((recipient) => ({
                value: String(recipient.student),
                label: `${recipient.student_name} · ${recipient.admission_number} · ${recipient.status}`,
            })),
    ], [recipients]);

    useEffect(() => {
        setSelectedStudent(defaultRecipient ? String(defaultRecipient.student) : '');
        setSubmittedAt(toDateTimeLocalValue(new Date()));
        setTextResponse('');
        setAttachmentNote('');
        setFormError(null);
    }, [defaultRecipient, assignment.id]);

    const handleSave = async () => {
        setFormError(null);

        if (!selectedStudent) {
            setFormError('Select the learner whose response you are recording.');
            return;
        }

        try {
            const submission = await createMutation.mutateAsync({
                assignment: assignment.id,
                student: Number(selectedStudent),
                submitted_at: submittedAt ? new Date(submittedAt).toISOString() : undefined,
                text_response: textResponse.trim(),
                attachment_metadata: attachmentNote.trim()
                    ? [{ note: attachmentNote.trim(), source: 'teacher_recorded_placeholder' }]
                    : [],
            });
            await onSaved?.(submission);
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to record learner response.');
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

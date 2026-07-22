'use client';

import { resolveErrorMessage } from '@/app/core/errors';

import { useEffect, useMemo, useState } from 'react';
import { Paperclip, UserCheck } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { AssignmentWorkUnitNavigation } from '@/app/core/components/assignments/AssignmentWorkUnitNavigation';
import {
    formatDateTime,
    getSubmissionStatusBadgeVariant,
} from '@/app/core/components/assignments/assignmentUtils';
import { useCreateAssignmentSubmission } from '@/app/core/hooks/useAssignments';
import type {
    Assignment,
    AssignmentAttachmentSlot,
    AssignmentRecipient,
    AssignmentSubmission,
} from '@/app/core/types/assignments';

interface AssignmentRecordResponsePanelProps {
    assignment: Assignment;
    activeRecipient: AssignmentRecipient | null;
    currentSubmission: AssignmentSubmission | null;
    currentIndex: number;
    totalCount: number;
    onPrevious: () => void;
    onNext: () => void;
    onClose: () => void;
    onSaved?: (submission: AssignmentSubmission) => void | Promise<void>;
    onSaveAndNext?: (submission: AssignmentSubmission) => void | Promise<void>;
    pending?: boolean;
    readOnly?: boolean;
}

const textareaClassName = [
    'theme-focus-ring theme-input theme-surface-elevated w-full rounded-lg px-4 py-3',
    'placeholder:text-[color:var(--color-text-subtle)]',
].join(' ');

function slotAcceptedTypeLabel(slot: AssignmentAttachmentSlot): string {
    if (!slot.accepted_types?.length) return 'Any evidence type';
    return slot.accepted_types.join(', ');
}

function metadataNote(value: unknown): string {
    if (!value || typeof value !== 'object') return '';
    const note = (value as { note?: unknown }).note;
    return typeof note === 'string' ? note : '';
}

function metadataSlotKey(value: unknown): string {
    if (!value || typeof value !== 'object') return '';
    const slotKey = (value as { slot_key?: unknown }).slot_key;
    return typeof slotKey === 'string' ? slotKey : '';
}

export function AssignmentRecordResponsePanel({
    assignment,
    activeRecipient,
    currentSubmission,
    currentIndex,
    totalCount,
    onPrevious,
    onNext,
    onClose,
    onSaved,
    onSaveAndNext,
    pending = false,
    readOnly = false,
}: AssignmentRecordResponsePanelProps) {
    const createMutation = useCreateAssignmentSubmission();
    const [textResponse, setTextResponse] = useState('');
    const [attachmentNote, setAttachmentNote] = useState('');
    const [attachmentSlotNotes, setAttachmentSlotNotes] = useState<Record<string, string>>({});
    const [hydrationKey, setHydrationKey] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    const attachmentSlots = assignment.attachment_slots ?? [];
    const hasAttachmentSlots = attachmentSlots.length > 0;
    const activeHydrationKey = [
        assignment.id,
        activeRecipient?.student ?? 'none',
        currentSubmission?.id ?? 'none',
        currentSubmission?.updated_at ?? 'none',
    ].join(':');
    const saving = pending || createMutation.isPending;

    useEffect(() => {
        if (hydrationKey === activeHydrationKey) return;

        setTextResponse(currentSubmission?.text_response ?? '');
        const nextSlotNotes: Record<string, string> = {};
        let legacyNote = '';
        for (const item of currentSubmission?.attachment_metadata ?? []) {
            const slotKey = metadataSlotKey(item);
            const note = metadataNote(item);
            if (slotKey && note) {
                nextSlotNotes[slotKey] = note;
            } else if (note && !legacyNote) {
                legacyNote = note;
            }
        }
        setAttachmentSlotNotes(nextSlotNotes);
        setAttachmentNote(legacyNote);
        setFormError(null);
        setHydrationKey(activeHydrationKey);
    }, [activeHydrationKey, currentSubmission, hydrationKey]);

    const dirty = useMemo(() => {
        if (!activeRecipient) return false;
        const hydratedText = currentSubmission?.text_response ?? '';
        const hydratedSlotNotes: Record<string, string> = {};
        let hydratedLegacyNote = '';
        for (const item of currentSubmission?.attachment_metadata ?? []) {
            const slotKey = metadataSlotKey(item);
            const note = metadataNote(item);
            if (slotKey && note) hydratedSlotNotes[slotKey] = note;
            else if (note && !hydratedLegacyNote) hydratedLegacyNote = note;
        }
        return (
            textResponse !== hydratedText
            || attachmentNote !== hydratedLegacyNote
            || JSON.stringify(attachmentSlotNotes) !== JSON.stringify(hydratedSlotNotes)
        );
    }, [activeRecipient, attachmentNote, attachmentSlotNotes, currentSubmission, textResponse]);

    const save = async (advance: boolean) => {
        setFormError(null);

        if (!activeRecipient) {
            setFormError('No learner is available for response recording.');
            return;
        }
        if (currentSubmission?.text_response && !textResponse && hydrationKey !== activeHydrationKey) {
            setFormError('The saved response has not finished loading. Wait and try again.');
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
                student: activeRecipient.student,
                text_response: textResponse.trim(),
                attachment_metadata: [...slotMetadata, ...legacyMetadata],
            });
            setHydrationKey([
                assignment.id,
                activeRecipient.student,
                submission.id,
                submission.updated_at,
            ].join(':'));
            await onSaved?.(submission);
            if (advance) {
                await onSaveAndNext?.(submission);
            }
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
                        Capturing offline work, oral answers, notebook checks, homework, or practical work for {assignment.title}.
                    </p>
                </div>

                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="w-full sm:w-auto">
                    Close
                </Button>
            </div>

            {formError ? (
                <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />
            ) : null}

            {!activeRecipient ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Issue this assignment to learners before recording responses.
                </div>
            ) : (
                <>
                    <AssignmentWorkUnitNavigation
                        label="Learner"
                        currentIndex={currentIndex}
                        totalCount={totalCount}
                        onPrevious={onPrevious}
                        onNext={onNext}
                        disabled={saving || dirty}
                        queueDescription={dirty ? 'Save or close/discard changes before navigating.' : activeRecipient.student_name}
                    />

                    <div className="rounded-lg border theme-border theme-surface-elevated px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold theme-text">{activeRecipient.student_name}</div>
                            <div className="text-xs theme-subtle">{activeRecipient.admission_number}</div>
                            {currentSubmission ? (
                                <Badge variant={getSubmissionStatusBadgeVariant(currentSubmission.status)} size="sm">
                                    {currentSubmission.status}
                                </Badge>
                            ) : (
                                <Badge variant="default" size="sm">No response yet</Badge>
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

                    <div className="space-y-2">
                        <label className="block text-sm font-medium theme-text">Response note / learner response</label>
                        <textarea
                            value={textResponse}
                            onChange={(event) => setTextResponse(event.target.value)}
                            rows={5}
                            disabled={readOnly || saving}
                            placeholder="Record what the learner submitted, said, presented, or completed."
                            className={textareaClassName}
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
                                            <p className="text-sm font-semibold theme-text">{slot.label}</p>
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
                                            disabled={readOnly || saving}
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
                                disabled={readOnly || saving}
                                placeholder="Optional placeholder for collected books, photos, files, or practical evidence."
                                className={textareaClassName}
                            />
                        </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                            Close
                        </Button>
                        <Button
                            type="button"
                            onClick={() => void save(false)}
                            disabled={readOnly || saving}
                            className="w-full sm:w-auto"
                        >
                            {saving ? 'Saving response...' : 'Save'}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => void save(true)}
                            disabled={readOnly || saving || currentIndex >= totalCount - 1}
                            className="w-full sm:w-auto"
                        >
                            Save & Next
                        </Button>
                    </div>
                </>
            )}
        </Card>
    );
}

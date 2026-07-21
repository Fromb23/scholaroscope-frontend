'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Image as ImageIcon, Paperclip, Upload } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import Modal from '@/app/components/ui/Modal';
import { Select } from '@/app/components/ui/Select';
import { resolveErrorMessage, type ApiError } from '@/app/core/types/errors';
import type {
    FineArtsCourseworkTask,
    FineArtsEvidenceType,
    FineArtsLearnerEvidenceCell,
    FineArtsLearnerEvidenceLearner,
    FineArtsLearnerEvidenceStatus,
    FineArtsTaughtOutcomeLink,
} from '@/app/core/types/session';
import {
    useRecordFineArtsLearnerEvidence,
    useUploadFineArtsLearnerEvidenceAttachment,
} from '@/app/plugins/cbc/hooks/useFineArtsPracticals';

interface FineArtsLearnerEvidenceModalProps {
    sessionId: number;
    isOpen: boolean;
    learner: FineArtsLearnerEvidenceLearner | null;
    evidenceType: FineArtsEvidenceType | null;
    courseworkTask: FineArtsCourseworkTask | null;
    taughtOutcomes: FineArtsTaughtOutcomeLink[];
    cell: FineArtsLearnerEvidenceCell | null;
    editable: boolean;
    onClose: () => void;
    onStateChange?: () => Promise<void> | void;
}

const STATUS_OPTIONS: Array<{ value: FineArtsLearnerEvidenceStatus; label: string }> = [
    { value: 'NOT_STARTED', label: 'Not started' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'REVIEWED', label: 'Reviewed' },
    { value: 'NEEDS_IMPROVEMENT', label: 'Needs improvement' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'MISSING', label: 'Missing' },
];

function formatEvidenceLabel(value: string | null) {
    return (value ?? '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatBytes(bytes: number) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentIcon(mimeType: string) {
    if (mimeType.startsWith('image/')) {
        return <ImageIcon className="h-4 w-4 theme-muted" />;
    }

    return <FileText className="h-4 w-4 theme-muted" />;
}

export function FineArtsLearnerEvidenceModal({
    sessionId,
    isOpen,
    learner,
    evidenceType,
    courseworkTask,
    taughtOutcomes,
    cell,
    editable,
    onClose,
    onStateChange,
}: FineArtsLearnerEvidenceModalProps) {
    const recordMutation = useRecordFineArtsLearnerEvidence(sessionId);
    const uploadMutation = useUploadFineArtsLearnerEvidenceAttachment(sessionId);

    const [status, setStatus] = useState<FineArtsLearnerEvidenceStatus>('NOT_STARTED');
    const [notes, setNotes] = useState('');
    const [selectedOutcomeIds, setSelectedOutcomeIds] = useState<number[]>([]);
    const [uploadCaption, setUploadCaption] = useState('');
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [persistedEvidenceId, setPersistedEvidenceId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        setStatus(cell?.status ?? 'NOT_STARTED');
        setNotes(cell?.notes ?? '');
        setSelectedOutcomeIds(cell?.outcome_ids ?? []);
        setUploadCaption('');
        setPendingFiles([]);
        setUploadProgress({});
        setPersistedEvidenceId(cell?.id ?? null);
        setError(null);
    }, [cell, isOpen]);

    const requiresOutcomeLinks = useMemo(
        () => status !== 'NOT_STARTED' && status !== 'MISSING',
        [status],
    );

    const handleSave = async () => {
        if (!learner || !evidenceType) {
            return;
        }

        if (requiresOutcomeLinks && selectedOutcomeIds.length === 0) {
            setError('Select at least one confirmed taught outcome for learner worksheet evidence.');
            return;
        }

        try {
            setError(null);
            const result = await recordMutation.mutateAsync({
                learner_id: learner.learner_id,
                evidence_type: evidenceType,
                recorded: status !== 'NOT_STARTED' && status !== 'MISSING',
                status,
                notes,
                outcome_ids: requiresOutcomeLinks ? selectedOutcomeIds : [],
            });
            setPersistedEvidenceId(result.id ?? null);
            await onStateChange?.();
        } catch (mutationError) {
            setError(resolveErrorMessage(mutationError as ApiError, 'We could not save learner evidence.'));
        }
    };

    const handleUpload = async () => {
        if (!persistedEvidenceId) {
            setError('Save learner evidence before uploading files.');
            return;
        }

        if (pendingFiles.length === 0) {
            return;
        }

        try {
            setError(null);
            for (const file of pendingFiles) {
                await uploadMutation.mutateAsync({
                    evidenceId: persistedEvidenceId,
                    file,
                    caption: uploadCaption,
                    onUploadProgress: (percent) => {
                        setUploadProgress((current) => ({
                            ...current,
                            [file.name]: percent,
                        }));
                    },
                });
            }
            setPendingFiles([]);
            setUploadCaption('');
            setUploadProgress({});
            await onStateChange?.();
        } catch (mutationError) {
            setError(resolveErrorMessage(mutationError as ApiError, 'We could not upload the selected files.'));
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={learner && evidenceType ? `${learner.name} · ${formatEvidenceLabel(evidenceType)}` : 'Learner worksheet evidence'}
            size="xl"
        >
            <div className="space-y-6">
                {error ? (
                    <ErrorBanner message={error} compact onDismiss={() => setError(null)} />
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                        <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Learner</p>
                        <p className="mt-1 text-sm font-semibold theme-text">{learner?.name ?? 'Unknown learner'}</p>
                        <p className="text-sm theme-muted">{learner?.admission_number ?? 'No admission number'}</p>
                    </div>
                    <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                        <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Coursework task</p>
                        <p className="mt-1 text-sm font-semibold theme-text">
                            {courseworkTask ? `${courseworkTask.task_code} · ${courseworkTask.name}` : 'Not resolved'}
                        </p>
                        <p className="text-sm theme-muted">{formatEvidenceLabel(evidenceType)}</p>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
                    <Select
                        label="Status"
                        value={status}
                        onChange={(event) => setStatus(event.target.value as FineArtsLearnerEvidenceStatus)}
                        disabled={!editable || recordMutation.isPending}
                        options={STATUS_OPTIONS}
                    />

                    <div>
                        <label className="mb-2 block text-sm font-medium theme-text">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            rows={4}
                            disabled={!editable || recordMutation.isPending}
                            className="theme-input theme-focus-ring min-h-[112px] w-full rounded-lg px-4 py-3 text-sm"
                            placeholder="Record learner worksheet notes, feedback, or observations..."
                        />
                    </div>
                </div>

                <div className="rounded-xl border p-4 theme-border theme-surface">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold theme-text">Linked taught outcomes</p>
                            <p className="text-sm theme-muted">
                                Link this learner evidence back to the confirmed outcomes taught in this session.
                            </p>
                        </div>
                        <Badge variant="default">{selectedOutcomeIds.length} selected</Badge>
                    </div>

                    <div className="mt-4 space-y-3">
                        {taughtOutcomes.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm theme-border theme-muted">
                                No confirmed taught outcomes are available for this session yet.
                            </div>
                        ) : (
                            taughtOutcomes.map((outcome) => {
                                const checked = selectedOutcomeIds.includes(outcome.outcome_id);
                                return (
                                    <label
                                        key={outcome.outcome_id}
                                        className="flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 theme-border theme-hover-surface"
                                    >
                                        <input
                                            type="checkbox"
                                            className="theme-checkbox theme-border mt-1 h-4 w-4 rounded"
                                            checked={checked}
                                            disabled={!editable || !requiresOutcomeLinks}
                                            onChange={(event) => {
                                                if (event.target.checked) {
                                                    setSelectedOutcomeIds((current) => [...current, outcome.outcome_id]);
                                                    return;
                                                }
                                                setSelectedOutcomeIds((current) => (
                                                    current.filter((value) => value !== outcome.outcome_id)
                                                ));
                                            }}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-sm font-medium theme-text">{outcome.code}</p>
                                                <Badge variant="default">{outcome.status}</Badge>
                                            </div>
                                            <p className="mt-1 text-sm theme-muted">{outcome.text}</p>
                                            <p className="mt-1 text-xs theme-subtle">
                                                {outcome.strand} · {outcome.sub_strand}
                                            </p>
                                        </div>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="rounded-xl border p-4 theme-border theme-surface">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold theme-text">Attachments</p>
                            <p className="text-sm theme-muted">
                                Upload portfolio pages, sketches, artwork photos, PDFs, or allowed videos.
                            </p>
                        </div>
                        <Badge variant="default">{cell?.attachment_count ?? 0} uploaded</Badge>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr,220px]">
                        <div className="space-y-3">
                            <label className="block">
                                <span className="mb-2 block text-sm font-medium theme-text">Select files</span>
                                <input
                                    type="file"
                                    multiple
                                    disabled={!editable || uploadMutation.isPending}
                                    accept=".jpg,.jpeg,.png,.webp,.pdf,.mp4,.mov"
                                    onChange={(event) => setPendingFiles(Array.from(event.target.files ?? []))}
                                    className="theme-input theme-focus-ring w-full rounded-lg px-4 py-3 text-sm"
                                />
                            </label>
                            {pendingFiles.length > 0 ? (
                                <div className="space-y-2 rounded-lg border p-3 theme-border theme-surface-muted">
                                    {pendingFiles.map((file) => (
                                        <div key={file.name} className="flex items-center justify-between gap-3 text-sm">
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-medium theme-text">{file.name}</p>
                                                <p className="theme-muted">{formatBytes(file.size)}</p>
                                            </div>
                                            <span className="shrink-0 text-xs theme-subtle">
                                                {uploadProgress[file.name] ? `${uploadProgress[file.name]}%` : 'Queued'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <div className="space-y-3">
                            <label className="block">
                                <span className="mb-2 block text-sm font-medium theme-text">Caption</span>
                                <input
                                    value={uploadCaption}
                                    onChange={(event) => setUploadCaption(event.target.value)}
                                    disabled={!editable || uploadMutation.isPending}
                                    className="theme-input theme-focus-ring w-full rounded-lg px-4 py-2 text-sm"
                                    placeholder="Optional caption"
                                />
                            </label>
                            <Button
                                type="button"
                                variant="secondary"
                                className="w-full"
                                onClick={() => {
                                    void handleUpload();
                                }}
                                disabled={!editable || uploadMutation.isPending || pendingFiles.length === 0}
                            >
                                <Upload className="h-4 w-4" />
                                {uploadMutation.isPending ? 'Uploading...' : 'Upload selected'}
                            </Button>
                            {!persistedEvidenceId ? (
                                <p className="text-xs theme-muted">Save the learner evidence entry first, then upload files.</p>
                            ) : null}
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        {(cell?.attachments ?? []).length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm theme-border theme-muted">
                                No attachments uploaded yet.
                            </div>
                        ) : (
                            cell?.attachments.map((attachment) => (
                                <div
                                    key={attachment.id}
                                    className="flex flex-col gap-3 rounded-lg border p-3 theme-border theme-surface-muted sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        {attachment.thumbnail_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={attachment.thumbnail_url}
                                                alt={attachment.original_name}
                                                className="h-14 w-14 rounded-lg border object-cover theme-border"
                                            />
                                        ) : (
                                            <div className="flex h-14 w-14 items-center justify-center rounded-lg border theme-border theme-surface-elevated">
                                                {attachmentIcon(attachment.mime_type)}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium theme-text">{attachment.original_name}</p>
                                            <p className="text-xs theme-muted">
                                                {formatBytes(attachment.optimized_size)} · {attachment.processing_status}
                                            </p>
                                            {attachment.caption ? (
                                                <p className="mt-1 text-xs theme-subtle">{attachment.caption}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="default">{attachment.stored_format}</Badge>
                                        {attachment.file_url ? (
                                            <a
                                                href={attachment.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="theme-focus-ring inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors theme-border theme-hover-surface theme-text"
                                            >
                                                <Paperclip className="h-4 w-4" />
                                                Open
                                            </a>
                                        ) : null}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-t pt-4 theme-border sm:flex-row sm:items-center sm:justify-end">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Close
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            void handleSave();
                        }}
                        disabled={!editable || recordMutation.isPending}
                    >
                        {recordMutation.isPending ? 'Saving...' : 'Save learner evidence'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

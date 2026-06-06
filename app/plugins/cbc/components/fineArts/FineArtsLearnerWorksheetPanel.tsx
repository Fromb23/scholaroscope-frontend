'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Paperclip, RefreshCcw, Search, Upload } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';
import type {
    FineArtsEvidenceType,
    FineArtsLearnerEvidenceCell,
    FineArtsLearnerEvidenceMatrix,
    FineArtsLearnerEvidenceStatus,
    FineArtsPracticalContract,
    FineArtsWorksheetError,
    FineArtsWorksheetNextAction,
} from '@/app/core/types/session';
import {
    filterFineArtsLearners,
    formatFineArtsEvidenceLabel,
    getFineArtsWorksheetStorageKey,
    getNextFineArtsWorksheetTarget,
    sanitizeFineArtsWorksheetUiState,
} from '@/app/plugins/cbc/lib/fineArtsPracticals';
import {
    useRecordFineArtsLearnerEvidence,
    useUploadFineArtsLearnerEvidenceAttachment,
} from '@/app/plugins/cbc/hooks/useFineArtsPracticals';

interface FineArtsLearnerWorksheetPanelProps {
    sessionId: number;
    contract: FineArtsPracticalContract | null;
    matrix: FineArtsLearnerEvidenceMatrix | null;
    editable: boolean;
    isLoading: boolean;
    loadError: ApiError | null;
    onRetry: () => Promise<void> | void;
    onStateChange?: () => Promise<void> | void;
    onGoToSessionProof: () => void;
}

const STATUS_OPTIONS: Array<{ value: FineArtsLearnerEvidenceStatus; label: string }> = [
    { value: 'NOT_STARTED', label: 'Not started' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'REVIEWED', label: 'Reviewed' },
    { value: 'NEEDS_IMPROVEMENT', label: 'Needs improvement' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'MISSING', label: 'Missing' },
];

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

function getStructuredWorksheetError(error: ApiError | null): FineArtsWorksheetError | null {
    const data = error?.response?.data;
    if (!data || typeof data !== 'object' || !('error' in data)) {
        return null;
    }

    const structured = data.error;
    if (!structured || typeof structured !== 'object') {
        return null;
    }

    if (
        !Array.isArray(structured)
        && typeof structured.code === 'string'
        && typeof structured.message === 'string'
        && typeof structured.next_action === 'string'
    ) {
        return structured as FineArtsWorksheetError;
    }

    return null;
}

export function FineArtsLearnerWorksheetPanel({
    sessionId,
    contract,
    matrix,
    editable,
    isLoading,
    loadError,
    onRetry,
    onStateChange,
    onGoToSessionProof,
}: FineArtsLearnerWorksheetPanelProps) {
    const recordMutation = useRecordFineArtsLearnerEvidence(sessionId);
    const uploadMutation = useUploadFineArtsLearnerEvidenceAttachment(sessionId);
    const bannerRef = useRef<HTMLDivElement | null>(null);
    const initializedRef = useRef(false);

    const [search, setSearch] = useState('');
    const [selectedLearnerId, setSelectedLearnerId] = useState<number | null>(null);
    const [selectedEvidenceType, setSelectedEvidenceType] = useState<FineArtsEvidenceType | null>(null);
    const [status, setStatus] = useState<FineArtsLearnerEvidenceStatus>('NOT_STARTED');
    const [notes, setNotes] = useState('');
    const [selectedOutcomeIds, setSelectedOutcomeIds] = useState<number[]>([]);
    const [uploadCaption, setUploadCaption] = useState('');
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [persistedEvidenceId, setPersistedEvidenceId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<{ message: string; nextAction?: FineArtsWorksheetNextAction } | null>(null);

    const requiredEvidenceTypes = useMemo(
        () => matrix?.required_evidence_types ?? contract?.learner_evidence_summary?.missing_required_evidence_types ?? [],
        [contract?.learner_evidence_summary?.missing_required_evidence_types, matrix?.required_evidence_types],
    );
    const filteredLearners = useMemo(
        () => filterFineArtsLearners(matrix?.learners ?? [], search),
        [matrix?.learners, search],
    );
    const selectedLearner = useMemo(() => {
        const pool = filteredLearners.length > 0
            ? filteredLearners
            : (search.trim() ? [] : (matrix?.learners ?? []));
        return pool.find((learner) => learner.learner_id === selectedLearnerId)
            ?? (pool[0] ?? null);
    }, [filteredLearners, matrix?.learners, search, selectedLearnerId]);
    const selectedCell: FineArtsLearnerEvidenceCell | null = useMemo(() => {
        if (!selectedLearner || !selectedEvidenceType) {
            return null;
        }

        return selectedLearner.evidence[selectedEvidenceType] ?? null;
    }, [selectedEvidenceType, selectedLearner]);

    const requiresOutcomeLinks = useMemo(
        () => status !== 'NOT_STARTED' && status !== 'MISSING',
        [status],
    );

    const matrixError = matrix?.error ?? null;
    const queryError = getStructuredWorksheetError(loadError);
    const visibleError = useMemo(() => (
        actionError
        ?? (matrixError ? { message: matrixError.message, nextAction: matrixError.next_action } : null)
        ?? (queryError ? { message: queryError.message, nextAction: queryError.next_action } : null)
        ?? (loadError ? { message: extractErrorMessage(loadError, 'We could not load learner worksheet evidence.') } : null)
    ), [actionError, loadError, matrixError, queryError]);

    useEffect(() => {
        if (!matrix) {
            return;
        }

        let sourceState = null;
        if (typeof window !== 'undefined') {
            const raw = window.sessionStorage.getItem(getFineArtsWorksheetStorageKey(sessionId));
            if (raw) {
                try {
                    sourceState = JSON.parse(raw);
                } catch {
                    sourceState = null;
                }
            }
        }

        const nextState = sanitizeFineArtsWorksheetUiState({
            state: initializedRef.current
                ? {
                    activeSection: 'learner',
                    search,
                    learnerId: selectedLearnerId,
                    evidenceType: selectedEvidenceType,
                }
                : sourceState,
            learners: matrix.learners,
            evidenceTypes: matrix.evidence_types,
            fallbackActiveSection: 'learner',
        });

        setSearch(nextState.search);
        setSelectedLearnerId(nextState.learnerId);
        setSelectedEvidenceType(nextState.evidenceType);
        initializedRef.current = true;
    }, [matrix, search, selectedEvidenceType, selectedLearnerId, sessionId]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const key = getFineArtsWorksheetStorageKey(sessionId);
        let existing: Record<string, unknown> = {};
        const raw = window.sessionStorage.getItem(key);
        if (raw) {
            try {
                existing = JSON.parse(raw) as Record<string, unknown>;
            } catch {
                existing = {};
            }
        }

        window.sessionStorage.setItem(key, JSON.stringify({
            ...existing,
            activeSection: 'learner',
            search,
            learnerId: selectedLearner?.learner_id ?? selectedLearnerId,
            evidenceType: selectedEvidenceType,
        }));
    }, [search, selectedEvidenceType, selectedLearner, selectedLearnerId, sessionId]);

    useEffect(() => {
        setStatus(selectedCell?.status ?? 'NOT_STARTED');
        setNotes(selectedCell?.notes ?? '');
        setSelectedOutcomeIds(selectedCell?.outcome_ids ?? []);
        setUploadCaption('');
        setPendingFiles([]);
        setUploadProgress({});
        setPersistedEvidenceId(selectedCell?.id ?? null);
        setActionError(null);
    }, [selectedCell]);

    useEffect(() => {
        if (!visibleError) {
            return;
        }

        bannerRef.current?.focus();
        bannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [visibleError]);

    const handleSave = async (moveNext: boolean) => {
        if (!selectedLearner || !selectedEvidenceType) {
            return;
        }

        if (requiresOutcomeLinks && selectedOutcomeIds.length === 0) {
            setActionError({
                message: 'Select at least one confirmed taught outcome for learner worksheet evidence.',
            });
            return;
        }

        try {
            setActionError(null);
            const result = await recordMutation.mutateAsync({
                learner_id: selectedLearner.learner_id,
                evidence_type: selectedEvidenceType,
                recorded: status !== 'NOT_STARTED' && status !== 'MISSING',
                status,
                notes,
                outcome_ids: requiresOutcomeLinks ? selectedOutcomeIds : [],
            });
            setPersistedEvidenceId(result.id ?? null);
            await onStateChange?.();

            if (moveNext && matrix) {
                const nextTarget = getNextFineArtsWorksheetTarget({
                    learners: filteredLearners.length > 0 ? filteredLearners : matrix.learners,
                    currentLearnerId: selectedLearner.learner_id,
                    currentEvidenceType: selectedEvidenceType,
                    evidenceTypes: matrix.evidence_types,
                    preferredEvidenceTypes: requiredEvidenceTypes.length > 0 ? requiredEvidenceTypes : undefined,
                });
                if (nextTarget) {
                    setSelectedLearnerId(nextTarget.learnerId);
                    setSelectedEvidenceType(nextTarget.evidenceType);
                }
            }
        } catch (mutationError) {
            const apiError = mutationError as ApiError;
            const structured = getStructuredWorksheetError(apiError);
            setActionError({
                message: extractErrorMessage(apiError, 'We could not save learner evidence.'),
                nextAction: structured?.next_action,
            });
        }
    };

    const handleUpload = async () => {
        if (!persistedEvidenceId || pendingFiles.length === 0) {
            return;
        }

        try {
            setActionError(null);
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
            const apiError = mutationError as ApiError;
            const structured = getStructuredWorksheetError(apiError);
            setActionError({
                message: extractErrorMessage(apiError, 'We could not upload the selected files.'),
                nextAction: structured?.next_action,
            });
        }
    };

    const handleErrorAction = async (nextAction: FineArtsWorksheetNextAction | undefined) => {
        if (nextAction === 'mark_attendance') {
            return;
        }
        if (nextAction === 'resolve_practical') {
            onGoToSessionProof();
            return;
        }
        await onRetry();
    };

    if (isLoading && !matrix) {
        return <LoadingSpinner message="Loading learner worksheet evidence..." fullScreen={false} />;
    }

    return (
        <div className="space-y-4">
            <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold theme-text">Learner worksheet</p>
                        <p className="text-sm theme-muted">
                            Keep the teacher focused on one learner and one evidence type at a time. Saved worksheet state stays on the server.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="default">
                            {contract?.learner_evidence_summary?.present_learners_with_evidence ?? 0}
                            /
                            {contract?.learner_evidence_summary?.present_learners_total ?? 0}
                            {' '}present learners recorded
                        </Badge>
                        <Badge variant="default">
                            {matrix?.required_evidence_types?.length ?? 0}
                            {' '}required categories
                        </Badge>
                    </div>
                </div>

                {visibleError ? (
                    <div className="mt-4 space-y-3">
                        <ErrorBanner
                            ref={bannerRef}
                            message={visibleError.message}
                            compact
                            onDismiss={() => setActionError(null)}
                        />
                        <div className="flex flex-col gap-3 sm:flex-row">
                            {visibleError.nextAction === 'mark_attendance' ? (
                                <Link href={`/sessions/${sessionId}?section=attendance`}>
                                    <Button variant="secondary">Go to attendance</Button>
                                </Link>
                            ) : null}
                            {visibleError.nextAction === 'resolve_practical' ? (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        void handleErrorAction('resolve_practical');
                                    }}
                                >
                                    Resolve practical task
                                </Button>
                            ) : null}
                            {!visibleError.nextAction || visibleError.nextAction === 'retry' ? (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                        void handleErrorAction('retry');
                                    }}
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                    Retry loading worksheet
                                </Button>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </div>

            {matrix && !matrix.error ? (
                <div className="space-y-4 rounded-xl border p-4 theme-border theme-surface">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,260px),1fr,220px]">
                        <label className="block">
                            <span className="mb-2 flex items-center gap-2 text-sm font-medium theme-text">
                                <Search className="h-4 w-4 theme-muted" />
                                Search learners
                            </span>
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="theme-input theme-focus-ring w-full rounded-lg px-4 py-3 text-sm"
                                placeholder="Search by learner name or admission number"
                            />
                        </label>
                        <Select
                            label="Learner"
                            value={filteredLearners.length === 0 ? '' : (selectedLearner?.learner_id ?? '')}
                            onChange={(event) => setSelectedLearnerId(Number(event.target.value))}
                            options={[
                                { value: '', label: filteredLearners.length === 0 ? 'No learners match this search' : 'Select learner', disabled: true },
                                ...filteredLearners.map((learner) => ({
                                    value: learner.learner_id,
                                    label: `${learner.name} · ${learner.admission_number}`,
                                })),
                            ]}
                        />
                        <Select
                            label="Evidence type"
                            value={selectedEvidenceType ?? ''}
                            onChange={(event) => setSelectedEvidenceType(event.target.value as FineArtsEvidenceType)}
                            options={matrix.evidence_types.map((evidenceType) => ({
                                value: evidenceType,
                                label: formatFineArtsEvidenceLabel(evidenceType),
                            }))}
                        />
                    </div>

                    {filteredLearners.length === 0 ? (
                        <div className="rounded-lg border border-dashed px-4 py-3 text-sm theme-border theme-muted">
                            No present learners match the current search.
                        </div>
                    ) : null}

                    {selectedLearner ? (
                        <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
                            <div className="space-y-4">
                                <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                                    <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Selected learner</p>
                                    <p className="mt-1 text-sm font-semibold theme-text">{selectedLearner.name}</p>
                                    <p className="text-sm theme-muted">{selectedLearner.admission_number}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Badge variant="default">{selectedLearner.progress.label} required categories</Badge>
                                        <Badge variant="default">{selectedLearner.attendance_status ?? 'Attendance pending'}</Badge>
                                    </div>
                                </div>

                                <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                                    <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">Required gaps</p>
                                    {contract?.learner_evidence_summary?.missing_required_evidence_types?.length ? (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {contract.learner_evidence_summary.missing_required_evidence_types.map((evidenceType) => (
                                                <Badge key={evidenceType} variant="default">{formatFineArtsEvidenceLabel(evidenceType)}</Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-sm theme-muted">Required evidence categories are covered.</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
                                    <Select
                                        label="Status"
                                        value={status}
                                        onChange={(event) => setStatus(event.target.value as FineArtsLearnerEvidenceStatus)}
                                        disabled={!editable || recordMutation.isPending}
                                        options={STATUS_OPTIONS}
                                    />
                                    <label className="block">
                                        <span className="mb-2 block text-sm font-medium theme-text">Notes</span>
                                        <textarea
                                            value={notes}
                                            onChange={(event) => setNotes(event.target.value)}
                                            rows={4}
                                            disabled={!editable || recordMutation.isPending}
                                            className="theme-input theme-focus-ring min-h-[112px] w-full rounded-lg px-4 py-3 text-sm"
                                            placeholder="Record learner worksheet notes, feedback, or observations..."
                                        />
                                    </label>
                                </div>

                                <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold theme-text">Linked taught outcomes</p>
                                            <p className="text-sm theme-muted">
                                                Link the selected learner evidence back to the confirmed outcomes taught in this session.
                                            </p>
                                        </div>
                                        <Badge variant="default">{selectedOutcomeIds.length} selected</Badge>
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        {(matrix.taught_outcomes ?? []).length === 0 ? (
                                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm theme-border theme-muted">
                                                No confirmed taught outcomes are available for this session yet.
                                            </div>
                                        ) : (
                                            matrix.taught_outcomes.map((outcome) => {
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
                                                                setSelectedOutcomeIds((current) => current.filter((value) => value !== outcome.outcome_id));
                                                            }}
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="text-sm font-medium theme-text">{outcome.code}</p>
                                                                <Badge variant="default">{outcome.status}</Badge>
                                                            </div>
                                                            <p className="mt-1 text-sm theme-muted">{outcome.text}</p>
                                                            <p className="mt-1 text-xs theme-subtle">{outcome.strand} · {outcome.sub_strand}</p>
                                                        </div>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold theme-text">Attachments</p>
                                            <p className="text-sm theme-muted">
                                                Upload portfolio pages, sketches, artwork photos, PDFs, or allowed videos without changing learner selection.
                                            </p>
                                        </div>
                                        <Badge variant="default">{selectedCell?.attachment_count ?? 0} uploaded</Badge>
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
                                                <div className="space-y-2 rounded-lg border p-3 theme-border theme-surface">
                                                    {pendingFiles.map((file) => (
                                                        <div key={file.name} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="break-words font-medium theme-text">{file.name}</p>
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
                                                disabled={!editable || uploadMutation.isPending || pendingFiles.length === 0 || !persistedEvidenceId}
                                            >
                                                <Upload className="h-4 w-4" />
                                                {uploadMutation.isPending ? 'Uploading...' : 'Upload selected'}
                                            </Button>
                                            {!persistedEvidenceId ? (
                                                <p className="text-xs theme-muted">Save this learner evidence entry first, then upload files.</p>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-3">
                                        {(selectedCell?.attachments ?? []).length === 0 ? (
                                            <div className="rounded-lg border border-dashed px-4 py-3 text-sm theme-border theme-muted">
                                                No attachments uploaded yet.
                                            </div>
                                        ) : (
                                            selectedCell?.attachments.map((attachment) => (
                                                <div
                                                    key={attachment.id}
                                                    className="flex flex-col gap-3 rounded-lg border p-3 theme-border theme-surface sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
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
                                                            <p className="break-words text-sm font-medium theme-text">{attachment.original_name}</p>
                                                            <p className="text-xs theme-muted">{formatBytes(attachment.optimized_size)} · {attachment.processing_status}</p>
                                                            {attachment.caption ? (
                                                                <p className="mt-1 break-words text-xs theme-subtle">{attachment.caption}</p>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
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
                            </div>
                        </div>
                    ) : null}

                    <div className="sticky bottom-0 z-10 -mx-4 border-t p-4 theme-border theme-surface sm:static sm:mx-0 sm:border-0 sm:p-0">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    void handleSave(true);
                                }}
                                disabled={!editable || recordMutation.isPending || !selectedLearner || !selectedEvidenceType}
                            >
                                {recordMutation.isPending ? 'Saving...' : 'Save and next'}
                            </Button>
                            <Button
                                type="button"
                                onClick={() => {
                                    void handleSave(false);
                                }}
                                disabled={!editable || recordMutation.isPending || !selectedLearner || !selectedEvidenceType}
                            >
                                {recordMutation.isPending ? 'Saving...' : 'Save learner evidence'}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

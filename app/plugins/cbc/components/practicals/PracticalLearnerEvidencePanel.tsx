'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Paperclip, Search, Upload } from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/app/components/ui/Table';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';
import type {
    MusicEvidenceType,
    MusicPracticalContract,
    MusicPracticalEvidenceStatus,
    MusicPracticalLearnerEvidenceMatrix,
    MusicWorksheetError,
} from '@/app/core/types/session';
import {
    useRecordMusicPracticalLearnerEvidence,
    useUploadMusicPracticalLearnerEvidenceAttachment,
} from '@/app/plugins/cbc/hooks/useMusicPracticals';
import {
    filterMusicLearners,
    formatMusicEvidenceLabel,
    getMusicEvidenceCategoryLabel,
} from '@/app/plugins/cbc/lib/musicPracticals';

const STATUS_OPTIONS: Array<{ value: MusicPracticalEvidenceStatus; label: string }> = [
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'REVIEWED', label: 'Reviewed' },
    { value: 'NEEDS_IMPROVEMENT', label: 'Needs improvement' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'MISSING', label: 'Missing' },
];

function getStructuredWorksheetError(error: ApiError | null): MusicWorksheetError | null {
    const data = error?.response?.data;
    if (!data || typeof data !== 'object' || !('error' in data)) {
        return null;
    }

    const structured = data.error;
    if (
        structured
        && typeof structured === 'object'
        && !Array.isArray(structured)
        && typeof structured.code === 'string'
        && typeof structured.message === 'string'
        && typeof structured.next_action === 'string'
    ) {
        return structured as MusicWorksheetError;
    }

    return null;
}

function statusBadgeVariant(status: MusicPracticalEvidenceStatus) {
    switch (status) {
        case 'ACCEPTED':
            return 'green' as const;
        case 'REVIEWED':
            return 'blue' as const;
        case 'SUBMITTED':
            return 'yellow' as const;
        case 'NEEDS_IMPROVEMENT':
            return 'orange' as const;
        case 'MISSING':
            return 'red' as const;
        default:
            return 'default' as const;
    }
}

function formatUpdatedAt(value: string | null) {
    if (!value) {
        return 'No update yet';
    }

    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export function PracticalLearnerEvidencePanel({
    sessionId,
    contract,
    matrix,
    editable,
    actorCanRecord,
    readOnlyMessage,
    isLoading,
    loadError,
    onRetry,
    onStateChange,
}: {
    sessionId: number;
    contract: MusicPracticalContract | null;
    matrix: MusicPracticalLearnerEvidenceMatrix | null;
    editable: boolean;
    actorCanRecord: boolean;
    readOnlyMessage: string | null;
    isLoading: boolean;
    loadError: ApiError | null;
    onRetry: () => Promise<void> | void;
    onStateChange?: () => Promise<void> | void;
}) {
    const recordMutation = useRecordMusicPracticalLearnerEvidence(sessionId);
    const uploadMutation = useUploadMusicPracticalLearnerEvidenceAttachment(sessionId);

    const [search, setSearch] = useState('');
    const [selectedLearnerId, setSelectedLearnerId] = useState<number | null>(null);
    const [selectedEvidenceType, setSelectedEvidenceType] = useState<MusicEvidenceType | ''>('');
    const [status, setStatus] = useState<MusicPracticalEvidenceStatus>('SUBMITTED');
    const [notes, setNotes] = useState('');
    const [selectedOutcomeIds, setSelectedOutcomeIds] = useState<number[]>([]);
    const [attachmentCaption, setAttachmentCaption] = useState('');
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [actionError, setActionError] = useState<string | null>(null);

    const structuredError = getStructuredWorksheetError(loadError);
    const visibleError = actionError
        ?? structuredError?.message
        ?? (loadError ? extractErrorMessage(loadError, 'We could not load learner evidence.') : null)
        ?? null;
    const learners = useMemo(
        () => filterMusicLearners(matrix?.learners ?? [], search),
        [matrix?.learners, search],
    );
    const selectedLearner = useMemo(
        () => learners.find((learner) => learner.learner_id === selectedLearnerId)
            ?? matrix?.learners.find((learner) => learner.learner_id === selectedLearnerId)
            ?? learners[0]
            ?? matrix?.learners[0]
            ?? null,
        [learners, matrix?.learners, selectedLearnerId],
    );
    const selectedEntries = useMemo(
        () => [...(selectedLearner?.evidence_entries ?? [])].sort((left, right) => (
            String(right.updated_at ?? '').localeCompare(String(left.updated_at ?? ''))
        )),
        [selectedLearner?.evidence_entries],
    );
    const evidenceTypeOptions = useMemo(
        () => (contract?.allowed_evidence_types ?? matrix?.evidence_types ?? []).map((value) => ({
            value,
            label: formatMusicEvidenceLabel(value),
        })),
        [contract?.allowed_evidence_types, matrix?.evidence_types],
    );
    const taughtOutcomeOptions = useMemo(
        () => matrix?.taught_outcomes ?? [],
        [matrix?.taught_outcomes],
    );
    const canRecord = editable && actorCanRecord;

    useEffect(() => {
        if (selectedLearner && selectedLearnerId !== selectedLearner.learner_id) {
            setSelectedLearnerId(selectedLearner.learner_id);
        }
    }, [selectedLearner, selectedLearnerId]);

    useEffect(() => {
        if (!selectedEvidenceType && evidenceTypeOptions[0]?.value) {
            setSelectedEvidenceType(evidenceTypeOptions[0].value);
        }
    }, [evidenceTypeOptions, selectedEvidenceType]);

    useEffect(() => {
        if (taughtOutcomeOptions.length === 0) {
            setSelectedOutcomeIds([]);
            return;
        }

        setSelectedOutcomeIds((current) => (
            current.length > 0
                ? current.filter((outcomeId) => taughtOutcomeOptions.some((outcome) => outcome.outcome_id === outcomeId))
                : taughtOutcomeOptions.map((outcome) => outcome.outcome_id)
        ));
    }, [taughtOutcomeOptions]);

    const handleSave = async () => {
        if (!selectedLearner || !selectedEvidenceType) {
            setActionError('Select a learner and evidence type first.');
            return;
        }

        setActionError(null);
        try {
            const recorded = await recordMutation.mutateAsync({
                learner_id: selectedLearner.learner_id,
                evidence_type: selectedEvidenceType,
                status,
                notes,
                outcome_ids: selectedOutcomeIds,
                recorded: status !== 'MISSING',
            });

            for (const file of pendingFiles) {
                await uploadMutation.mutateAsync({
                    evidenceId: recorded.id,
                    file,
                    caption: attachmentCaption,
                });
            }

            setPendingFiles([]);
            setAttachmentCaption('');
            setNotes('');
            if (onStateChange) {
                await onStateChange();
            }
        } catch (error) {
            setActionError(extractErrorMessage(error as ApiError, 'We could not save Music practical evidence.'));
        }
    };

    if (isLoading && !matrix) {
        return <LoadingSpinner fullScreen={false} message="Loading learner evidence..." />;
    }

    return (
        <div className="space-y-4">
            {visibleError ? (
                <ErrorBanner
                    message={visibleError}
                    onDismiss={() => setActionError(null)}
                />
            ) : null}

            {!canRecord && readOnlyMessage ? (
                <Card>
                    <div className="space-y-2 p-5">
                        <h3 className="text-sm font-semibold theme-text">Read-only practical review</h3>
                        <p className="text-sm theme-muted">{readOnlyMessage}</p>
                    </div>
                </Card>
            ) : null}

            <Card>
                <div className="space-y-4 p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h3 className="text-lg font-semibold theme-text">Learner evidence matrix</h3>
                            <p className="text-sm theme-muted">
                                Learner | Performance | Technique | Rhythm/Pitch | Expression | Notation | Reflection
                            </p>
                        </div>
                        <div className="relative w-full lg:max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 theme-subtle" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search learner or admission number..."
                                className="theme-input theme-focus-ring w-full rounded-xl py-2.5 pl-9 pr-4 text-sm"
                            />
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Learner</TableHead>
                                {(matrix?.matrix_columns ?? contract?.matrix_columns ?? []).map((column) => (
                                    <TableHead key={column.key}>{column.label}</TableHead>
                                ))}
                                <TableHead>Entries</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {learners.length === 0 ? (
                                <TableRow>
                                    <td colSpan={8} className="px-6 py-8 text-center text-sm theme-muted">
                                        No learners available for this Music practical yet.
                                    </td>
                                </TableRow>
                            ) : (
                                learners.map((learner) => {
                                    const active = learner.learner_id === selectedLearner?.learner_id;

                                    return (
                                        <TableRow
                                            key={learner.learner_id}
                                            className={active ? 'bg-blue-50/70' : undefined}
                                            onClick={() => setSelectedLearnerId(learner.learner_id)}
                                        >
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="font-medium theme-text">{learner.name}</div>
                                                    <div className="text-xs theme-subtle">
                                                        {learner.admission_number} · {learner.attendance_status ?? 'No attendance'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            {(matrix?.matrix_columns ?? contract?.matrix_columns ?? []).map((column) => (
                                                <TableCell key={column.key}>
                                                    <Badge variant={learner.coverage[column.key] ? 'green' : 'default'}>
                                                        {learner.coverage[column.key] ? 'Covered' : 'Pending'}
                                                    </Badge>
                                                </TableCell>
                                            ))}
                                            <TableCell>
                                                <Badge variant={learner.has_linked_evidence ? 'blue' : 'default'}>
                                                    {learner.total_recorded_entries}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {selectedLearner ? (
                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <Card>
                        <div className="space-y-4 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-semibold theme-text">{selectedLearner.name}</h3>
                                    <p className="text-sm theme-muted">
                                        {selectedLearner.admission_number} · {selectedLearner.attendance_status ?? 'Attendance pending'}
                                    </p>
                                </div>
                                <Badge variant={selectedLearner.has_linked_evidence ? 'green' : 'default'}>
                                    {selectedLearner.has_linked_evidence ? 'Evidence recorded' : 'Needs evidence'}
                                </Badge>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {(matrix?.matrix_columns ?? contract?.matrix_columns ?? []).map((column) => (
                                    <div key={column.key} className="rounded-xl border p-3 theme-border theme-surface-muted">
                                        <p className="text-xs font-semibold uppercase tracking-wide theme-subtle">
                                            {column.label}
                                        </p>
                                        <p className="mt-2 text-sm font-medium theme-text">
                                            {selectedLearner.coverage[column.key] ? 'Covered' : 'Pending'}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <h4 className="text-sm font-semibold theme-text">Recorded entries</h4>
                                    <Button variant="secondary" size="sm" onClick={() => void onRetry()}>
                                        Refresh
                                    </Button>
                                </div>
                                {selectedEntries.length === 0 ? (
                                    <div className="rounded-xl border p-4 text-sm theme-border theme-muted">
                                        No learner evidence has been recorded yet for this learner.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {selectedEntries.map((entry) => (
                                            <div key={entry.id} className="rounded-xl border p-4 theme-border theme-surface-muted">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Badge variant="blue">{formatMusicEvidenceLabel(entry.evidence_type)}</Badge>
                                                    <Badge variant={statusBadgeVariant(entry.status)}>{formatMusicEvidenceLabel(entry.status)}</Badge>
                                                    <Badge variant="default">{getMusicEvidenceCategoryLabel(entry.category)}</Badge>
                                                </div>
                                                {entry.notes ? (
                                                    <p className="mt-3 text-sm theme-text">{entry.notes}</p>
                                                ) : null}
                                                <div className="mt-3 flex flex-wrap gap-2 text-xs theme-muted">
                                                    <span>{entry.outcomes.length} linked outcome{entry.outcomes.length === 1 ? '' : 's'}</span>
                                                    <span>{entry.attachment_count} attachment{entry.attachment_count === 1 ? '' : 's'}</span>
                                                    <span>Updated {formatUpdatedAt(entry.updated_at)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="space-y-4 p-5">
                            <div>
                                <h3 className="text-lg font-semibold theme-text">Record Music evidence</h3>
                                <p className="text-sm theme-muted">
                                    Capture performance, technique, notation, or reflection evidence for the selected learner.
                                </p>
                            </div>

                            <Select
                                label="Evidence type"
                                value={selectedEvidenceType}
                                onChange={(event) => setSelectedEvidenceType(event.target.value as MusicEvidenceType)}
                                options={evidenceTypeOptions}
                                disabled={!canRecord}
                            />

                            <Select
                                label="Status"
                                value={status}
                                onChange={(event) => setStatus(event.target.value as MusicPracticalEvidenceStatus)}
                                options={STATUS_OPTIONS}
                                disabled={!canRecord}
                            />

                            <label className="block space-y-2">
                                <span className="text-sm font-medium theme-text">Observation notes</span>
                                <textarea
                                    value={notes}
                                    onChange={(event) => setNotes(event.target.value)}
                                    rows={4}
                                    placeholder="What was observed in rehearsal, technique, performance, notation, or reflection?"
                                    className="theme-input theme-focus-ring w-full rounded-xl px-3 py-2 text-sm"
                                    disabled={!canRecord}
                                />
                            </label>

                            <div className="space-y-2">
                                <div className="text-sm font-medium theme-text">Link to confirmed taught outcomes</div>
                                <div className="space-y-2 rounded-xl border p-3 theme-border theme-surface-muted">
                                    {taughtOutcomeOptions.length === 0 ? (
                                        <p className="text-sm theme-muted">Confirm taught outcomes in the session before recording learner evidence.</p>
                                    ) : (
                                        taughtOutcomeOptions.map((outcome) => {
                                            const checked = selectedOutcomeIds.includes(outcome.outcome_id);

                                            return (
                                                <label key={outcome.outcome_id} className="flex items-start gap-3 text-sm">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(event) => {
                                                            setSelectedOutcomeIds((current) => (
                                                                event.target.checked
                                                                    ? [...current, outcome.outcome_id]
                                                                    : current.filter((outcomeId) => outcomeId !== outcome.outcome_id)
                                                            ));
                                                        }}
                                                        disabled={!canRecord}
                                                        className="mt-0.5"
                                                    />
                                                    <span>
                                                        <span className="font-medium theme-text">{outcome.code}</span>
                                                        <span className="block theme-muted">{outcome.text}</span>
                                                    </span>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3 rounded-xl border p-4 theme-border theme-surface-muted">
                                <div className="flex items-center gap-2">
                                    <Paperclip className="h-4 w-4 theme-muted" />
                                    <h4 className="text-sm font-semibold theme-text">Attachments</h4>
                                </div>
                                <p className="text-sm theme-muted">
                                    Accepted: {(contract?.attachment_support.accepted_labels ?? []).join(', ')}
                                </p>
                                <Input
                                    label="Attachment caption"
                                    value={attachmentCaption}
                                    onChange={(event) => setAttachmentCaption(event.target.value)}
                                    placeholder="Choir recording, rhythm worksheet, annotated score"
                                    disabled={!canRecord}
                                />
                                <input
                                    type="file"
                                    multiple
                                    accept={(contract?.attachment_support.accepted_extensions ?? []).join(',')}
                                    onChange={(event) => setPendingFiles(Array.from(event.target.files ?? []))}
                                    disabled={!canRecord}
                                    className="block w-full text-sm"
                                />
                                {pendingFiles.length > 0 ? (
                                    <div className="space-y-1 text-xs theme-muted">
                                        {pendingFiles.map((file) => (
                                            <div key={`${file.name}:${file.size}`}>{file.name}</div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                                <Button variant="secondary" onClick={() => void onRetry()}>
                                    Refresh matrix
                                </Button>
                                <Button
                                    onClick={() => {
                                        void handleSave();
                                    }}
                                    disabled={!canRecord || recordMutation.isPending || uploadMutation.isPending}
                                >
                                    {recordMutation.isPending || uploadMutation.isPending ? (
                                        <>
                                            <Upload className="h-4 w-4" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-4 w-4" />
                                            Record learner evidence
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            ) : null}
        </div>
    );
}

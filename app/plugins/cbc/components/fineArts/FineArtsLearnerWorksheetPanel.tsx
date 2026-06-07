'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    FileText,
    Image as ImageIcon,
    Paperclip,
    RefreshCcw,
    Search,
    Upload,
} from 'lucide-react';

import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { extractErrorMessage, type ApiError } from '@/app/core/types/errors';
import type {
    FineArtsEvidenceType,
    FineArtsLearnerEvidenceCell,
    FineArtsLearnerEvidenceLearner,
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

type LearnerFilter = 'ALL_PRESENT' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'MISSING_REQUIRED';

const STATUS_OPTIONS: Array<{ value: FineArtsLearnerEvidenceStatus; label: string }> = [
    { value: 'NOT_STARTED', label: 'Not started' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'REVIEWED', label: 'Reviewed' },
    { value: 'NEEDS_IMPROVEMENT', label: 'Needs improvement' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'MISSING', label: 'Missing' },
];

const LEARNER_FILTERS: Array<{ value: LearnerFilter; label: string }> = [
    { value: 'ALL_PRESENT', label: 'All present' },
    { value: 'NOT_STARTED', label: 'Not started' },
    { value: 'IN_PROGRESS', label: 'In progress' },
    { value: 'COMPLETE', label: 'Complete' },
    { value: 'MISSING_REQUIRED', label: 'Missing required' },
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

function getLearnerMissingCount(
    learner: FineArtsLearnerEvidenceLearner,
    displayEvidenceTypes: FineArtsEvidenceType[],
) {
    return displayEvidenceTypes.filter((evidenceType) => !learner.evidence[evidenceType]?.recorded).length;
}

function getLearnerQueueState(
    learner: FineArtsLearnerEvidenceLearner,
    displayEvidenceTypes: FineArtsEvidenceType[],
) {
    const missingCount = getLearnerMissingCount(learner, displayEvidenceTypes);
    if (missingCount === displayEvidenceTypes.length) {
        return { label: 'Not started', variant: 'default' as const };
    }
    if (missingCount === 0) {
        return { label: 'Complete', variant: 'green' as const };
    }
    return { label: 'In progress', variant: 'yellow' as const };
}

function getEvidenceStatusVariant(status: FineArtsLearnerEvidenceStatus) {
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

function sortEvidenceTypesForLearner(
    learner: FineArtsLearnerEvidenceLearner | null,
    displayEvidenceTypes: FineArtsEvidenceType[],
) {
    return [...displayEvidenceTypes].sort((left, right) => {
        const leftRecorded = learner?.evidence[left]?.recorded ?? false;
        const rightRecorded = learner?.evidence[right]?.recorded ?? false;
        if (leftRecorded === rightRecorded) {
            return displayEvidenceTypes.indexOf(left) - displayEvidenceTypes.indexOf(right);
        }
        return leftRecorded ? 1 : -1;
    });
}

function cloneLearnersForNextAction(params: {
    learners: FineArtsLearnerEvidenceLearner[];
    learnerId: number;
    evidenceType: FineArtsEvidenceType;
    recorded: boolean;
}) {
    return params.learners.map((learner) => {
        if (learner.learner_id !== params.learnerId) {
            return learner;
        }

        return {
            ...learner,
            evidence: {
                ...learner.evidence,
                [params.evidenceType]: {
                    ...learner.evidence[params.evidenceType],
                    recorded: params.recorded,
                },
            },
        };
    });
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
    const [learnerFilter, setLearnerFilter] = useState<LearnerFilter>('ALL_PRESENT');
    const [selectedLearnerId, setSelectedLearnerId] = useState<number | null>(null);
    const [activeEvidenceType, setActiveEvidenceType] = useState<FineArtsEvidenceType | null>(null);
    const [status, setStatus] = useState<FineArtsLearnerEvidenceStatus>('NOT_STARTED');
    const [notes, setNotes] = useState('');
    const [selectedOutcomeIds, setSelectedOutcomeIds] = useState<number[]>([]);
    const [useCustomOutcomeLinks, setUseCustomOutcomeLinks] = useState(false);
    const [uploadCaption, setUploadCaption] = useState('');
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [actionError, setActionError] = useState<{ message: string; nextAction?: FineArtsWorksheetNextAction } | null>(null);

    const requiredEvidenceTypes = useMemo(
        () => matrix?.required_evidence_types?.length
            ? matrix.required_evidence_types
            : (contract?.learner_evidence_summary?.missing_required_evidence_types ?? []),
        [contract, matrix],
    );
    const displayEvidenceTypes = useMemo(
        () => (requiredEvidenceTypes.length > 0 ? requiredEvidenceTypes : (matrix?.evidence_types ?? [])),
        [matrix?.evidence_types, requiredEvidenceTypes],
    );
    const searchedLearners = useMemo(
        () => filterFineArtsLearners(matrix?.learners ?? [], search),
        [matrix?.learners, search],
    );
    const filteredLearners = useMemo(() => {
        return searchedLearners.filter((learner) => {
            const queueState = getLearnerQueueState(learner, displayEvidenceTypes);
            const missingCount = getLearnerMissingCount(learner, displayEvidenceTypes);

            switch (learnerFilter) {
                case 'NOT_STARTED':
                    return queueState.label === 'Not started';
                case 'IN_PROGRESS':
                    return queueState.label === 'In progress';
                case 'COMPLETE':
                    return queueState.label === 'Complete';
                case 'MISSING_REQUIRED':
                    return missingCount > 0;
                default:
                    return true;
            }
        });
    }, [displayEvidenceTypes, learnerFilter, searchedLearners]);
    const selectedLearner = useMemo(() => {
        const pool = filteredLearners.length > 0
            ? filteredLearners
            : (search.trim() || learnerFilter !== 'ALL_PRESENT' ? [] : (matrix?.learners ?? []));
        return pool.find((learner) => learner.learner_id === selectedLearnerId)
            ?? (pool[0] ?? null);
    }, [filteredLearners, learnerFilter, matrix?.learners, search, selectedLearnerId]);
    const orderedEvidenceTypes = useMemo(
        () => sortEvidenceTypesForLearner(selectedLearner, displayEvidenceTypes),
        [displayEvidenceTypes, selectedLearner],
    );
    const activeCell: FineArtsLearnerEvidenceCell | null = useMemo(() => {
        if (!selectedLearner || !activeEvidenceType) {
            return null;
        }

        return selectedLearner.evidence[activeEvidenceType] ?? null;
    }, [activeEvidenceType, selectedLearner]);
    const requiresOutcomeLinks = status !== 'NOT_STARTED' && status !== 'MISSING';
    const learnerIndex = useMemo(
        () => filteredLearners.findIndex((learner) => learner.learner_id === selectedLearner?.learner_id),
        [filteredLearners, selectedLearner?.learner_id],
    );
    const previousLearner = learnerIndex > 0 ? filteredLearners[learnerIndex - 1] : null;
    const nextLearner = learnerIndex >= 0 && learnerIndex < filteredLearners.length - 1
        ? filteredLearners[learnerIndex + 1]
        : null;

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
                    evidenceType: activeEvidenceType,
                }
                : sourceState,
            learners: matrix.learners,
            evidenceTypes: displayEvidenceTypes,
            fallbackActiveSection: 'learner',
        });

        setSearch(nextState.search);
        setSelectedLearnerId(nextState.learnerId);
        setActiveEvidenceType(nextState.evidenceType);

        const storedLearnerFilter = sourceState && typeof sourceState === 'object' && 'learnerFilter' in sourceState
            ? sourceState.learnerFilter
            : null;
        if (!initializedRef.current && storedLearnerFilter && LEARNER_FILTERS.some((item) => item.value === storedLearnerFilter)) {
            setLearnerFilter(storedLearnerFilter as LearnerFilter);
        }

        initializedRef.current = true;
    }, [activeEvidenceType, displayEvidenceTypes, matrix, search, selectedLearnerId, sessionId]);

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
            learnerFilter,
            learnerId: selectedLearner?.learner_id ?? selectedLearnerId,
            evidenceType: activeEvidenceType,
        }));
    }, [activeEvidenceType, learnerFilter, search, selectedLearner, selectedLearnerId, sessionId]);

    useEffect(() => {
        if (!selectedLearner) {
            return;
        }

        if (!activeEvidenceType || !selectedLearner.evidence[activeEvidenceType]) {
            setActiveEvidenceType(orderedEvidenceTypes[0] ?? null);
        }
    }, [activeEvidenceType, orderedEvidenceTypes, selectedLearner]);

    useEffect(() => {
        setStatus(activeCell?.status ?? 'NOT_STARTED');
        setNotes(activeCell?.notes ?? '');
        setSelectedOutcomeIds(activeCell?.outcome_ids ?? []);
        setUseCustomOutcomeLinks(Boolean(activeCell?.id && (activeCell?.outcome_ids?.length ?? 0) > 0));
        setUploadCaption('');
        setPendingFiles([]);
        setUploadProgress({});
        setActionError(null);
    }, [activeCell]);

    useEffect(() => {
        if (!visibleError) {
            return;
        }

        bannerRef.current?.focus();
        bannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [visibleError]);

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

    const uploadFilesForEvidence = async (evidenceId: number) => {
        if (pendingFiles.length === 0) {
            return;
        }

        for (const file of pendingFiles) {
            await uploadMutation.mutateAsync({
                evidenceId,
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
    };

    const saveCurrentEvidence = async () => {
        if (!selectedLearner || !activeEvidenceType) {
            return null;
        }

        if (requiresOutcomeLinks && useCustomOutcomeLinks && selectedOutcomeIds.length === 0) {
            setActionError({
                message: 'Select at least one confirmed taught outcome, or leave advanced outcome linking collapsed so the system can link taught outcomes automatically.',
            });
            return null;
        }

        try {
            setActionError(null);
            const result = await recordMutation.mutateAsync({
                learner_id: selectedLearner.learner_id,
                evidence_type: activeEvidenceType,
                recorded: status !== 'NOT_STARTED' && status !== 'MISSING',
                status,
                notes,
                ...(requiresOutcomeLinks && useCustomOutcomeLinks
                    ? { outcome_ids: selectedOutcomeIds }
                    : {}),
            });
            const savedEvidenceId = result.id ?? null;
            if (savedEvidenceId && pendingFiles.length > 0) {
                await uploadFilesForEvidence(savedEvidenceId);
            }
            await onStateChange?.();
            return {
                savedEvidenceId,
                recorded: status !== 'NOT_STARTED' && status !== 'MISSING',
            };
        } catch (mutationError) {
            const apiError = mutationError as ApiError;
            const structured = getStructuredWorksheetError(apiError);
            setActionError({
                message: extractErrorMessage(apiError, 'We could not save learner evidence.'),
                nextAction: structured?.next_action,
            });
            return null;
        }
    };

    const handleSave = async () => {
        await saveCurrentEvidence();
    };

    const handleSaveAndNextMissing = async () => {
        if (!selectedLearner || !activeEvidenceType || !matrix) {
            return;
        }

        const result = await saveCurrentEvidence();
        if (!result) {
            return;
        }

        const navigationLearners = cloneLearnersForNextAction({
            learners: filteredLearners.length > 0 ? filteredLearners : matrix.learners,
            learnerId: selectedLearner.learner_id,
            evidenceType: activeEvidenceType,
            recorded: result.recorded,
        });

        const nextTarget = getNextFineArtsWorksheetTarget({
            learners: navigationLearners,
            currentLearnerId: selectedLearner.learner_id,
            currentEvidenceType: activeEvidenceType,
            evidenceTypes: displayEvidenceTypes,
            preferredEvidenceTypes: displayEvidenceTypes,
        });

        if (nextTarget) {
            setSelectedLearnerId(nextTarget.learnerId);
            setActiveEvidenceType(nextTarget.evidenceType);
        }
    };

    if (isLoading && !matrix) {
        return <LoadingSpinner message="Loading learner worksheet evidence..." fullScreen={false} />;
    }

    return (
        <div className="space-y-4">
            <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold theme-text">Learner worksheet workflow</p>
                        <p className="text-sm theme-muted">
                            Work learner-by-learner. The system keeps outcome links automatic unless you explicitly override them.
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
                            {displayEvidenceTypes.length} categories in view
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
                <div className="grid gap-4 xl:grid-cols-[320px,minmax(0,1fr)]">
                    <div className="space-y-4 rounded-xl border p-4 theme-border theme-surface">
                        <div className="space-y-3">
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

                            <div className="space-y-2">
                                <p className="text-sm font-medium theme-text">Queue filter</p>
                                <div className="flex flex-wrap gap-2">
                                    {LEARNER_FILTERS.map((filter) => (
                                        <button
                                            key={filter.value}
                                            type="button"
                                            onClick={() => setLearnerFilter(filter.value)}
                                            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                                                learnerFilter === filter.value
                                                    ? 'border-blue-200 bg-blue-100 text-blue-800'
                                                    : 'theme-border theme-surface-muted theme-text hover:bg-gray-50'
                                            }`}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {filteredLearners.length === 0 ? (
                                <div className="rounded-lg border border-dashed px-4 py-6 text-sm theme-border theme-muted">
                                    No present learners match the current filters.
                                </div>
                            ) : (
                                filteredLearners.map((learner) => {
                                    const queueState = getLearnerQueueState(learner, displayEvidenceTypes);
                                    const missingCount = getLearnerMissingCount(learner, displayEvidenceTypes);
                                    const selected = learner.learner_id === selectedLearner?.learner_id;

                                    return (
                                        <button
                                            key={learner.learner_id}
                                            type="button"
                                            onClick={() => setSelectedLearnerId(learner.learner_id)}
                                            className={`w-full rounded-xl border p-3 text-left transition-colors ${
                                                selected
                                                    ? 'border-blue-300 bg-blue-50'
                                                    : 'theme-border theme-surface hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="break-words text-sm font-semibold theme-text">{learner.name}</p>
                                                    <p className="mt-0.5 break-words text-xs theme-muted">{learner.admission_number}</p>
                                                </div>
                                                {selected ? (
                                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                                ) : null}
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Badge variant="default">
                                                    {learner.progress.recorded}/{learner.progress.required}
                                                </Badge>
                                                <Badge variant={queueState.variant}>{queueState.label}</Badge>
                                                {missingCount > 0 ? (
                                                    <Badge variant="orange">{missingCount} missing</Badge>
                                                ) : null}
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 rounded-xl border p-4 theme-border theme-surface">
                        {selectedLearner ? (
                            <>
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg font-semibold theme-text">{selectedLearner.name}</h3>
                                            <Badge variant="default">{selectedLearner.admission_number}</Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="default">
                                                {selectedLearner.progress.recorded}/{selectedLearner.progress.required} recorded
                                            </Badge>
                                            <Badge variant={getLearnerQueueState(selectedLearner, displayEvidenceTypes).variant}>
                                                {getLearnerQueueState(selectedLearner, displayEvidenceTypes).label}
                                            </Badge>
                                            {getLearnerMissingCount(selectedLearner, displayEvidenceTypes) > 0 ? (
                                                <Badge variant="orange">
                                                    {getLearnerMissingCount(selectedLearner, displayEvidenceTypes)} categories still missing
                                                </Badge>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            disabled={!previousLearner}
                                            onClick={() => setSelectedLearnerId(previousLearner?.learner_id ?? null)}
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                            Previous learner
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            disabled={!nextLearner}
                                            onClick={() => setSelectedLearnerId(nextLearner?.learner_id ?? null)}
                                        >
                                            Next learner
                                            <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid gap-3 lg:grid-cols-2">
                                    {orderedEvidenceTypes.map((evidenceType) => {
                                        const cell = selectedLearner.evidence[evidenceType];
                                        const active = evidenceType === activeEvidenceType;
                                        const completed = cell?.recorded;

                                        return (
                                            <button
                                                key={evidenceType}
                                                type="button"
                                                onClick={() => setActiveEvidenceType(evidenceType)}
                                                className={`rounded-xl border p-4 text-left transition-colors ${
                                                    active
                                                        ? 'border-blue-300 bg-blue-50'
                                                        : completed
                                                            ? 'border-green-200 bg-green-50'
                                                            : 'theme-border theme-surface-muted hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="break-words text-sm font-semibold theme-text">
                                                                {formatFineArtsEvidenceLabel(evidenceType)}
                                                            </p>
                                                            <p className="mt-1 text-xs theme-muted">
                                                                {cell?.attachment_count ?? 0} attachment{(cell?.attachment_count ?? 0) === 1 ? '' : 's'} · {formatUpdatedAt(cell?.updated_at ?? null)}
                                                            </p>
                                                        </div>
                                                        <Badge variant={getEvidenceStatusVariant(cell?.status ?? 'NOT_STARTED')}>
                                                            {STATUS_OPTIONS.find((option) => option.value === (cell?.status ?? 'NOT_STARTED'))?.label ?? 'Not started'}
                                                        </Badge>
                                                    </div>
                                                    <p className="line-clamp-2 text-sm theme-muted">
                                                        {cell?.notes?.trim()
                                                            ? cell.notes
                                                            : completed
                                                                ? 'Evidence saved for this category.'
                                                                : 'No evidence recorded yet.'}
                                                    </p>
                                                    <div className="flex justify-end">
                                                        <span className="text-sm font-medium text-blue-700">
                                                            {completed ? 'Update evidence' : 'Add evidence'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {activeEvidenceType ? (
                                    <div className="rounded-xl border p-4 theme-border theme-surface-muted">
                                        <div className="flex flex-col gap-3 border-b pb-4 theme-border sm:flex-row sm:items-start sm:justify-between">
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold theme-text">
                                                    Edit {formatFineArtsEvidenceLabel(activeEvidenceType)}
                                                </p>
                                                <p className="text-sm theme-muted">
                                                    Save this category, upload supporting files in the same step, then continue to the next missing learner or category.
                                                </p>
                                            </div>
                                            <Badge variant={getEvidenceStatusVariant(status)}>
                                                {STATUS_OPTIONS.find((option) => option.value === status)?.label ?? 'Not started'}
                                            </Badge>
                                        </div>

                                        <div className="mt-4 grid gap-4 xl:grid-cols-[220px,minmax(0,1fr)]">
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
                                                    className="theme-input theme-focus-ring min-h-[120px] w-full rounded-lg px-4 py-3 text-sm"
                                                    placeholder="Record what the learner submitted, observed strengths, or follow-up notes..."
                                                />
                                            </label>
                                        </div>

                                        <details className="mt-4 rounded-xl border p-4 theme-border theme-surface">
                                            <summary className="cursor-pointer list-none text-sm font-medium theme-text">
                                                Advanced: linked taught outcomes
                                            </summary>
                                            <p className="mt-2 text-sm theme-muted">
                                                Leave this collapsed to let the system link all confirmed taught outcomes automatically.
                                                Open it only when you need to override the default links.
                                            </p>

                                            <label className="mt-3 flex items-start gap-3 rounded-lg border px-4 py-3 theme-border">
                                                <input
                                                    type="checkbox"
                                                    className="theme-checkbox theme-border mt-0.5 h-4 w-4 rounded"
                                                    checked={useCustomOutcomeLinks}
                                                    onChange={(event) => setUseCustomOutcomeLinks(event.target.checked)}
                                                    disabled={!editable || !requiresOutcomeLinks}
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium theme-text">Choose linked outcomes manually</p>
                                                    <p className="mt-1 text-sm theme-muted">
                                                        Use this only when the saved evidence should link to a smaller outcome set than the full confirmed lesson outcomes.
                                                    </p>
                                                </div>
                                            </label>

                                            {useCustomOutcomeLinks ? (
                                                <div className="mt-4 space-y-3">
                                                    {(matrix.taught_outcomes ?? []).length === 0 ? (
                                                        <div className="rounded-lg border border-dashed px-4 py-3 text-sm theme-border theme-muted">
                                                            Confirm taught outcomes before recording learner worksheet evidence.
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
                                            ) : null}
                                        </details>

                                        <div className="mt-4 rounded-xl border p-4 theme-border theme-surface">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold theme-text">Attachments</p>
                                                    <p className="text-sm theme-muted">
                                                        Save evidence and upload files in one pass. Existing files remain attached to this category.
                                                    </p>
                                                </div>
                                                <Badge variant="default">{activeCell?.attachment_count ?? 0} uploaded</Badge>
                                            </div>

                                            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr,220px]">
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
                                                    <p className="text-xs theme-muted">
                                                        Files upload immediately after the evidence entry is saved.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-4 space-y-3">
                                                {(activeCell?.attachments ?? []).length === 0 ? (
                                                    <div className="rounded-lg border border-dashed px-4 py-3 text-sm theme-border theme-muted">
                                                        No attachments uploaded yet.
                                                    </div>
                                                ) : (
                                                    activeCell?.attachments.map((attachment) => (
                                                        <div
                                                            key={attachment.id}
                                                            className="flex flex-col gap-3 rounded-lg border p-3 theme-border theme-surface-muted sm:flex-row sm:items-center sm:justify-between"
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
                                                                    <p className="text-xs theme-muted">
                                                                        {formatBytes(attachment.optimized_size)} · {attachment.processing_status}
                                                                    </p>
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

                                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                disabled={!editable || recordMutation.isPending || uploadMutation.isPending}
                                                onClick={() => {
                                                    void handleSave();
                                                }}
                                            >
                                                <Upload className="h-4 w-4" />
                                                {recordMutation.isPending || uploadMutation.isPending ? 'Saving...' : 'Save'}
                                            </Button>
                                            <Button
                                                type="button"
                                                disabled={!editable || recordMutation.isPending || uploadMutation.isPending}
                                                onClick={() => {
                                                    void handleSaveAndNextMissing();
                                                }}
                                            >
                                                <ArrowRight className="h-4 w-4" />
                                                {recordMutation.isPending || uploadMutation.isPending ? 'Saving...' : 'Save & next missing'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                            </>
                        ) : (
                            <div className="rounded-xl border border-dashed px-4 py-8 text-sm theme-border theme-muted">
                                Select a learner from the queue to record worksheet evidence.
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

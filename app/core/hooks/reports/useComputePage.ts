'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ReportComputeStreamFallbackError, reportsAPI } from '@/app/core/api/reporting';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { resolveReportError } from '@/app/core/errors';
import type { FormFieldErrors } from '@/app/core/forms';
import type {
    ReportComputeJob,
    ReportComputeMode,
    ReportComputeProgressEvent,
    ReportComputeReadiness,
    ReportReadinessRecommendation,
} from '@/app/core/types/reporting';

export interface ComputeOption {
    id: string;
    title: string;
    description: string;
}

export interface ComputeResult {
    success: boolean;
    title?: string;
    message: string;
    serverCode?: string;
}

type ComputeActionStatus = 'idle' | 'loading' | 'blocked' | 'success' | 'error';
export type ComputeTransportState = 'idle' | 'connecting' | 'live' | 'disconnected' | 'polling' | 'restored';

const TERMINAL_JOB_STATUSES = new Set(['COMPLETED', 'FAILED', 'BLOCKED']);

function sleep(milliseconds: number) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
}

function readinessAllowsCompute(readiness: ReportComputeReadiness | null): boolean {
    if (!readiness) return false;
    if (readiness.can_compute !== undefined) return readiness.can_compute;
    return Boolean(readiness.ready && !readiness.blocked);
}

function readinessBlocked(readiness: ReportComputeReadiness | null): boolean {
    if (!readiness) return false;
    if (readiness.can_compute === false) return true;
    if (readiness.blocked) return true;
    if ((readiness.blocking_count ?? 0) > 0) return true;
    return readiness.overall_status === 'NEEDS_SETUP' || readiness.overall_status === 'CONFLICTS';
}

function readinessBlockedMessage(readiness: ReportComputeReadiness | null): string {
    if (!readiness) return 'Load report readiness before computing official reports.';
    if (readiness.message) return readiness.message;
    const missing = readiness.missing?.length ?? 0;
    const conflicts = readiness.conflicts?.length ?? 0;
    if (conflicts > 0) return `${conflicts} policy conflict${conflicts === 1 ? '' : 's'} need admin review.`;
    if (missing > 0) return `${missing} class subject${missing === 1 ? '' : 's'} missing report policy coverage.`;
    return 'Reports are not ready. Resolve report setup before computing official reports.';
}

function computeJobErrorMessage(job: ReportComputeJob | null): string | null {
    const payload = job?.error_payload;
    if (payload && typeof payload === 'object') {
        for (const key of ['detail', 'message', 'error', 'reason']) {
            const value = (payload as Record<string, unknown>)[key];
            if (typeof value === 'string' && value.trim()) return value;
        }
    }
    return job?.label ?? null;
}

function progressFromJob(job: ReportComputeJob): ReportComputeProgressEvent {
    return job.latest_event ?? {
        event: TERMINAL_JOB_STATUSES.has(job.status) ? (job.status === 'COMPLETED' ? 'complete' : 'error') : 'progress',
        stage: job.stage,
        label: job.label,
        progress_percent: job.progress_percent,
        completed_count: job.completed_count,
        total_count: job.total_count,
        status: job.status,
    };
}

function mergeProgressEvent(
    current: ReportComputeProgressEvent | null,
    next: ReportComputeProgressEvent,
): ReportComputeProgressEvent {
    if (!current) return next;
    const currentSequence = current.sequence ?? 0;
    const nextSequence = next.sequence ?? currentSequence;
    const progressPercent = Math.max(
        Number(current.progress_percent ?? 0),
        Number(next.progress_percent ?? 0),
    );
    const completedCount = Math.max(
        Number(current.completed_count ?? 0),
        Number(next.completed_count ?? 0),
    );
    return {
        ...current,
        ...next,
        sequence: Math.max(currentSequence, nextSequence),
        progress_percent: progressPercent,
        completed_count: completedCount,
        total_count: next.total_count ?? current.total_count,
        created_count: Math.max(Number(current.created_count ?? 0), Number(next.created_count ?? 0)),
        updated_count: Math.max(Number(current.updated_count ?? 0), Number(next.updated_count ?? 0)),
        unchanged_count: Math.max(Number(current.unchanged_count ?? 0), Number(next.unchanged_count ?? 0)),
        failed_count: Math.max(Number(current.failed_count ?? 0), Number(next.failed_count ?? 0)),
    };
}

export function useComputePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const initialTerm = Number(searchParams.get('term') ?? '');
    const [selectedTerm, setSelectedTerm] = useState<number | null>(
        Number.isFinite(initialTerm) && initialTerm > 0 ? initialTerm : null,
    );
    const [computing, setComputing] = useState(false);
    const [readiness, setReadiness] = useState<ReportComputeReadiness | null>(null);
    const [readinessLoading, setReadinessLoading] = useState(false);
    const [job, setJob] = useState<ReportComputeJob | null>(null);
    const [progressEvent, setProgressEvent] = useState<ReportComputeProgressEvent | null>(null);
    const [streamFallback, setStreamFallback] = useState(false);
    const [transportState, setTransportState] = useState<ComputeTransportState>('idle');
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FormFieldErrors<'term'>>({});
    const [computeSheetOpen, setComputeSheetOpen] = useState(false);
    const [computeActionStatus, setComputeActionStatus] = useState<ComputeActionStatus>('idle');
    const [computeActionError, setComputeActionError] = useState<string | null>(null);
    const streamAbortRef = useRef<AbortController | null>(null);
    const lastSequenceRef = useRef<number | null>(null);

    const { terms, loading: termsLoading } = useTerms();
    const selectedTermRecord = terms.find((term) => term.id === selectedTerm) ?? null;
    const selectedTermClosed = Boolean(
        selectedTermRecord?.is_frozen || selectedTermRecord?.status === 'CLOSED_HISTORICAL',
    );

    const fetchReadiness = useCallback(async (
        termId: number,
        options: { showPageError?: boolean } = {},
    ) => {
        const showPageError = options.showPageError ?? true;
        setReadinessLoading(true);
        try {
            setReadiness(await reportsAPI.getComputeReadiness(termId));
            if (showPageError) setGlobalError(null);
        } catch (error) {
            const resolved = resolveReportError(error, {
                action: 'load',
                entityLabel: 'report compute readiness',
                role: 'ADMIN',
            });
            if (showPageError) {
                setReadiness(null);
                setGlobalError(resolved.message ?? 'Could not load report compute readiness.');
            }
        } finally {
            setReadinessLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!selectedTerm) {
            setReadiness(null);
            return;
        }
        void fetchReadiness(selectedTerm);
    }, [fetchReadiness, selectedTerm]);

    useEffect(() => () => {
        streamAbortRef.current?.abort();
    }, []);

    const requireSelectedTerm = () => {
        if (!selectedTerm) {
            setFieldErrors({ term: 'Select a term before computing.' });
            return false;
        }
        if (selectedTermClosed) {
            setGlobalError('This term is closed. Policies and reports are historical.');
            return false;
        }
        return true;
    };

    const handleTermChange = (value: string) => {
        const nextTerm = value ? Number(value) : null;
        setSelectedTerm(nextTerm);
        setFieldErrors({});
        setGlobalError(null);
        setJob(null);
        setProgressEvent(null);
        setStreamFallback(false);
        setTransportState('idle');
        lastSequenceRef.current = null;
        setComputeActionStatus('idle');
        setComputeActionError(null);

        const params = new URLSearchParams(searchParams.toString());
        if (nextTerm) {
            params.set('term', String(nextTerm));
        } else {
            params.delete('term');
        }
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };

    const pollComputeJob = useCallback(async (jobId: string) => {
        let latest: ReportComputeJob | null = null;
        for (let attempt = 0; attempt < 120; attempt += 1) {
            await sleep(attempt < 3 ? 1000 : 2000);
            const fetched = await reportsAPI.getComputeJob(jobId);
            latest = fetched;
            setJob(latest);
            setProgressEvent((current) => mergeProgressEvent(current, progressFromJob(fetched)));
            if (TERMINAL_JOB_STATUSES.has(latest.status)) {
                return latest;
            }
        }
        return latest;
    }, []);

    const handleComputeReports = async (mode: ReportComputeMode = 'INCREMENTAL') => {
        if (!requireSelectedTerm()) return;
        const termId = selectedTerm;
        if (!termId) return;

        setComputeSheetOpen(true);
        setComputeActionStatus('loading');
        setComputeActionError(null);

        if (readinessBlocked(readiness)) {
            setComputeActionStatus('blocked');
            setComputeActionError(readinessBlockedMessage(readiness));
            return;
        }

        setComputing(true);
        setFieldErrors({});
        setGlobalError(null);
        setJob(null);
        setProgressEvent({
            event: 'progress',
            stage: 'queued',
            label: 'Queueing report computation',
            progress_percent: 0,
            completed_count: 0,
            total_count: null,
            mode,
        });
        setStreamFallback(false);
        setTransportState('connecting');
        lastSequenceRef.current = null;
        try {
            const createdJob = await reportsAPI.computeReports(termId, mode);
            setJob(createdJob);
            setProgressEvent((current) => mergeProgressEvent(current, progressFromJob(createdJob)));

            if (createdJob.status === 'BLOCKED') {
                setReadiness(createdJob.readiness ?? readiness);
                setComputeActionStatus('blocked');
                setComputeActionError(
                    computeJobErrorMessage(createdJob)
                    ?? 'Reports are blocked because one or more curricula are missing required report policies.',
                );
                return;
            }

            let finalJob: ReportComputeJob | null = null;

            if (!createdJob.events_url) {
                setStreamFallback(true);
                setTransportState('polling');
                finalJob = await pollComputeJob(createdJob.job_id);
            } else {
                const controller = new AbortController();
                streamAbortRef.current?.abort();
                streamAbortRef.current = controller;

                try {
                    await reportsAPI.streamComputeJobEvents(createdJob.events_url, (event) => {
                        if (typeof event.sequence === 'number') {
                            lastSequenceRef.current = Math.max(lastSequenceRef.current ?? 0, event.sequence);
                        }
                        setProgressEvent((current) => mergeProgressEvent(current, event));
                        setJob((current) => (
                            current
                                ? {
                                    ...current,
                                    status: event.status ?? current.status,
                                    stage: event.stage ?? current.stage,
                                    label: event.label ?? current.label,
                                    progress_percent: Math.max(
                                        Number(event.progress_percent ?? 0),
                                        Number(current.progress_percent ?? 0),
                                    ),
                                    completed_count: Math.max(
                                        Number(event.completed_count ?? 0),
                                        Number(current.completed_count ?? 0),
                                    ),
                                    total_count: event.total_count ?? current.total_count,
                                }
                                : current
                        ));
                    }, controller.signal, {
                        initialSequence: lastSequenceRef.current,
                        onTransportState: (state) => {
                            if (state === 'live' || state === 'restored') {
                                setStreamFallback(false);
                            }
                            setTransportState(state);
                        },
                    });
                    const fetchedFinalJob = await reportsAPI.getComputeJob(createdJob.job_id);
                    finalJob = fetchedFinalJob;
                    setJob(fetchedFinalJob);
                    setProgressEvent((current) => mergeProgressEvent(current, progressFromJob(fetchedFinalJob)));
                } catch (streamError) {
                    if (controller.signal.aborted) return;
                    if (!(streamError instanceof ReportComputeStreamFallbackError)) {
                        // Transport errors are handled by polling; computation state remains authoritative.
                    }
                    setStreamFallback(true);
                    setTransportState('polling');
                    finalJob = await pollComputeJob(createdJob.job_id);
                }
            }

            if (!finalJob) {
                throw new Error('Report computation did not finish in time.');
            }

            if (finalJob.status === 'COMPLETED') {
                setComputeActionStatus('success');
            } else if (finalJob.status === 'BLOCKED') {
                setReadiness(finalJob.readiness ?? readiness);
                setComputeActionStatus('blocked');
                setComputeActionError(
                    computeJobErrorMessage(finalJob)
                    ?? 'Reports are blocked because one or more curricula are missing required report policies.',
                );
            } else if (finalJob.status === 'FAILED') {
                setComputeActionStatus('error');
                setComputeActionError(computeJobErrorMessage(finalJob) ?? 'Report computation failed.');
            }
        } catch (error) {
            const resolved = resolveReportError(error, {
                action: 'compute',
                entityLabel: 'official reports',
                role: 'ADMIN',
            });
            if (resolved.serverCode === 'report_compute_blocked' && termId) {
                await fetchReadiness(termId, { showPageError: false });
            }
            setComputeActionStatus(resolved.serverCode === 'report_compute_blocked' ? 'blocked' : 'error');
            setComputeActionError(
                resolved.serverCode === 'report_compute_blocked'
                    ? 'Reports are blocked because one or more curricula are missing required report policies.'
                    : resolved.message ?? 'Report computation failed.',
            );
        } finally {
            streamAbortRef.current = null;
            setComputing(false);
            setTransportState((current) => (
                current === 'polling' || current === 'disconnected' ? current : 'idle'
            ));
            await fetchReadiness(termId, { showPageError: false });
        }
    };

    const termOptions = [
        { value: '', label: 'Select a term...' },
        ...terms.map((term) => ({
            value: String(term.id),
            label: `${term.academic_year_name} - ${term.name}`,
        })),
    ];

    const manageCbcPoliciesHref = useMemo(() => {
        const returnTo = selectedTerm
            ? `/reports/compute?term=${selectedTerm}`
            : '/reports/compute';
        const params = new URLSearchParams({ returnTo });
        if (selectedTerm) {
            params.set('term', String(selectedTerm));
        }
        return `/reports/policies/cbc?${params.toString()}`;
    }, [selectedTerm]);

    const safeRecommendation = useMemo<ReportReadinessRecommendation | null>(() => (
        readiness?.recommendations?.find((recommendation) => recommendation.safe_to_apply) ?? null
    ), [readiness]);

    const computeDisabledReason = useMemo(() => {
        if (!selectedTerm) return 'Select a term before computing reports.';
        if (selectedTermClosed) return 'This term is closed. Policies and reports are historical.';
        if (readinessLoading) return 'Checking report readiness.';
        if (!readiness) return 'Load report readiness before computing.';
        if ((readiness.engines?.length ?? 0) === 0) return 'No reportable curriculum engines were found for this term.';
        if (!readinessAllowsCompute(readiness)) {
            return readiness.message || 'Reports are not ready. Use Prepare Term for Reports or manage report policies.';
        }
        return null;
    }, [readiness, readinessLoading, selectedTerm, selectedTermClosed]);

    return {
        selectedTerm,
        selectedTermRecord,
        selectedTermClosed,
        computing,
        readiness,
        readinessLoading,
        job,
        progressEvent,
        streamFallback,
        transportState,
        safeRecommendation,
        computeSheetOpen,
        computeActionStatus,
        computeActionError,
        computeDisabledReason,
        fieldErrors,
        globalError,
        termsLoading,
        termOptions,
        manageCbcPoliciesHref,
        setReadiness,
        setGlobalError,
        setComputeSheetOpen,
        handleTermChange,
        handleComputeReports,
        refetchReadiness: selectedTerm ? () => fetchReadiness(selectedTerm) : undefined,
        refreshReadinessInBackground: selectedTerm ? () => fetchReadiness(selectedTerm, { showPageError: false }) : undefined,
    };
}

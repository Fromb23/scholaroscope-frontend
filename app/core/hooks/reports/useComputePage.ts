'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { reportsAPI } from '@/app/core/api/reporting';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { resolveReportError } from '@/app/core/errors';
import type { FormFieldErrors } from '@/app/core/forms';
import type {
    ReportComputeJob,
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

export function useComputePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const initialTerm = Number(searchParams.get('term') ?? '');
    const [selectedTerm, setSelectedTerm] = useState<number | null>(
        Number.isFinite(initialTerm) && initialTerm > 0 ? initialTerm : null,
    );
    const [computing, setComputing] = useState(false);
    const [preparing, setPreparing] = useState(false);
    const [applyingRecommendation, setApplyingRecommendation] = useState<string | null>(null);
    const [readiness, setReadiness] = useState<ReportComputeReadiness | null>(null);
    const [readinessLoading, setReadinessLoading] = useState(false);
    const [job, setJob] = useState<ReportComputeJob | null>(null);
    const [progressEvent, setProgressEvent] = useState<ReportComputeProgressEvent | null>(null);
    const [streamFallback, setStreamFallback] = useState(false);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FormFieldErrors<'term'>>({});
    const streamAbortRef = useRef<AbortController | null>(null);

    const { terms, loading: termsLoading } = useTerms();
    const selectedTermRecord = terms.find((term) => term.id === selectedTerm) ?? null;
    const selectedTermClosed = Boolean(
        selectedTermRecord?.is_frozen || selectedTermRecord?.status === 'CLOSED_HISTORICAL',
    );

    const fetchReadiness = useCallback(async (termId: number) => {
        setReadinessLoading(true);
        try {
            setReadiness(await reportsAPI.getComputeReadiness(termId));
            setGlobalError(null);
        } catch (error) {
            const resolved = resolveReportError(error, {
                action: 'load',
                entityLabel: 'report compute readiness',
                role: 'ADMIN',
            });
            setReadiness(null);
            setGlobalError(resolved.message ?? 'Could not load report compute readiness.');
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
            latest = await reportsAPI.getComputeJob(jobId);
            setJob(latest);
            setProgressEvent(progressFromJob(latest));
            if (TERMINAL_JOB_STATUSES.has(latest.status)) {
                return latest;
            }
        }
        return latest;
    }, []);

    const handlePrepareTerm = async () => {
        if (!requireSelectedTerm()) return;
        const termId = selectedTerm;
        if (!termId) return;

        setPreparing(true);
        setFieldErrors({});
        setGlobalError(null);
        try {
            setReadiness(await reportsAPI.prepareTermForReports(termId));
        } catch (error) {
            const resolved = resolveReportError(error, {
                action: 'load',
                entityLabel: 'report setup recommendations',
                role: 'ADMIN',
            });
            setGlobalError(resolved.message ?? 'Could not prepare this term for reports.');
        } finally {
            setPreparing(false);
        }
    };

    const handleApplyRecommendation = async (recommendationId: string) => {
        if (!requireSelectedTerm()) return;
        const termId = selectedTerm;
        if (!termId) return;

        setApplyingRecommendation(recommendationId);
        setFieldErrors({});
        setGlobalError(null);
        try {
            setReadiness(await reportsAPI.applyRecommendedFix(termId, recommendationId));
        } catch (error) {
            const resolved = resolveReportError(error, {
                action: 'update',
                entityLabel: 'recommended report setup fix',
                role: 'ADMIN',
            });
            setGlobalError(resolved.message ?? 'Could not apply the recommended report setup fix.');
        } finally {
            setApplyingRecommendation(null);
        }
    };

    const handleComputeReports = async () => {
        if (!requireSelectedTerm()) return;
        const termId = selectedTerm;
        if (!termId) return;
        if (readinessBlocked(readiness)) {
            setGlobalError(readiness?.message || 'Reports are not ready. Resolve report setup before computing official reports.');
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
        });
        setStreamFallback(false);
        try {
            const createdJob = await reportsAPI.computeReports(termId);
            setJob(createdJob);
            setProgressEvent(progressFromJob(createdJob));

            if (createdJob.status === 'BLOCKED') {
                setReadiness(createdJob.readiness ?? readiness);
                setGlobalError('Reports are blocked because one or more curricula are missing required report policies.');
                return;
            }

            if (!createdJob.events_url) {
                setStreamFallback(true);
                await pollComputeJob(createdJob.job_id);
                return;
            }

            const controller = new AbortController();
            streamAbortRef.current?.abort();
            streamAbortRef.current = controller;

            try {
                await reportsAPI.streamComputeJobEvents(createdJob.events_url, (event) => {
                    setProgressEvent(event);
                    setJob((current) => (
                        current
                            ? {
                                ...current,
                                status: event.status ?? current.status,
                                stage: event.stage ?? current.stage,
                                label: event.label ?? current.label,
                                progress_percent: event.progress_percent ?? current.progress_percent,
                                completed_count: event.completed_count ?? current.completed_count,
                                total_count: event.total_count ?? current.total_count,
                            }
                            : current
                    ));
                }, controller.signal);
            } catch {
                if (controller.signal.aborted) return;
                setStreamFallback(true);
                await pollComputeJob(createdJob.job_id);
            }
        } catch (error) {
            const resolved = resolveReportError(error, {
                action: 'compute',
                entityLabel: 'official reports',
                role: 'ADMIN',
            });
            if (resolved.serverCode === 'report_compute_blocked' && termId) {
                await fetchReadiness(termId);
            }
            setGlobalError(
                resolved.serverCode === 'report_compute_blocked'
                    ? 'Reports are blocked because one or more curricula are missing required report policies.'
                    : resolved.message ?? 'Report computation failed.',
            );
        } finally {
            streamAbortRef.current = null;
            setComputing(false);
            await fetchReadiness(termId);
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
        preparing,
        applyingRecommendation,
        readiness,
        readinessLoading,
        job,
        progressEvent,
        streamFallback,
        safeRecommendation,
        computeDisabledReason,
        fieldErrors,
        globalError,
        termsLoading,
        termOptions,
        manageCbcPoliciesHref,
        setGlobalError,
        handleTermChange,
        handlePrepareTerm,
        handleApplyRecommendation,
        handleComputeReports,
        refetchReadiness: selectedTerm ? () => fetchReadiness(selectedTerm) : undefined,
    };
}

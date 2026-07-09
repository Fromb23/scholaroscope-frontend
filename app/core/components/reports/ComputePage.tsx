'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Loader, Play, Settings } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { FormValidationSummary } from '@/app/components/ui/forms';
import { Badge } from '@/app/components/ui/Badge';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ActionProgress, ActionStateBanner, ResponsiveActionSheet } from '@/app/components/ui/actions';
import { ReportPrepareTermSheet } from '@/app/core/components/reports/ReportPrepareTermSheet';
import { getFormFieldErrorMessage, useFormValidationFeedback } from '@/app/core/forms';
import { useComputePage } from '@/app/core/hooks/reports/useComputePage';
import type {
    ReportComputeEngineReadiness,
    ReportComputeJob,
    ReportComputeProgressEvent,
} from '@/app/core/types/reporting';

const COMPUTE_FIELD_LABELS = {
    term: 'Term',
};

type ComputeActionStatus = 'idle' | 'loading' | 'blocked' | 'success' | 'error';

function engineBadgeVariant(engine: ReportComputeEngineReadiness) {
    if (engine.blocked || Number(engine.conflict_count ?? engine.context?.conflict_count ?? 0) > 0) return 'red' as const;
    if (Number(engine.missing_count ?? engine.context?.missing_count ?? 0) > 0) return 'orange' as const;
    return 'green' as const;
}

function engineStatusLabel(engine: ReportComputeEngineReadiness): string {
    const status = engine.setup_status ?? engine.status;
    const missing = Number(engine.missing_count ?? engine.context?.missing_count ?? 0);
    const conflicts = Number(engine.conflict_count ?? engine.context?.conflict_count ?? 0);
    if (conflicts > 0 || status === 'CONFLICTS') return 'Conflicts found';
    if (missing > 0 || status === 'NEEDS_SETUP' || status === 'MISSING_POLICIES') return 'Needs setup';
    if (status === 'NOT_INSTALLED') return 'Not installed';
    return engine.blocked ? 'Not ready' : 'Ready';
}

function engineSummary(engine: ReportComputeEngineReadiness): string {
    const missing = Number(engine.missing_count ?? engine.context?.missing_count ?? 0);
    const conflicts = Number(engine.conflict_count ?? engine.context?.conflict_count ?? 0);
    const inactive = Number(engine.inactive_count ?? engine.context?.inactive_count ?? 0);
    if (engine.summary_message) return engine.summary_message;
    if (missing > 0) return `Missing policies for ${missing} class subject${missing === 1 ? '' : 's'}`;
    if (conflicts > 0) return `${conflicts} policy conflict${conflicts === 1 ? '' : 's'} need review`;
    if (inactive > 0) return `${inactive} inactive policy selection${inactive === 1 ? '' : 's'} need review`;
    return engine.message;
}

function engineMetric(engine: ReportComputeEngineReadiness, key: 'covered_count' | 'missing_count' | 'exception_count' | 'official_result_estimate'): number {
    const value = engine[key] ?? engine.context?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function ComputePage() {
    const [prepareSheetOpen, setPrepareSheetOpen] = useState(false);
    const [prepareAutoRunKey, setPrepareAutoRunKey] = useState(0);
    const {
        selectedTerm,
        selectedTermRecord,
        selectedTermClosed,
        computing,
        readiness,
        readinessLoading,
        job,
        progressEvent,
        streamFallback,
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
        refreshReadinessInBackground,
    } = useComputePage();
    const {
        summaryRef,
        setFieldRef,
        focusField,
        focusFirstError,
    } = useFormValidationFeedback<'term'>({
        fieldErrors,
        fieldOrder: ['term'],
        fieldLabels: COMPUTE_FIELD_LABELS,
        summaryId: 'report-compute-validation-summary',
    });

    useEffect(() => {
        if (fieldErrors.term) {
            focusFirstError(fieldErrors);
        }
    }, [fieldErrors, focusFirstError]);

    const computeDisabled = Boolean(
        computing
        || selectedTermClosed
        || readinessLoading
        || !selectedTerm
        || computeDisabledReason
        || readiness?.engines.length === 0,
    );
    const reportsReady = Boolean(readiness && (readiness.can_compute ?? readiness.ready));
    const coveredCount = readiness?.engines.reduce((total, engine) => total + engineMetric(engine, 'covered_count'), 0) ?? 0;
    const missingCount = readiness?.engines.reduce((total, engine) => total + engineMetric(engine, 'missing_count'), 0) ?? 0;
    const exceptionCount = readiness?.engines.reduce((total, engine) => total + engineMetric(engine, 'exception_count'), 0) ?? 0;
    const officialEstimate = readiness?.engines.reduce((total, engine) => total + engineMetric(engine, 'official_result_estimate'), 0) ?? 0;
    const progressPercent = Math.max(0, Math.min(100, Number(progressEvent?.progress_percent ?? job?.progress_percent ?? 0)));
    const officialResults = progressEvent?.official_results
        ?? job?.result_payload?.official_results
        ?? job?.result_payload?.computed_count
        ?? 0;
    const summaryRows = progressEvent?.summary_rows_refreshed
        ?? job?.result_payload?.summary_rows_refreshed
        ?? job?.result_payload?.summary_count
        ?? job?.result_payload?.summaries?.summary_count
        ?? 0;
    const completionMessage = `Reports computed successfully. ${officialResults} official result${officialResults === 1 ? '' : 's'} computed; ${summaryRows} summary row${summaryRows === 1 ? '' : 's'} refreshed.`;

    const openPrepareSheet = (autoRun = false) => {
        setPrepareSheetOpen(true);
        if (autoRun) setPrepareAutoRunKey((key) => key + 1);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Compute Reports</h1>
                    <p className="mt-1 text-gray-500">
                        Run official report computation for a selected term.
                    </p>
                </div>
                <Settings className="h-7 w-7 text-gray-500" />
            </div>

            {globalError ? <ErrorBanner message={globalError} onDismiss={() => setGlobalError(null)} /> : null}

            <div ref={summaryRef}>
                <FormValidationSummary
                    id="report-compute-validation-summary"
                    title="Some fields need correction."
                    fieldErrors={fieldErrors}
                    fieldLabels={COMPUTE_FIELD_LABELS}
                    onFieldClick={focusField}
                />
            </div>

            <Card>
                <Select
                    ref={setFieldRef('term')}
                    label="Term"
                    value={selectedTerm?.toString() ?? ''}
                    onChange={(event) => handleTermChange(event.target.value)}
                    disabled={termsLoading}
                    required
                    error={getFormFieldErrorMessage(fieldErrors.term)}
                    helperText="Required for official report computation."
                    options={termOptions}
                />
                {selectedTermClosed ? (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        This term is closed. Policies and reports are historical.
                    </div>
                ) : null}
            </Card>

            <Card>
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Reporting Setup</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            {selectedTermRecord
                                ? `${selectedTermRecord.academic_year_name} - ${selectedTermRecord.name}`
                                : 'Select a term to check curriculum readiness.'}
                        </p>
                    </div>
                    {readinessLoading ? (
                        <Loader className="h-5 w-5 animate-spin text-gray-400" />
                    ) : readiness ? (
                        <Badge variant={reportsReady ? 'green' : 'orange'}>
                            {reportsReady ? 'Ready' : 'Needs setup'}
                        </Badge>
                    ) : null}
                </div>

                {readiness && readiness.engines.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {readiness.engines.map((engine) => (
                            <div key={engine.key} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                                <div className="flex items-start gap-3">
                                    {engine.blocked ? (
                                        <AlertTriangle className="mt-0.5 h-5 w-5 text-red-500" />
                                    ) : (
                                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                                    )}
                                    <div>
                                        <p className="font-medium text-gray-900">{engine.label}</p>
                                        <p className="mt-0.5 text-sm text-gray-600">{engineSummary(engine)}</p>
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                                            <span>{engineMetric(engine, 'covered_count')} covered</span>
                                            <span>{engineMetric(engine, 'official_result_estimate')} results</span>
                                            <span>{engineMetric(engine, 'exception_count')} exceptions</span>
                                            <span>{engineMetric(engine, 'missing_count')} missing</span>
                                        </div>
                                    </div>
                                </div>
                                <Badge variant={engineBadgeVariant(engine)}>
                                    {engineStatusLabel(engine)}
                                </Badge>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">
                        {selectedTerm ? 'No reportable curriculum engines were found for this term.' : 'Readiness appears after term selection.'}
                    </p>
                )}

                {readiness ? (
                    <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                        reportsReady
                            ? 'border-green-200 bg-green-50 text-green-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}>
                        <p className="font-medium">
                            {reportsReady ? 'Reports are ready.' : 'Reports are not ready.'}
                        </p>
                        <p className="mt-1">
                            {coveredCount} class subject{coveredCount === 1 ? '' : 's'} covered. {officialEstimate} learner-subject result{officialEstimate === 1 ? '' : 's'} ready. {exceptionCount} exception{exceptionCount === 1 ? '' : 's'}. {missingCount} missing.
                        </p>
                    </div>
                ) : null}

                {safeRecommendation ? (
                    <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                        <p className="font-semibold">Recommended fix</p>
                        <p className="mt-1">{safeRecommendation.summary ?? safeRecommendation.label}</p>
                        <p className="mt-1 text-blue-800">
                            This will cover {safeRecommendation.affected_class_subject_count} class subject{safeRecommendation.affected_class_subject_count === 1 ? '' : 's'} and {safeRecommendation.affected_result_estimate} learner-subject report{safeRecommendation.affected_result_estimate === 1 ? '' : 's'}.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => openPrepareSheet(false)}
                            >
                                <ClipboardCheck className="h-4 w-4" />
                                Review Recommended Fix
                            </Button>
                            <Link href={manageCbcPoliciesHref}>
                                <Button type="button" variant="secondary" size="sm">Manage Manually</Button>
                            </Link>
                        </div>
                    </div>
                ) : readiness?.decision_items?.length ? (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <p className="font-medium">Needs admin decision</p>
                        <p className="mt-1">Multiple policy choices could apply. Review the setup before computing reports.</p>
                    </div>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => openPrepareSheet(true)}
                        disabled={!selectedTerm || selectedTermClosed}
                    >
                        <ClipboardCheck className="h-4 w-4" />
                        Prepare Term for Reports
                    </Button>
                    <Link href={manageCbcPoliciesHref}>
                        <Button type="button" variant="secondary" size="sm">
                            <Settings className="h-4 w-4" />
                            Manage Report Policies - {reportsReady ? 'Review setup' : 'Fix setup'}
                        </Button>
                    </Link>
                </div>
            </Card>

            <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-semibold text-gray-900">Official Computation</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Compute enforces policy readiness and refreshes report summaries from official results.
                        </p>
                    </div>
                    <Button onClick={handleComputeReports} disabled={computeDisabled} className="w-full sm:w-auto">
                        {computing ? (
                            <>
                                <Loader className="mr-1.5 h-4 w-4 animate-spin" />
                                Computing Reports
                            </>
                        ) : (
                            <>
                                <Play className="mr-1.5 h-4 w-4" />
                                Compute Reports
                            </>
                        )}
                    </Button>
                </div>

                {computeDisabled && computeDisabledReason && !computing ? (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {computeDisabledReason}
                    </div>
                ) : null}

            </Card>

            <ReportPrepareTermSheet
                open={prepareSheetOpen}
                onOpenChange={setPrepareSheetOpen}
                termId={selectedTerm}
                readiness={readiness}
                onReadinessChange={setReadiness}
                managePoliciesHref={manageCbcPoliciesHref}
                autoPrepareKey={prepareAutoRunKey}
                onAfterMutation={refreshReadinessInBackground}
            />

            <ComputeReportsSheet
                open={computeSheetOpen}
                onOpenChange={setComputeSheetOpen}
                status={computeActionStatus}
                error={computeActionError}
                computing={computing}
                job={job}
                progressEvent={progressEvent}
                progressLabel={progressEvent?.label ?? job?.label ?? 'Computing official reports'}
                progressPercent={progressPercent}
                streamFallback={streamFallback}
                completedMessage={completionMessage}
                blockedReason={computeDisabledReason ?? 'Reports are not ready. Resolve report setup before computing official reports.'}
                managePoliciesHref={manageCbcPoliciesHref}
                onRetry={handleComputeReports}
            />
        </div>
    );
}

function ComputeReportsSheet({
    open,
    onOpenChange,
    status,
    error,
    computing,
    job,
    progressEvent,
    progressLabel,
    progressPercent,
    streamFallback,
    completedMessage,
    blockedReason,
    managePoliciesHref,
    onRetry,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    status: ComputeActionStatus;
    error: string | null;
    computing: boolean;
    job: ReportComputeJob | null;
    progressEvent: ReportComputeProgressEvent | null;
    progressLabel: string;
    progressPercent: number;
    streamFallback: boolean;
    completedMessage: string;
    blockedReason: string;
    managePoliciesHref: string;
    onRetry: () => void;
}) {
    const progressStatus = job?.status ?? (computing ? 'QUEUED' : status === 'success' ? 'COMPLETED' : undefined);

    return (
        <ResponsiveActionSheet
            open={open}
            onOpenChange={onOpenChange}
            title="Compute Reports"
            description="Official report computation progress and results stay here until you close this action."
            size="lg"
            state={status}
            closeDisabled={computing}
            preventBackdropClose
            footer={
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={computing}>
                        Close
                    </Button>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        {status === 'blocked' ? (
                            <Link href={managePoliciesHref}>
                                <Button type="button" variant="secondary" disabled={computing} className="w-full sm:w-auto">
                                    Manage Report Policies
                                </Button>
                            </Link>
                        ) : null}
                        {status === 'error' ? (
                            <Button type="button" onClick={onRetry} disabled={computing} className="w-full sm:w-auto">
                                Retry Compute
                            </Button>
                        ) : null}
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {status === 'loading' && !job ? (
                    <ActionStateBanner
                        variant="loading"
                        title="Queueing compute job"
                        message="Starting official report computation for the selected term."
                    />
                ) : null}

                {(job || progressEvent || computing) ? (
                    <ActionProgress
                        label={progressLabel}
                        stage={progressEvent?.stage ?? job?.stage}
                        progressPercent={progressPercent}
                        completedCount={progressEvent?.completed_count ?? job?.completed_count}
                        totalCount={progressEvent?.total_count ?? job?.total_count}
                        status={progressStatus}
                        fallbackMessage={
                            streamFallback
                                ? 'Live stream unavailable. Polling the server for latest progress.'
                                : null
                        }
                    />
                ) : null}

                {status === 'blocked' ? (
                    <ActionStateBanner
                        variant="blocked"
                        title="Computation blocked"
                        message={error ?? blockedReason}
                        action={
                            <Link href={managePoliciesHref}>
                                <Button type="button" size="sm" variant="secondary">
                                    Manage Report Policies
                                </Button>
                            </Link>
                        }
                    />
                ) : null}

                {status === 'error' && error ? (
                    <ActionStateBanner
                        variant="error"
                        title="Computation failed"
                        message={error}
                        action={
                            <Button type="button" size="sm" onClick={onRetry}>
                                Retry Compute
                            </Button>
                        }
                    />
                ) : null}

                {status === 'success' ? (
                    <ActionStateBanner
                        variant="success"
                        title="Reports computed successfully"
                        message={completedMessage}
                    />
                ) : null}

                {status === 'idle' ? (
                    <ActionStateBanner
                        variant="info"
                        title="Ready to compute"
                        message="Start report computation to see queued, progress, and result states here."
                    />
                ) : null}
            </div>
        </ResponsiveActionSheet>
    );
}

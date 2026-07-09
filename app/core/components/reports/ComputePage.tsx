'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Loader, Play, Settings } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { FormValidationSummary } from '@/app/components/ui/forms';
import { Badge } from '@/app/components/ui/Badge';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { getFormFieldErrorMessage, useFormValidationFeedback } from '@/app/core/forms';
import { useComputePage } from '@/app/core/hooks/reports/useComputePage';
import type { ReportComputeEngineReadiness } from '@/app/core/types/reporting';

const COMPUTE_FIELD_LABELS = {
    term: 'Term',
};

function engineBadgeVariant(engine: ReportComputeEngineReadiness) {
    if (engine.blocked) return 'red' as const;
    return 'green' as const;
}

function engineSummary(engine: ReportComputeEngineReadiness): string {
    const missing = Number(engine.context?.missing_count ?? 0);
    const conflicts = Number(engine.context?.conflict_count ?? 0);
    const inactive = Number(engine.context?.inactive_count ?? 0);
    if (missing > 0) return `Missing policies for ${missing} class subject${missing === 1 ? '' : 's'}`;
    if (conflicts > 0) return `${conflicts} policy conflict${conflicts === 1 ? '' : 's'} need review`;
    if (inactive > 0) return `${inactive} inactive policy selection${inactive === 1 ? '' : 's'} need review`;
    return engine.message;
}

export function ComputePage() {
    const {
        selectedTerm,
        selectedTermRecord,
        selectedTermClosed,
        computing,
        readiness,
        readinessLoading,
        result,
        fieldErrors,
        globalError,
        termsLoading,
        termOptions,
        manageCbcPoliciesHref,
        setGlobalError,
        handleTermChange,
        handleComputeReports,
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
        || readiness?.blocked
        || readiness?.engines.length === 0,
    );
    const hasCbcReadiness = readiness?.engines.some((engine) => engine.key === 'cbc') ?? false;

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
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Readiness</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            {selectedTermRecord
                                ? `${selectedTermRecord.academic_year_name} - ${selectedTermRecord.name}`
                                : 'Select a term to check curriculum readiness.'}
                        </p>
                    </div>
                    {readinessLoading ? (
                        <Loader className="h-5 w-5 animate-spin text-gray-400" />
                    ) : readiness ? (
                        <Badge variant={readiness.blocked ? 'red' : 'green'}>
                            {readiness.blocked ? 'Blocked' : 'Ready'}
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
                                    </div>
                                </div>
                                <Badge variant={engineBadgeVariant(engine)}>
                                    {engine.blocked ? 'Not ready' : 'Ready'}
                                </Badge>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">
                        {selectedTerm ? 'No reportable curriculum engines were found for this term.' : 'Readiness appears after term selection.'}
                    </p>
                )}

                {hasCbcReadiness && readiness?.blocked ? (
                    <div className="mt-4">
                        <Link href={manageCbcPoliciesHref}>
                            <Button variant="secondary" size="sm">
                                <Settings className="mr-1.5 h-4 w-4" />
                                Manage CBC policies
                            </Button>
                        </Link>
                    </div>
                ) : null}
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
                                Computing...
                            </>
                        ) : (
                            <>
                                <Play className="mr-1.5 h-4 w-4" />
                                Compute Reports
                            </>
                        )}
                    </Button>
                </div>

                {result ? (
                    <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                        {result.detail} {result.computed_count} official result{result.computed_count === 1 ? '' : 's'} computed; {result.summary_count} summary row{result.summary_count === 1 ? '' : 's'} refreshed.
                    </div>
                ) : null}
            </Card>
        </div>
    );
}

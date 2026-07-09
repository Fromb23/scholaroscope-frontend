'use client';

// ============================================================================
// app/(dashboard)/reports/compute/page.tsx — render only
// ============================================================================

import { useEffect } from 'react';
import Link from 'next/link';
import { Settings, Play, Loader, Zap } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { FormValidationSummary } from '@/app/components/ui/forms';
import { Badge } from '@/app/components/ui/Badge';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { getFormFieldErrorMessage, useFormValidationFeedback } from '@/app/core/forms';
import { ComputeOptionCard } from '@/app/core/components/reports/ComputeOptionCard';
import { ComputeResultBanner } from '@/app/core/components/reports/ComputeResultBanner';
import { useComputePage } from '@/app/core/hooks/reports/useComputePage';

const COMPUTE_FIELD_LABELS = {
    term: 'Term',
};

export function ComputePage() {
    const {
        selectedTerm,
        selectedTermClosed,
        computing,
        results,
        fieldErrors,
        globalError,
        termsLoading,
        computeOptions,
        successCount,
        failCount,
        termOptions,
        run,
        setGlobalError,
        handleTermChange,
        handleComputeAll,
        computeWithPolicy,
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

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Compute Controls</h1>
                    <p className="text-gray-500 mt-1">
                        Trigger grade computation and recompute summaries for a term.
                    </p>
                </div>
                <Settings className="h-7 w-7 text-gray-500" />
            </div>

            {globalError && <ErrorBanner message={globalError} onDismiss={() => setGlobalError(null)} />}

            <div ref={summaryRef}>
                <FormValidationSummary
                    id="report-compute-validation-summary"
                    title="Some fields need correction."
                    fieldErrors={fieldErrors}
                    fieldLabels={COMPUTE_FIELD_LABELS}
                    onFieldClick={focusField}
                />
            </div>

            {/* Term selector */}
            <Card>
                <Select
                    ref={setFieldRef('term')}
                    label="Select Term"
                    value={selectedTerm?.toString() ?? ''}
                    onChange={(event) => handleTermChange(event.target.value)}
                    disabled={termsLoading}
                    required
                    error={getFormFieldErrorMessage(fieldErrors.term)}
                    helperText="Choose the reporting term before running any computation."
                    options={termOptions}
                />
                {selectedTermClosed ? (
                    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        This term is closed. Policies and reports are historical.
                    </div>
                ) : null}
            </Card>

            {/* Policy-based computation */}
            <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50
                            border border-blue-200 p-5">
                <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
                        <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                            Policy-Based Grade Computation
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                            Compute grades using your configured policies — weighted averages,
                            custom scales, required components, and grading bands.
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                onClick={() => run('policy', () => computeWithPolicy(selectedTerm!))}
                                disabled={computing === 'policy' || selectedTermClosed}
                            >
                                {computing === 'policy'
                                    ? <><Loader className="h-4 w-4 mr-1.5 animate-spin" />Computing…</>
                                    : <><Zap className="h-4 w-4 mr-1.5" />Compute with Policies</>
                                }
                            </Button>
                            <Link href="/reports/policies">
                                <Button variant="secondary" size="sm">
                                    <Settings className="h-4 w-4 mr-1.5" />Manage Report Policies
                                </Button>
                            </Link>
                        </div>
                        {results.policy && <ComputeResultBanner result={results.policy} />}
                    </div>
                </div>
            </div>

            {/* Individual compute options */}
            <div>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Summary Recomputation
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                    {computeOptions.map((option) => (
                        <ComputeOptionCard
                            key={option.id}
                            option={option}
                            result={results[option.id]}
                            computing={computing === option.id}
                            disabled={computing === option.id || computing === 'all' || selectedTermClosed}
                            onCompute={() => run(option.id, option.run)}
                        />
                    ))}
                </div>
            </div>

            {/* Batch all */}
            <Card>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="font-semibold text-gray-900">Compute All Summaries</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Runs all five summary computations in sequence.
                        </p>
                    </div>
                    {Object.keys(results).length > 0 && (
                        <div className="flex gap-2">
                            {successCount > 0 && <Badge variant="green">{successCount} ok</Badge>}
                            {failCount > 0 && <Badge variant="red">{failCount} failed</Badge>}
                        </div>
                    )}
                </div>
                <Button
                    onClick={handleComputeAll}
                    disabled={computing !== null || selectedTermClosed}
                    className="w-full md:w-auto"
                >
                    {computing === 'all'
                        ? <><Loader className="h-4 w-4 mr-1.5 animate-spin" />Computing All…</>
                        : <><Play className="h-4 w-4 mr-1.5" />Compute All</>
                    }
                </Button>
            </Card>

        </div>
    );
}

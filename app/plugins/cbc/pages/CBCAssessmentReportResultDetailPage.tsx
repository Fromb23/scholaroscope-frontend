'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import {
    CBCBreadcrumb,
    CBCError,
    CBCLoading,
    CBCNav,
} from '@/app/plugins/cbc/components/CBCComponents';
import { useCbcAssessmentReportResult } from '@/app/plugins/cbc/hooks/useCbcAssessmentReportResults';
import {
    CBC_ASSESSMENT_RESULT_STATUS_HELPER_TEXT,
    CBC_ASSESSMENT_RESULT_STATUS_LABELS,
    formatCbcDateTime,
    formatCbcWeightedScore,
    getCbcLevelLabel,
} from '@/app/plugins/cbc/lib/assessmentReportResults';
import type { CbcAssessmentReportResult, CbcAssessmentResultStatus } from '@/app/plugins/cbc/types/cbc';

type BadgeVariant =
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'default'
    | 'blue'
    | 'green'
    | 'yellow'
    | 'red'
    | 'purple'
    | 'indigo'
    | 'orange';

function getStatusBadgeVariant(status: CbcAssessmentResultStatus): BadgeVariant {
    switch (status) {
        case 'FINAL':
            return 'green';
        case 'PROVISIONAL':
            return 'yellow';
        case 'INCOMPLETE':
            return 'default';
    }
}

function hasObjectValues(value: Record<string, unknown>) {
    return Object.keys(value).length > 0;
}

function JsonPanel({
    title,
    value,
}: {
    title: string;
    value: Record<string, unknown>;
}) {
    return (
        <Card>
            <div className="space-y-3">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                {hasObjectValues(value) ? (
                    <pre className="rounded-lg bg-gray-50 p-4 text-xs text-gray-700 whitespace-pre-wrap break-words">
                        {JSON.stringify(value, null, 2)}
                    </pre>
                ) : (
                    <p className="text-sm text-gray-500">No data available.</p>
                )}
            </div>
        </Card>
    );
}

function MissingComponents({ result }: { result: CbcAssessmentReportResult }) {
    if (result.missing_components.length === 0) {
        return <p className="text-sm text-gray-500">None.</p>;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {result.missing_components.map((component) => (
                <Badge key={component} variant="warning" size="sm" className="whitespace-normal break-words">
                    {component}
                </Badge>
            ))}
        </div>
    );
}

export function CBCAssessmentReportResultDetailPage() {
    const params = useParams();
    const resultId = useMemo(() => {
        const rawId = params.id;
        const value = Array.isArray(rawId) ? rawId[0] : rawId;
        const parsed = Number(value);

        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }, [params.id]);

    const {
        result,
        loading,
        error,
        refetch,
    } = useCbcAssessmentReportResult(resultId);

    if (!resultId) {
        return <CBCError error="Invalid CBC result id." />;
    }

    if (loading && !result) {
        return <CBCLoading message="Loading CBC result…" />;
    }

    if (error) {
        return <CBCError error={error} onRetry={() => { refetch(); }} />;
    }

    if (!result) {
        return <CBCError error="CBC assessment report result not found." onRetry={() => { refetch(); }} />;
    }

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb
                segments={[
                    { label: 'Results', href: '/cbc/assessment-results' },
                    { label: result.student_name },
                ]}
            />

            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-blue-50 p-3">
                        <BarChart3 className="h-7 w-7 text-blue-600" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold text-gray-900">{result.student_name}</h1>
                        <p className="text-gray-500">
                            {result.admission_number} · {result.cohort_name} · {result.subject_name} ({result.subject_code})
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Badge variant={getStatusBadgeVariant(result.result_status)} size="sm">
                                {CBC_ASSESSMENT_RESULT_STATUS_LABELS[result.result_status]}
                            </Badge>
                            <Badge variant="blue" size="sm">
                                {result.cbc_level || '—'} · {getCbcLevelLabel(result)}
                            </Badge>
                            <Badge variant={result.is_stale ? 'warning' : 'success'} size="sm">
                                {result.is_stale ? 'Needs refresh' : 'Fresh'}
                            </Badge>
                        </div>
                    </div>
                </div>

                <Link href="/cbc/assessment-results">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Back to CBC Results
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-gray-900">Result Summary</h2>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                            <div>
                                <p className="text-sm text-gray-500">Weighted score</p>
                                <p className="text-xl font-semibold text-gray-900">
                                    {formatCbcWeightedScore(result.weighted_score)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">CBC label</p>
                                <p className="text-base font-medium text-gray-900">{getCbcLevelLabel(result)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Status</p>
                                <p className="text-base font-medium text-gray-900">
                                    {CBC_ASSESSMENT_RESULT_STATUS_LABELS[result.result_status]}
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                    {CBC_ASSESSMENT_RESULT_STATUS_HELPER_TEXT[result.result_status]}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Policy</p>
                                <p className="text-base font-medium text-gray-900">{result.policy_name || '—'}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-gray-900">Context</h2>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-gray-500">Learner</p>
                                <p className="font-medium text-gray-900">{result.student_name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Admission number</p>
                                <p className="font-medium text-gray-900">{result.admission_number}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Class</p>
                                <p className="font-medium text-gray-900">{result.cohort_name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Subject</p>
                                <p className="font-medium text-gray-900">{result.subject_name} ({result.subject_code})</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Term</p>
                                <p className="font-medium text-gray-900">{result.term_name || '—'}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold text-gray-900">Timestamps</h2>
                        <div className="space-y-3 text-sm">
                            <div>
                                <p className="text-gray-500">Computed at</p>
                                <p className="font-medium text-gray-900">{formatCbcDateTime(result.computed_at)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Created at</p>
                                <p className="font-medium text-gray-900">{formatCbcDateTime(result.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Updated at</p>
                                <p className="font-medium text-gray-900">{formatCbcDateTime(result.updated_at)}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Refresh state</p>
                                <p className="font-medium text-gray-900">
                                    {result.is_stale ? 'Needs refresh from the server.' : 'Current.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            <Card>
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-gray-900">Missing Components</h2>
                    <MissingComponents result={result} />
                </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
                <JsonPanel title="Component Scores" value={result.component_scores} />
                <JsonPanel title="Diagnostic Scores" value={result.diagnostic_scores} />
            </div>

            <JsonPanel title="Computation Details" value={result.computation_details} />
        </div>
    );
}

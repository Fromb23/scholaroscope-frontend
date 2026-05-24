'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, RefreshCw } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/app/components/ui/Table';
import { useTerms } from '@/app/core/hooks/useAcademic';
import {
    CBCEmpty,
    CBCError,
    CBCLoading,
    CBCNav,
} from '@/app/plugins/cbc/components/CBCComponents';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { useCbcAssessmentReportResults } from '@/app/plugins/cbc/hooks/useCbcAssessmentReportResults';
import {
    CBC_ASSESSMENT_RESULT_STATUS_HELPER_TEXT,
    CBC_ASSESSMENT_RESULT_STATUS_LABELS,
    formatCbcDateTime,
    formatCbcWeightedScore,
    getCbcLevelLabel,
} from '@/app/plugins/cbc/lib/assessmentReportResults';
import type {
    CbcAssessmentReportResult,
    CbcAssessmentReportResultFilters,
    CbcAssessmentResultStatus,
} from '@/app/plugins/cbc/types/cbc';

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

type FreshnessFilter = 'all' | 'stale' | 'fresh';

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

function matchesSearch(result: CbcAssessmentReportResult, query: string) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;

    return (
        result.student_name.toLowerCase().includes(normalizedQuery)
        || result.admission_number.toLowerCase().includes(normalizedQuery)
    );
}

function hasMissingComponents(result: CbcAssessmentReportResult) {
    return result.missing_components.length > 0;
}

function ResultStatusBlock({ result }: { result: CbcAssessmentReportResult }) {
    return (
        <div className="space-y-1">
            <Badge variant={getStatusBadgeVariant(result.result_status)} size="sm">
                {CBC_ASSESSMENT_RESULT_STATUS_LABELS[result.result_status]}
            </Badge>
            <p className="text-xs text-gray-500">
                {CBC_ASSESSMENT_RESULT_STATUS_HELPER_TEXT[result.result_status]}
            </p>
        </div>
    );
}

function MissingComponents({ result }: { result: CbcAssessmentReportResult }) {
    if (!hasMissingComponents(result)) {
        return <span className="text-sm text-gray-500">None</span>;
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {result.missing_components.map((component) => (
                <Badge key={component} variant="warning" size="sm" className="whitespace-normal break-words">
                    {component}
                </Badge>
            ))}
        </div>
    );
}

export function CBCAssessmentReportResultsPage() {
    const router = useRouter();
    const { terms } = useTerms();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<CbcAssessmentResultStatus | ''>('');
    const [selectedFreshness, setSelectedFreshness] = useState<FreshnessFilter>('all');

    const filters = useMemo<CbcAssessmentReportResultFilters>(() => ({
        term: selectedTerm ?? undefined,
        result_status: selectedStatus || undefined,
        is_stale: selectedFreshness === 'all'
            ? undefined
            : selectedFreshness === 'stale',
    }), [selectedFreshness, selectedStatus, selectedTerm]);

    const {
        results,
        loading,
        error,
        refetch,
    } = useCbcAssessmentReportResults(filters);

    const filteredResults = useMemo(
        () => results.filter(result => matchesSearch(result, searchQuery)),
        [results, searchQuery],
    );
    const assistantContext = useMemo(() => ({
        pageKey: 'cbc_assessment_results',
        pageTitle: 'CBC Results',
        state: {
            selected_subject: '',
            selected_cohort: '',
            has_subject_filter: false,
            has_cohort_filter: false,
            is_empty: !loading && filteredResults.length === 0,
            is_loading: loading,
        },
        visibleActions: [
            {
                label: 'Refresh results',
                type: 'page_action' as const,
                target: 'refresh_cbc_results',
                handler: refetch,
            },
            {
                label: 'Browse CBC',
                type: 'navigate' as const,
                href: '/cbc/browser',
            },
            {
                label: 'Open CBC Teaching',
                type: 'navigate' as const,
                href: '/cbc/teaching',
            },
            {
                label: 'Open CBC Progress',
                type: 'navigate' as const,
                href: '/cbc/progress',
            },
            ...(filteredResults[0]
                ? [{
                    label: 'View result',
                    type: 'navigate' as const,
                    href: `/cbc/assessment-results/${filteredResults[0].id}`,
                }]
                : []),
        ],
        nextSafeAction: filteredResults[0]
            ? {
                label: 'View result',
                type: 'navigate' as const,
                href: `/cbc/assessment-results/${filteredResults[0].id}`,
            }
            : {
                label: 'Refresh results',
                type: 'page_action' as const,
                target: 'refresh_cbc_results',
                handler: refetch,
            },
        workflowStep: filteredResults.length > 0 ? 'review_cbc_results' : 'cbc_results_filters',
        emptyStateReason: !loading && filteredResults.length === 0
            ? 'No CBC assessment results match the current filters.'
            : undefined,
    }), [filteredResults, loading, refetch]);

    useAssistantPageContext(assistantContext);

    if (loading && results.length === 0) {
        return <CBCLoading message="Loading CBC assessment results…" />;
    }

    return (
        <div className="space-y-6">
            <CBCNav />

            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-blue-50 p-3">
                        <BarChart3 className="h-7 w-7 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">CBC Results</h1>
                        <p className="mt-1 text-gray-500">
                            Server-owned CBC assessment report results. This page only renders the stored result.
                        </p>
                    </div>
                </div>

                <Button type="button" variant="secondary" size="sm" onClick={() => { refetch(); }}>
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <Card>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Input
                        label="Learner Search"
                        placeholder="Search name or admission number"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />

                    <Select
                        label="Term"
                        value={selectedTerm?.toString() ?? ''}
                        onChange={(event) => setSelectedTerm(event.target.value ? Number(event.target.value) : null)}
                        options={[
                            { value: '', label: 'All terms' },
                            ...terms.map((term) => ({
                                value: String(term.id),
                                label: `${term.academic_year_name} — ${term.name}`,
                            })),
                        ]}
                    />

                    <Select
                        label="Status"
                        value={selectedStatus}
                        onChange={(event) => setSelectedStatus(event.target.value as CbcAssessmentResultStatus | '')}
                        options={[
                            { value: '', label: 'All statuses' },
                            { value: 'FINAL', label: CBC_ASSESSMENT_RESULT_STATUS_LABELS.FINAL },
                            { value: 'PROVISIONAL', label: CBC_ASSESSMENT_RESULT_STATUS_LABELS.PROVISIONAL },
                            { value: 'INCOMPLETE', label: CBC_ASSESSMENT_RESULT_STATUS_LABELS.INCOMPLETE },
                        ]}
                    />

                    <Select
                        label="Freshness"
                        value={selectedFreshness}
                        onChange={(event) => setSelectedFreshness(event.target.value as FreshnessFilter)}
                        options={[
                            { value: 'all', label: 'All results' },
                            { value: 'fresh', label: 'Fresh only' },
                            { value: 'stale', label: 'Needs refresh' },
                        ]}
                    />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span>
                        Showing {filteredResults.length} of {results.length} result{results.length !== 1 ? 's' : ''}.
                    </span>
                    {selectedFreshness === 'stale' && (
                        <Badge variant="warning" size="sm">Needs refresh from the server.</Badge>
                    )}
                </div>
            </Card>

            {error && <CBCError error={error} onRetry={() => { refetch(); }} />}

            {!error && filteredResults.length === 0 && (
                <CBCEmpty
                    icon={BarChart3}
                    title="No CBC Results Found"
                    description={results.length === 0
                        ? 'No CBC assessment report results match the selected server filters.'
                        : 'No learners match the current search.'}
                />
            )}

            {filteredResults.length > 0 && (
                <>
                    <div className="grid gap-4 lg:hidden">
                        {filteredResults.map((result) => (
                            <Link key={result.id} href={`/cbc/assessment-results/${result.id}`} className="block">
                                <Card className="p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/30">
                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h2 className="text-base font-semibold text-gray-900 break-words">
                                                    {result.student_name}
                                                </h2>
                                                <p className="text-sm text-gray-500 break-words">
                                                    {result.admission_number} · {result.cohort_name}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant={getStatusBadgeVariant(result.result_status)} size="sm">
                                                    {CBC_ASSESSMENT_RESULT_STATUS_LABELS[result.result_status]}
                                                </Badge>
                                                <Badge variant={result.is_stale ? 'warning' : 'success'} size="sm">
                                                    {result.is_stale ? 'Stale' : 'Fresh'}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-gray-500">Subject</p>
                                                <p className="font-medium text-gray-900 break-words">
                                                    {result.subject_name} ({result.subject_code})
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Weighted score</p>
                                                <p className="font-medium text-gray-900">
                                                    {formatCbcWeightedScore(result.weighted_score)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">CBC level</p>
                                                <p className="font-medium text-gray-900">
                                                    {result.cbc_level || '—'} · {getCbcLevelLabel(result)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500">Computed</p>
                                                <p className="font-medium text-gray-900">
                                                    {formatCbcDateTime(result.computed_at)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-500">
                                                {CBC_ASSESSMENT_RESULT_STATUS_HELPER_TEXT[result.result_status]}
                                            </p>
                                            {result.is_stale && (
                                                <p className="text-sm text-amber-700">Needs refresh from the server.</p>
                                            )}
                                        </div>

                                        <div>
                                            <p className="mb-2 text-sm text-gray-500">Missing components</p>
                                            <MissingComponents result={result} />
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    <div className="hidden lg:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Learner</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Weighted Score</TableHead>
                                    <TableHead>CBC Level</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Missing Components</TableHead>
                                    <TableHead>Computed</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredResults.map((result) => (
                                    <TableRow key={result.id} onClick={() => router.push(`/cbc/assessment-results/${result.id}`)}>
                                        <TableCell className="align-top">
                                            <div className="space-y-1">
                                                <p className="font-medium text-gray-900 whitespace-normal break-words">
                                                    {result.student_name}
                                                </p>
                                                <p className="text-sm text-gray-500 whitespace-normal break-words">
                                                    {result.admission_number}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top whitespace-normal break-words">
                                            {result.cohort_name}
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <div className="space-y-1">
                                                <p className="font-medium text-gray-900 whitespace-normal break-words">
                                                    {result.subject_name}
                                                </p>
                                                <p className="text-sm text-gray-500 whitespace-normal break-words">
                                                    {result.subject_code}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top font-medium text-gray-900">
                                            {formatCbcWeightedScore(result.weighted_score)}
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <div className="space-y-1">
                                                <Badge variant="blue" size="sm">
                                                    {result.cbc_level || '—'}
                                                </Badge>
                                                <p className="text-sm text-gray-500 whitespace-normal break-words">
                                                    {getCbcLevelLabel(result)}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <div className="space-y-2">
                                                <ResultStatusBlock result={result} />
                                                <Badge variant={result.is_stale ? 'warning' : 'success'} size="sm">
                                                    {result.is_stale ? 'Needs refresh' : 'Fresh'}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <MissingComponents result={result} />
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <div className="space-y-1">
                                                <p className="text-sm text-gray-900">
                                                    {formatCbcDateTime(result.computed_at)}
                                                </p>
                                                {result.is_stale && (
                                                    <p className="text-xs text-amber-700">Needs refresh from the server.</p>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
        </div>
    );
}

'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, ChevronRight, RefreshCw } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { useAuth } from '@/app/context/AuthContext';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { CBCEmpty, CBCError, CBCLoading, CBCNav } from '@/app/plugins/cbc/components/CBCComponents';
import { useCbcResultCohortOverview } from '@/app/plugins/cbc/hooks/useCbcAssessmentReportResults';
import { CBC_ASSESSMENT_RESULT_STATUS_LABELS } from '@/app/plugins/cbc/lib/assessmentReportResults';
import type { CbcAssessmentReportResultFilters, CbcAssessmentResultStatus } from '@/app/plugins/cbc/types/cbc';

type FreshnessFilter = '' | 'fresh' | 'stale';

export function CBCAssessmentReportResultsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { activeOperatingContext } = useAuth();
    const { terms } = useTerms();
    const term = Number(searchParams.get('term') ?? '') || undefined;
    const status = (searchParams.get('status') ?? '') as CbcAssessmentResultStatus | '';
    const freshness = (searchParams.get('freshness') ?? '') as FreshnessFilter;
    const authorityMode = activeOperatingContext === 'WORKSPACE_MANAGEMENT'
        ? 'supervision' as const
        : 'teaching' as const;
    const filters = useMemo<CbcAssessmentReportResultFilters>(() => ({
        term,
        result_status: status || undefined,
        freshness: freshness || undefined,
        authority_mode: authorityMode,
    }), [authorityMode, freshness, status, term]);
    const { cohorts, loading, error, refetch } = useCbcResultCohortOverview(filters);
    const currentHref = useMemo(() => {
        const query = searchParams.toString();
        return query ? `${pathname}?${query}` : pathname;
    }, [pathname, searchParams]);

    const setFilter = (key: string, value: string) => {
        const next = new URLSearchParams(searchParams.toString());
        if (value) next.set(key, value); else next.delete(key);
        router.replace(next.size ? `${pathname}?${next.toString()}` : pathname, { scroll: false });
    };

    if (loading && cohorts.length === 0) return <CBCLoading message="Loading CBC result cohorts…" />;

    return (
        <div className="space-y-6">
            <CBCNav />
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-blue-50 p-3"><BarChart3 className="h-7 w-7 text-blue-600" /></div>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">CBC Results</h1>
                        <p className="mt-1 text-gray-500">Choose a class to review its learners and subject results.</p>
                    </div>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => { void refetch(); }}>
                    <RefreshCw className="mr-1.5 h-4 w-4" />Refresh
                </Button>
            </div>

            <Card>
                <div className="grid gap-4 md:grid-cols-3">
                    <Select label="Term" value={term?.toString() ?? ''} onChange={(event) => setFilter('term', event.target.value)} options={[
                        { value: '', label: 'All terms' },
                        ...terms.map(item => ({ value: String(item.id), label: `${item.academic_year_name} — ${item.name}` })),
                    ]} />
                    <Select label="Status" value={status} onChange={(event) => setFilter('status', event.target.value)} options={[
                        { value: '', label: 'All statuses' },
                        { value: 'FINAL', label: CBC_ASSESSMENT_RESULT_STATUS_LABELS.FINAL },
                        { value: 'PROVISIONAL', label: CBC_ASSESSMENT_RESULT_STATUS_LABELS.PROVISIONAL },
                        { value: 'INCOMPLETE', label: CBC_ASSESSMENT_RESULT_STATUS_LABELS.INCOMPLETE },
                    ]} />
                    <Select label="Freshness" value={freshness} onChange={(event) => setFilter('freshness', event.target.value)} options={[
                        { value: '', label: 'All results' },
                        { value: 'fresh', label: 'Fresh only' },
                        { value: 'stale', label: 'Needs refresh' },
                    ]} />
                </div>
            </Card>

            {error ? <CBCError error={error} onRetry={() => { void refetch(); }} /> : null}
            {!error && cohorts.length === 0 ? (
                <CBCEmpty icon={BarChart3} title="No CBC result cohorts found" description="No authorized classes match these filters." />
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {cohorts.map(cohort => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('returnTo', currentHref);
                        return (
                            <Link key={cohort.cohort_id} href={`/cbc/assessment-results/cohorts/${cohort.cohort_id}?${params.toString()}`}>
                                <Card className="h-full p-5 transition-colors hover:border-blue-300">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">{cohort.cohort_name}</h2>
                                            <p className="mt-1 text-sm text-gray-500">{cohort.distinct_learner_count} distinct learners</p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                                        <div><p className="text-gray-500">Subject results</p><p className="font-semibold">{cohort.subject_result_record_count}</p></div>
                                        <div><p className="text-gray-500">Final</p><p className="font-semibold text-green-700">{cohort.final_count}</p></div>
                                        <div><p className="text-gray-500">Provisional</p><p className="font-semibold text-amber-700">{cohort.provisional_count}</p></div>
                                        <div><p className="text-gray-500">Incomplete</p><p className="font-semibold">{cohort.incomplete_count}</p></div>
                                        <div><p className="text-gray-500">Stale</p><p className="font-semibold">{cohort.stale_count}</p></div>
                                        <div><p className="text-gray-500">Missing</p><p className="font-semibold">{cohort.missing_result_count}</p></div>
                                    </div>
                                    {(status || freshness) ? <Badge className="mt-4" variant="blue" size="sm">{cohort.matching_result_count} matching records</Badge> : null}
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

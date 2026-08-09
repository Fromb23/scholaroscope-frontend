'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { useAuth } from '@/app/context/AuthContext';
import { parseAppDestination } from '@/app/core/auth/navigation';
import { CBCEmpty, CBCError, CBCLoading, CBCNav } from '@/app/plugins/cbc/components/CBCComponents';
import { useCbcLearnerAssessmentReportResults } from '@/app/plugins/cbc/hooks/useCbcAssessmentReportResults';
import { formatCbcWeightedScore, getCbcLevelLabel } from '@/app/plugins/cbc/lib/assessmentReportResults';
import type { CbcAssessmentReportResultFilters, CbcAssessmentResultStatus } from '@/app/plugins/cbc/types/cbc';

export function CBCAssessmentReportLearnerPage() {
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeOperatingContext } = useAuth();
    const cohortId = Number(params.cohortId);
    const learnerId = Number(params.learnerId);
    const subject = Number(searchParams.get('subject') ?? '') || undefined;
    const filters = useMemo<CbcAssessmentReportResultFilters>(() => ({
        term: Number(searchParams.get('term') ?? '') || undefined,
        result_status: (searchParams.get('status') || undefined) as CbcAssessmentResultStatus | undefined,
        freshness: (searchParams.get('freshness') || undefined) as 'fresh' | 'stale' | undefined,
        authority_mode: activeOperatingContext === 'WORKSPACE_MANAGEMENT' ? 'supervision' : 'teaching',
    }), [activeOperatingContext, searchParams]);
    const { results, loading, error, refetch } = useCbcLearnerAssessmentReportResults(cohortId, learnerId, filters);
    const learnerName = results[0]?.student_name ?? searchParams.get('learner_name') ?? 'Learner';
    const returnTo = parseAppDestination(searchParams.get('returnTo')) ?? '/cbc/assessment-results';
    const visibleResults = subject ? results.filter(result => result.subject_profile === subject) : results;
    const currentHref = useMemo(() => {
        const query = searchParams.toString();
        return query ? `${pathname}?${query}` : pathname;
    }, [pathname, searchParams]);

    const setSubject = (value: string) => {
        const next = new URLSearchParams(searchParams.toString());
        if (value) next.set('subject', value); else next.delete('subject');
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    };

    if (loading && results.length === 0) return <CBCLoading message="Loading learner subject results…" />;
    return (
        <div className="space-y-6">
            <CBCNav />
            <Link href={returnTo}><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back to {returnTo.includes('/cohorts/') ? 'Cohort Results' : 'CBC Results'}</Button></Link>
            <div><h1 className="text-2xl font-semibold text-gray-900">{learnerName}’s Results</h1><p className="mt-1 text-gray-500">Subject results for the inherited term and result scope.</p></div>
            <Card>
                <Select label="Subject" value={subject?.toString() ?? ''} onChange={event => setSubject(event.target.value)} options={[
                    { value: '', label: 'All subjects' },
                    ...results.map(result => ({ value: String(result.subject_profile), label: result.subject_name })),
                ]} />
            </Card>
            {error ? <CBCError error={error} onRetry={() => { void refetch(); }} /> : null}
            {!error && visibleResults.length === 0 ? <CBCEmpty icon={BookOpen} title="No subject results found" description="No stored results match this learner scope." /> : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {visibleResults.map(result => {
                        const detailParams = new URLSearchParams(searchParams.toString());
                        detailParams.set('returnTo', currentHref);
                        return (
                            <Link key={result.id} href={`/cbc/assessment-results/${result.id}?${detailParams.toString()}`}>
                                <Card className="h-full p-5 hover:border-blue-300">
                                    <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-gray-900">{result.subject_name}</h2><p className="text-sm text-gray-500">{result.subject_code}</p></div><Badge variant={result.is_stale ? 'warning' : 'success'} size="sm">{result.is_stale ? 'Stale' : 'Fresh'}</Badge></div>
                                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-gray-500">Weighted score</p><p className="font-semibold">{formatCbcWeightedScore(result.weighted_score)}</p></div><div><p className="text-gray-500">CBC level</p><p className="font-semibold">{getCbcLevelLabel(result)}</p></div></div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

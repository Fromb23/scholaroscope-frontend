'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Search, Users } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { useAuth } from '@/app/context/AuthContext';
import { useCohort } from '@/app/core/hooks/useAcademic';
import { parseAppDestination } from '@/app/core/auth/navigation';
import { CBCEmpty, CBCError, CBCLoading, CBCNav } from '@/app/plugins/cbc/components/CBCComponents';
import { useCbcResultCohortLearners } from '@/app/plugins/cbc/hooks/useCbcAssessmentReportResults';
import type { CbcAssessmentReportResultFilters, CbcAssessmentResultStatus } from '@/app/plugins/cbc/types/cbc';

export function CBCAssessmentReportCohortPage() {
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeOperatingContext } = useAuth();
    const cohortId = Number(params.cohortId);
    const { cohort } = useCohort(cohortId);
    const [searchDraft, setSearchDraft] = useState(searchParams.get('search') ?? '');
    const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
    const filters = useMemo<CbcAssessmentReportResultFilters>(() => ({
        term: Number(searchParams.get('term') ?? '') || undefined,
        result_status: (searchParams.get('status') || undefined) as CbcAssessmentResultStatus | undefined,
        freshness: (searchParams.get('freshness') || undefined) as 'fresh' | 'stale' | undefined,
        search: searchParams.get('search') || undefined,
        page,
        page_size: 25,
        authority_mode: activeOperatingContext === 'WORKSPACE_MANAGEMENT' ? 'supervision' : 'teaching',
    }), [activeOperatingContext, page, searchParams]);
    const { learners, count, next, previous, loading, error, refetch } = useCbcResultCohortLearners(cohortId, filters);
    const returnTo = parseAppDestination(searchParams.get('returnTo')) ?? '/cbc/assessment-results';
    const currentHref = useMemo(() => {
        const query = searchParams.toString();
        return query ? `${pathname}?${query}` : pathname;
    }, [pathname, searchParams]);

    const updateQuery = (updates: Record<string, string | null>) => {
        const nextParams = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, value]) => value ? nextParams.set(key, value) : nextParams.delete(key));
        router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    };

    if (loading && learners.length === 0) return <CBCLoading message="Loading class learners…" />;

    return (
        <div className="space-y-6">
            <CBCNav />
            <Link href={returnTo}><Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back to CBC Results</Button></Link>
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">{cohort?.name ?? 'Cohort'} Results</h1>
                <p className="mt-1 text-gray-500">{count} distinct learner{count === 1 ? '' : 's'} match this scope.</p>
            </div>
            <Card>
                <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => {
                    event.preventDefault();
                    updateQuery({ search: searchDraft.trim() || null, page: null });
                }}>
                    <div className="flex-1"><Input label="Learner search" value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Name or admission number" /></div>
                    <Button type="submit"><Search className="mr-2 h-4 w-4" />Search</Button>
                    {searchParams.get('search') ? <Button type="button" variant="ghost" onClick={() => { setSearchDraft(''); updateQuery({ search: null, page: null }); }}>Clear</Button> : null}
                </form>
            </Card>
            {error ? <CBCError error={error} onRetry={() => { void refetch(); }} /> : null}
            {!error && learners.length === 0 ? <CBCEmpty icon={Users} title="No learners found" description="No learner matches this server-side search and result scope." /> : (
                <div className="space-y-3">
                    {learners.map(learner => {
                        const childParams = new URLSearchParams(searchParams.toString());
                        childParams.set('returnTo', currentHref);
                        childParams.set('learner_name', learner.learner_name);
                        return (
                            <Link key={learner.learner_id} href={`${pathname}/learners/${learner.learner_id}?${childParams.toString()}`}>
                                <Card className="flex items-center justify-between gap-4 p-4 hover:border-blue-300">
                                    <div><p className="font-semibold text-gray-900">{learner.learner_name}</p><p className="text-sm text-gray-500">{learner.admission_number}</p></div>
                                    <div className="text-right text-sm"><p>{learner.subject_result_count} subject result{learner.subject_result_count === 1 ? '' : 's'}</p><p className="text-gray-500">{learner.final_count} final · {learner.stale_count} stale</p></div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
            <div className="flex items-center justify-between">
                <Button variant="secondary" disabled={!previous} onClick={() => updateQuery({ page: String(Math.max(1, page - 1)) })}>Previous</Button>
                <span className="text-sm text-gray-500">Page {page} · {count} learners</span>
                <Button variant="secondary" disabled={!next} onClick={() => updateQuery({ page: String(page + 1) })}>Next</Button>
            </div>
        </div>
    );
}

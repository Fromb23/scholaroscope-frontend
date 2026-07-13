'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { resolveTeachingError } from '@/app/core/errors';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useSubjects, useTerms, useCurrentTerm } from '@/app/core/hooks/useAcademic';
import { useLessonPlanCompliance } from '@/app/core/hooks/useLessonPlans';
import { isSafeNextPath } from '@/app/core/auth/navigation';
import type { LessonPlanComplianceQueryParams, LessonPlanComplianceRow } from '@/app/core/types/lessonPlans';

const WINDOW_OPTIONS = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'term', label: 'This Term' },
] as const;

const COMPLIANCE_OPTIONS = [
    { value: '', label: 'All compliance' },
    { value: 'COMPLETE', label: 'Complete' },
    { value: 'PARTIAL', label: 'Partial' },
    { value: 'MISSING', label: 'Missing' },
    { value: 'OVERDUE', label: 'Overdue' },
    { value: 'NOT_EXPECTED', label: 'Not expected' },
] as const;

function statusVariant(status: LessonPlanComplianceRow['status']) {
    if (status === 'COMPLETE') return 'success';
    if (status === 'OVERDUE' || status === 'MISSING') return 'danger';
    if (status === 'PARTIAL') return 'warning';
    return 'default';
}

function joinNames(items: Array<{ name: string }>) {
    return items.map((item) => item.name).filter(Boolean).join(', ') || 'Not assigned';
}

function toNumber(value: string | null): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function LessonPlanComplianceOverview() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { terms } = useTerms();
    const { currentTerm } = useCurrentTerm();
    const { subjects } = useSubjects();
    const { cohorts } = useCohorts();
    const termId = searchParams.get('term_id') || (currentTerm?.id ? String(currentTerm.id) : '');
    const windowValue = (searchParams.get('window') || 'week') as LessonPlanComplianceQueryParams['window'];
    const page = toNumber(searchParams.get('page')) ?? 1;

    useEffect(() => {
        if (searchParams.get('term_id') || !termId) return;
        const next = new URLSearchParams(searchParams.toString());
        next.set('term_id', termId);
        next.set('window', next.get('window') || 'week');
        router.replace(`/admin/lesson-plans?${next.toString()}`, { scroll: false });
    }, [router, searchParams, termId]);

    const queryParams = useMemo<LessonPlanComplianceQueryParams | null>(() => {
        if (!termId) return null;
        return {
            term_id: termId,
            window: windowValue,
            subject_id: searchParams.get('subject_id') || undefined,
            cohort_id: searchParams.get('cohort_id') || undefined,
            search: searchParams.get('search') || undefined,
            compliance: (searchParams.get('compliance') as LessonPlanComplianceQueryParams['compliance']) || '',
            page,
            page_size: 25,
        };
    }, [page, searchParams, termId, windowValue]);
    const { data, loading, error } = useLessonPlanCompliance(queryParams);
    const currentReviewHref = useMemo(() => {
        const next = new URLSearchParams(searchParams.toString());
        if (termId) {
            next.set('term_id', termId);
        }
        next.set('window', next.get('window') || windowValue || 'week');
        const query = next.toString();
        return `${pathname}${query ? `?${query}` : ''}`;
    }, [pathname, searchParams, termId, windowValue]);
    const resolvedError = error
        ? resolveTeachingError(error, {
            action: 'load',
            entityLabel: 'lesson plan compliance',
        })
        : null;

    const updateParam = (key: string, value: string) => {
        const next = new URLSearchParams(searchParams.toString());
        if (value) next.set(key, value);
        else next.delete(key);
        next.delete('page');
        if (key !== 'window') next.set('window', next.get('window') || 'week');
        router.replace(`/admin/lesson-plans?${next.toString()}`, { scroll: false });
    };

    const setCompliance = (value: string) => updateParam('compliance', value);
    const summary = data?.summary;
    const buildInstructorProgressHref = (row: LessonPlanComplianceRow) => {
        const reviewReturnTo = isSafeNextPath(currentReviewHref) ? currentReviewHref : '/admin/lesson-plans';
        const params = new URLSearchParams({
            source: 'lesson-plan-review',
            returnTo: reviewReturnTo,
        });
        if (termId) {
            params.set('review_term_id', String(termId));
        }
        if (data?.window.start_date) {
            params.set('review_start_date', data.window.start_date);
        }
        if (data?.window.end_date) {
            params.set('review_end_date', data.window.end_date);
        }
        const subjectId = searchParams.get('subject_id');
        const cohortId = searchParams.get('cohort_id');
        if (subjectId) {
            params.set('review_subject_id', subjectId);
        }
        if (cohortId) {
            params.set('review_cohort_id', cohortId);
        }
        return `/admin/instructors/${row.instructor_id}/progress?${params.toString()}#sessions`;
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold theme-text">Lesson Plan Review</h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    {WINDOW_OPTIONS.map((option) => (
                        <Button
                            key={option.value}
                            type="button"
                            size="sm"
                            variant={windowValue === option.value ? 'primary' : 'secondary'}
                            onClick={() => updateParam('window', option.value)}
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>
            </div>

            <Card>
                <div className="grid gap-3 p-4 md:grid-cols-5">
                    <Input
                        placeholder="Search teacher"
                        value={searchParams.get('search') || ''}
                        onChange={(event) => updateParam('search', event.target.value)}
                    />
                    <Select
                        value={termId}
                        onChange={(event) => updateParam('term_id', event.target.value)}
                        options={[
                            { value: '', label: 'Term' },
                            ...terms.map((term) => ({ value: term.id, label: term.name })),
                        ]}
                    />
                    <Select
                        value={searchParams.get('subject_id') || ''}
                        onChange={(event) => updateParam('subject_id', event.target.value)}
                        options={[
                            { value: '', label: 'Subject' },
                            ...subjects.map((subject) => ({ value: subject.id, label: subject.name })),
                        ]}
                    />
                    <Select
                        value={searchParams.get('cohort_id') || ''}
                        onChange={(event) => updateParam('cohort_id', event.target.value)}
                        options={[
                            { value: '', label: 'Cohort' },
                            ...cohorts.map((cohort) => ({ value: cohort.id, label: cohort.name })),
                        ]}
                    />
                    <Select
                        value={searchParams.get('compliance') || ''}
                        onChange={(event) => setCompliance(event.target.value)}
                        options={COMPLIANCE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                    />
                </div>
            </Card>

            {resolvedError ? <AppErrorBanner error={resolvedError} /> : null}

            <div className="grid gap-3 md:grid-cols-5">
                {[
                    ['Total Teachers', summary?.total_instructors ?? 0, ''],
                    ['Complete', summary?.complete ?? 0, 'COMPLETE'],
                    ['Partial', summary?.partial ?? 0, 'PARTIAL'],
                    ['Missing', summary?.missing ?? 0, 'MISSING'],
                    ['Overdue', summary?.overdue ?? 0, 'OVERDUE'],
                ].map(([label, value, filter]) => (
                    <button
                        key={label}
                        type="button"
                        onClick={() => setCompliance(String(filter))}
                        className="rounded-lg border theme-border theme-surface p-4 text-left transition-colors hover:bg-gray-50"
                    >
                        <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
                        <p className="mt-2 text-2xl font-semibold theme-text">{value}</p>
                    </button>
                ))}
            </div>

            <Card>
                {loading ? (
                    <LoadingSpinner message="Loading lesson plan compliance..." />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Instructor</TableHead>
                                <TableHead>Subjects</TableHead>
                                <TableHead>Expected</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Missing</TableHead>
                                <TableHead>Compliance</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(data?.results ?? []).map((row) => (
                                <TableRow
                                    key={row.instructor_id}
                                    onClick={() => router.push(buildInstructorProgressHref(row))}
                                >
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{row.instructor_name}</p>
                                            <p className="text-xs text-gray-500">{row.instructor_email}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>{joinNames(row.subjects)}</TableCell>
                                    <TableCell>{row.expected}</TableCell>
                                    <TableCell>{row.submitted}</TableCell>
                                    <TableCell>{row.missing}</TableCell>
                                    <TableCell>{row.compliance_percentage}%</TableCell>
                                    <TableCell><Badge variant={statusVariant(row.status)}>{row.status_label}</Badge></TableCell>
                                    <TableCell><ArrowRight className="h-4 w-4" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </div>
    );
}

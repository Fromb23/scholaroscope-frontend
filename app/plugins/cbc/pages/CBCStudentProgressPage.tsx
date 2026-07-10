'use client';

import { useCallback, useMemo, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    AlertCircle,
    BookOpen,
    CheckCircle,
    FileBarChart,
    Target,
    User,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import {
    CBCBreadcrumb,
    CBCError,
    CBCLoading,
    CBCNav,
    MasteryBadge,
    MasteryDistributionLegend,
    StrandProgressRow,
} from '@/app/plugins/cbc/components/CBCComponents';
import { useAuth } from '@/app/context/AuthContext';
import {
    buildReportReturnTo,
    resolveReportBackHref,
} from '@/app/core/components/reports/reportNavigation';
import {
    buildLearnerOverviewReportHref,
    buildLearnerSubjectReportHref,
} from '@/app/core/lib/learnerReportingRoutes';
import { CBCLearnerSummarySkeleton } from '@/app/plugins/cbc/components/progress/CBCLearnerSummarySkeleton';
import { CBCOutcomeRowsSkeleton } from '@/app/plugins/cbc/components/progress/CBCOutcomeRowsSkeleton';
import { useOutcomeProgress, useOutcomeProgressSummary } from '@/app/plugins/cbc/hooks/useCBC';
import type {
    OutcomeProgress,
    StrandMasterySummary,
    StudentProgressSubjectSummary,
    StudentProgressSummary,
} from '@/app/plugins/cbc/types/cbc';

function buildFallbackSubjects(summary: StudentProgressSummary): StudentProgressSubjectSummary[] {
    const grouped = new Map<string, StudentProgressSubjectSummary>();

    summary.strand_summary.forEach((strand) => {
        const subjectId = strand.subject_id ?? 0;
        const subjectCode = strand.subject_code ?? 'CBC';
        const subjectName = strand.subject_name ?? 'CBC Progress';
        const key = `${subjectId}:${subjectCode}:${subjectName}`;

        if (!grouped.has(key)) {
            grouped.set(key, {
                subject_id: subjectId,
                subject_name: subjectName,
                subject_code: subjectCode,
                strands: [],
                total_outcomes: 0,
                total_selected_outcomes: 0,
                taught_outcomes: 0,
                total_taught_outcomes: 0,
                not_yet_taught_count: 0,
                needs_remediation_count: 0,
                mastered_count: 0,
                total_mastered: 0,
                completion_percentage: 0,
                coverage_percentage: 0,
                taught_mastery_percentage: 0,
            });
        }

        const bucket = grouped.get(key)!;
        bucket.strands.push(strand);
        bucket.total_outcomes += strand.total_outcomes;
        bucket.total_selected_outcomes = bucket.total_outcomes;
        bucket.taught_outcomes = (bucket.taught_outcomes ?? 0) + (strand.taught_outcomes ?? 0);
        bucket.total_taught_outcomes = bucket.taught_outcomes;
        bucket.not_yet_taught_count = (bucket.not_yet_taught_count ?? 0) + (strand.not_yet_taught_count ?? 0);
        bucket.needs_remediation_count = (bucket.needs_remediation_count ?? 0) + (strand.needs_remediation_count ?? 0);
        bucket.mastered_count = (bucket.mastered_count ?? 0) + strand.mastered_count;
        bucket.total_mastered = bucket.mastered_count;
    });

    return Array.from(grouped.values()).map((subject) => ({
        ...subject,
        completion_percentage: subject.total_outcomes > 0
            ? Number((((subject.mastered_count ?? 0) / subject.total_outcomes) * 100).toFixed(2))
            : 0,
        coverage_percentage: subject.total_outcomes > 0
            ? Number((((subject.taught_outcomes ?? 0) / subject.total_outcomes) * 100).toFixed(2))
            : 0,
        taught_mastery_percentage: (subject.taught_outcomes ?? 0) > 0
            ? Number((((subject.mastered_count ?? 0) / (subject.taught_outcomes ?? 0)) * 100).toFixed(2))
            : 0,
    }));
}

function strandKey(subject: StudentProgressSubjectSummary, strand: StrandMasterySummary): string {
    return `${subject.subject_id}:${strand.strand_code}`;
}

function focusCardTone(type: 'teaching' | 'remediation' | 'track') {
    switch (type) {
        case 'teaching':
            return {
                container: 'theme-warning-surface',
                pill: 'theme-surface-elevated border theme-border',
                title: 'Needs teaching',
                icon: <AlertCircle className="h-5 w-5 text-[color:var(--color-warning)]" />,
            };
        case 'remediation':
            return {
                container: 'theme-info-surface',
                pill: 'theme-surface-elevated border theme-border',
                title: 'Needs remediation',
                icon: <Target className="h-5 w-5 text-[color:var(--color-primary)]" />,
            };
        default:
            return {
                container: 'theme-success-surface',
                pill: 'theme-surface-elevated border theme-border',
                title: 'On track',
                icon: <CheckCircle className="h-5 w-5 text-[color:var(--color-success)]" />,
            };
    }
}

function resolveSubjectReportHref(
    learnerId: number,
    subject: StudentProgressSubjectSummary,
    returnTo: string,
): string {
    const cohortSubjectId = subject.cohort_subject_id
        ?? subject.cohort_subject_ids?.[0]
        ?? subject.cbc_cohort_subject_id
        ?? subject.cbc_cohort_subject_ids?.[0]
        ?? null;
    return buildLearnerSubjectReportHref(learnerId, cohortSubjectId, { returnTo });
}

export function CBCStudentProgressPage() {
    const { studentId: raw } = useParams<{ studentId: string }>();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const studentId = Number(raw);
    const { user, activeRole } = useAuth();
    const { data: summary, isLoading: summaryLoading, error: summaryError, refetch } =
        useOutcomeProgressSummary(studentId);
    const { data: recordsRaw, isLoading: recordsLoading } = useOutcomeProgress(studentId);
    const [expandedStrands, setExpandedStrands] = useState<Set<string>>(new Set());

    const records: OutcomeProgress[] = useMemo(() => {
        if (!recordsRaw) return [];
        return Array.isArray(recordsRaw)
            ? recordsRaw
            : (recordsRaw as { results?: OutcomeProgress[] }).results ?? [];
    }, [recordsRaw]);
    const recordsByOutcomeId = useMemo(
        () => new Map(records.map((record) => [record.learning_outcome, record])),
        [records],
    );
    const subjectGroups = useMemo(
        () => (summary?.subjects?.length ? summary.subjects : summary ? buildFallbackSubjects(summary) : []),
        [summary],
    );
    const allStrands = useMemo(
        () => subjectGroups.flatMap((subject) => subject.strands.map((strand) => ({ subject, strand }))),
        [subjectGroups],
    );
    const needsTeaching = useMemo(
        () => allStrands.filter(({ strand }) => (strand.not_yet_taught_count ?? 0) > 0),
        [allStrands],
    );
    const needsRemediation = useMemo(
        () => allStrands.filter(({ strand }) => (strand.needs_remediation_count ?? 0) > 0),
        [allStrands],
    );
    const onTrack = useMemo(
        () => allStrands.filter(({ strand }) => strand.status === 'ON_TRACK'),
        [allStrands],
    );
    const canGenerateOverviewReport = !!user && activeRole === 'ADMIN';
    const canGenerateSubjectReport = !!user && (activeRole === 'ADMIN' || activeRole === 'INSTRUCTOR');
    const currentReturnTo = buildReportReturnTo(pathname, searchParams.toString());
    const backHref = resolveReportBackHref({
        returnTo: searchParams.get('returnTo'),
        fallbackHref: `/learners/${studentId}`,
    });

    const toggleStrand = useCallback((key: string) => {
        setExpandedStrands((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    if (summaryLoading) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCLoading message="Loading CBC progress for this learner..." />
                <CBCLearnerSummarySkeleton />
            </div>
        );
    }

    if (summaryError || !summary) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCError error={summaryError ?? 'Progress data not found'} onRetry={refetch} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb
                segments={[
                    { label: 'Progress', href: '/cbc/progress' },
                    { label: summary.student.name },
                ]}
            />

            <Link href={backHref}>
                <Button variant="ghost" size="md">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </Link>

            <Card className="theme-surface-elevated">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="theme-card flex h-14 w-14 items-center justify-center rounded-xl">
                            <User className="h-7 w-7 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold theme-text">{summary.student.name}</h1>
                            <p className="mt-1 text-sm theme-muted">
                                Admission <span className="font-medium theme-text">{summary.student.admission_number}</span>
                            </p>
                        </div>
                    </div>

                    <div className="text-left sm:text-right">
                        <p className="text-xs font-medium uppercase tracking-wide theme-subtle">
                            Overall Mastery
                        </p>
                        <div className="mt-1 flex items-baseline gap-1 sm:justify-end">
                            <span className="text-4xl font-bold text-blue-600">
                                {summary.overall_mastery_percentage}
                            </span>
                            <span className="text-xl font-semibold text-blue-400">%</span>
                        </div>
                    </div>
                </div>

                {canGenerateSubjectReport ? (
                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-4 theme-border">
                        {subjectGroups.length > 0 ? (
                            <Link href={resolveSubjectReportHref(studentId, subjectGroups[0], currentReturnTo)}>
                                <Button variant="secondary" size="md">
                                    <FileBarChart className="h-4 w-4" />
                                    Generate Subject Report
                                </Button>
                            </Link>
                        ) : null}
                        {canGenerateOverviewReport ? (
                            <Link href={buildLearnerOverviewReportHref(studentId, { returnTo: currentReturnTo })}>
                                <Button size="md">
                                    <FileBarChart className="h-4 w-4" />
                                    Generate Overall Report
                                </Button>
                            </Link>
                        ) : null}
                    </div>
                ) : null}
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        title: 'Selected Outcomes',
                        value: summary.total_selected_outcomes ?? summary.total_outcomes,
                        color: 'text-blue-600',
                    },
                    {
                        title: 'Covered',
                        value: summary.total_taught_outcomes ?? 0,
                        color: 'text-amber-600',
                    },
                    {
                        title: 'Mastered',
                        value: summary.total_mastered,
                        color: 'text-emerald-600',
                    },
                    {
                        title: 'Coverage',
                        value: `${summary.overall_coverage_percentage ?? 0}%`,
                        color: 'text-purple-600',
                    },
                ].map((stat) => (
                    <Card key={stat.title} className="theme-card">
                        <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="mt-1 text-sm theme-muted">{stat.title}</div>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                {[
                    {
                        key: 'teaching',
                        items: needsTeaching,
                        description: 'Selected outcomes that have not been taught or evidenced yet.',
                    },
                    {
                        key: 'remediation',
                        items: needsRemediation,
                        description: 'Taught strands where mastery is still below target.',
                    },
                    {
                        key: 'track',
                        items: onTrack,
                        description: 'Strands where taught outcomes are currently on track.',
                    },
                ].map(({ key, items, description }) => {
                    const tone = focusCardTone(key as 'teaching' | 'remediation' | 'track');

                    return (
                        <Card key={key} className={tone.container}>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.pill}`}>
                                        {tone.icon}
                                    </div>
                                    <div>
                                        <h2 className="text-base font-semibold theme-text">{tone.title}</h2>
                                        <p className="text-sm theme-muted">{description}</p>
                                    </div>
                                </div>

                                {items.length === 0 ? (
                                    <p className="text-sm theme-muted">No strands in this category.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {items.slice(0, 4).map(({ subject, strand }) => (
                                            <div key={`${key}:${strandKey(subject, strand)}`} className="theme-surface-elevated rounded-lg border p-3 theme-border">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="blue" size="sm">{subject.subject_code}</Badge>
                                                    <span className="text-sm font-medium theme-text">{strand.strand_name}</span>
                                                </div>
                                                <p className="mt-1 text-sm theme-muted">
                                                    {key === 'teaching'
                                                        ? `${strand.not_yet_taught_count ?? 0} not yet covered`
                                                        : key === 'remediation'
                                                            ? `${strand.needs_remediation_count ?? 0} taught outcomes need support`
                                                            : `${strand.mastered_count} of ${strand.total_outcomes} outcomes mastered`}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>

            <Card className="theme-card">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-semibold theme-text">
                            <BookOpen className="h-5 w-5 text-blue-600" />
                            Progress by Subject and Strand
                        </h2>
                        <p className="mt-1 text-sm theme-muted">
                            Expand a strand to review recorded per-outcome progress.
                        </p>
                    </div>
                    <MasteryDistributionLegend />
                </div>

                <div className="space-y-4">
                    {subjectGroups.map((subject) => (
                        <div key={`${subject.subject_id}:${subject.subject_code}`} className="rounded-xl border theme-border">
                            <div className="theme-card-muted border-b px-4 py-3 theme-border">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="indigo">{subject.subject_code}</Badge>
                                            <h3 className="text-base font-semibold theme-text">{subject.subject_name}</h3>
                                        </div>
                                        <p className="mt-2 text-sm theme-muted">
                                            {subject.total_selected_outcomes ?? subject.total_outcomes} selected · {subject.total_taught_outcomes ?? subject.taught_outcomes ?? 0} covered · {subject.total_mastered ?? subject.mastered_count ?? 0} mastered
                                        </p>
                                    </div>

                                    {canGenerateSubjectReport ? (
                                        <Link href={resolveSubjectReportHref(studentId, subject, currentReturnTo)}>
                                            <Button variant="ghost" size="sm">
                                                <FileBarChart className="h-4 w-4" />
                                                Subject Report
                                            </Button>
                                        </Link>
                                    ) : null}
                                </div>
                            </div>

                            <div className="space-y-2 p-3">
                                {subject.strands.map((strand) => {
                                    const key = strandKey(subject, strand);
                                    const isOpen = expandedStrands.has(key);
                                    const detailRows = (strand.selected_outcome_ids?.length ?? 0) > 0
                                        ? strand.selected_outcome_ids!
                                            .map((outcomeId) => recordsByOutcomeId.get(outcomeId))
                                            .filter((record): record is OutcomeProgress => Boolean(record))
                                        : records.filter((record) => record.learning_outcome_code
                                            .toUpperCase()
                                            .startsWith(strand.strand_code.toUpperCase()));

                                    return (
                                        <div key={key} className="overflow-hidden rounded-lg border theme-border">
                                            <button
                                                type="button"
                                                onClick={() => toggleStrand(key)}
                                                className="w-full px-4 py-4 text-left transition-colors hover:bg-[color:var(--color-surface-muted)]"
                                            >
                                                <div className="mb-3 flex items-center gap-3">
                                                    <div className="shrink-0">
                                                        {isOpen
                                                            ? <ChevronDown className="h-5 w-5 text-blue-600" />
                                                            : <ChevronRight className="h-5 w-5 theme-subtle" />}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge variant="blue" size="md" className="font-mono">
                                                            {strand.strand_code}
                                                        </Badge>
                                                        {strand.status ? (
                                                            <span className="rounded-full theme-card-muted px-2.5 py-1 text-xs font-medium theme-muted">
                                                                {strand.status === 'NEEDS_TEACHING'
                                                                    ? 'Needs teaching'
                                                                    : strand.status === 'NEEDS_REMEDIATION'
                                                                        ? 'Needs remediation'
                                                                        : strand.status === 'MIXED'
                                                                            ? 'Teaching and remediation'
                                                                            : 'On track'}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <StrandProgressRow
                                                    strandCode={strand.strand_code}
                                                    strandName={strand.strand_name}
                                                    totalOutcomes={strand.total_outcomes}
                                                    completedOutcomes={strand.mastered_count}
                                                    percentage={strand.completion_percentage}
                                                    masteryDistribution={strand.mastery_distribution}
                                                />

                                                <div className="mt-3 flex flex-wrap gap-2 text-xs theme-muted">
                                                    <span className="rounded-full theme-card-muted px-2.5 py-1">
                                                        Covered: {strand.taught_outcomes ?? 0}/{strand.total_outcomes}
                                                    </span>
                                                    <span className="rounded-full theme-card-muted px-2.5 py-1">
                                                        Not yet covered: {strand.not_yet_taught_count ?? 0}
                                                    </span>
                                                    <span className="rounded-full theme-card-muted px-2.5 py-1">
                                                        Needs support: {strand.needs_remediation_count ?? 0}
                                                    </span>
                                                </div>
                                            </button>

                                            {isOpen ? (
                                                <div className="border-t px-4 py-4 theme-border theme-surface-elevated">
                                                    {recordsLoading ? (
                                                        <>
                                                            <CBCLoading message={`Loading outcomes for ${strand.strand_name}...`} />
                                                            <CBCOutcomeRowsSkeleton />
                                                        </>
                                                    ) : detailRows.length === 0 ? (
                                                        <p className="py-4 text-center text-sm italic theme-muted">
                                                            No outcome progress records yet.
                                                        </p>
                                                    ) : (
                                                        <div className="overflow-hidden rounded-lg border theme-border">
                                                            <table className="w-full text-sm">
                                                                <thead className="theme-card-muted">
                                                                    <tr className="text-left">
                                                                        <th className="px-4 py-3 text-xs font-medium uppercase theme-subtle">Outcome</th>
                                                                        <th className="px-4 py-3 text-xs font-medium uppercase theme-subtle">Mastery</th>
                                                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase theme-subtle">Evidence</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {detailRows.map((row) => (
                                                                        <tr key={row.id} className="border-t theme-border">
                                                                            <td className="px-4 py-3">
                                                                                <Badge variant="indigo" size="sm" className="font-mono">
                                                                                    {row.learning_outcome_code}
                                                                                </Badge>
                                                                            </td>
                                                                            <td className="px-4 py-3">
                                                                                <MasteryBadge level={row.mastery_level} size="sm" />
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right">
                                                                                <Badge variant="default" size="sm">
                                                                                    {row.evidence_count}
                                                                                </Badge>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}

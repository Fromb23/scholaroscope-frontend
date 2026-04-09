'use client';

import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Target, ChevronDown, ChevronRight,
    User, AlertCircle, CheckCircle,
} from 'lucide-react';
import { useOutcomeProgressSummary, useOutcomeProgress } from '@/app/plugins/cbc/hooks/useCBC';
import {
    CBCNav, CBCBreadcrumb, CBCError, CBCLoading,
    StrandProgressRow, MasteryBadge, MasteryDistributionLegend,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import type { OutcomeProgress, StrandMasterySummary } from '@/app/plugins/cbc/types/cbc';

export default function StudentProgressPage() {
    const { studentId: raw } = useParams<{ studentId: string }>();
    const studentId = Number(raw);

    const { data: summary, isLoading: summaryLoading, error: summaryError, refetch } =
        useOutcomeProgressSummary(studentId);
    const { data: recordsRaw, isLoading: recordsLoading } =
        useOutcomeProgress(studentId);

    const records: OutcomeProgress[] = useMemo(() => {
        if (!recordsRaw) return [];
        return Array.isArray(recordsRaw)
            ? recordsRaw
            : (recordsRaw as { results?: OutcomeProgress[] }).results ?? [];
    }, [recordsRaw]);

    const [expandedStrands, setExpandedStrands] = useState<Set<string>>(new Set());
    const toggleStrand = useCallback((code: string) => {
        setExpandedStrands(prev => {
            const next = new Set(prev);
            next.has(code) ? next.delete(code) : next.add(code);
            return next;
        });
    }, []);

    const recordsByStrand = useMemo(() => {
        if (!summary) return {} as Record<string, OutcomeProgress[]>;
        const map: Record<string, OutcomeProgress[]> = {};
        for (const strand of summary.strand_summary) {
            map[strand.strand_code] = records.filter(r =>
                r.learning_outcome_code
                    .toUpperCase()
                    .startsWith(strand.strand_code.toUpperCase())
            );
        }
        return map;
    }, [summary, records]);

    const weakStrands = useMemo(
        () => summary?.strand_summary.filter(
            (s: StrandMasterySummary) => s.completion_percentage < 50
        ) ?? [],
        [summary],
    );

    if (summaryLoading) return (
        <div className="space-y-6">
            <CBCNav /><CBCLoading message="Loading progress data…" />
        </div>
    );

    if (summaryError || !summary) return (
        <div className="space-y-6">
            <CBCNav />
            <CBCError error={summaryError ?? 'Progress data not found'} onRetry={refetch} />
        </div>
    );

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Progress', href: '/cbc/progress' },
                { label: summary.student.name },
            ]} />

            <Link href={`/learners/${studentId}`}>
                <Button variant="ghost" size="md">
                    <ArrowLeft className="mr-2 h-4 w-4" />Back to Learner Profile
                </Button>
            </Link>

            {/* Student banner */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center
                    justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                            <User className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {summary.student.name}
                            </h1>
                            <p className="text-sm text-gray-600 mt-0.5">
                                Admission:{' '}
                                <span className="font-medium">
                                    {summary.student.admission_number}
                                </span>
                            </p>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className="text-xs text-gray-500 uppercase tracking-wide
                            font-medium mb-1">
                            Overall Mastery
                        </p>
                        <div className="flex items-baseline gap-1">
                            <p className="text-5xl font-bold text-blue-600">
                                {summary.overall_mastery_percentage}
                            </p>
                            <p className="text-2xl font-semibold text-blue-400">%</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    {
                        title: 'Total Outcomes',
                        value: summary.total_outcomes,
                        color: 'text-blue-600',
                    },
                    {
                        title: 'Mastered',
                        value: summary.total_mastered,
                        color: 'text-emerald-600',
                    },
                    {
                        title: 'Mastery Rate',
                        value: `${summary.overall_mastery_percentage}%`,
                        color: 'text-purple-600',
                    },
                ].map(s => (
                    <Card key={s.title} className="text-center">
                        <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-sm text-gray-500 mt-1">{s.title}</div>
                    </Card>
                ))}
            </div>

            {/* Strand progress */}
            <Card>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between
                    gap-3 mb-5">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center
                            gap-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            Progress by Strand
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Click any strand for per-outcome detail
                        </p>
                    </div>
                    <MasteryDistributionLegend />
                </div>

                <div className="space-y-2">
                    {summary.strand_summary.map((strand: StrandMasterySummary) => {
                        const isOpen = expandedStrands.has(strand.strand_code);
                        const detailRows = isOpen && !recordsLoading
                            ? (recordsByStrand[strand.strand_code] ?? [])
                            : [];

                        return (
                            <div key={strand.strand_code}
                                className="border border-gray-200 rounded-xl overflow-hidden
                                    hover:border-gray-300 transition-colors">
                                <button
                                    type="button"
                                    onClick={() => toggleStrand(strand.strand_code)}
                                    className="w-full text-left hover:bg-gray-50 p-4
                                        transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="shrink-0">
                                            {isOpen
                                                ? <ChevronDown className="h-5 w-5 text-blue-600" />
                                                : <ChevronRight className="h-5 w-5 text-gray-400" />
                                            }
                                        </div>
                                        <Badge variant="blue" size="md" className="font-mono">
                                            {strand.strand_code}
                                        </Badge>
                                    </div>
                                    <StrandProgressRow
                                        strandCode={strand.strand_code}
                                        strandName={strand.strand_name}
                                        totalOutcomes={strand.total_outcomes}
                                        completedOutcomes={strand.mastered_count}
                                        percentage={strand.completion_percentage}
                                        masteryDistribution={strand.mastery_distribution}
                                    />
                                </button>

                                {isOpen && (
                                    <div className="border-t border-gray-100 bg-white p-4">
                                        {recordsLoading ? (
                                            <CBCLoading message="Loading outcomes…" />
                                        ) : detailRows.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic py-4
                                                text-center">
                                                No outcome progress records yet
                                            </p>
                                        ) : (
                                            <div className="rounded-lg border border-gray-200
                                                overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-50 text-left">
                                                            <th className="px-4 py-3 text-xs
                                                                font-medium text-gray-600
                                                                uppercase">
                                                                Code
                                                            </th>
                                                            <th className="px-4 py-3 text-xs
                                                                font-medium text-gray-600
                                                                uppercase">
                                                                Mastery
                                                            </th>
                                                            <th className="px-4 py-3 text-xs
                                                                font-medium text-gray-600
                                                                uppercase text-right">
                                                                Evidence
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {detailRows.map((row: OutcomeProgress) => (
                                                            <tr key={row.id}
                                                                className="hover:bg-gray-50">
                                                                <td className="px-4 py-3">
                                                                    <Badge variant="indigo"
                                                                        size="sm"
                                                                        className="font-mono">
                                                                        {row.learning_outcome_code}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <MasteryBadge
                                                                        level={row.mastery_level}
                                                                        size="sm"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3
                                                                    text-right">
                                                                    <Badge variant="default"
                                                                        size="sm">
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
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Focus areas */}
            {weakStrands.length === 0 ? (
                <Card className="border-emerald-200 bg-emerald-50">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-100 rounded-xl shrink-0">
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                Excellent Progress!
                            </h3>
                            <p className="text-sm text-gray-700">
                                All strands are at or above 50% mastery.
                            </p>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card className="border-amber-200 bg-amber-50">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                            <AlertCircle className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                Focus Areas
                            </h3>
                            <p className="text-sm text-gray-700 mb-4">
                                These strands need attention.
                            </p>
                            <div className="space-y-2">
                                {weakStrands.map((s: StrandMasterySummary) => (
                                    <div key={s.strand_code}
                                        className="flex items-center gap-3 p-3 bg-white
                                            border border-amber-200 rounded-lg">
                                        <div className="h-2.5 w-2.5 rounded-full
                                            bg-amber-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <Badge variant="orange" size="sm"
                                                    className="font-mono">
                                                    {s.strand_code}
                                                </Badge>
                                                <p className="font-medium text-gray-900 truncate">
                                                    {s.strand_name}
                                                </p>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                <span className="font-semibold text-amber-700">
                                                    {s.completion_percentage}%
                                                </span>
                                                {' — '}
                                                {s.mastered_count} of {s.total_outcomes} outcomes
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
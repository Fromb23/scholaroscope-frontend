// ============================================================================
// app/(dashboard)/cbc/progress/learner/[studentId]/page.tsx — Student Progress - REDESIGNED
// ============================================================================

'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Award,
    Target,
    TrendingUp,
    ChevronDown,
    ChevronRight,
    User,
    AlertCircle,
    CheckCircle
} from 'lucide-react';
import { useOutcomeProgressSummary, useOutcomeProgress } from '@/app/plugins/cbc/hooks/useCBC';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import {
    StrandProgressRow,
    MasteryBadge,
    MasteryDistributionLegend,
} from '@/app/plugins/cbc/components/CBCComponents';

export default function StudentProgressPage() {
    const params = useParams();
    const studentId = Number(params.studentId);

    // Strand-grouped summary from cache
    const { summary, loading: summaryLoading } = useOutcomeProgressSummary(studentId);
    // Raw per-outcome records (for expanded detail rows)
    const { records, loading: recordsLoading } = useOutcomeProgress(studentId);

    // Which strands are expanded
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const toggleStrand = (code: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(code) ? next.delete(code) : next.add(code);
            return next;
        });
    };

    // Index raw records by strand_name for quick lookup in expanded rows.
    const recordsByStrand = useMemo(() => {
        if (!summary) return {};
        const map: Record<string, typeof records> = {};
        for (const strand of summary.strand_summary) {
            map[strand.strand_code] = records.filter(r =>
                r.learning_outcome_code.toUpperCase().includes(strand.strand_code.toUpperCase())
            );
        }
        return map;
    }, [summary, records]);

    const weakStrands = useMemo(
        () => summary?.strand_summary.filter(s => s.completion_percentage < 50) ?? [],
        [summary]
    );

    // ---------------------------------------------------------------
    if (summaryLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="text-sm text-gray-500">Loading progress data...</p>
                </div>
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="py-20 text-center max-w-md mx-auto">
                <User className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-1">Progress data not found</p>
                <p className="text-sm text-gray-500 mb-4">Unable to load progress data for this learner.</p>
                <Link href="/learners">
                    <Button variant="primary">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Learners
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* CBC nav */}
            <nav className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
                <Link
                    href="/cbc/authoring"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Authoring
                </Link>
                <Link
                    href="/cbc/browser"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Browser
                </Link>
                <Link
                    href="/cbc/progress"
                    className="flex-1 text-center text-sm font-semibold text-white bg-blue-600 rounded-lg py-2.5 shadow-sm"
                >
                    Progress
                </Link>
                <Link
                    href="/cbc/teaching"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Teaching
                </Link>
            </nav>

            {/* Back */}
            <Link href={`/learners/${studentId}`}>
                <Button variant="ghost" size="md" className="hover:bg-gray-100">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Learner Profile
                </Button>
            </Link>

            {/* Student banner */}
            <Card className="shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm">
                            <User className="h-8 w-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{summary.student.name}</h1>
                            <p className="text-sm text-gray-600 mt-0.5">
                                Admission: <span className="font-medium">{summary.student.admission_number}</span>
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatsCard
                    title="Total Outcomes"
                    value={summary.total_outcomes}
                    icon={Target}
                    color="blue"
                />
                <StatsCard
                    title="Mastered"
                    value={summary.total_mastered}
                    icon={Award}
                    color="green"
                />
                <StatsCard
                    title="Mastery Rate"
                    value={`${summary.overall_mastery_percentage}%`}
                    icon={TrendingUp}
                    color="purple"
                />
            </div>

            {/* Strand progress — expandable */}
            <Card className="shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            Progress by Strand
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Click any strand to view detailed per-outcome mastery
                        </p>
                    </div>
                    <MasteryDistributionLegend />
                </div>

                <div className="mt-5 space-y-2">
                    {summary.strand_summary.map(strand => {
                        const isOpen = expanded.has(strand.strand_code);
                        const detailRows = isOpen && !recordsLoading ? (recordsByStrand[strand.strand_code] ?? []) : [];

                        return (
                            <div
                                key={strand.strand_code}
                                className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors"
                            >
                                {/* Toggle button wrapping the strand row */}
                                <button
                                    type="button"
                                    onClick={() => toggleStrand(strand.strand_code)}
                                    className="w-full text-left hover:bg-gray-50 rounded-t-xl transition-colors p-4"
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
                                        <span className="text-sm font-medium text-gray-700">
                                            Click to {isOpen ? 'collapse' : 'expand'} details
                                        </span>
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

                                {/* Expanded: per-outcome table */}
                                {isOpen && (
                                    <div className="border-t border-gray-100 bg-white p-4">
                                        {recordsLoading ? (
                                            <div className="py-8 text-center">
                                                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
                                                <p className="text-sm text-gray-500">Loading outcomes...</p>
                                            </div>
                                        ) : detailRows.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic py-4 text-center">
                                                No outcome progress records yet for this strand
                                            </p>
                                        ) : (
                                            <div className="rounded-lg border border-gray-200 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-50 text-left">
                                                            <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase">Code</th>
                                                            <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase">Mastery Level</th>
                                                            <th className="px-4 py-3 font-medium text-gray-600 text-xs uppercase text-right">Evidence</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {detailRows.map((row) => (
                                                            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
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
                                                                        {row.evidence_count} item{row.evidence_count !== 1 ? 's' : ''}
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
                <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-100 rounded-xl shrink-0">
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                Excellent Progress!
                            </h3>
                            <p className="text-sm text-gray-700">
                                All strands are at or above 50% mastery. Continue with evidence collection and assessments to maintain this momentum.
                            </p>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                            <AlertCircle className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                Focus Areas
                            </h3>
                            <p className="text-sm text-gray-700 mb-4">
                                These strands need attention. Consider targeted support or additional evidence collection.
                            </p>
                            <div className="space-y-3">
                                {weakStrands.map(s => (
                                    <div
                                        key={s.strand_code}
                                        className="flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-lg"
                                    >
                                        <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Badge variant="orange" size="sm" className="font-mono">
                                                    {s.strand_code}
                                                </Badge>
                                                <p className="font-medium text-gray-900 truncate">{s.strand_name}</p>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                <span className="font-semibold text-amber-700">{s.completion_percentage}%</span>
                                                {' '}mastery — {s.mastered_count} of {s.total_outcomes} outcomes mastered
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
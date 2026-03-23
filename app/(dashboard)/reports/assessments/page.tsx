'use client';

// ============================================================================
// app/(dashboard)/reports/assessments/page.tsx — render only
// ============================================================================

import { useState } from 'react';
import { PieChart, Award, TrendingUp, Target } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useAssessmentTypeSummaries } from '@/app/core/hooks/useReporting';
import { useTerms } from '@/app/core/hooks/useAcademic';

const TYPE_COLOR: Record<string, string> = {
    CAT: 'bg-blue-50   border-blue-200   text-blue-600',
    TEST: 'bg-purple-50 border-purple-200 text-purple-600',
    MAIN_EXAM: 'bg-orange-50 border-orange-200 text-orange-600',
    PROJECT: 'bg-green-50  border-green-200  text-green-600',
    ASSIGNMENT: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    PRACTICAL: 'bg-indigo-50 border-indigo-200 text-indigo-600',
    COMPETENCY: 'bg-teal-50   border-teal-200   text-teal-600',
};

export default function AssessmentsReportPage() {
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const { terms, loading: termsLoading } = useTerms();
    const { summaries, loading, error } = useAssessmentTypeSummaries({
        term: selectedTerm ?? undefined,
    });

    const totalAssessments = summaries.reduce((s, r) => s + r.total_assessments, 0);
    const avgScore = summaries.length
        ? summaries.reduce((s, r) => s + (r.average_score ?? 0), 0) / summaries.length
        : 0;

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Assessment Reports</h1>
                    <p className="text-gray-500 mt-1">
                        Assessment type analysis and pedagogy insights.
                    </p>
                </div>
                <PieChart className="h-7 w-7 text-orange-500" />
            </div>

            {/* Stats */}
            {summaries.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatsCard title="Type Records" value={summaries.length} icon={PieChart} color="blue" />
                    <StatsCard title="Avg Score" value={`${avgScore.toFixed(1)}%`} icon={Target} color="green" />
                    <StatsCard title="Total Assessments" value={totalAssessments} icon={Award} color="purple" />
                    <StatsCard title="Subjects Covered" value={new Set(summaries.map(s => s.subject_name)).size} icon={TrendingUp} color="orange" />
                </div>
            )}

            {/* Filter */}
            <Card>
                <Select
                    label="Select Term"
                    value={selectedTerm?.toString() ?? ''}
                    onChange={e => setSelectedTerm(e.target.value ? Number(e.target.value) : null)}
                    disabled={termsLoading}
                    options={[
                        { value: '', label: 'Select term…' },
                        ...terms.map(t => ({
                            value: String(t.id),
                            label: `${t.academic_year_name} — ${t.name}`,
                        })),
                    ]}
                />
            </Card>

            {error && <ErrorBanner message={error} onDismiss={() => { }} />}
            {loading && <LoadingSpinner />}

            {/* Empty */}
            {!loading && !selectedTerm && (
                <Card>
                    <div className="py-16 text-center">
                        <PieChart className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-3 text-sm text-gray-500">Select a term to view assessment data.</p>
                    </div>
                </Card>
            )}

            {/* Cards grid */}
            {!loading && summaries.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {summaries.map(s => {
                        const colorClass = TYPE_COLOR[s.assessment_type] ?? 'bg-gray-50 border-gray-200 text-gray-600';
                        return (
                            <div key={s.id}
                                className={`rounded-2xl border p-5 ${colorClass.split(' ').slice(0, 2).join(' ')}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <Badge variant="default">{s.assessment_type}</Badge>
                                    <Award className="h-4 w-4 text-gray-400" />
                                </div>
                                <p className="font-semibold text-gray-900">{s.subject_name}</p>
                                <p className="text-sm text-gray-500 mb-4">{s.cohort_name}</p>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-0.5">Avg Score</p>
                                        <p className={`text-2xl font-bold ${colorClass.split(' ')[2]}`}>
                                            {s.average_score?.toFixed(1) ?? '—'}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-0.5">Assessments</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {s.total_assessments}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full ${colorClass.split(' ')[2].replace('text', 'bg')}`}
                                                style={{ width: `${Math.min((s.average_score ?? 0), 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500">{s.term_name}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* No data */}
            {!loading && selectedTerm && summaries.length === 0 && (
                <Card>
                    <div className="py-12 text-center">
                        <PieChart className="mx-auto h-10 w-10 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">No assessment data for this term.</p>
                    </div>
                </Card>
            )}

        </div>
    );
}
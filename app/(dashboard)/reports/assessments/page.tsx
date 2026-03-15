'use client';

import { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useAssessmentTypeSummaries } from '@/app/core/hooks/useReporting';
import { PieChart, Award, TrendingUp, Target } from 'lucide-react';

export default function AssessmentsReportPage() {
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);

    const { terms, loading: termsLoading } = useTerms();
    const { summaries, loading } = useAssessmentTypeSummaries({ term: selectedTerm || undefined });

    const getTypeColor = (type: string): 'blue' | 'purple' | 'orange' | 'green' | 'yellow' | 'indigo' | 'teal' => {
        const colors: { [key: string]: 'blue' | 'purple' | 'orange' | 'green' | 'yellow' | 'indigo' | 'teal' } = {
            'CAT': 'blue',
            'TEST': 'purple',
            'MAIN_EXAM': 'orange',
            'PROJECT': 'green',
            'ASSIGNMENT': 'yellow',
            'PRACTICAL': 'indigo',
            'COMPETENCY': 'teal'
        };
        return colors[type] || 'blue';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Assessment Reports</h1>
                    <p className="mt-2 text-gray-600">Assessment type analysis & pedagogy insights</p>
                </div>
                <PieChart className="h-8 w-8 text-blue-600" />
            </div>

            {/* Stats Overview */}
            {summaries && summaries.length > 0 && (
                <div className="grid gap-4 md:grid-cols-4">
                    <StatsCard
                        title="Total Records"
                        value={summaries.length}
                        icon={PieChart}
                        color="blue"
                    />
                    <StatsCard
                        title="Avg Score"
                        value={`${(summaries.reduce((acc, s) => acc + (s.average_score || 0), 0) / summaries.length).toFixed(1)}%`}
                        icon={Target}
                        color="green"
                    />
                    <StatsCard
                        title="Total Assessments"
                        value={summaries.reduce((acc, s) => acc + s.total_assessments, 0)}
                        icon={Award}
                        color="purple"
                    />
                    <StatsCard
                        title="Total Weight"
                        value={summaries.reduce((acc, s) => acc + s.total_weight, 0).toFixed(1)}
                        icon={TrendingUp}
                        color="orange"
                    />
                </div>
            )}

            {/* Term Filter */}
            <Card>
                <Select
                    label="Select Term"
                    value={selectedTerm?.toString() || ''}
                    onChange={(e) => setSelectedTerm(e.target.value ? Number(e.target.value) : null)}
                    options={[
                        { value: '', label: 'Select term...' },
                        ...terms.map(term => ({
                            value: String(term.id),
                            label: `${term.academic_year_name} — ${term.name}`
                        }))
                    ]}
                    disabled={termsLoading}
                />
            </Card>

            {/* Assessment Type Cards */}
            {loading ? (
                <Card>
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-gray-600">Loading assessments...</p>
                    </div>
                </Card>
            ) : summaries && summaries.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {summaries.map((summary) => (
                        <Card key={summary.id} className="hover:shadow-lg transition-shadow">
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <Badge variant="default">{summary.assessment_type}</Badge>
                                    <Award className="h-5 w-5 text-gray-400" />
                                </div>
                                <h3 className="font-semibold text-gray-900">{summary.subject_name}</h3>
                                <p className="text-sm text-gray-500">{summary.cohort_name}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1">Average Score</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {summary.average_score?.toFixed(1) || 'N/A'}%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 mb-1">Total Weight</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {summary.total_weight.toFixed(1)}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-200">
                                    <p className="text-xs text-gray-600 mb-2">Number of Assessments</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full"
                                                style={{ width: `${Math.min(summary.total_assessments * 10, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-gray-900">{summary.total_assessments}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <div className="py-12 text-center">
                        <PieChart className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No Data Available</h3>
                        <p className="mt-1 text-sm text-gray-500">Select a term to view assessment type summaries</p>
                    </div>
                </Card>
            )}
        </div>
    );
}
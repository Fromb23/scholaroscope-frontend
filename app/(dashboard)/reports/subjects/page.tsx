'use client';

import { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { useTerms, useSubjects } from '@/app/core/hooks/useAcademic';
import { useSubjectAnalysis } from '@/app/core/hooks/useReporting';
import { BookOpen, TrendingUp, Target, BarChart3 } from 'lucide-react';

export default function SubjectsReportPage() {
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<number | undefined>(undefined);

    const { terms, loading: termsLoading } = useTerms();
    const { subjects, loading: subjectsLoading } = useSubjects();
    const { analysis, loading } = useSubjectAnalysis(selectedTerm, selectedSubject);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Subject Analysis</h1>
                    <p className="mt-2 text-gray-600">Subject performance across cohorts & curriculum analysis</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-600" />
            </div>

            {/* Filters */}
            <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <Select
                        label="Term"
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
                    <Select
                        label="Subject (Optional)"
                        value={selectedSubject?.toString() || ''}
                        onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : undefined)}
                        options={[
                            { value: '', label: 'All subjects...' },
                            ...subjects.map(subject => ({
                                value: String(subject.id),
                                label: `${subject.code} - ${subject.name}`
                            }))
                        ]}
                        disabled={subjectsLoading}
                    />
                </div>
            </Card>

            {/* Loading State */}
            {loading && (
                <Card>
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-gray-600">Loading subject analysis...</p>
                    </div>
                </Card>
            )}

            {/* Subject Summaries */}
            {!loading && analysis && analysis.subject_summaries && analysis.subject_summaries.length > 0 && (
                <>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Subject Performance</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {analysis.subject_summaries.map((subject) => (
                                <Card key={subject.id} className="hover:shadow-lg transition-shadow">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900">{subject.subject_name}</h3>
                                            <p className="text-sm text-gray-500">
                                                {subject.cohort_name} · {subject.subject_code}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-3xl font-bold text-blue-600">
                                                {subject.average_score?.toFixed(1) || 'N/A'}%
                                            </p>
                                            <p className="text-sm text-gray-500">{subject.total_students} students</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-gray-200">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Highest Score:</span>
                                            <Badge variant="success">
                                                {subject.highest_score?.toFixed(1)}%
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Lowest Score:</span>
                                            <Badge variant="danger">
                                                {subject.lowest_score?.toFixed(1)}%
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Total Assessments:</span>
                                            <Badge variant="default">
                                                {subject.total_assessments}
                                            </Badge>
                                        </div>

                                        <div className="pt-3 border-t border-gray-200 grid grid-cols-3 gap-3">
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500 mb-1">CATs</p>
                                                <p className="text-lg font-bold text-blue-600">{subject.cat_count}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500 mb-1">Exams</p>
                                                <p className="text-lg font-bold text-purple-600">{subject.exam_count}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-gray-500 mb-1">Projects</p>
                                                <p className="text-lg font-bold text-orange-600">{subject.project_count}</p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Assessment Type Breakdown */}
            {!loading && analysis && analysis.assessment_type_breakdown && analysis.assessment_type_breakdown.length > 0 && (
                <Card>
                    <div className="flex items-center gap-2 mb-6">
                        <Target className="h-6 w-6 text-blue-600" />
                        <h3 className="text-xl font-semibold text-gray-900">Assessment Type Breakdown</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {analysis.assessment_type_breakdown.map((type) => (
                            <div key={type.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-medium text-gray-600">{type.assessment_type}</span>
                                    <Badge variant="info">
                                        {type.total_assessments} tests
                                    </Badge>
                                </div>
                                <p className="text-3xl font-bold text-blue-600 mb-2">
                                    {type.average_score?.toFixed(1) || 'N/A'}%
                                </p>
                                <div className="text-sm text-gray-600">
                                    <span>Weight: </span>
                                    <span className="font-semibold">{type.total_weight.toFixed(1)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Empty State */}
            {!loading && (!analysis || (!analysis.subject_summaries?.length && !analysis.assessment_type_breakdown?.length)) && (
                <Card>
                    <div className="py-12 text-center">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No Data Available</h3>
                        <p className="mt-1 text-sm text-gray-500">Select a term to view subject analysis</p>
                    </div>
                </Card>
            )}
        </div>
    );
}
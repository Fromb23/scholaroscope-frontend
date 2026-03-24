'use client';

// ============================================================================
// app/(dashboard)/reports/subjects/page.tsx — render only
// ============================================================================

import { useState } from 'react';
import { FileText, BarChart3 } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { useSubjectAnalysis } from '@/app/core/hooks/useReporting';
import { useTerms } from '@/app/core/hooks/useAcademic';

const TYPE_COLORS: Record<string, string> = {
    CAT: 'blue',
    TEST: 'purple',
    MAIN_EXAM: 'orange',
    PROJECT: 'green',
    ASSIGNMENT: 'yellow',
    PRACTICAL: 'indigo',
    COMPETENCY: 'teal',
};

export default function SubjectsReportPage() {
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const { terms, loading: termsLoading } = useTerms();
    const { analysis, loading, error } = useSubjectAnalysis(selectedTerm);

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Subject Reports</h1>
                    <p className="text-gray-500 mt-1">
                        Subject performance across cohorts and assessment type breakdowns.
                    </p>
                </div>
                <FileText className="h-7 w-7 text-green-600" />
            </div>

            {/* Filter */}
            <Card>
                <Select
                    label="Term"
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
                        <FileText className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-3 text-sm text-gray-500">Select a term to view subject data.</p>
                    </div>
                </Card>
            )}

            {/* Subject summaries */}
            {!loading && analysis && (
                <div className="space-y-6">

                    {/* Subject performance table */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Subject Performance</h3>
                            <Badge variant="blue">{analysis.subject_summaries.length} subjects</Badge>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Cohort</TableHead>
                                    <TableHead>Students</TableHead>
                                    <TableHead>Average</TableHead>
                                    <TableHead>Highest</TableHead>
                                    <TableHead>Lowest</TableHead>
                                    <TableHead>Assessments</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analysis.subject_summaries.map(sub => (
                                    <TableRow key={sub.id}>
                                        <TableCell>
                                            <p className="font-medium text-gray-900">{sub.subject_name}</p>
                                            <p className="text-xs text-gray-500">{sub.subject_code}</p>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm text-gray-600">{sub.cohort_name}</span>
                                        </TableCell>
                                        <TableCell>{sub.total_students}</TableCell>
                                        <TableCell>
                                            <span className="font-semibold text-blue-600">
                                                {sub.average_score?.toFixed(1) ?? '—'}%
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-green-600 font-medium">
                                                {sub.highest_score?.toFixed(1) ?? '—'}%
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-red-600 font-medium">
                                                {sub.lowest_score?.toFixed(1) ?? '—'}%
                                            </span>
                                        </TableCell>
                                        <TableCell>{sub.total_assessments}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Assessment type breakdown */}
                    {analysis.assessment_type_breakdown.length > 0 && (
                        <Card>
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="h-5 w-5 text-orange-500" />
                                <h3 className="font-semibold text-gray-900">Assessment Type Breakdown</h3>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {analysis.assessment_type_breakdown.map(item => (
                                    <div key={item.id}
                                        className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant={TYPE_COLORS[item.assessment_type] as 'blue' ?? 'default'}>
                                                {item.assessment_type}
                                            </Badge>
                                            <span className="text-xs text-gray-500">
                                                {item.total_assessments} assessments
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-1">{item.subject_name}</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {item.average_score?.toFixed(1) ?? '—'}
                                            <span className="text-sm font-normal text-gray-400 ml-1">%</span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                </div>
            )}

        </div>
    );
}
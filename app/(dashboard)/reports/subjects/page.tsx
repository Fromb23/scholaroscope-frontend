'use client';

import { useMemo, useState } from 'react';
import { FileText, BarChart3, Download } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { useSubjectAnalysis } from '@/app/core/hooks/useReporting';
import { useTerms, useSubjects } from '@/app/core/hooks/useAcademic';
import type { ExportPayload } from '@/app/types/export';

const TYPE_COLORS: Record<string, string> = {
    CAT: 'blue',
    TEST: 'purple',
    MAIN_EXAM: 'orange',
    PROJECT: 'green',
    ASSIGNMENT: 'yellow',
    PRACTICAL: 'indigo',
    COMPETENCY: 'blue',
};

type BadgeVariant = 'default' | 'blue' | 'purple' | 'orange' | 'green' | 'yellow' | 'indigo';

export default function SubjectsReportPage() {
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
    const [exportOpen, setExportOpen] = useState(false);

    const { terms, loading: termsLoading } = useTerms();
    const { subjects, loading: subjectsLoading } = useSubjects();
    const { analysis, loading, error } = useSubjectAnalysis(selectedTerm, selectedSubject);

    const exportPayload = useMemo<ExportPayload | null>(() => {
        if (!analysis) return null;

        return {
            title: `${analysis.subject.name} Subject Report`,
            subtitle: analysis.term
                ? `${analysis.subject.code} · ${analysis.term.name}`
                : analysis.subject.code,
            metadata: {
                term: analysis.term?.name ?? 'All terms',
                academicYear: analysis.term?.academic_year ?? '—',
                averageScore: analysis.average_score != null ? `${analysis.average_score.toFixed(1)}%` : '—',
                assessmentBreakdown: analysis.assessment_type_breakdown
                    .map(item => `${item.assessment_type}: ${item.total_assessments}`)
                    .join(' | ') || 'No assessment breakdown',
                generatedAt: new Date().toLocaleString(),
            },
            columns: [
                { key: 'cohort', label: 'Cohort', width: 20 },
                { key: 'academic_year', label: 'Academic Year', width: 16 },
                { key: 'instructor', label: 'Instructor', width: 20 },
                { key: 'learners', label: 'Learners', format: 'number', width: 12, align: 'right' as const },
                { key: 'average_score', label: 'Average', format: 'percentage', width: 12, align: 'right' as const },
                { key: 'highest_score', label: 'Highest', format: 'percentage', width: 12, align: 'right' as const },
                { key: 'lowest_score', label: 'Lowest', format: 'percentage', width: 12, align: 'right' as const },
            ],
            rows: analysis.cohort_subjects.map(item => ({
                cohort: item.cohort.name,
                academic_year: item.cohort.academic_year,
                instructor: item.assigned_instructor?.name ?? 'Unassigned',
                learners: item.active_learner_count,
                average_score: item.average_score,
                highest_score: item.highest_score,
                lowest_score: item.lowest_score,
            })),
            fileName: `subject-report-${analysis.subject.name.toLowerCase().replace(/\s+/g, '-')}`,
            includeMetadata: true,
            includeTimestamp: true,
            sheetName: 'Subject Report',
            freezeHeader: true,
            autoFilter: true,
            orientation: 'landscape' as const,
        };
    }, [analysis]);

    return (
        <div className="space-y-6">

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Subject Reports</h1>
                    <p className="text-gray-500 mt-1">
                        Subject performance across cohorts and assessment type breakdowns.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {exportPayload && (
                        <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                            <Download className="h-4 w-4 mr-1.5" />
                            Export
                        </Button>
                    )}
                    <FileText className="h-7 w-7 text-green-600" />
                </div>
            </div>

            <Card>
                <div className="grid md:grid-cols-2 gap-4">
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
                    <Select
                        label="Subject"
                        value={selectedSubject?.toString() ?? ''}
                        onChange={e => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
                        disabled={subjectsLoading}
                        options={[
                            { value: '', label: 'Select subject…' },
                            ...subjects.map(subject => ({
                                value: String(subject.id),
                                label: `${subject.name} (${subject.code})`,
                            })),
                        ]}
                    />
                </div>
            </Card>

            {error && <ErrorBanner message={error} onDismiss={() => { }} />}
            {loading && <LoadingSpinner />}

            {!loading && (!selectedTerm || !selectedSubject) && (
                <Card>
                    <div className="py-16 text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-3 text-sm text-gray-500">
                            Select a term and subject to view the report.
                        </p>
                    </div>
                </Card>
            )}

            {!loading && analysis && (
                <div className="space-y-6">

                    <Card>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{analysis.subject.name}</h2>
                                <p className="text-gray-500 text-sm">{analysis.subject.code}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-end">
                                {analysis.term?.name && <Badge variant="blue">{analysis.term.name}</Badge>}
                                <Badge variant="green">
                                    Avg {analysis.average_score?.toFixed(1) ?? '—'}%
                                </Badge>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Cohort Performance</h3>
                            <Badge variant="blue">{analysis.cohort_subjects.length} cohort subjects</Badge>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cohort</TableHead>
                                    <TableHead>Academic Year</TableHead>
                                    <TableHead>Instructor</TableHead>
                                    <TableHead>Learners</TableHead>
                                    <TableHead>Average</TableHead>
                                    <TableHead>Highest</TableHead>
                                    <TableHead>Lowest</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analysis.cohort_subjects.map(item => (
                                    <TableRow key={item.cohort_subject.id}>
                                        <TableCell>
                                            <p className="font-medium text-gray-900">{item.cohort.name}</p>
                                            <p className="text-xs text-gray-500">{item.cohort.level}</p>
                                        </TableCell>
                                        <TableCell>{item.cohort.academic_year}</TableCell>
                                        <TableCell>{item.assigned_instructor?.name ?? 'Unassigned'}</TableCell>
                                        <TableCell>{item.active_learner_count}</TableCell>
                                        <TableCell>
                                            <span className="font-semibold text-blue-600">
                                                {item.average_score?.toFixed(1) ?? '—'}%
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-green-600 font-medium">
                                                {item.highest_score?.toFixed(1) ?? '—'}%
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-red-600 font-medium">
                                                {item.lowest_score?.toFixed(1) ?? '—'}%
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>

                    {analysis.assessment_type_breakdown.length > 0 && (
                        <Card>
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="h-5 w-5 text-orange-500" />
                                <h3 className="font-semibold text-gray-900">Assessment Type Breakdown</h3>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {analysis.assessment_type_breakdown.map(item => (
                                    <div key={item.assessment_type}
                                        className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant={(TYPE_COLORS[item.assessment_type] ?? 'default') as BadgeVariant}>
                                                {item.assessment_type}
                                            </Badge>
                                            <span className="text-xs text-gray-500">
                                                {item.total_assessments} records
                                            </span>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {item.average_score?.toFixed(1) ?? '—'}
                                            <span className="text-sm font-normal text-gray-400 ml-1">%</span>
                                        </p>
                                        <p className="text-sm text-gray-500 mt-2">
                                            {item.cohort_subjects ?? analysis.cohort_subjects.length} cohort subjects
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                </div>
            )}

            {!loading && selectedTerm && selectedSubject && !analysis && (
                <Card>
                    <div className="py-12 text-center">
                        <FileText className="mx-auto h-10 w-10 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">No subject data for this selection.</p>
                    </div>
                </Card>
            )}

            {exportPayload && (
                <ExportModal
                    open={exportOpen}
                    onClose={() => setExportOpen(false)}
                    payload={exportPayload}
                    defaultFormat="excel"
                    title="Export Subject Report"
                />
            )}

        </div>
    );
}

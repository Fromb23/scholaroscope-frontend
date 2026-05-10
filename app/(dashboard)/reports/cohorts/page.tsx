'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Users, TrendingUp, Award, Download } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { useClassSummary } from '@/app/core/hooks/useReporting';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { DesktopOnly } from '@/app/core/components/DesktopOnly';
import type { ExportPayload } from '@/app/types/export';

export default function CohortsReportPage() {
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [selectedCohort, setSelectedCohort] = useState<number | null>(null);
    const [exportOpen, setExportOpen] = useState(false);

    const { terms, loading: termsLoading } = useTerms();
    const { cohorts, loading: cohortsLoading } = useCohorts();
    const { summary, loading, error } = useClassSummary(selectedTerm, selectedCohort);

    const gradeDistribution = summary?.cohort_summary ? [
        { grade: 'A', count: summary.cohort_summary.grade_a_count, color: 'bg-green-500' },
        { grade: 'B', count: summary.cohort_summary.grade_b_count, color: 'bg-blue-500' },
        { grade: 'C', count: summary.cohort_summary.grade_c_count, color: 'bg-yellow-500' },
        { grade: 'D', count: summary.cohort_summary.grade_d_count, color: 'bg-orange-500' },
        { grade: 'E', count: summary.cohort_summary.grade_e_count, color: 'bg-red-500' },
    ] : [];

    const maxGradeCount = Math.max(...gradeDistribution.map(g => g.count), 1);

    const exportPayload = useMemo<ExportPayload | null>(() => {
        if (!summary) return null;

        const performanceRows = summary.subject_summaries.map(subject => ({
            section: 'Performance',
            subject: subject.subject_name,
            instructor: '—',
            learners: subject.total_students,
            average_score: subject.average_score,
            highest_score: subject.highest_score,
            lowest_score: subject.lowest_score,
            assessments: subject.total_assessments,
            average_attendance: null,
        }));

        const teachingRows = summary.cohort_subjects.map(item => ({
            section: 'Teaching',
            subject: item.cohort_subject.subject_name,
            instructor: item.assigned_instructor?.name ?? 'Unassigned',
            learners: item.active_learner_count,
            average_score: item.average_grade,
            highest_score: item.subject_summary?.highest_score ?? null,
            lowest_score: item.subject_summary?.lowest_score ?? null,
            assessments: item.subject_summary?.total_assessments ?? null,
            average_attendance: item.average_attendance,
        }));

        return {
            title: `${summary.cohort.name} Cohort Report`,
            subtitle: summary.term
                ? `${summary.cohort.level} · ${summary.term.name}`
                : summary.cohort.level,
            metadata: {
                cohort: summary.cohort.name,
                academicYear: summary.cohort.academic_year,
                term: summary.term?.name ?? 'All terms',
                generatedAt: new Date().toLocaleString(),
            },
            columns: [
                { key: 'section', label: 'Section', width: 14 },
                { key: 'subject', label: 'Subject', width: 24 },
                { key: 'instructor', label: 'Instructor', width: 22 },
                { key: 'learners', label: 'Learners', format: 'number', width: 12, align: 'right' as const },
                { key: 'average_score', label: 'Average', format: 'percentage', width: 12, align: 'right' as const },
                { key: 'highest_score', label: 'Highest', format: 'percentage', width: 12, align: 'right' as const },
                { key: 'lowest_score', label: 'Lowest', format: 'percentage', width: 12, align: 'right' as const },
                { key: 'assessments', label: 'Assessments', format: 'number', width: 14, align: 'right' as const },
                { key: 'average_attendance', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
            ],
            rows: [...performanceRows, ...teachingRows],
            fileName: `cohort-report-${summary.cohort.name.toLowerCase().replace(/\s+/g, '-')}`,
            includeMetadata: true,
            includeTimestamp: true,
            sheetName: 'Cohort Report',
            freezeHeader: true,
            autoFilter: true,
            orientation: 'landscape' as const,
        };
    }, [summary]);

    return (
        <div className="space-y-6">

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Cohort Reports</h1>
                    <p className="text-gray-500 mt-1">
                        Class-level analytics, grade distributions, and subject performance.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {exportPayload && (
                        <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                            <Download className="h-4 w-4 mr-1.5" />
                            Export
                        </Button>
                    )}
                    <BookOpen className="h-7 w-7 text-purple-600" />
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
                        label="Cohort"
                        value={selectedCohort?.toString() ?? ''}
                        onChange={e => setSelectedCohort(e.target.value ? Number(e.target.value) : null)}
                        disabled={cohortsLoading}
                        options={[
                            { value: '', label: 'Select cohort…' },
                            ...cohorts.map(c => ({
                                value: String(c.id),
                                label: `${c.name} — ${c.level}`,
                            })),
                        ]}
                    />
                </div>
            </Card>

            {error && <ErrorBanner message={error} onDismiss={() => { }} />}
            {loading && <LoadingSpinner />}

            {!loading && (!selectedTerm || !selectedCohort) && (
                <Card>
                    <div className="py-16 text-center">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-3 text-sm text-gray-500">
                            Select a term and cohort to view the class report.
                        </p>
                    </div>
                </Card>
            )}

            {!loading && summary && (
                <div className="space-y-6">

                    <Card>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{summary.cohort.name}</h2>
                                <p className="text-gray-500 text-sm">
                                    {summary.cohort.level} · {summary.cohort.curriculum}
                                </p>
                            </div>
                            <div className="flex gap-2 flex-wrap justify-end">
                                <Badge variant="purple">{summary.learner_count} learners</Badge>
                                {summary.term?.name && <Badge variant="blue">{summary.term.name}</Badge>}
                            </div>
                        </div>
                    </Card>

                    <DesktopOnly>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatsCard
                                title="Total Learners"
                                value={summary.learner_count}
                                icon={Users}
                                color="blue"
                            />
                            <StatsCard
                                title="Avg Grade"
                                value={`${summary.average_grade?.toFixed(1) ?? '—'}%`}
                                icon={Award}
                                color="green"
                            />
                            <StatsCard
                                title="Avg Attendance"
                                value={`${summary.average_attendance?.toFixed(1) ?? '—'}%`}
                                icon={TrendingUp}
                                color="indigo"
                            />
                            <StatsCard
                                title="A Grades"
                                value={summary.cohort_summary?.grade_a_count ?? 0}
                                icon={Award}
                                color="yellow"
                            />
                        </div>
                    </DesktopOnly>

                    {gradeDistribution.length > 0 && (
                        <Card>
                            <h3 className="font-semibold text-gray-900 mb-4">Grade Distribution</h3>
                            <div className="flex items-end gap-4 h-32">
                                {gradeDistribution.map(({ grade, count, color }) => (
                                    <div key={grade} className="flex flex-col items-center gap-1 flex-1">
                                        <span className="text-xs font-semibold text-gray-600">{count}</span>
                                        <div
                                            className={`w-full rounded-t-md ${color} transition-all`}
                                            style={{ height: `${(count / maxGradeCount) * 100}px` }}
                                        />
                                        <span className="text-sm font-bold text-gray-700">{grade}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {summary.subject_summaries.length > 0 && (
                        <Card>
                            <h3 className="font-semibold text-gray-900 mb-4">Subject Performance</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Students</TableHead>
                                        <TableHead>Average</TableHead>
                                        <TableHead>Highest</TableHead>
                                        <TableHead>Lowest</TableHead>
                                        <TableHead>Assessments</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary.subject_summaries.map(subject => (
                                        <TableRow key={subject.id}>
                                            <TableCell>
                                                <p className="font-medium text-gray-900">{subject.subject_name}</p>
                                                <p className="text-xs text-gray-500">{subject.subject_code}</p>
                                            </TableCell>
                                            <TableCell>{subject.total_students}</TableCell>
                                            <TableCell>
                                                <span className="font-semibold text-blue-600">
                                                    {subject.average_score?.toFixed(1) ?? '—'}%
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-green-600 font-medium">
                                                    {subject.highest_score?.toFixed(1) ?? '—'}%
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-red-600 font-medium">
                                                    {subject.lowest_score?.toFixed(1) ?? '—'}%
                                                </span>
                                            </TableCell>
                                            <TableCell>{subject.total_assessments}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    )}

                    {summary.cohort_subjects.length > 0 && (
                        <Card>
                            <h3 className="font-semibold text-gray-900 mb-4">Cohort Subject Status</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Instructor</TableHead>
                                        <TableHead>Learners</TableHead>
                                        <TableHead>Avg Grade</TableHead>
                                        <TableHead>Attendance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary.cohort_subjects.map(item => (
                                        <TableRow key={item.cohort_subject.id}>
                                            <TableCell>
                                                <p className="font-medium text-gray-900">
                                                    {item.cohort_subject.subject_name}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {item.cohort_subject.subject_code}
                                                </p>
                                            </TableCell>
                                            <TableCell>{item.assigned_instructor?.name ?? 'Unassigned'}</TableCell>
                                            <TableCell>{item.active_learner_count}</TableCell>
                                            <TableCell>{item.average_grade?.toFixed(1) ?? '—'}%</TableCell>
                                            <TableCell>{item.average_attendance?.toFixed(1) ?? '—'}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    )}

                </div>
            )}

            {!loading && selectedTerm && selectedCohort && !summary && (
                <Card>
                    <div className="py-12 text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">
                            No data available for this cohort and term.
                        </p>
                    </div>
                </Card>
            )}

            {exportPayload && (
                <ExportModal
                    open={exportOpen}
                    onClose={() => setExportOpen(false)}
                    payload={exportPayload}
                    defaultFormat="excel"
                    title="Export Cohort Report"
                />
            )}

        </div>
    );
}

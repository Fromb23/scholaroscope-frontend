'use client';

// ============================================================================
// app/(dashboard)/reports/cohorts/page.tsx — render only
// ============================================================================

import { useState } from 'react';
import { BookOpen, Users, TrendingUp, Award } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { AttendanceBar } from '@/app/core/components/reports/AttendanceBar';
import { useClassSummary, useSubjectSummaries } from '@/app/core/hooks/useReporting';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';

export default function CohortsReportPage() {
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [selectedCohort, setSelectedCohort] = useState<number | null>(null);

    const { terms, loading: termsLoading } = useTerms();
    const { cohorts, loading: cohortsLoading } = useCohorts();

    const { summary, loading, error } = useClassSummary(selectedTerm, selectedCohort);
    const { summaries: subjects } = useSubjectSummaries({
        term: selectedTerm ?? undefined,
    });

    const cohortSubjects = subjects.filter(s => s.cohort_name === summary?.cohort.name);

    const gradeDistribution = summary?.summary ? [
        { grade: 'A', count: summary.summary.grade_a_count, color: 'bg-green-500' },
        { grade: 'B', count: summary.summary.grade_b_count, color: 'bg-blue-500' },
        { grade: 'C', count: summary.summary.grade_c_count, color: 'bg-yellow-500' },
        { grade: 'D', count: summary.summary.grade_d_count, color: 'bg-orange-500' },
        { grade: 'E', count: summary.summary.grade_e_count, color: 'bg-red-500' },
    ] : [];

    const maxGradeCount = Math.max(...gradeDistribution.map(g => g.count), 1);

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Cohort Reports</h1>
                    <p className="text-gray-500 mt-1">
                        Class-level analytics, grade distributions, and subject performance.
                    </p>
                </div>
                <BookOpen className="h-7 w-7 text-purple-600" />
            </div>

            {/* Filters */}
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

            {/* Empty */}
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

            {/* Summary */}
            {!loading && summary && (
                <div className="space-y-6">

                    {/* Cohort header */}
                    <Card>
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{summary.cohort.name}</h2>
                                <p className="text-gray-500 text-sm">{summary.cohort.level}</p>
                            </div>
                            <Badge variant="purple">{summary.total_students} students</Badge>
                        </div>
                    </Card>

                    {/* Stats */}
                    {summary.summary && (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatsCard
                                title="Total Students"
                                value={summary.summary.total_students}
                                icon={Users}
                                color="blue"
                            />
                            <StatsCard
                                title="Avg Grade"
                                value={`${summary.summary.average_grade?.toFixed(1) ?? '—'}%`}
                                icon={Award}
                                color="green"
                            />
                            <StatsCard
                                title="Avg Attendance"
                                value={`${summary.summary.average_attendance?.toFixed(1) ?? '—'}%`}
                                icon={TrendingUp}
                                color="indigo"
                            />
                            <StatsCard
                                title="A Grades"
                                value={summary.summary.grade_a_count}
                                icon={Award}
                                color="yellow"
                            />
                        </div>
                    )}

                    {/* Grade distribution chart */}
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

                    {/* Subject performance */}
                    {summary.subject_performance.length > 0 && (
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
                                    {summary.subject_performance.map(sub => (
                                        <TableRow key={sub.id}>
                                            <TableCell>
                                                <p className="font-medium text-gray-900">{sub.subject_name}</p>
                                                <p className="text-xs text-gray-500">{sub.subject_code}</p>
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
                    )}

                </div>
            )}

            {/* No summary data */}
            {!loading && selectedTerm && selectedCohort && !summary && (
                <Card>
                    <div className="py-12 text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">
                            No data available. Summaries may need to be computed first.
                        </p>
                    </div>
                </Card>
            )}

        </div>
    );
}
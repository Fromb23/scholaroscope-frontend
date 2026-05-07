'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BookOpen, Download, GraduationCap, TrendingUp, Users } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { useInstructorCohortSubjects } from '@/app/core/hooks/useReporting';
import type { ExportPayload } from '@/app/types/export';

function average(values: Array<number | null | undefined>): number | null {
    const numbers = values.filter((value): value is number => typeof value === 'number');
    if (numbers.length === 0) return null;
    return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

export default function InstructorCohortSubjectsReportPage() {
    const [exportOpen, setExportOpen] = useState(false);
    const { cohortSubjects, loading, error } = useInstructorCohortSubjects();

    const averageGrade = average(cohortSubjects.map(item => item.average_grade));
    const averageAttendance = average(cohortSubjects.map(item => item.average_attendance));
    const averageCoverage = average(cohortSubjects.map(item => item.coverage?.percentage));

    const exportPayload = useMemo<ExportPayload | null>(() => {
        if (cohortSubjects.length === 0) return null;

        return {
            title: 'My Cohort Subjects',
            subtitle: 'Instructor cohort-subject reporting scope',
            metadata: {
                totalCohortSubjects: String(cohortSubjects.length),
                averageGrade: averageGrade != null ? `${averageGrade.toFixed(1)}%` : '—',
                averageAttendance: averageAttendance != null ? `${averageAttendance.toFixed(1)}%` : '—',
                coverage: averageCoverage != null ? `${averageCoverage.toFixed(1)}%` : '—',
                generatedAt: new Date().toLocaleString(),
            },
            columns: [
                { key: 'cohort_name', label: 'Cohort', width: 20 },
                { key: 'subject_name', label: 'Subject', width: 24 },
                { key: 'subject_code', label: 'Code', width: 10 },
                { key: 'curriculum', label: 'Curriculum', width: 18 },
                { key: 'academic_year', label: 'Academic Year', width: 16 },
                { key: 'active_learner_count', label: 'Learners', format: 'number', width: 12, align: 'right' as const },
                { key: 'average_grade', label: 'Average Grade', format: 'percentage', width: 14, align: 'right' as const },
                { key: 'average_attendance', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
                { key: 'coverage_percentage', label: 'Coverage', format: 'percentage', width: 12, align: 'right' as const },
                { key: 'session_count', label: 'Sessions', format: 'number', width: 12, align: 'right' as const },
            ],
            rows: cohortSubjects.map(item => ({
                ...item,
                coverage_percentage: item.coverage?.percentage ?? null,
            })),
            fileName: 'my-cohort-subjects',
            includeMetadata: true,
            includeTimestamp: true,
            sheetName: 'Cohort Subjects',
            freezeHeader: true,
            autoFilter: true,
            orientation: 'landscape' as const,
        };
    }, [averageAttendance, averageCoverage, averageGrade, cohortSubjects]);

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorBanner message={error} onDismiss={() => { }} />;

    return (
        <div className="space-y-6">

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">My Cohort Subjects</h1>
                    <p className="text-gray-500 mt-1">
                        Cohort-subject scoped reporting for your active teaching assignments.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {exportPayload && (
                        <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                            <Download className="h-4 w-4 mr-1.5" />
                            Export
                        </Button>
                    )}
                    <BookOpen className="h-7 w-7 text-green-600" />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatsCard title="Cohort Subjects" value={cohortSubjects.length} icon={BookOpen} color="blue" />
                <StatsCard
                    title="Learners"
                    value={cohortSubjects.reduce((sum, item) => sum + item.active_learner_count, 0)}
                    icon={Users}
                    color="green"
                />
                <StatsCard
                    title="Average Grade"
                    value={averageGrade != null ? `${averageGrade.toFixed(1)}%` : '—'}
                    icon={TrendingUp}
                    color="purple"
                />
                <StatsCard
                    title="Coverage"
                    value={averageCoverage != null ? `${averageCoverage.toFixed(1)}%` : '—'}
                    icon={GraduationCap}
                    color="indigo"
                />
            </div>

            {cohortSubjects.length === 0 ? (
                <Card>
                    <div className="py-16 text-center">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-3 text-sm font-medium text-gray-900">No assigned cohort subjects</p>
                        <p className="mt-1 text-xs text-gray-500">
                            This page only lists active cohort-subject assignments available in reporting scope.
                        </p>
                    </div>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cohort</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Curriculum</TableHead>
                                <TableHead>Academic Year</TableHead>
                                <TableHead>Learners</TableHead>
                                <TableHead>Average</TableHead>
                                <TableHead>Attendance</TableHead>
                                <TableHead>Coverage</TableHead>
                                <TableHead>
                                    <span className="sr-only">Actions</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cohortSubjects.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.cohort_name}</TableCell>
                                    <TableCell>
                                        <p className="font-medium text-gray-900">{item.subject_name}</p>
                                        <p className="text-xs text-gray-500">{item.subject_code}</p>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="default">{item.curriculum}</Badge>
                                    </TableCell>
                                    <TableCell>{item.academic_year}</TableCell>
                                    <TableCell>{item.active_learner_count}</TableCell>
                                    <TableCell>{item.average_grade?.toFixed(1) ?? '—'}%</TableCell>
                                    <TableCell>{item.average_attendance?.toFixed(1) ?? '—'}%</TableCell>
                                    <TableCell>{item.coverage?.percentage?.toFixed(1) ?? '—'}%</TableCell>
                                    <TableCell>
                                        <Link href={`/reports/instructor/cohort-subjects/${item.id}`}>
                                            <Button variant="ghost" size="sm">Open</Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {exportPayload && (
                <ExportModal
                    open={exportOpen}
                    onClose={() => setExportOpen(false)}
                    payload={exportPayload}
                    defaultFormat="excel"
                    title="Export My Cohort Subjects"
                />
            )}

        </div>
    );
}

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BookOpen, Download, FileBarChart, GraduationCap, TrendingUp, Users } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { useInstructorOverview } from '@/app/core/hooks/useReporting';
import type { ExportPayload } from '@/app/types/export';

function average(values: Array<number | null | undefined>): number | null {
    const numbers = values.filter((value): value is number => typeof value === 'number');
    if (numbers.length === 0) return null;
    return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

export function InstructorReportsOverviewPage() {
    const [exportOpen, setExportOpen] = useState(false);
    const { overview, loading, error } = useInstructorOverview();

    const averageGrade = average(overview?.assigned_cohort_subjects.map(item => item.average_grade) ?? []);
    const averageAttendance = average(overview?.assigned_cohort_subjects.map(item => item.average_attendance) ?? []);
    const totalSessions = (overview?.assigned_cohort_subjects ?? []).reduce(
        (sum, item) => sum + (item.session_count ?? 0),
        0,
    );

    const exportPayload = useMemo<ExportPayload | null>(() => {
        if (!overview) return null;

        return {
            title: 'Instructor Overview',
            subtitle: 'My Reports',
            metadata: {
                assignedCohortSubjects: String(overview.total_assigned_cohort_subjects),
                visibleLearners: String(overview.total_visible_learners),
                averageGrade: averageGrade != null ? `${averageGrade.toFixed(1)}%` : '—',
                averageAttendance: averageAttendance != null ? `${averageAttendance.toFixed(1)}%` : '—',
                totalSessions: String(totalSessions),
                generatedAt: new Date().toLocaleString(),
            },
            columns: [
                { key: 'cohort_name', label: 'Cohort', width: 20 },
                { key: 'subject_name', label: 'Subject', width: 24 },
                { key: 'curriculum', label: 'Curriculum', width: 18 },
                { key: 'academic_year', label: 'Academic Year', width: 16 },
                { key: 'active_learner_count', label: 'Learners', format: 'number', width: 12, align: 'right' as const },
                { key: 'average_grade', label: 'Average Grade', format: 'percentage', width: 14, align: 'right' as const },
                { key: 'average_attendance', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
                { key: 'session_count', label: 'Sessions', format: 'number', width: 12, align: 'right' as const },
                { key: 'completed_session_count', label: 'Completed', format: 'number', width: 12, align: 'right' as const },
            ],
            rows: overview.assigned_cohort_subjects,
            fileName: 'instructor-overview',
            includeMetadata: true,
            includeTimestamp: true,
            sheetName: 'Instructor Overview',
            freezeHeader: true,
            autoFilter: true,
            orientation: 'landscape' as const,
        };
    }, [averageAttendance, averageGrade, overview, totalSessions]);

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorBanner message={error} onDismiss={() => { }} />;

    return (
        <div className="space-y-6">

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">My Reports</h1>
                    <p className="text-gray-500 mt-1">
                        Responsibility-bound reporting across your assigned cohort subjects.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {exportPayload && (
                        <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                            <Download className="h-4 w-4 mr-1.5" />
                            Export
                        </Button>
                    )}
                    <FileBarChart className="h-7 w-7 text-green-600" />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatsCard
                    title="Assigned Cohort Subjects"
                    value={overview?.total_assigned_cohort_subjects ?? 0}
                    icon={BookOpen}
                    color="blue"
                />
                <StatsCard
                    title="Visible Learners"
                    value={overview?.total_visible_learners ?? 0}
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
                    title="Average Attendance"
                    value={averageAttendance != null ? `${averageAttendance.toFixed(1)}%` : '—'}
                    icon={GraduationCap}
                    color="indigo"
                />
            </div>

            <Card>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Total Sessions</p>
                        <p className="mt-2 text-2xl font-semibold text-gray-900">{totalSessions}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                        <p className="text-sm text-gray-500">Completed Sessions</p>
                        <p className="mt-2 text-2xl font-semibold text-gray-900">
                            {(overview?.assigned_cohort_subjects ?? []).reduce(
                                (sum, item) => sum + (item.completed_session_count ?? 0),
                                0,
                            )}
                        </p>
                    </div>
                </div>
            </Card>

            {!overview || overview.assigned_cohort_subjects.length === 0 ? (
                <Card>
                    <div className="py-16 text-center">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-3 text-sm font-medium text-gray-900">No assigned cohort subjects</p>
                        <p className="mt-1 text-xs text-gray-500">
                            Reports will appear here when you have active cohort-subject assignments.
                        </p>
                    </div>
                </Card>
            ) : (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-900">Assigned Cohort Subjects</h2>
                        <Link href="/reports/instructor/cohort-subjects">
                            <Button variant="secondary" size="sm">View All</Button>
                        </Link>
                    </div>
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
                                <TableHead>
                                    <span className="sr-only">Actions</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {overview.assigned_cohort_subjects.map(item => (
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
                    title="Export Instructor Overview"
                />
            )}

        </div>
    );
}

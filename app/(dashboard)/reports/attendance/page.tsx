'use client';

import { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { useTerms, useCohorts } from '@/app/core/hooks/useAcademic';
import { useAttendanceSummaries } from '@/app/core/hooks/useReporting';
import { Calendar, TrendingUp, Users, Activity } from 'lucide-react';

export default function AttendanceReportPage() {
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [selectedCohort, setSelectedCohort] = useState<number | undefined>(undefined);

    const { terms, loading: termsLoading } = useTerms();
    const { cohorts, loading: cohortsLoading } = useCohorts();
    const { summaries, loading } = useAttendanceSummaries({
        term: selectedTerm || undefined,
        cohort: selectedCohort
    });

    const getAttendanceBadgeVariant = (percentage: number): 'success' | 'info' | 'warning' | 'danger' => {
        if (percentage >= 90) return 'success';
        if (percentage >= 75) return 'info';
        if (percentage >= 60) return 'warning';
        return 'danger';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Attendance Reports</h1>
                    <p className="mt-2 text-gray-600">Participation metrics & session tracking</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
            </div>

            {/* Summary Stats */}
            {summaries && summaries.length > 0 && (
                <div className="grid gap-4 md:grid-cols-4">
                    <StatsCard
                        title="Total Records"
                        value={summaries.length}
                        icon={Users}
                        color="blue"
                    />
                    <StatsCard
                        title="Avg Attendance"
                        value={`${(summaries.reduce((acc, s) => acc + s.attendance_percentage, 0) / summaries.length).toFixed(1)}%`}
                        icon={Activity}
                        color="green"
                    />
                    <StatsCard
                        title="Total Sessions"
                        value={summaries.reduce((acc, s) => acc + s.total_sessions, 0)}
                        icon={TrendingUp}
                        color="purple"
                    />
                    <StatsCard
                        title="Present Days"
                        value={summaries.reduce((acc, s) => acc + s.present_count, 0)}
                        icon={Calendar}
                        color="indigo"
                    />
                </div>
            )}

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
                        label="Cohort (Optional)"
                        value={selectedCohort?.toString() || ''}
                        onChange={(e) => setSelectedCohort(e.target.value ? Number(e.target.value) : undefined)}
                        options={[
                            { value: '', label: 'All cohorts...' },
                            ...cohorts.map(cohort => ({
                                value: String(cohort.id),
                                label: cohort.name
                            }))
                        ]}
                        disabled={cohortsLoading}
                    />
                </div>
            </Card>

            {/* Attendance Table */}
            {loading ? (
                <Card>
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-gray-600">Loading attendance data...</p>
                    </div>
                </Card>
            ) : summaries && summaries.length > 0 ? (
                <Card>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Detailed Attendance Records</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Present</TableHead>
                                <TableHead>Absent</TableHead>
                                <TableHead>Late</TableHead>
                                <TableHead>Rate</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {summaries.map((summary) => (
                                <TableRow key={summary.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-gray-900">{summary.student_name}</p>
                                            <p className="text-sm text-gray-500">{summary.student_admission}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-gray-900">{summary.subject_name}</p>
                                            <p className="text-sm text-gray-500">{summary.subject_code}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-gray-700">{summary.total_sessions}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-green-600">{summary.present_count}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-red-600">{summary.absent_count}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium text-yellow-600">{summary.late_count}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full ${summary.attendance_percentage >= 90 ? 'bg-green-600' :
                                                        summary.attendance_percentage >= 75 ? 'bg-blue-600' :
                                                            summary.attendance_percentage >= 60 ? 'bg-yellow-600' :
                                                                'bg-red-600'
                                                        }`}
                                                    style={{ width: `${summary.attendance_percentage}%` }}
                                                />
                                            </div>
                                            <Badge variant={getAttendanceBadgeVariant(summary.attendance_percentage)}>
                                                {summary.attendance_percentage.toFixed(0)}%
                                            </Badge>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            ) : (
                <Card>
                    <div className="py-12 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No Data Available</h3>
                        <p className="mt-1 text-sm text-gray-500">Select a term to view attendance summaries</p>
                    </div>
                </Card>
            )}
        </div>
    );
}
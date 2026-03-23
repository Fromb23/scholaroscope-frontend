'use client';

// ============================================================================
// app/(dashboard)/reports/attendance/page.tsx — render only
// ============================================================================

import { useState } from 'react';
import { Calendar, Users, Activity, TrendingUp } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { AttendanceBar } from '@/app/core/components/reports/AttendanceBar';
import { useAttendanceSummaries } from '@/app/core/hooks/useReporting';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';

export default function AttendanceReportPage() {
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [selectedCohort, setSelectedCohort] = useState<number | undefined>(undefined);

    const { terms, loading: termsLoading } = useTerms();
    const { cohorts, loading: cohortsLoading } = useCohorts();
    const { summaries, loading, error } = useAttendanceSummaries({
        term: selectedTerm ?? undefined,
        cohort: selectedCohort,
    });

    const totalSessions = summaries.reduce((s, r) => s + r.total_sessions, 0);
    const avgAttendance = summaries.length
        ? summaries.reduce((s, r) => s + r.attendance_percentage, 0) / summaries.length
        : 0;
    const atRisk = summaries.filter(s => s.attendance_percentage < 75).length;

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Attendance Reports</h1>
                    <p className="text-gray-500 mt-1">Session participation metrics per student and subject.</p>
                </div>
                <Calendar className="h-7 w-7 text-indigo-600" />
            </div>

            {/* Stats — only when data exists */}
            {summaries.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatsCard title="Records" value={summaries.length} icon={Users} color="blue" />
                    <StatsCard title="Avg Attendance" value={`${avgAttendance.toFixed(1)}%`} icon={Activity} color="green" />
                    <StatsCard title="Total Sessions" value={totalSessions} icon={TrendingUp} color="purple" />
                    <StatsCard title="At Risk (<75%)" value={atRisk} icon={Calendar} color="red" />
                </div>
            )}

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
                        label="Cohort (optional)"
                        value={selectedCohort?.toString() ?? ''}
                        onChange={e => setSelectedCohort(e.target.value ? Number(e.target.value) : undefined)}
                        disabled={cohortsLoading}
                        options={[
                            { value: '', label: 'All cohorts' },
                            ...cohorts.map(c => ({ value: String(c.id), label: c.name })),
                        ]}
                    />
                </div>
            </Card>

            {error && <ErrorBanner message={error} onDismiss={() => { }} />}
            {loading && <LoadingSpinner />}

            {/* Empty state */}
            {!loading && !selectedTerm && (
                <Card>
                    <div className="py-16 text-center">
                        <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-3 text-sm text-gray-500">Select a term to view attendance data.</p>
                    </div>
                </Card>
            )}

            {/* Table */}
            {!loading && selectedTerm && summaries.length > 0 && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900">Attendance Records</h3>
                        <span className="text-xs text-gray-500">{summaries.length} records</span>
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Sessions</TableHead>
                                <TableHead>Present</TableHead>
                                <TableHead>Absent</TableHead>
                                <TableHead>Late</TableHead>
                                <TableHead>Rate</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {summaries.map(s => (
                                <TableRow key={s.id}>
                                    <TableCell>
                                        <p className="font-medium text-gray-900">{s.student_name}</p>
                                        <p className="text-xs text-gray-500">{s.student_admission}</p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium text-gray-900">{s.subject_name}</p>
                                        <p className="text-xs text-gray-500">{s.subject_code}</p>
                                    </TableCell>
                                    <TableCell>{s.total_sessions}</TableCell>
                                    <TableCell>
                                        <span className="text-green-600 font-medium">{s.present_count}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-red-600 font-medium">{s.absent_count}</span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-yellow-600 font-medium">{s.late_count}</span>
                                    </TableCell>
                                    <TableCell>
                                        <AttendanceBar percentage={s.attendance_percentage} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            {/* No data after filter */}
            {!loading && selectedTerm && summaries.length === 0 && (
                <Card>
                    <div className="py-12 text-center">
                        <Calendar className="mx-auto h-10 w-10 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">No attendance data for this selection.</p>
                    </div>
                </Card>
            )}

        </div>
    );
}
'use client';

// ============================================================================
// app/(dashboard)/reports/attendance/page.tsx — render only
// ============================================================================

import { useMemo, useState } from 'react';
import { Calendar, Users, Activity, TrendingUp, Download } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { AttendanceBar } from '@/app/core/components/reports/AttendanceBar';
import { useAttendanceSummaries } from '@/app/core/hooks/useReporting';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import type { ExportPayload } from '@/app/types/export';

export default function AttendanceReportPage() {
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [selectedCohort, setSelectedCohort] = useState<number | undefined>(undefined);
    const [exportOpen, setExportOpen] = useState(false);

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

    const exportPayload = useMemo<ExportPayload | null>(() => {
        if (!selectedTerm || summaries.length === 0) return null;

        return {
            title: 'Attendance Report',
            subtitle: selectedCohort
                ? `Cohort ${selectedCohort} attendance records`
                : 'All cohort attendance records',
            metadata: {
                term: terms.find(term => term.id === selectedTerm)?.name ?? 'Selected term',
                cohort: cohorts.find(cohort => cohort.id === selectedCohort)?.name ?? 'All cohorts',
                generatedAt: new Date().toLocaleString(),
            },
            columns: [
                { key: 'student_name', label: 'Student', width: 24 },
                { key: 'student_admission', label: 'Admission No.', width: 14 },
                { key: 'cohort_name', label: 'Cohort', width: 18 },
                { key: 'subject_name', label: 'Subject', width: 20 },
                { key: 'subject_code', label: 'Code', width: 10 },
                { key: 'total_sessions', label: 'Sessions', format: 'number', width: 12, align: 'right' as const },
                { key: 'present_count', label: 'Present', format: 'number', width: 12, align: 'right' as const },
                { key: 'absent_count', label: 'Absent', format: 'number', width: 12, align: 'right' as const },
                { key: 'late_count', label: 'Late', format: 'number', width: 10, align: 'right' as const },
                { key: 'attendance_percentage', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
            ],
            rows: summaries,
            fileName: 'attendance-report',
            includeMetadata: true,
            includeTimestamp: true,
            sheetName: 'Attendance',
            freezeHeader: true,
            autoFilter: true,
            orientation: 'landscape' as const,
        };
    }, [cohorts, selectedCohort, selectedTerm, summaries, terms]);

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Attendance Reports</h1>
                    <p className="text-gray-500 mt-1">Session participation metrics per student and subject.</p>
                </div>
                <div className="flex items-center gap-2">
                    {exportPayload && (
                        <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                            <Download className="h-4 w-4 mr-1.5" />
                            Export
                        </Button>
                    )}
                    <Calendar className="h-7 w-7 text-indigo-600" />
                </div>
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

            {exportPayload && (
                <ExportModal
                    open={exportOpen}
                    onClose={() => setExportOpen(false)}
                    payload={exportPayload}
                    defaultFormat="excel"
                    title="Export Attendance Report"
                />
            )}

        </div>
    );
}

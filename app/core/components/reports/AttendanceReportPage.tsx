'use client';

// ============================================================================
// app/(dashboard)/reports/attendance/page.tsx — render only
// ============================================================================

import { Calendar, Download } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { AttendanceReportFilters } from '@/app/core/components/reports/AttendanceReportFilters';
import { AttendanceReportStats } from '@/app/core/components/reports/AttendanceReportStats';
import { AttendanceReportTable } from '@/app/core/components/reports/AttendanceReportTable';
import { AdminReportAccessGate } from '@/app/core/components/reports/AdminReportAccessGate';
import { useAttendanceReportPage } from '@/app/core/hooks/reports/useAttendanceReportPage';

export function AttendanceReportPage() {
    const {
        selectedTerm,
        selectedCohort,
        exportOpen,
        termsLoading,
        cohortsLoading,
        summaries,
        loading,
        error,
        totalSessions,
        avgAttendance,
        atRisk,
        exportPayload,
        termOptions,
        cohortOptions,
        setExportOpen,
        handleTermChange,
        handleCohortChange,
    } = useAttendanceReportPage();

    return (
        <AdminReportAccessGate>
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Attendance Reports</h1>
                    <p className="text-gray-500 mt-1">Attendance is a kernel fact across generic, CBC, pending, and unsupported reporting sources.</p>
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
                <AttendanceReportStats
                    records={summaries.length}
                    avgAttendance={avgAttendance}
                    totalSessions={totalSessions}
                    atRisk={atRisk}
                />
            )}

            <AttendanceReportFilters
                selectedTerm={selectedTerm}
                selectedCohort={selectedCohort}
                termsLoading={termsLoading}
                cohortsLoading={cohortsLoading}
                termOptions={termOptions}
                cohortOptions={cohortOptions}
                onTermChange={handleTermChange}
                onCohortChange={handleCohortChange}
            />

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
                <AttendanceReportTable summaries={summaries} />
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
        </AdminReportAccessGate>
    );
}

'use client';

import { useMemo, useState } from 'react';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useAttendanceSummaries } from '@/app/core/hooks/useReporting';
import type { AttendanceSummary } from '@/app/core/types/reporting';
import type { ExportPayload } from '@/app/types/export';

export function useAttendanceReportPage() {
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [selectedCohort, setSelectedCohort] = useState<number | undefined>(undefined);
    const [exportOpen, setExportOpen] = useState(false);

    const { terms, loading: termsLoading } = useTerms();
    const { cohorts, loading: cohortsLoading } = useCohorts();
    const { summaries, loading, error } = useAttendanceSummaries({
        term: selectedTerm ?? undefined,
        cohort: selectedCohort,
    });

    const totalSessions = summaries.reduce(
        (sessionCount, summary) => sessionCount + summary.total_sessions,
        0
    );
    const avgAttendance = summaries.length
        ? summaries.reduce(
            (attendanceTotal, summary) => attendanceTotal + summary.attendance_percentage,
            0
        ) / summaries.length
        : 0;
    const atRisk = summaries.filter((summary) => summary.attendance_percentage < 75).length;

    const exportPayload = useMemo<ExportPayload | null>(() => {
        if (!selectedTerm || summaries.length === 0) return null;

        return {
            title: 'Attendance Report',
            subtitle: selectedCohort
                ? `Cohort ${selectedCohort} attendance records`
                : 'All cohort attendance records',
            metadata: {
                term: terms.find((term) => term.id === selectedTerm)?.name ?? 'Selected term',
                cohort: cohorts.find((cohort) => cohort.id === selectedCohort)?.name ?? 'All cohorts',
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

    const termOptions = [
        { value: '', label: 'Select term…' },
        ...terms.map((term) => ({
            value: String(term.id),
            label: `${term.academic_year_name} — ${term.name}`,
        })),
    ];
    const cohortOptions = [
        { value: '', label: 'All cohorts' },
        ...cohorts.map((cohort) => ({ value: String(cohort.id), label: cohort.name })),
    ];

    return {
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
        handleTermChange: (value: string) => setSelectedTerm(value ? Number(value) : null),
        handleCohortChange: (value: string) => setSelectedCohort(value ? Number(value) : undefined),
    };
}

export type AttendanceReportRow = AttendanceSummary;

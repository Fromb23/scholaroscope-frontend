'use client';

import { useMemo, useState } from 'react';
import {
    User, TrendingUp, BookOpen, Award,
    Activity, FileText, Calendar, Download,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Select } from '@/app/components/ui/Select';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { ExportModal } from '@/app/components/export/ExportModal';
import { GradeBadge } from '@/app/core/components/reports/GradeBadge';
import { AttendanceBar } from '@/app/core/components/reports/AttendanceBar';
import { useStudentReportCard, useLongitudinalStudent } from '@/app/core/hooks/useReporting';
import { useStudents } from '@/app/core/hooks/useStudents';
import { useTerms } from '@/app/core/hooks/useAcademic';
import type { ExportPayload } from '@/app/types/export';

type ViewMode = 'report-card' | 'longitudinal';

export function StudentsReportPage() {
    const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('report-card');
    const [exportOpen, setExportOpen] = useState(false);

    const { students, loading: studentsLoading } = useStudents();
    const { terms, loading: termsLoading } = useTerms();
    const { reportCard, loading: reportLoading, error: reportError } = useStudentReportCard(selectedStudent, selectedTerm);
    const { data: longitudinal, loading: longLoading, error: longError } = useLongitudinalStudent(selectedStudent);

    const showReport = viewMode === 'report-card' && selectedStudent && selectedTerm;
    const showLong = viewMode === 'longitudinal' && selectedStudent;
    const isLoading = showReport ? reportLoading : showLong ? longLoading : false;
    const visibleError = viewMode === 'report-card' ? reportError : longError;

    const exportPayload = useMemo<ExportPayload | null>(() => {
        if (viewMode === 'report-card' && reportCard) {
            const attendanceByCode = new Map(
                reportCard.attendance.map(item => [item.subject_code, item])
            );

            return {
                title: `${reportCard.student.name} Report Card`,
                subtitle: reportCard.term
                    ? `${reportCard.term.name} · ${reportCard.term.academic_year}`
                    : 'Learner report card',
                metadata: {
                    cohort: reportCard.student.cohort ?? '—',
                    term: reportCard.term?.name ?? 'All terms',
                    academicYear: reportCard.term?.academic_year ?? '—',
                    averageScore: reportCard.overall.average_score != null
                        ? `${reportCard.overall.average_score.toFixed(1)}%`
                        : '—',
                    averageAttendance: reportCard.overall.average_attendance != null
                        ? `${reportCard.overall.average_attendance.toFixed(1)}%`
                        : '—',
                    generatedAt: new Date().toLocaleString(),
                },
                columns: [
                    { key: 'subject', label: 'Subject', width: 24 },
                    { key: 'subject_code', label: 'Code', width: 10 },
                    { key: 'final_score', label: 'Final Score', format: 'percentage', width: 14, align: 'right' as const },
                    { key: 'grade', label: 'Grade', width: 10 },
                    { key: 'grade_status', label: 'Status', width: 14 },
                    { key: 'position', label: 'Position', width: 12 },
                    { key: 'policy', label: 'Policy', width: 18 },
                    { key: 'attendance_rate', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
                    { key: 'present', label: 'Present', format: 'number', width: 10, align: 'right' as const },
                    { key: 'absent', label: 'Absent', format: 'number', width: 10, align: 'right' as const },
                    { key: 'late', label: 'Late', format: 'number', width: 10, align: 'right' as const },
                ],
                rows: reportCard.grades.map(grade => {
                    const attendance = attendanceByCode.get(grade.subject_code);
                    return {
                        subject: grade.subject_name,
                        subject_code: grade.subject_code,
                        final_score: grade.final_score,
                        grade: grade.letter_grade,
                        grade_status: grade.grade_status,
                        position: `${grade.position}/${grade.total_in_class}`,
                        policy: grade.policy_name ?? '—',
                        attendance_rate: attendance?.attendance_percentage ?? null,
                        present: attendance?.present_count ?? null,
                        absent: attendance?.absent_count ?? null,
                        late: attendance?.late_count ?? null,
                    };
                }),
                fileName: `student-report-card-${reportCard.student.admission_number.toLowerCase()}`,
                includeMetadata: true,
                includeTimestamp: true,
                sheetName: 'Report Card',
                freezeHeader: true,
                autoFilter: true,
                orientation: 'landscape' as const,
            };
        }

        if (viewMode === 'longitudinal' && longitudinal && longitudinal.terms.length > 0) {
            return {
                title: `${longitudinal.student.name} Longitudinal Report`,
                subtitle: longitudinal.student.admission_number,
                metadata: {
                    generatedAt: new Date().toLocaleString(),
                },
                columns: [
                    { key: 'term', label: 'Term', width: 18 },
                    { key: 'academic_year', label: 'Academic Year', width: 18 },
                    { key: 'subject', label: 'Subject', width: 24 },
                    { key: 'weighted_average', label: 'Average', format: 'percentage', width: 14, align: 'right' as const },
                    { key: 'final_grade', label: 'Grade', width: 10 },
                    { key: 'attendance_rate', label: 'Attendance', format: 'percentage', width: 14, align: 'right' as const },
                    { key: 'assessments', label: 'Assessments', format: 'number', width: 14, align: 'right' as const },
                ],
                rows: longitudinal.terms.flatMap(termData => {
                    const attendanceByCode = new Map(
                        termData.attendance.map(item => [item.subject_code, item])
                    );
                    return termData.grades.map(grade => {
                        const attendance = attendanceByCode.get(grade.subject_code);
                        return {
                            term: termData.term.name,
                            academic_year: termData.term.academic_year,
                            subject: grade.subject_name,
                            weighted_average: grade.weighted_average,
                            final_grade: grade.final_grade,
                            attendance_rate: attendance?.attendance_percentage ?? null,
                            assessments: grade.total_assessments,
                        };
                    });
                }),
                fileName: `student-longitudinal-report-${longitudinal.student.admission_number.toLowerCase()}`,
                includeMetadata: true,
                includeTimestamp: true,
                sheetName: 'Longitudinal',
                freezeHeader: true,
                autoFilter: true,
                orientation: 'landscape' as const,
            };
        }

        return null;
    }, [longitudinal, reportCard, viewMode]);

    return (
        <div className="space-y-6">

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Student Reports</h1>
                    <p className="text-gray-500 mt-1">
                        Report cards, subject performance, and longitudinal tracking.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {exportPayload && (
                        <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
                            <Download className="h-4 w-4 mr-1.5" />
                            Export
                        </Button>
                    )}
                    <User className="h-7 w-7 text-blue-600" />
                </div>
            </div>

            <div className="flex gap-2">
                <Button
                    variant={viewMode === 'report-card' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setViewMode('report-card')}
                >
                    <BookOpen className="h-4 w-4 mr-1.5" />Report Card
                </Button>
                <Button
                    variant={viewMode === 'longitudinal' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setViewMode('longitudinal')}
                >
                    <TrendingUp className="h-4 w-4 mr-1.5" />Progress Over Time
                </Button>
            </div>

            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <Select
                        label="Student"
                        value={selectedStudent?.toString() ?? ''}
                        onChange={e => setSelectedStudent(e.target.value ? Number(e.target.value) : null)}
                        disabled={studentsLoading}
                        options={[
                            { value: '', label: 'Select student…' },
                            ...students.map(student => ({
                                value: String(student.id),
                                label: `${student.full_name} (${student.admission_number})`,
                            })),
                        ]}
                    />
                    {viewMode === 'report-card' && (
                        <Select
                            label="Term"
                            value={selectedTerm?.toString() ?? ''}
                            onChange={e => setSelectedTerm(e.target.value ? Number(e.target.value) : null)}
                            disabled={termsLoading}
                            options={[
                                { value: '', label: 'Select term…' },
                                ...terms.map(term => ({
                                    value: String(term.id),
                                    label: `${term.academic_year_name} — ${term.name}`,
                                })),
                            ]}
                        />
                    )}
                </div>
            </Card>

            {!selectedStudent && (
                <Card>
                    <div className="py-16 text-center">
                        <User className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-3 text-sm font-medium text-gray-900">No student selected</p>
                        <p className="mt-1 text-xs text-gray-500">
                            Select a student above to view their report.
                        </p>
                    </div>
                </Card>
            )}

            {isLoading && selectedStudent && <LoadingSpinner />}

            {visibleError && (
                <ErrorBanner message={visibleError} onDismiss={() => { }} />
            )}

            {showReport && !reportLoading && reportCard && (
                <div className="space-y-6">

                    <Card>
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {reportCard.student.name}
                                </h2>
                                <p className="text-gray-500 text-sm mt-0.5">
                                    {reportCard.student.admission_number}
                                    {reportCard.student.cohort && ` · ${reportCard.student.cohort}`}
                                    {reportCard.student.level && ` · ${reportCard.student.level}`}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Term</p>
                                <p className="font-semibold text-gray-900">
                                    {reportCard.term?.name ?? 'All terms'}
                                </p>
                                <p className="text-xs text-gray-500">{reportCard.term?.academic_year ?? '—'}</p>
                            </div>
                        </div>
                    </Card>

                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="border-l-4 border-blue-500">
                            <div className="flex items-center gap-2 mb-1">
                                <Award className="h-4 w-4 text-blue-500" />
                                <span className="text-xs text-gray-500">Average Grade</span>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {reportCard.overall.average_score?.toFixed(1) ?? '—'}
                                <span className="text-base font-normal text-gray-400 ml-1">%</span>
                            </p>
                        </Card>
                        <Card className="border-l-4 border-green-500">
                            <div className="flex items-center gap-2 mb-1">
                                <Activity className="h-4 w-4 text-green-500" />
                                <span className="text-xs text-gray-500">Average Attendance</span>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {reportCard.overall.average_attendance?.toFixed(1) ?? '—'}
                                <span className="text-base font-normal text-gray-400 ml-1">%</span>
                            </p>
                        </Card>
                        <Card className="border-l-4 border-purple-500">
                            <div className="flex items-center gap-2 mb-1">
                                <BookOpen className="h-4 w-4 text-purple-500" />
                                <span className="text-xs text-gray-500">Subjects</span>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {reportCard.overall.total_subjects}
                            </p>
                        </Card>
                    </div>

                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Subject Performance</h3>
                            <Badge variant="blue">{reportCard.grades.length} subjects</Badge>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Subject</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Final Score</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Components</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Grade</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Position</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Policy</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {reportCard.grades.map(grade => (
                                        <tr key={grade.id}>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-gray-900">{grade.subject_name}</p>
                                                <p className="text-xs text-gray-500">{grade.subject_code}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-gray-900">
                                                    {grade.final_score.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-gray-500 space-y-0.5">
                                                    {Object.entries(grade.component_scores ?? {}).map(([key, value]) => (
                                                        <div key={key}>
                                                            {key}: {typeof value === 'number' ? value.toFixed(1) : value}%
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <GradeBadge
                                                    grade={grade.letter_grade}
                                                    label={grade.letter_label}
                                                    status={grade.grade_status}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-gray-700">
                                                    {grade.position}/{grade.total_in_class}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-gray-500">
                                                    {grade.policy_name ?? '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {reportCard.attendance.length > 0 && (
                        <Card>
                            <h3 className="font-semibold text-gray-900 mb-4">Attendance Record</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Subject</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Sessions</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Present</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Absent</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Late</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {reportCard.attendance.map(attendance => (
                                            <tr key={attendance.id}>
                                                <td className="px-6 py-4">
                                                    <p className="font-medium text-gray-900">{attendance.subject_name}</p>
                                                    <p className="text-xs text-gray-500">{attendance.subject_code}</p>
                                                </td>
                                                <td className="px-6 py-4">{attendance.total_sessions}</td>
                                                <td className="px-6 py-4">
                                                    <span className="text-green-600 font-medium">{attendance.present_count}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-red-600 font-medium">{attendance.absent_count}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-yellow-600 font-medium">{attendance.late_count}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <AttendanceBar percentage={attendance.attendance_percentage} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {showLong && !longLoading && longitudinal && (
                <div className="space-y-4">
                    <Card>
                        <h2 className="font-semibold text-gray-900 mb-1">
                            {longitudinal.student.name}
                        </h2>
                        <p className="text-sm text-gray-500">{longitudinal.student.admission_number}</p>
                    </Card>

                    {longitudinal.terms.length === 0 ? (
                        <Card>
                            <div className="py-12 text-center">
                                <TrendingUp className="mx-auto h-10 w-10 text-gray-300" />
                                <p className="mt-2 text-sm text-gray-500">No term data available yet.</p>
                            </div>
                        </Card>
                    ) : (
                        longitudinal.terms.map((termData, index) => (
                            <Card key={`${termData.term.id}-${index}`}>
                                <div className="flex items-center gap-3 mb-4">
                                    <Calendar className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <p className="font-semibold text-gray-900">{termData.term.name}</p>
                                        <p className="text-xs text-gray-500">{termData.term.academic_year}</p>
                                    </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {termData.grades.map(grade => (
                                        <div key={grade.id}
                                            className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                            <p className="text-sm font-medium text-gray-800 mb-2">
                                                {grade.subject_name}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-2xl font-bold text-blue-600">
                                                    {grade.weighted_average?.toFixed(1) ?? '—'}%
                                                </span>
                                                <Badge variant={
                                                    grade.final_grade === 'A' ? 'green' :
                                                        grade.final_grade === 'B' ? 'blue' :
                                                            grade.final_grade === 'C' ? 'yellow' : 'red'
                                                }>
                                                    {grade.final_grade}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {showReport && !reportLoading && !reportCard && (
                <Card>
                    <div className="py-12 text-center">
                        <FileText className="mx-auto h-10 w-10 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">
                            No report card found for this student and term.
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
                    title="Export Student Report"
                />
            )}

        </div>
    );
}

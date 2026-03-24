'use client';

// ============================================================================
// app/(dashboard)/reports/students/page.tsx — render only
// ============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { GradeBadge } from '@/app/core/components/reports/GradeBadge';
import { AttendanceBar } from '@/app/core/components/reports/AttendanceBar';
import { useStudentReportCard, useLongitudinalStudent } from '@/app/core/hooks/useReporting';
import { useStudents } from '@/app/core/hooks/useStudents';
import { useTerms } from '@/app/core/hooks/useAcademic';

type ViewMode = 'report-card' | 'longitudinal';

export default function StudentsReportPage() {
    const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('report-card');

    const { students, loading: studentsLoading } = useStudents();
    const { terms, loading: termsLoading } = useTerms();
    const { reportCard, loading: reportLoading, error: reportError }
        = useStudentReportCard(selectedStudent, selectedTerm);
    const { data: longitudinal, loading: longLoading, error: longError }
        = useLongitudinalStudent(selectedStudent);

    const showReport = viewMode === 'report-card' && selectedStudent && selectedTerm;
    const showLong = viewMode === 'longitudinal' && selectedStudent;
    const isLoading = reportLoading || longLoading;

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Student Reports</h1>
                    <p className="text-gray-500 mt-1">
                        Report cards, subject performance, and longitudinal tracking.
                    </p>
                </div>
                <User className="h-7 w-7 text-blue-600" />
            </div>

            {/* View toggle */}
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

            {/* Filters */}
            <Card>
                <div className="grid md:grid-cols-2 gap-4">
                    <Select
                        label="Student"
                        value={selectedStudent?.toString() ?? ''}
                        onChange={e => setSelectedStudent(e.target.value ? Number(e.target.value) : null)}
                        disabled={studentsLoading}
                        options={[
                            { value: '', label: 'Select student…' },
                            ...students.map(s => ({
                                value: String(s.id),
                                label: `${s.full_name} (${s.admission_number})`,
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
                                ...terms.map(t => ({
                                    value: String(t.id),
                                    label: `${t.academic_year_name} — ${t.name}`,
                                })),
                            ]}
                        />
                    )}
                </div>
            </Card>

            {/* Empty state */}
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

            {/* Loading */}
            {isLoading && selectedStudent && <LoadingSpinner />}

            {/* Error */}
            {(reportError || longError) && (
                <ErrorBanner message={reportError ?? longError ?? ''} onDismiss={() => { }} />
            )}

            {/* ── Report Card ─────────────────────────────────────────────── */}
            {showReport && !reportLoading && reportCard && (
                <div className="space-y-6">

                    {/* Student header */}
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
                                <p className="font-semibold text-gray-900">{reportCard.term.name}</p>
                                <p className="text-xs text-gray-500">{reportCard.term.academic_year}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Stats */}
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

                    {/* Grades table */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-900">Subject Performance</h3>
                            <Badge variant="blue">{reportCard.grades.length} subjects</Badge>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Final Score</TableHead>
                                    <TableHead>Components</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Position</TableHead>
                                    <TableHead>Policy</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportCard.grades.map(grade => (
                                    <TableRow key={grade.id}>
                                        <TableCell>
                                            <p className="font-medium text-gray-900">{grade.subject_name}</p>
                                            <p className="text-xs text-gray-500">{grade.subject_code}</p>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-semibold text-gray-900">
                                                {grade.final_score.toFixed(1)}%
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs text-gray-500 space-y-0.5">
                                                {Object.entries(grade.component_scores).map(([k, v]) => (
                                                    <div key={k}>{k}: {(v as number).toFixed(1)}%</div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <GradeBadge
                                                grade={grade.letter_grade}
                                                label={grade.letter_label}
                                                status={grade.grade_status}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-gray-700">
                                                {grade.position}/{grade.total_in_class}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs text-gray-500">
                                                {grade.policy_name ?? '—'}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Attendance table */}
                    {reportCard.attendance.length > 0 && (
                        <Card>
                            <h3 className="font-semibold text-gray-900 mb-4">Attendance Record</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Sessions</TableHead>
                                        <TableHead>Present</TableHead>
                                        <TableHead>Absent</TableHead>
                                        <TableHead>Late</TableHead>
                                        <TableHead>Rate</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reportCard.attendance.map(att => (
                                        <TableRow key={att.id}>
                                            <TableCell>
                                                <p className="font-medium text-gray-900">{att.subject_name}</p>
                                                <p className="text-xs text-gray-500">{att.subject_code}</p>
                                            </TableCell>
                                            <TableCell>{att.total_sessions}</TableCell>
                                            <TableCell>
                                                <span className="text-green-600 font-medium">{att.present_count}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-red-600 font-medium">{att.absent_count}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-yellow-600 font-medium">{att.late_count}</span>
                                            </TableCell>
                                            <TableCell>
                                                <AttendanceBar percentage={att.attendance_percentage} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    )}
                </div>
            )}

            {/* ── Longitudinal ─────────────────────────────────────────────── */}
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
                        longitudinal.terms.map((termData, i) => (
                            <Card key={i}>
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

            {/* No data after selection */}
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

        </div>
    );
}
'use client';

import { useState } from 'react';
import { Select } from '@/app/components/ui/Select';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { useStudents } from '@/app/core/hooks/useStudents';
import { useTerms } from '@/app/core/hooks/useAcademic';
import { useStudentReportCard, useLongitudinalStudent } from '@/app/core/hooks/useReporting';
import { User, TrendingUp, Calendar, BookOpen, Award, Activity } from 'lucide-react';

export default function StudentsReportPage() {
    const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'report-card' | 'longitudinal'>('report-card');

    const { terms, loading: termsLoading } = useTerms();
    const { students, loading: studentsLoading } = useStudents(
        selectedCohortId ? { cohort: selectedCohortId } : undefined
    );
    const { reportCard, loading: reportLoading } = useStudentReportCard(selectedStudent, selectedTerm);
    const { data: longitudinalData, loading: longitudinalLoading } = useLongitudinalStudent(selectedStudent);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Student Reports</h1>
                    <p className="mt-2 text-gray-600">Individual performance & progress tracking</p>
                </div>
                <User className="h-8 w-8 text-blue-600" />
            </div>

            {/* View Mode Selector */}
            <Card>
                <div className="flex gap-3">
                    <Button
                        variant={viewMode === 'report-card' ? 'primary' : 'ghost'}
                        onClick={() => setViewMode('report-card')}
                    >
                        <BookOpen className="mr-2 h-4 w-4" />
                        Report Card
                    </Button>
                    <Button
                        variant={viewMode === 'longitudinal' ? 'primary' : 'ghost'}
                        onClick={() => setViewMode('longitudinal')}
                    >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Longitudinal View
                    </Button>
                </div>
            </Card>

            {/* Selection Filters */}
            <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Student & Term</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <Select
                        label="Student"
                        value={selectedStudent?.toString() || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSelectedStudent(val ? Number(val) : null);
                        }}
                        options={[
                            { value: '', label: 'Select Student' },
                            ...students.map(student => ({
                                value: String(student.id),
                                label: `${student.full_name} (${student.admission_number})`
                            }))
                        ]}
                    />
                    {viewMode === 'report-card' && (
                        <Select
                            label="Term"
                            value={selectedTerm?.toString() || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedTerm(val ? Number(val) : null);
                            }}
                            options={[
                                { value: '', label: 'Select Term' },
                                ...terms.map(t => ({
                                    value: String(t.id),
                                    label: `${t.academic_year_name} — ${t.name}`
                                }))
                            ]}
                        />
                    )}
                </div>
            </Card>

            {/* Report Card View */}
            {viewMode === 'report-card' && reportCard && (
                <div className="space-y-6">
                    {/* Student Info Card */}
                    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    {reportCard.student.name}
                                </h2>
                                <p className="text-gray-700 font-medium">
                                    Admission: {reportCard.student.admission_number}
                                </p>
                                <p className="text-gray-600">
                                    {reportCard.student.cohort} · {reportCard.student.level}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-600">Term</p>
                                <p className="text-xl font-bold text-gray-900">{reportCard.term.name}</p>
                                <p className="text-gray-600">{reportCard.term.academic_year}</p>
                            </div>
                        </div>
                    </Card>

                    {/* Overall Statistics */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="border-l-4 border-blue-500">
                            <div className="flex items-center gap-3 mb-2">
                                <Award className="h-5 w-5 text-blue-600" />
                                <span className="text-sm font-medium text-gray-600">Average Grade</span>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {reportCard.overall_statistics.average_grade?.toFixed(1) || 'N/A'}%
                            </p>
                        </Card>
                        <Card className="border-l-4 border-green-500">
                            <div className="flex items-center gap-3 mb-2">
                                <Activity className="h-5 w-5 text-green-600" />
                                <span className="text-sm font-medium text-gray-600">Average Attendance</span>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {reportCard.overall_statistics.average_attendance?.toFixed(1) || 'N/A'}%
                            </p>
                        </Card>
                        <Card className="border-l-4 border-purple-500">
                            <div className="flex items-center gap-3 mb-2">
                                <BookOpen className="h-5 w-5 text-purple-600" />
                                <span className="text-sm font-medium text-gray-600">Subjects</span>
                            </div>
                            <p className="text-3xl font-bold text-gray-900">
                                {reportCard.overall_statistics.total_subjects}
                            </p>
                        </Card>
                    </div>

                    {/* Grades Table */}
                    <Card>
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Subject Performance</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Average</TableHead>
                                    <TableHead>Weighted</TableHead>
                                    <TableHead>Grade</TableHead>
                                    <TableHead>Assessments</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportCard.grades.map((grade) => (
                                    <TableRow key={grade.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-gray-900">{grade.subject_name}</p>
                                                <p className="text-sm text-gray-500">{grade.subject_code}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-gray-700">
                                                {grade.average_score.toFixed(1)}%
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-blue-600">
                                                {grade.weighted_average.toFixed(1)}%
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                grade.final_grade === 'A' ? 'success' :
                                                    grade.final_grade === 'B' ? 'info' :
                                                        grade.final_grade === 'C' ? 'warning' :
                                                            'danger'
                                            }>
                                                {grade.final_grade}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-gray-600">{grade.total_assessments}</span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Attendance Table */}
                    <Card>
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">Attendance Record</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Present</TableHead>
                                    <TableHead>Absent</TableHead>
                                    <TableHead>Late</TableHead>
                                    <TableHead>Rate</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportCard.attendance.map((att) => (
                                    <TableRow key={att.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-gray-900">{att.subject_name}</p>
                                                <p className="text-sm text-gray-500">{att.total_sessions} sessions</p>
                                            </div>
                                        </TableCell>
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
                                            <div className="flex items-center gap-2">
                                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-green-600 h-2 rounded-full"
                                                        style={{ width: `${att.attendance_percentage}%` }}
                                                    />
                                                </div>
                                                <span className="font-medium text-gray-700">
                                                    {att.attendance_percentage.toFixed(0)}%
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}

            {/* Longitudinal View */}
            {viewMode === 'longitudinal' && longitudinalData && (
                <Card>
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Progress Over Time</h3>
                    <div className="space-y-6">
                        {longitudinalData.terms.map((termData, index) => (
                            <div key={index} className="border-l-4 border-blue-500 pl-6 pb-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900">{termData.term.name}</h4>
                                        <p className="text-sm text-gray-600">{termData.term.academic_year}</p>
                                    </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {termData.grades.map((grade) => (
                                        <div key={grade.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                            <p className="font-medium text-gray-900 mb-2">{grade.subject_name}</p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-2xl font-bold text-blue-600">
                                                    {grade.weighted_average.toFixed(1)}%
                                                </span>
                                                <Badge variant={
                                                    grade.final_grade === 'A' ? 'success' :
                                                        grade.final_grade === 'B' ? 'info' :
                                                            'warning'
                                                }>
                                                    {grade.final_grade}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Loading State */}
            {(reportLoading || longitudinalLoading) && (
                <Card>
                    <div className="py-12 text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-gray-600">Loading data...</p>
                    </div>
                </Card>
            )}

            {/* Empty State */}
            {!selectedStudent && (
                <Card>
                    <div className="py-12 text-center">
                        <User className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No Student Selected</h3>
                        <p className="mt-1 text-sm text-gray-500">Select a student to view their reports</p>
                    </div>
                </Card>
            )}
        </div>
    );
}
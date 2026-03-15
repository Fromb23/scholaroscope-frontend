'use client';

import { useState } from 'react';
import { Select } from '@/app/components/ui/Select';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/app/components/ui/Table';
import { useStudents } from '@/app/core/hooks/useStudents';
import { useTerms, useCohorts } from '@/app/core/hooks/useAcademic';
import { useStudentReportCard, useLongitudinalStudent } from '@/app/core/hooks/useReporting';
import {
    User, TrendingUp, Calendar, BookOpen, Award, Activity,
    Printer, FileText, Users
} from 'lucide-react';

export default function StudentsReportPage() {
    // Individual Student Report State
    const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
    const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'report-card' | 'longitudinal'>('report-card');

    // Cohort PDF Generation State
    const [selectedCohort, setSelectedCohort] = useState<number | null>(null);
    const [selectedPdfTerm, setSelectedPdfTerm] = useState<number | null>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // Fetch data
    const { students, loading: studentsLoading } = useStudents();
    const { cohorts, loading: cohortsLoading } = useCohorts();
    const { terms, loading: termsLoading } = useTerms();
    const { reportCard, loading: reportLoading } = useStudentReportCard(selectedStudent, selectedTerm);
    const { data: longitudinalData, loading: longitudinalLoading } = useLongitudinalStudent(selectedStudent);

    // Filter students by selected cohort for PDF
    const cohortStudents = students?.filter(
        (student) => student.primary_cohort === selectedCohort
    ) || [];

    const selectedCohortData = cohorts?.find(c => c.id === selectedCohort);
    const selectedTermData = terms?.find(t => t.id === selectedPdfTerm);

    const handleGeneratePdf = () => {
        if (!selectedCohort || !selectedPdfTerm) {
            alert('Please select both cohort and term');
            return;
        }

        setGeneratingPdf(true);
        setTimeout(() => {
            window.print();
            setGeneratingPdf(false);
        }, 500);
    };

    return (
        <>
            {/* Main Screen Content */}
            <div className="space-y-6 print:hidden">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Student Reports</h1>
                        <p className="mt-2 text-gray-600">Individual performance & cohort PDF generation</p>
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

                {/* Individual Student Selection */}
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Student & Term</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Select
                            label="Student"
                            value={selectedStudent ? String(selectedStudent) : ''}
                            onChange={(e) => {
                                const v = e.target.value;
                                setSelectedStudent(v ? Number(v) : null);
                            }}
                            options={[
                                { value: '', label: 'Select Student' },
                                ...students.map((s) => ({
                                    value: String(s.id),
                                    label: `${s.full_name} (${s.admission_number})`,
                                }))
                            ]}
                            disabled={studentsLoading}
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
                                    ...(terms || []).map(term => ({
                                        value: String(term.id),
                                        label: `${term.academic_year_name} — ${term.name}`
                                    }))
                                ]}
                                disabled={termsLoading}
                            />
                        )}
                    </div>
                </Card>

                {/* Report Card View */}
                {viewMode === 'report-card' && selectedStudent && selectedTerm && (
                    reportLoading ? (
                        <Card>
                            <div className="py-12 text-center">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                                <p className="mt-2 text-gray-600">Loading report card...</p>
                            </div>
                        </Card>
                    ) : reportCard ? (
                        <div className="space-y-6">
                            {/* Student Info Card */}
                            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                            {reportCard.student?.full_name}
                                        </h2>
                                        <p className="text-gray-700 font-medium">
                                            Admission: {reportCard.student?.admission_number}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-600">Term</p>
                                        <p className="text-xl font-bold text-gray-900">{reportCard.term?.name}</p>
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
                                        {reportCard.summary?.average_grade?.toFixed(1) || 'N/A'}%
                                    </p>
                                </Card>
                                <Card className="border-l-4 border-green-500">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Activity className="h-5 w-5 text-green-600" />
                                        <span className="text-sm font-medium text-gray-600">Average Attendance</span>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {reportCard.summary?.average_attendance?.toFixed(1) || 'N/A'}%
                                    </p>
                                </Card>
                                <Card className="border-l-4 border-purple-500">
                                    <div className="flex items-center gap-3 mb-2">
                                        <BookOpen className="h-5 w-5 text-purple-600" />
                                        <span className="text-sm font-medium text-gray-600">Subjects</span>
                                    </div>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {reportCard.grades?.length || 0}
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
                                            <TableHead>Highest</TableHead>
                                            <TableHead>Lowest</TableHead>
                                            <TableHead>Grade</TableHead>
                                            <TableHead>Assessments</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportCard.grades?.map((grade) => (
                                            <TableRow key={grade.id}>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{grade.subject_name}</p>
                                                        <p className="text-sm text-gray-500">{grade.subject_code}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-medium text-gray-700">
                                                        {grade.average_score?.toFixed(1)}%
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-green-600 font-medium">
                                                        {grade.highest_score?.toFixed(1) || 'N/A'}%
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-red-600 font-medium">
                                                        {grade.lowest_score?.toFixed(1) || 'N/A'}%
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={
                                                        grade.letter_grade === 'A' ? 'success' :
                                                            grade.letter_grade === 'B' ? 'info' :
                                                                grade.letter_grade === 'C' ? 'warning' :
                                                                    'danger'
                                                    }>
                                                        {grade.letter_grade}
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
                            {reportCard.attendance && reportCard.attendance.length > 0 && (
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
                            )}
                        </div>
                    ) : (
                        <Card>
                            <div className="py-12 text-center">
                                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-gray-600">No report card available for this student and term.</p>
                            </div>
                        </Card>
                    )
                )}

                {/* Longitudinal View */}
                {viewMode === 'longitudinal' && selectedStudent && (
                    longitudinalLoading ? (
                        <Card>
                            <div className="py-12 text-center">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                                <p className="mt-2 text-gray-600">Loading longitudinal data...</p>
                            </div>
                        </Card>
                    ) : longitudinalData ? (
                        <Card>
                            <h3 className="text-xl font-semibold text-gray-900 mb-6">Progress Over Time</h3>
                            <div className="space-y-6">
                                {longitudinalData.term_summaries?.map((termData: any, index: number) => (
                                    <div key={index} className="border-l-4 border-blue-500 pl-6 pb-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Calendar className="h-5 w-5 text-blue-600" />
                                            <div>
                                                <h4 className="text-lg font-semibold text-gray-900">{termData.term_name}</h4>
                                                <p className="text-sm text-gray-600">{termData.academic_year}</p>
                                            </div>
                                        </div>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                                <p className="text-sm text-gray-600 mb-1">Average Grade</p>
                                                <p className="text-3xl font-bold text-blue-600">
                                                    {termData.average_grade?.toFixed(1) || 'N/A'}%
                                                </p>
                                            </div>
                                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                                <p className="text-sm text-gray-600 mb-1">Attendance</p>
                                                <p className="text-3xl font-bold text-green-600">
                                                    {termData.attendance_percentage?.toFixed(1) || 'N/A'}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ) : (
                        <Card>
                            <div className="py-12 text-center">
                                <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                                <p className="mt-2 text-gray-600">No longitudinal data available.</p>
                            </div>
                        </Card>
                    )
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

                {/* Cohort PDF Generation Section */}
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-blue-600" />
                        <h2 className="text-xl font-semibold text-gray-900">
                            Generate Cohort Weekly Attendance PDF
                        </h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                        <Select
                            label="Cohort"
                            value={selectedCohort?.toString() || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedCohort(val ? Number(val) : null);
                            }}
                            options={[
                                { value: '', label: 'Select Cohort' },
                                ...(cohorts || []).map(cohort => ({
                                    value: String(cohort.id),
                                    label: cohort.name
                                }))
                            ]}
                            disabled={cohortsLoading}
                        />

                        <Select
                            label="Term"
                            value={selectedPdfTerm?.toString() || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSelectedPdfTerm(val ? Number(val) : null);
                            }}
                            options={[
                                { value: '', label: 'Select Term' },
                                ...(terms || []).map(term => ({
                                    value: String(term.id),
                                    label: term.name
                                }))
                            ]}
                            disabled={termsLoading}
                        />

                        <div className="flex items-end">
                            <Button
                                onClick={handleGeneratePdf}
                                disabled={!selectedCohort || !selectedPdfTerm || generatingPdf}
                                className="w-full"
                            >
                                <Printer className="mr-2 h-4 w-4" />
                                {generatingPdf ? 'Generating...' : 'Generate PDF'}
                            </Button>
                        </div>
                    </div>

                    {/* Preview */}
                    {selectedCohort && selectedPdfTerm && cohortStudents.length > 0 && (
                        <div className="border-t border-gray-200 pt-6">
                            <p className="text-sm text-gray-600 mb-4">
                                Preview: {cohortStudents.length} student{cohortStudents.length !== 1 ? 's' : ''} in {selectedCohortData?.name}
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-auto border border-gray-200">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Admission No.</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {cohortStudents.slice(0, 10).map((student: any) => (
                                            <TableRow key={student.id}>
                                                <TableCell>{student.full_name}</TableCell>
                                                <TableCell>{student.admission_number}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {cohortStudents.length > 10 && (
                                    <p className="text-center text-gray-500 mt-4 text-sm">
                                        ...and {cohortStudents.length - 10} more students
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* Printable PDF Content (Hidden on screen, visible when printing) */}
            <div className="hidden print:block">
                <div className="p-8 bg-white">
                    {/* PDF Header */}
                    <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Weekly Attendance Register
                        </h1>
                        <p className="text-lg text-gray-700">
                            {selectedCohortData?.name} • {selectedTermData?.name}
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                            Academic Year {selectedTermData?.academic_year_name}
                        </p>
                    </div>

                    {/* PDF Table */}
                    <table className="w-full border-collapse border-2 border-gray-900">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border-2 border-gray-900 px-3 py-3 text-left font-bold text-sm">#</th>
                                <th className="border-2 border-gray-900 px-3 py-3 text-left font-bold text-sm">
                                    Admission Number
                                </th>
                                <th className="border-2 border-gray-900 px-4 py-3 text-left font-bold text-sm">
                                    Student Name
                                </th>
                                <th className="border-2 border-gray-900 px-3 py-3 text-center font-bold text-sm">Mon</th>
                                <th className="border-2 border-gray-900 px-3 py-3 text-center font-bold text-sm">Tue</th>
                                <th className="border-2 border-gray-900 px-3 py-3 text-center font-bold text-sm">Wed</th>
                                <th className="border-2 border-gray-900 px-3 py-3 text-center font-bold text-sm">Thu</th>
                                <th className="border-2 border-gray-900 px-3 py-3 text-center font-bold text-sm">Fri</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cohortStudents.map((student: any, index: number) => (
                                <tr key={student.id}>
                                    <td className="border-2 border-gray-900 px-3 py-4 text-sm font-medium">
                                        {index + 1}
                                    </td>
                                    <td className="border-2 border-gray-900 px-3 py-4 text-sm">
                                        {student.admission_number}
                                    </td>
                                    <td className="border-2 border-gray-900 px-4 py-4 text-sm font-medium">
                                        {student.full_name}
                                    </td>
                                    <td className="border-2 border-gray-900 px-3 py-4 bg-gray-50"></td>
                                    <td className="border-2 border-gray-900 px-3 py-4 bg-gray-50"></td>
                                    <td className="border-2 border-gray-900 px-3 py-4 bg-gray-50"></td>
                                    <td className="border-2 border-gray-900 px-3 py-4 bg-gray-50"></td>
                                    <td className="border-2 border-gray-900 px-3 py-4 bg-gray-50"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* PDF Footer */}
                    <div className="mt-8 text-sm text-gray-600">
                        <p>Total Students: {cohortStudents.length}</p>
                        <p>Generated on: {new Date().toLocaleDateString('en-GB', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}</p>
                    </div>
                </div>
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print\\:block,
                    .print\\:block * {
                        visibility: visible;
                    }
                    .print\\:block {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    @page {
                        size: A4 landscape;
                        margin: 1cm;
                    }
                }
            `}</style>
        </>
    );
}
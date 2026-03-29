'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Edit, Mail, Phone, User,
    GraduationCap, FileText, Trash2, UserPlus, UserMinus,
} from 'lucide-react';
import { useStudent } from '@/app/core/hooks/useStudents';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { useStudentAttendanceHistory } from '@/app/core/hooks/useSessions';
import { useAuth } from '@/app/context/AuthContext';
import { hasCapability } from '@/app/utils/permissions';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { DataTable, Column } from '@/app/components/ui/Table';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import {
    StatusModal, EnrollModal, UnenrollModal, DeleteStudentModal,
} from '@/app/core/components/learners/LearnerModals';
import type { StudentCohortEnrollment } from '@/app/core/types/student';

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    ACTIVE: 'success', GRADUATED: 'info', TRANSFERRED: 'warning',
    SUSPENDED: 'danger', WITHDRAWN: 'danger',
};

const ENROLLMENT_TYPE_VARIANTS: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
    PRIMARY: 'default', ELECTIVE: 'info', REMEDIAL: 'warning',
    ADVANCED: 'success', TRANSFER: 'info',
};

const END_REASON_VARIANTS: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
    COMPLETED: 'success', GRADUATED: 'success', TRANSFERRED: 'info',
    WRONG_ASSIGNMENT: 'warning', WITHDRAWN: 'danger', PROMOTED: 'success',
};

const END_REASON_LABELS: Record<string, string> = {
    COMPLETED: 'Completed', GRADUATED: 'Graduated', TRANSFERRED: 'Transferred',
    WRONG_ASSIGNMENT: 'Wrong Assignment', WITHDRAWN: 'Withdrawn', PROMOTED: 'Promoted',
};

function calculateAge(dob?: string): string {
    if (!dob) return 'N/A';
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return `${age} years`;
}

export default function LearnerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, activeRole } = useAuth();
    const studentId = Number(params.id);

    const {
        student, loading, error,
        actionLoading, actionError, setActionError,
        updateStatus, enroll, unenroll, deleteStudent,
    } = useStudent(studentId);

    const { data: attendanceData } = useStudentAttendanceHistory(studentId);
    const { cohorts } = useCohorts();

    const [statusOpen, setStatusOpen] = useState(false);
    const [enrollOpen, setEnrollOpen] = useState(false);
    const [unenrollTarget, setUnenrollTarget] = useState<StudentCohortEnrollment | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const canEdit = !!user && hasCapability(activeRole, 'EDIT_LEARNER');
    const canManage = !!user && hasCapability(activeRole, 'MANAGE_ENROLLMENT');

    const availableCohorts = useMemo(() => {
        if (!cohorts || !student) return [];
        const enrolled = student.enrollments.filter(e => e.is_active).map(e => e.cohort);
        return cohorts.filter((c: { id: number }) => !enrolled.includes(c.id));
    }, [cohorts, student]);

    const activeEnrollments = useMemo(
        () => student?.enrollments.filter(e => e.is_active) ?? [],
        [student]
    );
    const historyEnrollments = useMemo(
        () => student?.enrollments.filter(e => !e.is_active) ?? [],
        [student]
    );

    const handleDelete = async () => {
        await deleteStudent();
        router.push('/learners');
    };

    const activeColumns: Column<StudentCohortEnrollment>[] = [
        {
            key: 'cohort_name', header: 'Cohort', sortable: true,
            render: row => (
                <div className="flex items-center gap-2">
                    <span className="font-medium">{row.cohort_name}</span>
                    {row.cohort === student?.primary_cohort && (
                        <Badge variant="default" size="sm">Primary</Badge>
                    )}
                </div>
            ),
        },
        { key: 'cohort_level', header: 'Level', sortable: true },
        { key: 'curriculum_name', header: 'Curriculum', sortable: true },
        {
            key: 'enrollment_type', header: 'Type', sortable: true,
            render: row => (
                <Badge variant={ENROLLMENT_TYPE_VARIANTS[row.enrollment_type] ?? 'default'}>
                    {row.enrollment_type}
                </Badge>
            ),
        },
        {
            key: 'enrolled_date', header: 'Enrolled', sortable: true,
            render: row => new Date(row.enrolled_date).toLocaleDateString(),
        },
        ...(canManage ? [{
            key: 'actions' as keyof StudentCohortEnrollment,
            header: 'Actions',
            render: (row: StudentCohortEnrollment) => (
                <Button size="sm" variant="ghost" onClick={() => setUnenrollTarget(row)}>
                    <UserMinus className="h-4 w-4 text-red-600" />
                </Button>
            ),
        }] : []),
    ];

    const historyColumns: Column<StudentCohortEnrollment>[] = [
        { key: 'cohort_name', header: 'Cohort', sortable: true },
        { key: 'enrollment_type_display', header: 'Type', sortable: true },
        {
            key: 'enrolled_date', header: 'Enrolled', sortable: true,
            render: row => new Date(row.enrolled_date).toLocaleDateString(),
        },
        {
            key: 'completion_date', header: 'Ended', sortable: true,
            render: row => row.completion_date
                ? new Date(row.completion_date).toLocaleDateString() : '-',
        },
        {
            key: 'end_reason', header: 'Reason', sortable: true,
            render: row => row.end_reason ? (
                <Badge variant={END_REASON_VARIANTS[row.end_reason] ?? 'default'}>
                    {END_REASON_LABELS[row.end_reason] ?? row.end_reason}
                </Badge>
            ) : <Badge variant="default">Inactive</Badge>,
        },
    ];

    if (loading) return <LoadingSpinner message="Loading student..." />;
    if (error || !student) return (
        <div className="flex items-center justify-center h-64 flex-col gap-3">
            <p className="text-sm text-gray-500">{error ?? 'Student not found'}</p>
            <Link href="/learners">
                <Button variant="secondary">Back to Learners</Button>
            </Link>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Link href="/learners">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />Back to Learners
                    </Button>
                </Link>
                <div className="flex gap-2">
                    {canManage && (
                        <Button variant="ghost" onClick={() => setEnrollOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" />Enroll in Cohort
                        </Button>
                    )}
                    {canManage && (
                        <Button variant="ghost" onClick={() => setStatusOpen(true)}>
                            Update Status
                        </Button>
                    )}
                    {canEdit && (
                        <Link href={`/learners/${studentId}/edit`}>
                            <Button>
                                <Edit className="mr-2 h-4 w-4" />Edit
                            </Button>
                        </Link>
                    )}
                    {canEdit && (
                        <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                    )}
                </div>
            </div>

            {actionError && (
                <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
            )}

            {/* Profile */}
            <Card>
                <div className="flex items-start gap-6 p-2">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-blue-600 shrink-0">
                        <User className="h-12 w-12" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h1 className="text-3xl font-bold text-gray-900">{student.full_name}</h1>
                            <Badge variant={STATUS_VARIANTS[student.status] ?? 'default'}>
                                {student.status}
                            </Badge>
                            {student.gender && (
                                <Badge variant={student.gender.toUpperCase().startsWith('F') ? 'warning' : 'info'}>
                                    {student.gender}
                                </Badge>
                            )}
                            {student.cohort_count > 1 && (
                                <Badge variant="info">{student.cohort_count} Cohorts</Badge>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            {[
                                { label: 'Admission Number', value: student.admission_number },
                                { label: 'Date of Birth', value: student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'N/A' },
                                { label: 'Enrollment Date', value: new Date(student.enrollment_date).toLocaleDateString() },
                                { label: 'Age', value: calculateAge(student.date_of_birth) },
                            ].map(item => (
                                <div key={item.label}>
                                    <p className="text-sm text-gray-600">{item.label}</p>
                                    <p className="font-semibold text-gray-900">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Active Enrollments */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Active Cohort Enrollments</h2>
                    {canManage && (
                        <Button size="sm" onClick={() => setEnrollOpen(true)}>
                            <UserPlus className="mr-2 h-4 w-4" />Add Cohort
                        </Button>
                    )}
                </div>
                {activeEnrollments.length === 0
                    ? <p className="text-sm text-gray-500 text-center py-4">No active cohort enrollments</p>
                    : <DataTable
                        data={activeEnrollments as unknown as Record<string, unknown>[]}
                        columns={activeColumns as unknown as Column<Record<string, unknown>>[]}
                        enableSearch
                        searchPlaceholder="Search enrollments..."
                        emptyMessage="No active enrollments"
                    />
                }
            </Card>

            {/* Contact + Primary Cohort */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
                    <div className="space-y-3">
                        {student.email && (
                            <div className="flex items-center gap-3">
                                <Mail className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-600">Email</p>
                                    <p className="font-medium text-gray-900">{student.email}</p>
                                </div>
                            </div>
                        )}
                        {student.phone && (
                            <div className="flex items-center gap-3">
                                <Phone className="h-5 w-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-600">Phone</p>
                                    <p className="font-medium text-gray-900">{student.phone}</p>
                                </div>
                            </div>
                        )}
                        {!student.email && !student.phone && (
                            <p className="text-sm text-gray-500">No contact information available</p>
                        )}
                    </div>
                </Card>

                <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Cohort</h2>
                    {!student.primary_cohort
                        ? <p className="text-sm text-gray-500">No primary cohort assigned</p>
                        : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <GraduationCap className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-600">Cohort</p>
                                        <p className="font-medium text-gray-900">{student.primary_cohort_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-600">Curriculum</p>
                                        <p className="font-medium text-gray-900">{student.primary_curriculum}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </Card>
            </div>

            {/* Current Subjects */}
            {student.current_subjects && student.current_subjects.length > 0 && (
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Subjects</h2>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {student.current_subjects.map(subject => (
                            <div key={`${subject.cohort}-${subject.id}`} className="p-3 border rounded-lg">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">{subject.code} — {subject.name}</p>
                                        <p className="text-xs text-gray-500 mt-1">{subject.cohort}</p>
                                    </div>
                                    {subject.is_compulsory && <Badge variant="default" size="sm">Core</Badge>}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Attendance */}
            {attendanceData && (
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                        {[
                            { label: 'Total Sessions', value: attendanceData.statistics.total, color: 'text-gray-900' },
                            { label: 'Present', value: attendanceData.statistics.present, color: 'text-green-600' },
                            { label: 'Absent', value: attendanceData.statistics.absent, color: 'text-red-600' },
                            { label: 'Late', value: attendanceData.statistics.late, color: 'text-yellow-600' },
                            { label: 'Attendance Rate', value: `${attendanceData.statistics.attendance_percentage.toFixed(1)}%`, color: 'text-blue-600' },
                        ].map(s => (
                            <div key={s.label}>
                                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-sm text-gray-600">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Assessment Summary */}
            {student.grade_summary && student.grade_summary.total_assessments > 0 && (
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessment Summary</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Average Score</span>
                            <span className="font-semibold">{student.grade_summary.average_score.toFixed(1)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Assessments Recorded</span>
                            <span className="font-semibold">{student.grade_summary.total_assessments}</span>
                        </div>
                    </div>
                </Card>
            )}

            {/* Enrollment History */}
            {historyEnrollments.length > 0 && (
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Enrollment History</h2>
                    <DataTable
                        data={historyEnrollments as unknown as Record<string, unknown>[]}
                        columns={historyColumns as unknown as Column<Record<string, unknown>>[]}
                        enableSearch
                        searchPlaceholder="Search enrollment history..."
                        emptyMessage="No enrollment history"
                    />
                </Card>
            )}

            {/* Modals */}
            <StatusModal
                isOpen={statusOpen}
                onClose={() => setStatusOpen(false)}
                onSubmit={updateStatus}
                loading={actionLoading}
            />
            <EnrollModal
                isOpen={enrollOpen}
                onClose={() => setEnrollOpen(false)}
                onSubmit={enroll}
                availableCohorts={availableCohorts}
                loading={actionLoading}
            />
            <UnenrollModal
                isOpen={!!unenrollTarget}
                onClose={() => setUnenrollTarget(null)}
                onSubmit={data => unenroll(unenrollTarget!.cohort, data)}
                enrollment={unenrollTarget}
                studentName={student.full_name}
                loading={actionLoading}
            />
            <DeleteStudentModal
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={handleDelete}
                studentName={student.full_name}
                loading={actionLoading}
            />
        </div>
    );
}
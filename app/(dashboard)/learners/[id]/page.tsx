'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Edit,
    Mail,
    Phone,
    User,
    GraduationCap,
    FileText,
    Trash2,
    UserPlus,
    UserMinus,
} from 'lucide-react';
import { learnersAPI } from '@/app/core/api/learners';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { DataTable, Column } from '@/app/components/ui/Table';
import Modal from '@/app/components/ui/Modal';
import { useAuth } from '@/app/context/AuthContext';
import { hasCapability } from '@/app/utils/permissions';
import { Select } from '@/app/components/ui/Select';
import { StudentDetail, StudentStatuses, EnrollmentTypes } from '@/app/core/types/student';
import { useStudentAttendanceHistory } from '@/app/core/hooks/useSessions';
import { useCohorts } from '@/app/core/hooks/useCohorts';
import { StudentCohortEnrollment } from '@/app/core/types/student';

// End reason options for unenrollment
const END_REASONS = [
    { value: 'COMPLETED', label: 'Completed Cohort' },
    { value: 'GRADUATED', label: 'Graduated' },
    { value: 'TRANSFERRED', label: 'Transferred to Another Cohort' },
    { value: 'WRONG_ASSIGNMENT', label: 'Wrong Assignment (Admin Correction)' },
    { value: 'WITHDRAWN', label: 'Withdrawn from Cohort' },
    { value: 'PROMOTED', label: 'Promoted to Next Level' },
];

export default function LearnerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const studentId = Number(params.id);

    const [student, setStudent] = useState<StudentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [showUnenrollModal, setShowUnenrollModal] = useState(false);
    const [selectedEnrollment, setSelectedEnrollment] = useState<StudentCohortEnrollment | null>(null)

    const [statusForm, setStatusForm] = useState({
        status: '',
        deactivate_enrollments: false,
        notes: ''
    });

    const [enrollForm, setEnrollForm] = useState({
        cohort_id: '',
        enrollment_type: 'ELECTIVE' as const,
        notes: ''
    });

    const [unenrollForm, setUnenrollForm] = useState({
        end_reason: '',
        notes: ''
    });

    if (!user) return null;

    const canEdit = user && hasCapability(activeRole, 'EDIT_LEARNER');

    const canManageEnrollment = user && hasCapability(activeRole, 'MANAGE_ENROLLMENT');

    const { data: attendanceData } = useStudentAttendanceHistory(studentId);
    const { cohorts } = useCohorts();

    useEffect(() => {
        loadStudent();
    }, [studentId]);

    const loadStudent = async () => {
        try {
            setLoading(true);
            const data = await learnersAPI.getStudent(studentId);
            setStudent(data);
        } catch (error: any) {
            alert('Failed to load student details');
            router.push('/learners');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await learnersAPI.updateStatus(
                studentId,
                statusForm.status,
                statusForm.deactivate_enrollments,
                statusForm.notes
            );
            await loadStudent();
            setShowStatusModal(false);
            setStatusForm({ status: '', deactivate_enrollments: false, notes: '' });
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await learnersAPI.enrollStudent(studentId, {
                cohort_id: Number(enrollForm.cohort_id),
                enrollment_type: enrollForm.enrollment_type,
                notes: enrollForm.notes
            });
            await loadStudent();
            setShowEnrollModal(false);
            setEnrollForm({ cohort_id: '', enrollment_type: 'ELECTIVE', notes: '' });
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleOpenUnenrollModal = (enrollment: any) => {
        setSelectedEnrollment(enrollment);
        setUnenrollForm({ end_reason: '', notes: '' });
        setShowUnenrollModal(true);
    };

    const handleUnenroll = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedEnrollment || !unenrollForm.end_reason) {
            alert('Please select a reason for unenrollment');
            return;
        }

        try {
            await learnersAPI.unenrollStudent(studentId, selectedEnrollment.cohort, {
                end_reason: unenrollForm.end_reason,
                notes: unenrollForm.notes
            });
            await loadStudent();
            setShowUnenrollModal(false);
            setSelectedEnrollment(null);
            setUnenrollForm({ end_reason: '', notes: '' });
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleDelete = async () => {
        if (confirm(`Are you sure you want to delete ${student?.full_name}? This action cannot be undone.`)) {
            try {
                await learnersAPI.deleteStudent(studentId);
                router.push('/learners');
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
            ACTIVE: 'success',
            GRADUATED: 'info',
            TRANSFERRED: 'warning',
            SUSPENDED: 'danger',
            WITHDRAWN: 'danger',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    const getEnrollmentTypeBadge = (type: string) => {
        const variants: Record<string, 'default' | 'info' | 'warning' | 'success'> = {
            PRIMARY: 'default',
            ELECTIVE: 'info',
            REMEDIAL: 'warning',
            ADVANCED: 'success',
            TRANSFER: 'info',
        };
        return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
    };

    const getEndReasonBadge = (endReason: string | null) => {
        if (!endReason) return <Badge variant="default">Inactive</Badge>;

        const variants: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
            COMPLETED: 'success',
            GRADUATED: 'success',
            TRANSFERRED: 'info',
            WRONG_ASSIGNMENT: 'warning',
            WITHDRAWN: 'danger',
            PROMOTED: 'success',
        };

        const labels: Record<string, string> = {
            COMPLETED: 'Completed',
            GRADUATED: 'Graduated',
            TRANSFERRED: 'Transferred',
            WRONG_ASSIGNMENT: 'Wrong Assignment',
            WITHDRAWN: 'Withdrawn',
            PROMOTED: 'Promoted',
        };

        return (
            <Badge variant={variants[endReason] || 'default'}>
                {labels[endReason] || endReason}
            </Badge>
        );
    };

    const getGenderBadge = (gender?: string) => {
        if (!gender) return null;
        const g = gender.trim().toUpperCase();
        if (g === 'MALE' || g === 'M') return <Badge variant="info">Male</Badge>;
        if (g === 'FEMALE' || g === 'F') return <Badge variant="warning">Female</Badge>;
        return <Badge variant="warning">Unknown</Badge>;
    };

    const calculateAge = (dateOfBirth?: string) => {
        if (!dateOfBirth) return 'N/A';
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return `${age} years`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (!student) return null;

    // Get available cohorts for enrollment
    const enrolledCohortIds = student.enrollments
        .filter(e => e.is_active)
        .map(e => e.cohort);
    const availableCohorts = cohorts?.filter((c: { id: number; }) => !enrolledCohortIds.includes(c.id)) || [];

    const baseColumns: Column<any>[] = [
        {
            key: 'cohort_name',
            header: 'Cohort',
            sortable: true,
            render: (enrollment) => (
                <div className="flex items-center gap-2">
                    <span className="font-medium">{enrollment.cohort_name}</span>
                    {enrollment.cohort === student.primary_cohort && (
                        <Badge variant="default" size="sm">
                            Primary
                        </Badge>
                    )}
                </div>
            )
        },
        {
            key: 'cohort_level',
            header: 'Level',
            sortable: true
        },
        {
            key: 'curriculum_name',
            header: 'Curriculum',
            sortable: true
        },
        {
            key: 'enrollment_type',
            header: 'Type',
            sortable: true,
            render: (enrollment) =>
                getEnrollmentTypeBadge(enrollment.enrollment_type)
        },
        {
            key: 'enrolled_date',
            header: 'Enrolled',
            sortable: true,
            render: (enrollment) =>
                new Date(enrollment.enrolled_date).toLocaleDateString()
        }
    ];
    const actionsColumn: Column<any> = {
        key: 'actions',
        header: 'Actions',
        render: (enrollment) => (
            <Button
                size="sm"
                variant="ghost"
                onClick={() => handleOpenUnenrollModal(enrollment)}
            >
                <UserMinus className="h-4 w-4 text-red-600" />
            </Button>
        )
    };


    // Define active enrollments table columns
    const activeEnrollmentsColumns: Column<any>[] = canManageEnrollment
        ? [...baseColumns, actionsColumn]
        : baseColumns;

    // Define enrollment history table columns
    const historyColumns: Column<any>[] = [
        {
            key: 'cohort_name',
            header: 'Cohort',
            sortable: true
        },
        {
            key: 'enrollment_type_display',
            header: 'Type',
            sortable: true
        },
        {
            key: 'enrolled_date',
            header: 'Enrolled',
            sortable: true,
            render: (enrollment) => new Date(enrollment.enrolled_date).toLocaleDateString()
        },
        {
            key: 'completion_date',
            header: 'Ended',
            sortable: true,
            render: (enrollment) =>
                enrollment.completion_date
                    ? new Date(enrollment.completion_date).toLocaleDateString()
                    : '-'
        },
        {
            key: 'end_reason',
            header: 'Reason',
            sortable: true,
            filterable: true,
            filterOptions: END_REASONS,
            render: (enrollment) => getEndReasonBadge(enrollment.end_reason)
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/learners">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Learners
                        </Button>
                    </Link>
                </div>
                <div className="flex gap-2">
                    {canManageEnrollment && (
                        <Button
                            variant="ghost"
                            onClick={() => setShowEnrollModal(true)}
                        >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Enroll in Cohort
                        </Button>
                    )}

                    {canManageEnrollment && (
                        <Button
                            variant="ghost"
                            onClick={() => setShowStatusModal(true)}
                        >
                            Update Status
                        </Button>
                    )}

                    {canEdit && (
                        <Link href={`/learners/${studentId}/edit`}>
                            <Button>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Button>
                        </Link>
                    )}

                    {canEdit && (
                        <Button variant="ghost" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Student Profile */}
            <Card>
                <div className="flex items-start gap-6">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        <User className="h-12 w-12" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900">{student.full_name}</h1>
                            {getStatusBadge(student.status)}
                            {getGenderBadge(student.gender)}
                            {student.cohort_count > 1 && (
                                <Badge variant="info">
                                    {student.cohort_count} Cohorts
                                </Badge>
                            )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                                <p className="text-sm text-gray-600">Admission Number</p>
                                <p className="font-semibold text-gray-900">{student.admission_number}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Date of Birth</p>
                                <p className="font-semibold text-gray-900">
                                    {student.date_of_birth
                                        ? new Date(student.date_of_birth).toLocaleDateString()
                                        : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Enrollment Date</p>
                                <p className="font-semibold text-gray-900">
                                    {new Date(student.enrollment_date).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Age</p>
                                <p className="font-semibold text-gray-900">
                                    {calculateAge(student.date_of_birth)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Cohort Enrollments */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Active Cohort Enrollments</h2>
                    {canManageEnrollment && (
                        <Button size="sm" onClick={() => setShowEnrollModal(true)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Cohort
                        </Button>
                    )}
                </div>
                {student.enrollments.filter(e => e.is_active).length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                        No active cohort enrollments
                    </p>
                ) : (
                    <DataTable
                        data={student.enrollments.filter(e => e.is_active)}
                        columns={activeEnrollmentsColumns}
                        enableSearch={true}
                        enableSort={true}
                        searchPlaceholder="Search active enrollments..."
                        emptyMessage="No active enrollments"
                    />
                )}
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Contact Information */}
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

                {/* Academic Information */}
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Cohort</h2>
                    <div className="space-y-3">
                        {!student.primary_cohort && (
                            <p className="text-sm text-gray-500">No primary cohort assigned</p>
                        )}
                        {student.primary_cohort && (
                            <>
                                <div className="flex items-center gap-3">
                                    <GraduationCap className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-600">Cohort</p>
                                        <p className="font-medium text-gray-900">
                                            {student.primary_cohort_name}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="text-sm text-gray-600">Curriculum</p>
                                        <p className="font-medium text-gray-900">
                                            {student.primary_curriculum}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </Card>
            </div>

            {/* Current Subjects */}
            {student.current_subjects && student.current_subjects.length > 0 && (
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Subjects</h2>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {student.current_subjects.map((subject) => (
                            <div key={`${subject.cohort}-${subject.id}`} className="p-3 border rounded-lg">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="font-medium text-gray-900">
                                            {subject.code} - {subject.name}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">{subject.cohort}</p>
                                    </div>
                                    {subject.is_compulsory && (
                                        <Badge variant="default" size="sm">Core</Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Attendance Summary */}
            {attendanceData && (
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Attendance Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{attendanceData.statistics.total}</p>
                            <p className="text-sm text-gray-600">Total Sessions</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{attendanceData.statistics.present}</p>
                            <p className="text-sm text-gray-600">Present</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-red-600">{attendanceData.statistics.absent}</p>
                            <p className="text-sm text-gray-600">Absent</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-yellow-600">{attendanceData.statistics.late}</p>
                            <p className="text-sm text-gray-600">Late</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">
                                {attendanceData.statistics.attendance_percentage.toFixed(1)}%
                            </p>
                            <p className="text-sm text-gray-600">Attendance Rate</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Academic Performance Summary */}
            {student.grade_summary && student.grade_summary.total_assessments > 0 && (
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessment Summary</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Average Score (raw):</span>
                            <span className="font-semibold">
                                {student.grade_summary.average_score.toFixed(1)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Assessments Recorded:</span>
                            <span className="font-semibold">
                                {student.grade_summary.total_assessments}
                            </span>
                        </div>
                    </div>
                </Card>
            )}

            {/* Projects and Evidence */}
            {(student.projects_count > 0 || student.evidence_count > 0) && (
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Learning Portfolio</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-3xl font-bold text-blue-600">{student.projects_count}</p>
                            <p className="text-sm text-gray-600 mt-1">Projects Completed</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-3xl font-bold text-green-600">{student.evidence_count}</p>
                            <p className="text-sm text-gray-600 mt-1">Evidence Uploaded</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Enrollment History */}
            {student.enrollments.filter(e => !e.is_active).length > 0 && (
                <Card>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Enrollment History</h2>
                    <DataTable
                        data={student.enrollments.filter(e => !e.is_active)}
                        columns={historyColumns}
                        enableSearch={true}
                        enableSort={true}
                        enableFilter={true}
                        searchPlaceholder="Search enrollment history..."
                        emptyMessage="No enrollment history"
                    />
                </Card>
            )}

            {/* Status Update Modal */}
            <Modal
                isOpen={showStatusModal}
                onClose={() => {
                    setShowStatusModal(false);
                    setStatusForm({ status: '', deactivate_enrollments: false, notes: '' });
                }}
                title="Update Student Status"
            >
                <form onSubmit={handleStatusUpdate} className="space-y-4">
                    <Select
                        label="New Status"
                        value={statusForm.status}
                        onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                        required
                        options={StudentStatuses}
                    />

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="deactivate"
                            checked={statusForm.deactivate_enrollments}
                            onChange={(e) => setStatusForm({
                                ...statusForm,
                                deactivate_enrollments: e.target.checked
                            })}
                            className="rounded border-gray-300"
                        />
                        <label htmlFor="deactivate" className="text-sm text-gray-700">
                            Deactivate all cohort enrollments
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={statusForm.notes}
                            onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Add any relevant notes about the status change"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setShowStatusModal(false);
                                setStatusForm({ status: '', deactivate_enrollments: false, notes: '' });
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">Update Status</Button>
                    </div>
                </form>
            </Modal>

            {/* Enroll Modal */}
            <Modal
                isOpen={showEnrollModal}
                onClose={() => {
                    setShowEnrollModal(false);
                    setEnrollForm({ cohort_id: '', enrollment_type: 'ELECTIVE', notes: '' });
                }}
                title="Enroll in Cohort"
            >
                <form onSubmit={handleEnroll} className="space-y-4">
                    <Select
                        label="Cohort"
                        value={enrollForm.cohort_id}
                        onChange={(e) => setEnrollForm({ ...enrollForm, cohort_id: e.target.value })}
                        required
                        options={[
                            { value: '', label: 'Select Cohort' },
                            ...availableCohorts.map((c: any) => ({
                                value: c.id.toString(),
                                label: `${c.name} - ${c.level}`,
                            })),
                        ]}
                    />
                    <Select
                        label="Enrollment Type"
                        value={enrollForm.enrollment_type}
                        onChange={(e) => setEnrollForm({
                            ...enrollForm,
                            enrollment_type: e.target.value as any
                        })}
                        required
                        options={EnrollmentTypes}
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={enrollForm.notes}
                            onChange={(e) => setEnrollForm({ ...enrollForm, notes: e.target.value })}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Add any notes about this enrollment"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setShowEnrollModal(false);
                                setEnrollForm({ cohort_id: '', enrollment_type: 'ELECTIVE', notes: '' });
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit">Enroll</Button>
                    </div>
                </form>
            </Modal>

            {/* Unenroll Modal - NEW */}
            <Modal
                isOpen={showUnenrollModal}
                onClose={() => {
                    setShowUnenrollModal(false);
                    setSelectedEnrollment(null);
                    setUnenrollForm({ end_reason: '', notes: '' });
                }}
                title="Unenroll from Cohort"
            >
                <form onSubmit={handleUnenroll} className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg mb-4">
                        <p className="text-sm text-gray-700">
                            <strong>Cohort:</strong> {selectedEnrollment?.cohort_name}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                            <strong>Student:</strong> {student?.full_name}
                        </p>
                    </div>

                    <Select
                        label="Reason for Unenrollment"
                        value={unenrollForm.end_reason}
                        onChange={(e) => setUnenrollForm({ ...unenrollForm, end_reason: e.target.value })}
                        required
                        options={[
                            { value: '', label: 'Select a reason...' },
                            ...END_REASONS
                        ]}
                    />

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-800">
                            <strong>Note:</strong> Selecting a reason helps maintain accurate records.
                            Choose "Completed" if the student finished the cohort, "Graduated" if they moved on,
                            or "Wrong Assignment" if this was an administrative error.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Additional Notes (Optional)
                        </label>
                        <textarea
                            value={unenrollForm.notes}
                            onChange={(e) => setUnenrollForm({ ...unenrollForm, notes: e.target.value })}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Add any additional notes about this unenrollment"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setShowUnenrollModal(false);
                                setSelectedEnrollment(null);
                                setUnenrollForm({ end_reason: '', notes: '' });
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="danger">
                            Unenroll Student
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
'use client';

// ============================================================================
// app/(dashboard)/admin/instructors/[id]/progress/page.tsx
//
// Responsibility: fetch via hook, handle modal state, compose components.
// No direct API calls. No any. No inline component definitions.
// ============================================================================

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Calendar, Users, TrendingUp, CheckCircle,
    AlertCircle, Award, GraduationCap, Layers, Pencil,
    KeyRound, Power, PowerOff, Trash2, BookOpen,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { instructorsAPI } from '@/app/core/api/instructors';
import { useInstructorProgress } from '@/app/core/hooks/useInstructorProgress';
import {
    EditModal,
    ResetPasswordModal,
    DeleteModal,
    CohortAssignModal,
} from '@/app/core/components/instructors/InstructorModals';
import {
    CohortSubjectCoverage,
    GroupedSessions,
} from '@/app/core/components/instructors/InstructorProgressComponents';
import type { UserUpdatePayload } from '@/app/core/types/globalUsers';

export default function InstructorProgressPage() {
    const params = useParams();
    const router = useRouter();
    const instructorId = Number(params.id);

    const {
        instructor, sessions, loading, error,
        refetch, nonCBCSubjects, cbcCohorts,
        sessionStats, attendanceStats,
    } = useInstructorProgress(instructorId);

    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [cohortOpen, setCohortOpen] = useState(false);

    const flash = (type: 'success' | 'error', msg: string) => {
        setFeedback({ type, msg });
        setTimeout(() => setFeedback(null), 3000);
    };

    const withSubmit = async (fn: () => Promise<void>, successMsg: string, failMsg: string) => {
        setSubmitting(true);
        try { await fn(); flash('success', successMsg); }
        catch { flash('error', failMsg); }
        finally { setSubmitting(false); }
    };

    const handleEdit = (data: UserUpdatePayload) =>
        withSubmit(async () => {
            await instructorsAPI.update(instructorId, data);
            setEditOpen(false);
            await refetch();
        }, 'Instructor updated', 'Failed to update instructor');

    const handleResetPw = (password: string) =>
        withSubmit(async () => {
            await instructorsAPI.resetPassword(instructorId, password);
            setResetOpen(false);
        }, 'Password reset successfully', 'Failed to reset password');

    const handleToggle = () =>
        withSubmit(async () => {
            await (instructor?.is_active ? instructorsAPI.deactivate(instructorId) : instructorsAPI.activate(instructorId));
            await refetch();
        },
            `Instructor ${instructor?.is_active ? 'deactivated' : 'activated'}`,
            'Failed to update status');

    const handleDelete = () =>
        withSubmit(async () => {
            await instructorsAPI.delete(instructorId);
            router.push('/admin/instructors');
        }, 'Deleted', 'Failed to delete instructor');

    // ── Guards ────────────────────────────────────────────────────────────

    if (loading) return <LoadingSpinner message="Loading instructor..." />;

    if (error || !instructor) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{error ?? 'Instructor not found'}</p>
                <Link href="/admin/instructors">
                    <Button variant="secondary" className="mt-3">Back</Button>
                </Link>
            </div>
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────

    const attendanceItems = [
        { label: 'Total Records', value: attendanceStats.total, color: 'text-gray-900' },
        { label: 'Present', value: attendanceStats.present, color: 'text-green-600' },
        { label: 'Absent', value: attendanceStats.absent, color: 'text-red-600' },
        { label: 'Late', value: attendanceStats.late, color: 'text-yellow-600' },
    ];

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <Link href="/admin/instructors">
                <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />Back to Instructors
                </Button>
            </Link>

            {feedback && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${feedback.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                    }`}>
                    {feedback.type === 'success'
                        ? <CheckCircle className="h-4 w-4 shrink-0" />
                        : <AlertCircle className="h-4 w-4 shrink-0" />
                    }
                    {feedback.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-start gap-5">
                <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700 shrink-0">
                    {instructor.first_name?.charAt(0)}{instructor.last_name?.charAt(0)}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold text-gray-900">{instructor.full_name}</h1>
                        <Badge variant={instructor.is_active ? 'success' : 'danger'}>
                            {instructor.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">{instructor.email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {instructor.cohort_assignments?.length === 0 && (
                            <span className="text-xs text-gray-400 italic">No cohorts assigned</span>
                        )}
                        {instructor.cohort_assignments?.map(a => (
                            <Badge key={a.cohort_id} variant="info" size="sm">
                                <GraduationCap className="h-3 w-3 mr-1 inline" />{a.cohort_name}
                            </Badge>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setCohortOpen(true)}>
                        <BookOpen className="h-3.5 w-3.5 mr-1" />Cohorts
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setResetOpen(true)}>
                        <KeyRound className="h-3.5 w-3.5 mr-1" />Password
                    </Button>
                    <Button
                        size="sm" variant="secondary" onClick={handleToggle}
                        className={instructor.is_active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}
                    >
                        {instructor.is_active
                            ? <><PowerOff className="h-3.5 w-3.5 mr-1" />Deactivate</>
                            : <><Power className="h-3.5 w-3.5 mr-1" />Activate</>
                        }
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard title="Total Sessions" value={sessionStats.total} icon={Calendar} color="blue" />
                <StatsCard title="This Month" value={sessionStats.thisMonth} icon={Calendar} color="purple" />
                <StatsCard title="Avg Attendance" value={`${attendanceStats.rate}%`} icon={Users} color="green" />
                <StatsCard title="Cohorts" value={instructor.cohort_assignments?.length ?? 0} icon={GraduationCap} color="orange" />
            </div>

            {/* Attendance */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Attendance Overview</h2>
                        <span className="text-sm text-gray-400">across all sessions</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {attendanceItems.map(stat => (
                            <div key={stat.label} className="bg-gray-50 rounded-xl p-4 text-center">
                                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Topic coverage */}
            {nonCBCSubjects.length > 0 && (
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-5">
                            <Layers className="h-5 w-5 text-blue-500" />
                            <h2 className="text-lg font-semibold text-gray-900">Topic Coverage</h2>
                            <Badge variant="info" size="sm">{nonCBCSubjects.length} subjects</Badge>
                        </div>
                        <div className="space-y-3">
                            {nonCBCSubjects.map(cs => (
                                <CohortSubjectCoverage key={cs.cohortSubjectId} cs={cs} />
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* CBC progress */}
            {cbcCohorts.length > 0 && (
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="h-5 w-5 text-purple-500" />
                            <h2 className="text-lg font-semibold text-gray-900">CBC Outcome Progress</h2>
                        </div>
                        <div className="space-y-3">
                            {cbcCohorts.map(a => (
                                <div key={a.cohort_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                                    <div>
                                        <p className="font-medium text-gray-900">{a.cohort_name}</p>
                                        <p className="text-xs text-gray-500">{a.academic_year}</p>
                                    </div>
                                    <Link href={`/cbc/progress/cohort/${a.cohort_id}`}>
                                        <Button size="sm" variant="ghost">
                                            <TrendingUp className="h-3.5 w-3.5 mr-1" />View Progress
                                        </Button>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            )}

            {/* Sessions */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Sessions</h2>
                        <Badge variant="info" size="sm">{sessions.length} total</Badge>
                    </div>
                    <GroupedSessions sessions={sessions} />
                </div>
            </Card>

            {/* Modals */}
            <EditModal
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                onSubmit={handleEdit}
                instructor={instructor}
                submitting={submitting}
            />
            <ResetPasswordModal
                isOpen={resetOpen}
                onClose={() => setResetOpen(false)}
                onSubmit={handleResetPw}
                submitting={submitting}
            />
            <DeleteModal
                isOpen={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={handleDelete}
                name={instructor.full_name}
                submitting={submitting}
            />
            <CohortAssignModal
                isOpen={cohortOpen}
                onClose={() => setCohortOpen(false)}
                instructorId={instructorId}
                instructorName={instructor.full_name}
            />
        </div>
    );
}
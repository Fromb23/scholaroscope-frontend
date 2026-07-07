'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, Calendar, Users, CheckCircle,
    AlertCircle, Award, GraduationCap, Pencil,
    KeyRound, Power, PowerOff, Trash2, BookOpen, ClipboardList,
} from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { instructorsAPI } from '@/app/core/api/instructors';
import {
    useInstructorProgress,
} from '@/app/core/hooks/useInstructorProgress';
import { useBackNavigation } from '@/app/core/hooks/useBackNavigation';
import {
    EditModal,
    ResetPasswordModal,
    DeleteModal,
    CohortAssignModal,
} from '@/app/core/components/instructors/InstructorModals';
import {
    CbcProgressAssignments,
    GroupedSessions,
    TeachingAssignmentsList,
} from '@/app/core/components/instructors/InstructorProgressComponents';
import { buildInstructorReportHref } from '@/app/core/components/reports/reportNavigation';
import type { UserUpdatePayload } from '@/app/core/types/globalUsers';
import {
    globalStatusLabel,
    globalStatusVariant,
    membershipStatusLabel,
    membershipStatusVariant,
    resolveGlobalStatus,
} from '@/app/core/types/globalUsers';

export default function InstructorProgressPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const instructorId = Number(params.id);
    const goBack = useBackNavigation('/admin/instructors');
    const initialCohortSubjectId = Number(searchParams.get('cohort_subject_id'));
    const hasInitialCohortSubjectId = Number.isFinite(initialCohortSubjectId) && initialCohortSubjectId > 0;
    const initialCohortName = searchParams.get('cohort_name');
    const initialSubjectName = searchParams.get('subject_name');
    const initialSubjectSource = searchParams.get('subject_source');
    const shouldOpenTeachingModal = searchParams.get('open') === 'teaching' || hasInitialCohortSubjectId;

    const {
        instructor, sessions, loading, error,
        refetch, teachingAssignments, cbcTeachingAssignments,
        sessionStats, attendanceStats, schemes,
    } = useInstructorProgress(instructorId);

    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [resetOpen, setResetOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [cohortOpen, setCohortOpen] = useState(false);

    useEffect(() => {
        if (shouldOpenTeachingModal) {
            setCohortOpen(true);
        }
    }, [shouldOpenTeachingModal]);

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

    const handleToggle = () => {
        const isRestricted = instructor?.membership_status === 'SUSPENDED';
        withSubmit(async () => {
            await (isRestricted
                ? instructorsAPI.activate(instructorId)
                : instructorsAPI.deactivate(instructorId));
            await refetch();
        },
            isRestricted ? 'Instructor access reactivated' : 'Instructor access restricted',
            'Failed to update status'
        );
    };

    const handleDelete = () =>
        withSubmit(async () => {
            await instructorsAPI.removeFromOrganization(instructorId);
            router.push('/admin/instructors');
        }, 'Instructor removed from organization', 'Failed to remove instructor from organization');

    if (loading) return <LoadingSpinner message="Loading instructor..." />;

    if (error || !instructor) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-center">
                <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{error ?? 'Instructor not found'}</p>
                <Button variant="secondary" className="mt-3" onClick={goBack}>Back</Button>
            </div>
        </div>
    );

    const globalStatus = resolveGlobalStatus(instructor);
    const isMembershipRestricted = instructor.membership_status === 'SUSPENDED';
    const isMembershipRemoved = instructor.membership_status === 'REVOKED';

    const attendanceItems = [
        { label: 'Total Records', value: attendanceStats.total, color: 'text-gray-900' },
        { label: 'Present', value: attendanceStats.present, color: 'text-green-600' },
        { label: 'Absent', value: attendanceStats.absent, color: 'text-red-600' },
        { label: 'Late', value: attendanceStats.late, color: 'text-yellow-600' },
    ];
    const groupedSchemes = schemes.reduce<Record<string, typeof schemes>>((groups, scheme) => {
        const key = scheme.term_name || 'No term assigned';
        groups[key] = groups[key] ?? [];
        groups[key].push(scheme);
        return groups;
    }, {});

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <Button variant="ghost" size="sm" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />Back to Instructors
            </Button>

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

            {initialSubjectName && initialCohortName ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                    Manage teaching assignment for <span className="font-medium text-blue-900">{initialSubjectName}</span> in{' '}
                    <span className="font-medium text-blue-900">{initialCohortName}</span>.
                </div>
            ) : null}

            {/* Header */}
            <div className="space-y-3">
                {/* Row 1 — avatar + name/email */}
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-700 shrink-0">
                        {instructor.first_name?.charAt(0)}{instructor.last_name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg font-bold text-gray-900 break-words">{instructor.full_name}</h1>
                            <Badge variant={globalStatusVariant(globalStatus)} size="sm">
                                {globalStatusLabel(globalStatus)}
                            </Badge>
                            <Badge variant={membershipStatusVariant(instructor.membership_status)} size="sm">
                                {membershipStatusLabel(instructor.membership_status)}
                            </Badge>
                        </div>
                        <p className="text-sm text-gray-500 break-all">{instructor.email}</p>
                        {instructor.state_message ? (
                            <p className="mt-1 text-sm text-gray-500">{instructor.state_message}</p>
                        ) : null}
                    </div>
                </div>

                {/* Row 2 — action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                        <Pencil className="h-3.5 w-3.5 md:mr-1" />
                        <span className="hidden md:inline">Edit</span>
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setCohortOpen(true)}>
                        <BookOpen className="h-3.5 w-3.5 md:mr-1" />
                        <span className="hidden md:inline">Teaching</span>
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => router.push(buildInstructorReportHref(instructorId, {
                            returnTo: `/admin/instructors/${instructorId}/progress`,
                        }))}
                    >
                        <ClipboardList className="h-3.5 w-3.5 md:mr-1" />
                        <span className="hidden md:inline">Teacher Report</span>
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setResetOpen(true)}>
                        <KeyRound className="h-3.5 w-3.5 md:mr-1" />
                        <span className="hidden md:inline">Password</span>
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleToggle}
                        disabled={globalStatus !== 'ACTIVE' || isMembershipRemoved}
                        className={isMembershipRestricted ? 'text-green-600 hover:bg-green-50' : 'text-orange-600 hover:bg-orange-50'}
                    >
                        {isMembershipRestricted
                            ? <><Power className="h-3.5 w-3.5 md:mr-1" /><span className="hidden md:inline">Reactivate Access</span></>
                            : <><PowerOff className="h-3.5 w-3.5 md:mr-1" /><span className="hidden md:inline">Restrict Access</span></>
                        }
                    </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setDeleteOpen(true)}
                        disabled={isMembershipRemoved}
                    >
                        <Trash2 className="h-3.5 w-3.5 md:mr-1" />
                        <span className="hidden md:inline">Remove from Organization</span>
                    </Button>
                </div>

                {/* Row 3 — teaching assignments */}
                {teachingAssignments.length > 0 && (
                    <TeachingAssignmentsList assignments={teachingAssignments} />
                )}
            </div>

            {/* Stats */}
            <StatStrip mdColumns={4}>
                <StatsCard title="Total Sessions" value={sessionStats.total} icon={Calendar} color="blue" mobile="hide" />
                <StatsCard title="This Month" value={sessionStats.thisMonth} icon={Calendar} color="purple" mobile="compact" />
                <StatsCard title="Avg Attendance" value={`${attendanceStats.rate}%`} icon={Users} color="green" mobile="compact" />
                <StatsCard title="Cohorts" value={instructor.cohort_assignments?.length ?? 0} icon={GraduationCap} color="orange" mobile="hide" />
            </StatStrip>

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

            {/* CBC progress */}
            {cbcTeachingAssignments.length > 0 && (
                <Card>
                    <div className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="h-5 w-5 text-purple-500" />
                            <h2 className="text-lg font-semibold text-gray-900">CBC Outcome Progress</h2>
                        </div>
                        <CbcProgressAssignments
                            assignments={cbcTeachingAssignments}
                            instructorId={instructorId}
                            returnTo={`/admin/instructors/${instructorId}/progress`}
                        />
                    </div>
                </Card>
            )}

            <Card>
                <div className="p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-emerald-500" />
                            <h2 className="text-lg font-semibold text-gray-900">Schemes of Work</h2>
                            <Badge variant="info" size="sm">{schemes.length} total</Badge>
                        </div>
                    </div>
                    {schemes.length === 0 ? (
                        <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                            No schemes of work have been created by this instructor yet.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(groupedSchemes).map(([termName, items]) => (
                                <div key={termName} className="rounded-xl border border-gray-200">
                                    <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2">
                                        <p className="text-sm font-semibold text-gray-900">{termName}</p>
                                        <span className="text-xs text-gray-500">{items.length} scheme{items.length === 1 ? '' : 's'}</span>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {items.map((scheme) => (
                                            <div key={scheme.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="truncate text-sm font-medium text-gray-900">{scheme.title}</p>
                                                        <Badge
                                                            variant={scheme.status === 'GENERATED' ? 'success' : scheme.status === 'DRAFT' ? 'warning' : 'default'}
                                                            size="sm"
                                                        >
                                                            {scheme.status_display || scheme.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {[scheme.cohort_name, scheme.subject_name, scheme.level_label].filter(Boolean).join(' · ') || 'Class subject not assigned'}
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Link href={`/schemes/${scheme.id}`}>
                                                        <Button size="sm" variant="secondary">View scheme</Button>
                                                    </Link>
                                                    {scheme.cohort_subject ? (
                                                        <Link href={`/sessions?cohort_subject=${scheme.cohort_subject}`}>
                                                            <Button size="sm" variant="ghost">View related lessons</Button>
                                                        </Link>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            {/* Sessions */}
            <Card>
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Sessions</h2>
                        <Badge variant="info" size="sm">{sessions.length} total</Badge>
                    </div>
                    <GroupedSessions
                        sessions={sessions}
                        returnTo={`/admin/instructors/${instructorId}/progress`}
                    />
                </div>
            </Card>

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
                initialCohortSubjectId={hasInitialCohortSubjectId ? initialCohortSubjectId : null}
                initialCohortName={initialCohortName}
                initialSubjectName={initialSubjectName}
                initialSubjectSource={initialSubjectSource}
                onAssignmentsChanged={refetch}
            />
        </div>
    );
}

'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Download, Users, UserPlus, UserMinus, X } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import {
    bulkEnrollCohortSubjectLearners,
    bulkUnenrollCohortSubjectLearners,
    exportCohortSubjectClassListPdf,
    getCohortSubjectLearners,
    listCohortSubjects,
} from '@/app/core/api/academic';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { academicKeys } from '@/app/core/lib/queryKeys';
import { isAdminOrAbove, isInstructor as hasInstructorRole } from '@/app/utils/permissions';
import { roleHomeRoute } from '@/app/utils/routeAccess';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { buildClassSubjectLearnerProfileHref } from '@/app/core/components/learners/learnerProfileNavigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/app/components/ui/Table';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type {
    BulkSubjectEnrollResponse,
    BulkSubjectUnenrollResponse,
    CohortSubjectLearnerListResponse,
} from '@/app/core/types/academic';
import type { StudentSummary } from '@/app/core/types/student';

interface ResultBannerState {
    tone: 'success' | 'error';
    message: string;
}

interface LearnerTableProps {
    title: string;
    description: string;
    icon: typeof Users;
    learners: StudentSummary[];
    selectedIds: Set<number>;
    onToggle: (studentId: number) => void;
    onToggleAll: () => void;
    actionLabel: string;
    actionVariant: 'primary' | 'danger';
    onAction: () => void;
    actionDisabled: boolean;
    emptyMessage: string;
}

function getStudentName(student: StudentSummary) {
    if (student.full_name?.trim()) return student.full_name.trim();

    const parts = [
        student.first_name,
        student.middle_name,
        student.last_name,
    ].filter((value): value is string => Boolean(value?.trim()));

    return parts.length > 0 ? parts.join(' ') : `Learner #${student.id}`;
}

function getStudentContact(student: StudentSummary) {
    const contact = [student.email, student.phone]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(' • ');

    return contact || '—';
}

function LearnerTable({
    title,
    description,
    icon: Icon,
    learners,
    selectedIds,
    onToggle,
    onToggleAll,
    actionLabel,
    actionVariant,
    onAction,
    actionDisabled,
    emptyMessage,
}: LearnerTableProps) {
    const allSelected = learners.length > 0 && learners.every((learner) => selectedIds.has(learner.id));

    return (
        <Card>
            <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-blue-600" />
                            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                            <Badge variant="info">{learners.length}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">{description}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{selectedIds.size} selected</span>
                        <Button
                            size="sm"
                            variant={actionVariant === 'danger' ? 'danger' : 'primary'}
                            disabled={actionDisabled}
                            onClick={onAction}
                        >
                            {actionLabel}
                        </Button>
                    </div>
                </div>

                {learners.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                        {emptyMessage}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <tr>
                                <TableHead>
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={onToggleAll}
                                        aria-label={`Select all ${title.toLowerCase()}`}
                                    />
                                </TableHead>
                                <TableHead>Learner</TableHead>
                                <TableHead>Admission No.</TableHead>
                                <TableHead>Contact</TableHead>
                            </tr>
                        </TableHeader>
                        <TableBody>
                            {learners.map((learner) => (
                                <TableRow key={learner.id}>
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(learner.id)}
                                            onChange={() => onToggle(learner.id)}
                                            aria-label={`Select ${getStudentName(learner)}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900">{getStudentName(learner)}</p>
                                            {learner.primary_cohort_name ? (
                                                <p className="text-xs text-gray-500">{learner.primary_cohort_name}</p>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-mono text-sm text-gray-700">{learner.admission_number}</span>
                                    </TableCell>
                                    <TableCell>{getStudentContact(learner)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </Card>
    );
}

function getLearnerStatus(student: StudentSummary) {
    return student.status_display?.trim() || student.status?.trim() || '—';
}

function getLearnerStatusVariant(student: StudentSummary): 'success' | 'warning' | 'danger' | 'info' | 'default' {
    switch (student.status) {
        case 'ACTIVE':
            return 'success';
        case 'TRANSFERRED':
            return 'warning';
        case 'GRADUATED':
            return 'info';
        case 'SUSPENDED':
        case 'WITHDRAWN':
            return 'danger';
        default:
            return 'default';
    }
}

function ReadOnlyLearnerTable({
    learners,
    buildLearnerHref,
}: {
    learners: StudentSummary[];
    buildLearnerHref: (learnerId: number) => string;
}) {
    if (learners.length === 0) {
        return (
            <Card>
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                    No learners are enrolled in this cohort subject yet.
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-gray-900">Enrolled Learners</h2>
                    <p className="text-sm text-gray-500">
                        Read-only learner list for this assigned cohort subject.
                    </p>
                </div>

                <Table>
                    <TableHeader>
                        <tr>
                            <TableHead>Admission No.</TableHead>
                            <TableHead>Learner Name</TableHead>
                            <TableHead>Status</TableHead>
                        </tr>
                    </TableHeader>
                    <TableBody>
                        {learners.map((learner) => (
                            <TableRow key={learner.id}>
                                <TableCell>
                                    <span className="font-mono text-sm text-gray-700">{learner.admission_number}</span>
                                </TableCell>
                                <TableCell>
                                    <div className="min-w-0">
                                        <Link
                                            href={buildLearnerHref(learner.id)}
                                            className="font-medium text-blue-600 hover:underline"
                                        >
                                            {getStudentName(learner)}
                                        </Link>
                                        {learner.primary_cohort_name ? (
                                            <p className="text-xs text-gray-500">{learner.primary_cohort_name}</p>
                                        ) : null}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={getLearnerStatusVariant(learner)}>
                                        {getLearnerStatus(learner)}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}

function buildEnrollResultMessage(result: BulkSubjectEnrollResponse) {
    const base = `Enroll processed: ${result.processed}. Created ${result.created}, reactivated ${result.reactivated}, already active ${result.already_active}, rejected ${result.rejected}.`;
    if (result.rejected > 0) {
        return `${base} Rejected learners were not active in this cohort. Move them to this cohort first if they should participate here.`;
    }
    return base;
}

function buildUnenrollResultMessage(result: BulkSubjectUnenrollResponse) {
    return `Unenroll processed: ${result.processed}. Deactivated ${result.deactivated}, already inactive ${result.already_inactive}, missing ${result.missing}.`;
}

export default function CohortSubjectLearnersPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, activeRole, loading: authLoading } = useAuth();
    const instructorView = hasInstructorRole(activeRole);
    const canManageLearners = isAdminOrAbove(user, activeRole);
    const instructorAccess = useInstructorCohortAccess({ enabled: instructorView });

    const cohortSubjectId = Number(params.id);
    const isValidCohortSubjectId = Number.isFinite(cohortSubjectId) && cohortSubjectId > 0;
    const accessLoading = authLoading || (instructorView && instructorAccess.isLoading);
    const allowed = !user
        ? false
        : canManageLearners
            || (instructorView && instructorAccess.cohortSubjectIds.includes(cohortSubjectId));

    const [selectedEnrolled, setSelectedEnrolled] = useState<Set<number>>(new Set());
    const [selectedAvailable, setSelectedAvailable] = useState<Set<number>>(new Set());
    const [resultBanner, setResultBanner] = useState<ResultBannerState | null>(null);
    const [downloadingClassList, setDownloadingClassList] = useState(false);

    const invalidateParticipationDependencies = async (studentIds: number[]) => {
        const cohortId = learnersQuery.data?.cohort_id;

        await Promise.all([
            queryClient.invalidateQueries({ queryKey: academicKeys.cohortSubjects.learners(cohortSubjectId) }),
            ...(typeof cohortId === 'number' ? [
                queryClient.invalidateQueries({ queryKey: academicKeys.cohorts.subjectParticipationPrefix(cohortId) }),
                queryClient.invalidateQueries({ queryKey: academicKeys.cohorts.subjects(cohortId) }),
            ] : []),
            ...studentIds.map((studentId) => (
                queryClient.invalidateQueries({ queryKey: academicKeys.students.detail(studentId) })
            )),
        ]);
    };

    useEffect(() => {
        if (accessLoading || allowed || !activeRole) return;
        router.replace(roleHomeRoute[activeRole]);
    }, [accessLoading, activeRole, allowed, router]);

    const learnersQuery = useQuery<CohortSubjectLearnerListResponse, Error>({
        queryKey: academicKeys.cohortSubjects.learners(cohortSubjectId),
        queryFn: () => getCohortSubjectLearners(cohortSubjectId),
        enabled: isValidCohortSubjectId && allowed,
        staleTime: 30_000,
    });

    const cohortSubjectsQuery = useQuery({
        queryKey: ['academic', 'cohort-subjects', 'cohort', learnersQuery.data?.cohort_id ?? null],
        queryFn: () => listCohortSubjects(learnersQuery.data!.cohort_id),
        enabled: allowed && typeof learnersQuery.data?.cohort_id === 'number',
        staleTime: 30_000,
    });

    const learnerData = learnersQuery.data;
    const cohortSubject = useMemo(
        () => cohortSubjectsQuery.data?.find((subject) => subject.id === cohortSubjectId) ?? null,
        [cohortSubjectId, cohortSubjectsQuery.data]
    );
    const coreLockedSubject = cohortSubject?.locked || cohortSubject?.subject_category === 'CORE';

    useEffect(() => {
        if (!learnerData) return;

        setSelectedEnrolled((current) => {
            const next = new Set(
                Array.from(current).filter((studentId) => learnerData.enrolled.some((student) => student.id === studentId))
            );
            return next.size === current.size ? current : next;
        });

        setSelectedAvailable((current) => {
            const next = new Set(
                Array.from(current).filter((studentId) => learnerData.available.some((student) => student.id === studentId))
            );
            return next.size === current.size ? current : next;
        });
    }, [learnerData]);

    const enrollMutation = useMutation({
        mutationFn: (studentIds: number[]) => bulkEnrollCohortSubjectLearners(cohortSubjectId, studentIds),
        onSuccess: async (result) => {
            const affectedStudentIds = Array.from(selectedAvailable);
            setSelectedAvailable(new Set());
            setResultBanner({ tone: 'success', message: buildEnrollResultMessage(result) });
            await invalidateParticipationDependencies(affectedStudentIds);
        },
        onError: (error) => {
            setResultBanner({
                tone: 'error',
                message: extractErrorMessage(error as ApiError, 'Failed to enroll learners in the cohort subject.'),
            });
        },
    });

    const unenrollMutation = useMutation({
        mutationFn: (studentIds: number[]) => bulkUnenrollCohortSubjectLearners(cohortSubjectId, studentIds),
        onSuccess: async (result) => {
            const affectedStudentIds = Array.from(selectedEnrolled);
            setSelectedEnrolled(new Set());
            setResultBanner({ tone: 'success', message: buildUnenrollResultMessage(result) });
            await invalidateParticipationDependencies(affectedStudentIds);
        },
        onError: (error) => {
            setResultBanner({
                tone: 'error',
                message: extractErrorMessage(error as ApiError, 'Failed to unenroll learners from the cohort subject.'),
            });
        },
    });

    if (!isValidCohortSubjectId) {
        return <ErrorState fullScreen={false} message="Invalid cohort subject." />;
    }

    if (accessLoading) {
        return <LoadingSpinner fullScreen={false} message="Checking subject access..." />;
    }

    if (!allowed) {
        return null;
    }

    if (learnersQuery.isLoading && !learnerData) {
        return <LoadingSpinner fullScreen={false} message="Loading cohort subject learners..." />;
    }

    if (learnersQuery.error || !learnerData) {
        return (
            <ErrorState
                fullScreen={false}
                message={learnersQuery.error?.message ?? 'Failed to load cohort subject learners.'}
                onRetry={() => {
                    void learnersQuery.refetch();
                }}
            />
        );
    }

    const cohortHref = `/academic/cohorts/${learnerData.cohort_id}`;
    const cohortLabel = cohortSubject?.cohort_name || `Cohort #${learnerData.cohort_id}`;
    const subjectLabel = cohortSubject?.subject_name || learnerData.subject_name;
    const isMutating = enrollMutation.isPending || unenrollMutation.isPending;
    const cohortStudentsHref = `/academic/cohorts/${learnerData.cohort_id}/students`;
    const canViewCohortStudents = canManageLearners;
    const pageTitle = instructorView
        ? `${subjectLabel} Learners`
        : `Manage ${subjectLabel} Learners`;
    const pageSubtitle = instructorView
        ? 'Read-only learner list for your assigned cohort subject.'
        : 'This screen manages explicit subject participation. It does not add or remove learners from the parent cohort.';

    const toggleSelection = (
        setter: Dispatch<SetStateAction<Set<number>>>,
        studentId: number
    ) => {
        setter((current) => {
            const next = new Set(current);
            if (next.has(studentId)) {
                next.delete(studentId);
            } else {
                next.add(studentId);
            }
            return next;
        });
    };

    const toggleAllSelection = (
        learners: StudentSummary[],
        selectedIds: Set<number>,
        setter: Dispatch<SetStateAction<Set<number>>>
    ) => {
        const allSelected = learners.length > 0 && learners.every((learner) => selectedIds.has(learner.id));
        setter(allSelected ? new Set() : new Set(learners.map((learner) => learner.id)));
    };

    const handleDownloadClassList = async () => {
        setResultBanner(null);
        setDownloadingClassList(true);

        try {
            await exportCohortSubjectClassListPdf(cohortSubjectId);
        } catch (error) {
            setResultBanner({
                tone: 'error',
                message: extractErrorMessage(error as ApiError, 'Failed to download the class list PDF.'),
            });
        } finally {
            setDownloadingClassList(false);
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            {coreLockedSubject ? (
                <ErrorBanner
                    message="Core CBC subjects are global curriculum requirements. Learners should not be removed from this subject through the normal subject participation flow."
                    onDismiss={() => undefined}
                />
            ) : null}

            <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => router.push(cohortHref)}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Cohort
                    </Button>
                    {canViewCohortStudents ? (
                        <Link href={cohortStudentsHref} className="w-full sm:w-auto">
                            <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                                View Cohort Students
                            </Button>
                        </Link>
                    ) : null}
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => {
                            void handleDownloadClassList();
                        }}
                        disabled={downloadingClassList}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        {downloadingClassList ? 'Downloading...' : 'Download Class List'}
                    </Button>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="info">{cohortLabel}</Badge>
                            <Badge variant="default">Cohort Subject #{cohortSubjectId}</Badge>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{pageTitle}</h1>
                            <p className="mt-1 text-sm text-gray-500">{pageSubtitle}</p>
                        </div>
                    </div>

                    {instructorView ? (
                        <Card className="min-w-[140px]">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Enrolled</p>
                            <p className="mt-2 text-2xl font-bold text-gray-900">{learnerData.counts.enrolled}</p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            <Card className="min-w-[120px]">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Enrolled</p>
                                <p className="mt-2 text-2xl font-bold text-gray-900">{learnerData.counts.enrolled}</p>
                            </Card>
                            <Card className="min-w-[120px]">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Available</p>
                                <p className="mt-2 text-2xl font-bold text-gray-900">{learnerData.counts.available}</p>
                            </Card>
                            <Card className="min-w-[120px]">
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Cohort Total</p>
                                <p className="mt-2 text-2xl font-bold text-gray-900">{learnerData.counts.cohort_total}</p>
                            </Card>
                        </div>
                    )}
                </div>
            </div>

            {resultBanner?.tone === 'error' ? (
                <ErrorBanner message={resultBanner.message} onDismiss={() => setResultBanner(null)} />
            ) : null}

            {resultBanner?.tone === 'success' ? (
                <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="flex-1">{resultBanner.message}</span>
                    <button
                        type="button"
                        onClick={() => setResultBanner(null)}
                        className="text-green-500 transition-colors hover:text-green-700"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ) : null}

            {instructorView ? (
                <ReadOnlyLearnerTable
                    learners={learnerData.enrolled}
                    buildLearnerHref={(learnerId) => buildClassSubjectLearnerProfileHref(
                        learnerId,
                        learnerData.cohort_id,
                        cohortSubjectId,
                    )}
                />
            ) : (
                <div className="grid gap-6 xl:grid-cols-2">
                    <LearnerTable
                        title="Enrolled Learners"
                        description="Learners currently participating in this cohort subject."
                        icon={Users}
                        learners={learnerData.enrolled}
                        selectedIds={selectedEnrolled}
                        onToggle={(studentId) => toggleSelection(setSelectedEnrolled, studentId)}
                        onToggleAll={() => toggleAllSelection(learnerData.enrolled, selectedEnrolled, setSelectedEnrolled)}
                        actionLabel={unenrollMutation.isPending ? 'Removing...' : 'Bulk Unenroll'}
                        actionVariant="danger"
                        onAction={() => unenrollMutation.mutate(Array.from(selectedEnrolled))}
                        actionDisabled={coreLockedSubject || selectedEnrolled.size === 0 || isMutating}
                        emptyMessage="No learners enrolled in this subject yet."
                    />

                    <LearnerTable
                        title="Available Learners"
                        description="Learners in the parent cohort who are not yet enrolled in this cohort subject."
                        icon={UserPlus}
                        learners={learnerData.available}
                        selectedIds={selectedAvailable}
                        onToggle={(studentId) => toggleSelection(setSelectedAvailable, studentId)}
                        onToggleAll={() => toggleAllSelection(learnerData.available, selectedAvailable, setSelectedAvailable)}
                        actionLabel={enrollMutation.isPending ? 'Enrolling...' : 'Bulk Enroll'}
                        actionVariant="primary"
                        onAction={() => enrollMutation.mutate(Array.from(selectedAvailable))}
                        actionDisabled={selectedAvailable.size === 0 || isMutating}
                        emptyMessage="No available cohort learners."
                    />
                </div>
            )}

            <Card>
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <UserMinus className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold text-gray-900">Scope</h2>
                        <p className="text-sm text-gray-600">
                            {instructorView
                                ? 'This is a read-only learner list for your assigned cohort subject.'
                                : coreLockedSubject
                                    ? 'This screen shows a required cohort subject. Learner participation in this subject cannot be removed here.'
                                    : 'This screen manages explicit subject participation. It does not add or remove learners from the parent cohort.'}
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}

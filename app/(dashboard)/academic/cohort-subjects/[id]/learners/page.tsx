'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Users, UserPlus, UserMinus, X } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import {
    bulkEnrollCohortSubjectLearners,
    bulkUnenrollCohortSubjectLearners,
    getCohortSubjectLearners,
    listCohortSubjects,
} from '@/app/core/api/academic';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { roleHomeRoute } from '@/app/utils/routeAccess';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
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

function buildEnrollResultMessage(result: BulkSubjectEnrollResponse) {
    return `Enroll processed: ${result.processed}. Created ${result.created}, reactivated ${result.reactivated}, already active ${result.already_active}, rejected ${result.rejected}.`;
}

function buildUnenrollResultMessage(result: BulkSubjectUnenrollResponse) {
    return `Unenroll processed: ${result.processed}. Deactivated ${result.deactivated}, already inactive ${result.already_inactive}, missing ${result.missing}.`;
}

export default function CohortSubjectLearnersPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user, activeRole, loading: authLoading } = useAuth();
    const instructorAccess = useInstructorCohortAccess({ enabled: activeRole === 'INSTRUCTOR' });

    const cohortSubjectId = Number(params.id);
    const isValidCohortSubjectId = Number.isFinite(cohortSubjectId) && cohortSubjectId > 0;
    const isInstructor = activeRole === 'INSTRUCTOR';
    const accessLoading = authLoading || (isInstructor && instructorAccess.isLoading);
    const allowed = !user
        ? false
        : user.is_superadmin
            || activeRole === 'ADMIN'
            || (isInstructor && instructorAccess.cohortSubjectIds.includes(cohortSubjectId));

    const [selectedEnrolled, setSelectedEnrolled] = useState<Set<number>>(new Set());
    const [selectedAvailable, setSelectedAvailable] = useState<Set<number>>(new Set());
    const [resultBanner, setResultBanner] = useState<ResultBannerState | null>(null);

    useEffect(() => {
        if (accessLoading || allowed || !activeRole) return;
        router.replace(roleHomeRoute[activeRole]);
    }, [accessLoading, activeRole, allowed, router]);

    const learnersQuery = useQuery<CohortSubjectLearnerListResponse, Error>({
        queryKey: ['academic', 'cohort-subject-learners', cohortSubjectId],
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
            setSelectedAvailable(new Set());
            setResultBanner({ tone: 'success', message: buildEnrollResultMessage(result) });
            await queryClient.invalidateQueries({ queryKey: ['academic', 'cohort-subject-learners', cohortSubjectId] });
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
            setSelectedEnrolled(new Set());
            setResultBanner({ tone: 'success', message: buildUnenrollResultMessage(result) });
            await queryClient.invalidateQueries({ queryKey: ['academic', 'cohort-subject-learners', cohortSubjectId] });
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

    const backHref = learnerData.cohort_id
        ? `/academic/cohorts/${learnerData.cohort_id}`
        : '/academic/cohorts';
    const cohortLabel = cohortSubject?.cohort_name || `Cohort #${learnerData.cohort_id}`;
    const subjectLabel = cohortSubject?.subject_name || learnerData.subject_name;
    const isMutating = enrollMutation.isPending || unenrollMutation.isPending;

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

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="space-y-3">
                <Link href={backHref}>
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Cohort
                    </Button>
                </Link>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="info">{cohortLabel}</Badge>
                            <Badge variant="default">Cohort Subject #{cohortSubjectId}</Badge>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{subjectLabel}</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Manage explicit learner participation for this cohort subject. Cohort placement is unchanged here.
                            </p>
                        </div>
                    </div>

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
                    actionDisabled={selectedEnrolled.size === 0 || isMutating}
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

            <Card>
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <UserMinus className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold text-gray-900">Scope</h2>
                        <p className="text-sm text-gray-600">
                            This screen only manages explicit subject participation. It does not enroll or remove learners from the parent cohort.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}

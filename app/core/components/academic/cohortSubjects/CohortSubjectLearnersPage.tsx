'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Users, UserPlus, UserMinus, X } from 'lucide-react';
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
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { CohortSubjectLearnersHeader } from '@/app/core/components/academic/cohortSubjects/CohortSubjectLearnersHeader';
import {
    LearnerTable,
    MobileLearnerSelectionList,
    MobileReadOnlyLearnerList,
    MobileSelectionActionBar,
    ReadOnlyLearnerTable,
} from '@/app/core/components/academic/cohortSubjects/CohortSubjectLearnerCards';
import {
    buildClassSubjectReturnTo,
    buildLearnerCreateHref,
} from '@/app/core/components/learners/learnerCreateNavigation';
import {
    buildClassSubjectLearnerProfileHref,
    buildLearnerProfileHref,
} from '@/app/core/components/learners/learnerProfileNavigation';
import { buildLearnerSubjectReportHref } from '@/app/core/lib/learnerReportingRoutes';
import { shouldUseInstructorReportSurface } from '@/app/core/components/reports/reportAccessPolicy';
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
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const queryClient = useQueryClient();
    const { user, activeRole, activeOrg, capabilities, loading: authLoading } = useAuth();
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
    const subjectReturnTo = buildClassSubjectReturnTo(learnerData.cohort_id, cohortSubjectId);
    const cohortLabel = cohortSubject?.cohort_name || `Cohort #${learnerData.cohort_id}`;
    const subjectLabel = cohortSubject?.subject_name || learnerData.subject_name;
    const isMutating = enrollMutation.isPending || unenrollMutation.isPending;
    const cohortStudentsHref = `/academic/cohorts/${learnerData.cohort_id}/students`;
    const createLearnerHref = buildLearnerCreateHref({
        cohortId: learnerData.cohort_id,
        cohortSubjectId,
        returnTo: subjectReturnTo,
    });
    const canViewCohortStudents = canManageLearners;
    const addLearnerActionLabel = 'Add learner to this class';
    const pageTitle = instructorView
        ? `${subjectLabel} Learners`
        : `Manage ${subjectLabel} Learners`;
    const pageSubtitle = instructorView
        ? 'Read-only learner list for your assigned cohort subject.'
        : 'This screen manages explicit subject participation. It does not add or remove learners from the parent cohort.';
    const currentReturnTo = (() => {
        const query = searchParams.toString();
        return query ? `${pathname}?${query}` : pathname;
    })();
    const canOpenInstructorLearnerReports = shouldUseInstructorReportSurface({
        user,
        activeRole,
        activeOrg,
        capabilities,
    });

    const toggleStudentId = (current: Set<number>, studentId: number) => {
        const next = new Set(current);
        if (next.has(studentId)) {
            next.delete(studentId);
        } else {
            next.add(studentId);
        }
        return next;
    };

    const toggleEnrolledSelection = (studentId: number) => {
        setSelectedAvailable(new Set());
        setSelectedEnrolled((current) => toggleStudentId(current, studentId));
    };

    const toggleAvailableSelection = (studentId: number) => {
        setSelectedEnrolled(new Set());
        setSelectedAvailable((current) => toggleStudentId(current, studentId));
    };

    const toggleAllSelection = (
        learners: StudentSummary[],
        selectedIds: Set<number>,
        setter: (value: Set<number>) => void
    ) => {
        const allSelected = learners.length > 0 && learners.every((learner) => selectedIds.has(learner.id));
        setter(allSelected ? new Set() : new Set(learners.map((learner) => learner.id)));
    };

    const toggleAllEnrolledSelection = () => {
        setSelectedAvailable(new Set());
        toggleAllSelection(learnerData.enrolled, selectedEnrolled, setSelectedEnrolled);
    };

    const toggleAllAvailableSelection = () => {
        setSelectedEnrolled(new Set());
        toggleAllSelection(learnerData.available, selectedAvailable, setSelectedAvailable);
    };

    const buildAdminLearnerHref = (learnerId: number) => {
        const returnTo = currentReturnTo;
        return buildLearnerProfileHref(learnerId, returnTo);
    };

    const buildInstructorLearnerHref = (learnerId: number) => (
        canOpenInstructorLearnerReports
            ? buildLearnerSubjectReportHref(learnerId, cohortSubjectId, { returnTo: currentReturnTo })
            : buildClassSubjectLearnerProfileHref(
                learnerId,
                learnerData.cohort_id,
                cohortSubjectId,
            )
    );

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

    const mobileActionBar = selectedEnrolled.size > 0 ? (
        <MobileSelectionActionBar
            selectedCount={selectedEnrolled.size}
            actionLabel={unenrollMutation.isPending ? 'Removing...' : 'Unenroll'}
            actionVariant="danger"
            onAction={() => unenrollMutation.mutate(Array.from(selectedEnrolled))}
            disabled={Boolean(coreLockedSubject) || isMutating}
        />
    ) : (
        <MobileSelectionActionBar
            selectedCount={selectedAvailable.size}
            actionLabel={enrollMutation.isPending ? 'Enrolling...' : 'Enroll'}
            actionVariant="primary"
            onAction={() => enrollMutation.mutate(Array.from(selectedAvailable))}
            disabled={isMutating}
        />
    );

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-24 md:pb-0">
            {coreLockedSubject ? (
                <ErrorBanner
                    message="Core CBC subjects are global curriculum requirements. Learners should not be removed from this subject through the normal subject participation flow."
                    onDismiss={() => undefined}
                />
            ) : null}

            <CohortSubjectLearnersHeader
                cohortHref={cohortHref}
                cohortStudentsHref={cohortStudentsHref}
                createLearnerHref={createLearnerHref}
                cohortLabel={cohortLabel}
                cohortSubjectId={cohortSubjectId}
                mobileTitle={subjectLabel}
                pageTitle={pageTitle}
                pageSubtitle={pageSubtitle}
                enrolledCount={learnerData.counts.enrolled}
                availableCount={learnerData.counts.available}
                cohortTotalCount={learnerData.counts.cohort_total}
                addLearnerActionLabel={addLearnerActionLabel}
                instructorView={instructorView}
                canManageLearners={canManageLearners}
                canViewCohortStudents={canViewCohortStudents}
                downloadingClassList={downloadingClassList}
                onBack={() => router.push(cohortHref)}
                onDownloadClassList={() => {
                    void handleDownloadClassList();
                }}
            />

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
                <>
                    <MobileReadOnlyLearnerList
                        learners={learnerData.enrolled}
                        buildLearnerHref={buildInstructorLearnerHref}
                    />
                    <div className="hidden md:block">
                        <ReadOnlyLearnerTable
                            learners={learnerData.enrolled}
                            buildLearnerHref={buildInstructorLearnerHref}
                        />
                    </div>
                </>
            ) : (
                <div className="grid gap-6 xl:grid-cols-2">
                    <div className="space-y-6">
                        <MobileLearnerSelectionList
                            title="Enrolled Learners"
                            description="Learners currently participating in this cohort subject."
                            icon={Users}
                            learners={learnerData.enrolled}
                            selectedIds={selectedEnrolled}
                            buildLearnerHref={buildAdminLearnerHref}
                            onToggle={toggleEnrolledSelection}
                            emptyMessage="No learners enrolled in this subject yet."
                        />
                        <div className="hidden md:block">
                            <LearnerTable
                                title="Enrolled Learners"
                                description="Learners currently participating in this cohort subject."
                                icon={Users}
                                learners={learnerData.enrolled}
                                selectedIds={selectedEnrolled}
                                buildLearnerHref={buildAdminLearnerHref}
                                onToggle={toggleEnrolledSelection}
                                onToggleAll={toggleAllEnrolledSelection}
                                actionLabel={unenrollMutation.isPending ? 'Removing...' : 'Bulk Unenroll'}
                                actionVariant="danger"
                                onAction={() => unenrollMutation.mutate(Array.from(selectedEnrolled))}
                                actionDisabled={Boolean(coreLockedSubject) || selectedEnrolled.size === 0 || isMutating}
                                emptyMessage="No learners enrolled in this subject yet."
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <MobileLearnerSelectionList
                            title="Available Learners"
                            description="Learners in the parent cohort who are not yet enrolled in this cohort subject."
                            icon={UserPlus}
                            learners={learnerData.available}
                            selectedIds={selectedAvailable}
                            buildLearnerHref={buildAdminLearnerHref}
                            onToggle={toggleAvailableSelection}
                            emptyMessage="No available cohort learners."
                        />
                        <div className="hidden md:block">
                            <LearnerTable
                                title="Available Learners"
                                description="Learners in the parent cohort who are not yet enrolled in this cohort subject."
                                icon={UserPlus}
                                learners={learnerData.available}
                                selectedIds={selectedAvailable}
                                buildLearnerHref={buildAdminLearnerHref}
                                onToggle={toggleAvailableSelection}
                                onToggleAll={toggleAllAvailableSelection}
                                actionLabel={enrollMutation.isPending ? 'Enrolling...' : 'Bulk Enroll'}
                                actionVariant="primary"
                                onAction={() => enrollMutation.mutate(Array.from(selectedAvailable))}
                                actionDisabled={selectedAvailable.size === 0 || isMutating}
                                emptyMessage="No available cohort learners."
                            />
                        </div>
                    </div>
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

            {canManageLearners ? mobileActionBar : null}
        </div>
    );
}

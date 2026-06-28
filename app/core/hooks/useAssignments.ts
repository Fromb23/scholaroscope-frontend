import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    assignmentGroupAPI,
    assignmentGroupEvaluationAPI,
    assignmentEvaluationAPI,
    assignmentRecipientAPI,
    assignmentsAPI,
    assignmentSubmissionAPI,
} from '@/app/core/api/assignments';
import { lessonPlanAPI } from '@/app/core/api/lessonPlans';
import { sessionAPI } from '@/app/core/api/sessions';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { assignmentKeys } from '@/app/core/lib/queryKeys';
import { emitLessonPlanDataChanged } from '@/app/core/lib/lessonPlanEvents';
import { emitSessionDataChanged } from '@/app/core/lib/sessionEvents';
import type { PaginatedResponse } from '@/app/core/types/api';
import type {
    Assignment,
    AssignmentAutoGenerateGroupsPayload,
    AssignmentAutoGenerateGroupsResponse,
    AssignmentCreatePayload,
    AssignmentEligibleLearnersParams,
    AssignmentEligibleLearnersResponse,
    AssignmentEvidenceBridgeResponse,
    AssignmentEvaluation,
    AssignmentEvaluationCreatePayload,
    AssignmentEvaluationFilters,
    AssignmentEvaluationUpdatePayload,
    AssignmentFilters,
    AssignmentGroup,
    AssignmentGroupCopyFromPayload,
    AssignmentGroupCopyFromResponse,
    AssignmentGroupCreatePayload,
    AssignmentGroupCreateResponse,
    AssignmentGroupBulkMemberCreatePayload,
    AssignmentGroupBulkMemberCreateResponse,
    AssignmentGroupEvidenceBridgeResponse,
    AssignmentGroupEvaluation,
    AssignmentGroupEvaluationCreatePayload,
    AssignmentGroupEvaluationFilters,
    AssignmentGroupEvaluationUpdatePayload,
    AssignmentGroupReuseSource,
    AssignmentGroupMemberCreatePayload,
    AssignmentGroupMemberMovePayload,
    AssignmentGroupMemberParticipationPayload,
    AssignmentGroupSubmission,
    AssignmentGroupSubmissionCreatePayload,
    AssignmentGroupUpdatePayload,
    AssignmentLifecycleState,
    AssignmentPublishPayload,
    AssignmentPublishResponse,
    IssuePreparedAssignmentPayload,
    IssuePreparedAssignmentResponse,
    PrepareAssignmentFromLessonPlanPayload,
    PrepareAssignmentFromLessonPlanResponse,
    PreparedAssignmentsForLessonPlanResponse,
    AssignmentRecipient,
    AssignmentRecipientCreatePayload,
    AssignmentRecipientSelectionPayload,
    AssignmentSubmission,
    AssignmentSubmissionCreatePayload,
    AssignmentTeachingTodayItem,
    AssignmentUpdatePayload,
} from '@/app/core/types/assignments';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';

interface UseAssignmentsOptions {
    enabled?: boolean;
}

function unwrapList<T>(data: T[] | PaginatedResponse<T>): T[] {
    return Array.isArray(data) ? data : data.results ?? [];
}

function unwrapCount<T>(data: T[] | PaginatedResponse<T>): number {
    return Array.isArray(data) ? data.length : data.count ?? data.results.length;
}

function compactFilters(filters: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
}

function toIdSet(idsKey: string): Set<number> {
    if (!idsKey) return new Set<number>();

    return new Set(
        idsKey
            .split(',')
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value))
    );
}

function ensureInstructorCohortSubjectAccess(
    isTeachingActor: boolean,
    allowedCohortSubjectIds: Set<number>,
    cohortSubjectId: number | null | undefined
) {
    if (!isTeachingActor) return;

    if (typeof cohortSubjectId !== 'number' || !allowedCohortSubjectIds.has(cohortSubjectId)) {
        throw new Error(
            'You can only manage assignments for cohort subjects directly assigned to your teaching load.'
        );
    }
}

async function invalidateAssignmentDependencies(
    queryClient: ReturnType<typeof useQueryClient>,
    assignmentId?: number | null
) {
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: assignmentKeys.all }),
        queryClient.invalidateQueries({ queryKey: assignmentKeys.teachingToday() }),
        assignmentId
            ? queryClient.invalidateQueries({ queryKey: assignmentKeys.detail(assignmentId) })
            : Promise.resolve(),
        assignmentId
            ? queryClient.invalidateQueries({ queryKey: assignmentKeys.lifecycleState(assignmentId) })
            : Promise.resolve(),
        assignmentId
            ? queryClient.invalidateQueries({ queryKey: assignmentKeys.eligibleLearnersPrefix(assignmentId) })
            : Promise.resolve(),
        assignmentId
            ? queryClient.invalidateQueries({ queryKey: assignmentKeys.recipients(assignmentId) })
            : Promise.resolve(),
        assignmentId
            ? queryClient.invalidateQueries({ queryKey: assignmentKeys.submissions(assignmentId) })
            : Promise.resolve(),
        assignmentId
            ? queryClient.invalidateQueries({ queryKey: assignmentKeys.evaluationsPrefix(assignmentId) })
            : Promise.resolve(),
        assignmentId
            ? queryClient.invalidateQueries({ queryKey: assignmentKeys.groups(assignmentId) })
            : Promise.resolve(),
        assignmentId
            ? queryClient.invalidateQueries({ queryKey: assignmentKeys.groupEvaluationsPrefix(assignmentId) })
            : Promise.resolve(),
    ]);
}

async function invalidateAssignmentGroupDependencies(
    queryClient: ReturnType<typeof useQueryClient>,
    assignmentId?: number | null,
    groupId?: number | null,
    evaluationId?: number | null,
) {
    await Promise.all([
        invalidateAssignmentDependencies(queryClient, assignmentId),
        groupId
            ? queryClient.invalidateQueries({ queryKey: assignmentKeys.groupDetail(groupId) })
            : Promise.resolve(),
        groupId
            ? queryClient.invalidateQueries({ queryKey: assignmentKeys.groupSubmissions(groupId) })
            : Promise.resolve(),
        evaluationId
            ? queryClient.invalidateQueries({ queryKey: assignmentKeys.groupEvaluationDetail(evaluationId) })
            : Promise.resolve(),
    ]);
}

export function useAssignmentTeachingToday(options?: UseAssignmentsOptions) {
    const enabled = options?.enabled ?? true;

    const query = useQuery<AssignmentTeachingTodayItem[], Error>({
        queryKey: assignmentKeys.teachingToday(),
        queryFn: async () => {
            try {
                const response = await assignmentsAPI.getTeachingToday();
                return response.items ?? [];
            } catch (err) {
                const message = extractErrorMessage(err as ApiError, 'Failed to load assignment workflow items.');
                throw Object.assign(new Error(message), { cause: err });
            }
        },
        enabled,
        staleTime: 30_000,
    });

    return {
        items: query.data ?? [],
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useAssignments(filters?: AssignmentFilters, options?: UseAssignmentsOptions) {
    const instructorAccess = useInstructorCohortAccess({ enabled: options?.enabled });
    const enabled = options?.enabled ?? true;
    const normalizedFilters = useMemo(() => compactFilters({
        cohort: filters?.cohort,
        subject: filters?.subject,
        cohort_subject: filters?.cohort_subject,
        instructor: filters?.instructor,
        status: filters?.status,
        delivery_mode: filters?.delivery_mode,
        evaluation_type: filters?.evaluation_type,
        starts_at_after: filters?.starts_at_after,
        starts_at_before: filters?.starts_at_before,
        due_at_after: filters?.due_at_after,
        due_at_before: filters?.due_at_before,
        search: filters?.search,
        ordering: filters?.ordering,
        page: filters?.page,
        page_size: filters?.page_size,
    }), [
        filters?.cohort,
        filters?.due_at_after,
        filters?.due_at_before,
        filters?.delivery_mode,
        filters?.evaluation_type,
        filters?.instructor,
        filters?.ordering,
        filters?.page,
        filters?.page_size,
        filters?.search,
        filters?.starts_at_after,
        filters?.starts_at_before,
        filters?.status,
        filters?.subject,
        filters?.cohort_subject,
    ]);
    const allowedCohortSubjectIds = useMemo(
        () => toIdSet(instructorAccess.cohortSubjectIdsKey),
        [instructorAccess.cohortSubjectIdsKey]
    );
    const accessReady = !instructorAccess.isTeachingActor || !instructorAccess.isLoading;

    const query = useQuery<{ assignments: Assignment[]; totalCount: number }, Error>({
        queryKey: assignmentKeys.list(normalizedFilters),
        queryFn: async () => {
            try {
                const response = await assignmentsAPI.list(normalizedFilters as AssignmentFilters);
                const items = unwrapList(response);
                const scopedItems = instructorAccess.isTeachingActor
                    ? items.filter((assignment) => allowedCohortSubjectIds.has(assignment.cohort_subject))
                    : items;

                return {
                    assignments: scopedItems,
                    totalCount: instructorAccess.isTeachingActor ? scopedItems.length : unwrapCount(response),
                };
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to load assignments.'));
            }
        },
        enabled: enabled && accessReady,
        staleTime: 30_000,
    });

    return {
        assignments: query.data?.assignments ?? [],
        totalCount: query.data?.totalCount ?? 0,
        loading: query.isLoading || (enabled && instructorAccess.isTeachingActor && instructorAccess.isLoading),
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useAssignmentDetail(assignmentId: number | null, options?: UseAssignmentsOptions) {
    const instructorAccess = useInstructorCohortAccess({ enabled: options?.enabled });
    const enabled = (options?.enabled ?? true) && typeof assignmentId === 'number' && assignmentId > 0;
    const allowedCohortSubjectIds = useMemo(
        () => toIdSet(instructorAccess.cohortSubjectIdsKey),
        [instructorAccess.cohortSubjectIdsKey]
    );
    const accessReady = !instructorAccess.isTeachingActor || !instructorAccess.isLoading;

    const query = useQuery<Assignment, Error>({
        queryKey: assignmentKeys.detail(assignmentId),
        queryFn: async () => {
            if (!assignmentId) {
                throw new Error('Assignment id is required.');
            }

            try {
                const assignment = await assignmentsAPI.getById(assignmentId);
                ensureInstructorCohortSubjectAccess(
                    instructorAccess.isTeachingActor,
                    allowedCohortSubjectIds,
                    assignment.cohort_subject
                );
                return assignment;
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to load assignment.'));
            }
        },
        enabled: enabled && accessReady,
        staleTime: 30_000,
    });

    return {
        assignment: query.data ?? null,
        loading: query.isLoading || (enabled && instructorAccess.isTeachingActor && instructorAccess.isLoading),
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useAssignmentLifecycleState(
    assignmentId: number | null,
    options?: UseAssignmentsOptions
) {
    const enabled = (options?.enabled ?? true) && typeof assignmentId === 'number' && assignmentId > 0;

    const query = useQuery<AssignmentLifecycleState, Error>({
        queryKey: assignmentKeys.lifecycleState(assignmentId),
        queryFn: async () => {
            if (!assignmentId) {
                throw new Error('Assignment id is required.');
            }

            try {
                return await assignmentsAPI.getLifecycleState(assignmentId);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to load assignment workflow.'));
            }
        },
        enabled,
        staleTime: 30_000,
    });

    return {
        lifecycleState: query.data ?? null,
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function usePreparedAssignmentsForLessonPlan(
    lessonPlanId: number | null,
    options?: UseAssignmentsOptions,
) {
    const enabled = (options?.enabled ?? true) && typeof lessonPlanId === 'number' && lessonPlanId > 0;

    const query = useQuery<PreparedAssignmentsForLessonPlanResponse, Error>({
        queryKey: assignmentKeys.preparedForLessonPlan(lessonPlanId),
        queryFn: async () => {
            if (!lessonPlanId) {
                throw new Error('Lesson plan id is required.');
            }

            try {
                return await lessonPlanAPI.getPreparedAssignments(lessonPlanId);
            } catch (err) {
                throw new Error(
                    extractErrorMessage(err as ApiError, 'Failed to load learner task status.')
                );
            }
        },
        enabled,
        staleTime: 30_000,
    });

    return {
        assignments: query.data?.assignments ?? [],
        draft: query.data?.draft ?? null,
        issued: query.data?.issued ?? [],
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useAssignmentGroups(assignmentId: number | null, options?: UseAssignmentsOptions) {
    const enabled = (options?.enabled ?? true) && typeof assignmentId === 'number' && assignmentId > 0;

    const query = useQuery<AssignmentGroup[], Error>({
        queryKey: assignmentKeys.groups(assignmentId),
        queryFn: async () => {
            if (!assignmentId) {
                throw new Error('Assignment id is required.');
            }

            try {
                const response = await assignmentsAPI.listAssignmentGroups(assignmentId);
                return unwrapList(response);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to load assignment groups.'));
            }
        },
        enabled,
        staleTime: 30_000,
    });

    return {
        groups: query.data ?? [],
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useAssignmentEligibleLearners(
    assignmentId: number,
    options?: AssignmentEligibleLearnersParams
) {
    const enabled = Number.isFinite(assignmentId) && assignmentId > 0;
    const source = options?.source;
    const excludeGrouped = options?.exclude_grouped;

    return useQuery<AssignmentEligibleLearnersResponse, Error>({
        queryKey: assignmentKeys.eligibleLearners(assignmentId, source, excludeGrouped),
        queryFn: async () => {
            if (!assignmentId) {
                throw new Error('Assignment id is required.');
            }

            try {
                return await assignmentsAPI.getEligibleLearners(
                    assignmentId,
                    {
                        ...(source ? { source } : {}),
                        ...(typeof excludeGrouped === 'boolean'
                            ? { exclude_grouped: excludeGrouped }
                            : {}),
                    }
                );
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to load eligible learners.'));
            }
        },
        enabled,
        staleTime: 30_000,
    });
}

export function useAssignmentGroupDetail(groupId: number | null, options?: UseAssignmentsOptions) {
    const enabled = (options?.enabled ?? true) && typeof groupId === 'number' && groupId > 0;

    const query = useQuery<AssignmentGroup, Error>({
        queryKey: assignmentKeys.groupDetail(groupId),
        queryFn: async () => {
            if (!groupId) {
                throw new Error('Assignment group id is required.');
            }

            try {
                return await assignmentGroupAPI.getById(groupId);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to load assignment group.'));
            }
        },
        enabled,
        staleTime: 30_000,
    });

    return {
        group: query.data ?? null,
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useAssignmentGroupReuseSources(
    assignmentId: number | null,
    options?: UseAssignmentsOptions
) {
    const enabled = (options?.enabled ?? true) && typeof assignmentId === 'number' && assignmentId > 0;

    const query = useQuery<AssignmentGroupReuseSource[], Error>({
        queryKey: assignmentKeys.groupReuseSources(assignmentId),
        queryFn: async () => {
            if (!assignmentId) {
                throw new Error('Assignment id is required.');
            }

            try {
                const response = await assignmentsAPI.listGroupReuseSources(assignmentId);
                return unwrapList(response);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to load reusable group sets.'));
            }
        },
        enabled,
        staleTime: 30_000,
    });

    return {
        sources: query.data ?? [],
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useAssignmentRecipients(assignmentId: number | null, options?: UseAssignmentsOptions) {
    const enabled = (options?.enabled ?? true) && typeof assignmentId === 'number' && assignmentId > 0;

    const query = useQuery<AssignmentRecipient[], Error>({
        queryKey: assignmentKeys.recipients(assignmentId),
        queryFn: async () => {
            if (!assignmentId) {
                throw new Error('Assignment id is required.');
            }

            try {
                const response = await assignmentsAPI.listRecipients(assignmentId);
                return unwrapList(response);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to load assignment recipients.'));
            }
        },
        enabled,
        staleTime: 30_000,
    });

    return {
        recipients: query.data ?? [],
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useAssignmentSubmissions(assignmentId: number | null, options?: UseAssignmentsOptions) {
    const enabled = (options?.enabled ?? true) && typeof assignmentId === 'number' && assignmentId > 0;

    const query = useQuery<AssignmentSubmission[], Error>({
        queryKey: assignmentKeys.submissions(assignmentId),
        queryFn: async () => {
            if (!assignmentId) {
                throw new Error('Assignment id is required.');
            }

            try {
                const response = await assignmentsAPI.listSubmissions(assignmentId);
                return unwrapList(response);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to load assignment submissions.'));
            }
        },
        enabled,
        staleTime: 30_000,
    });

    return {
        submissions: query.data ?? [],
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useAssignmentGroupSubmissions(groupId: number | null, options?: UseAssignmentsOptions) {
    const enabled = (options?.enabled ?? true) && typeof groupId === 'number' && groupId > 0;

    const query = useQuery<AssignmentGroupSubmission[], Error>({
        queryKey: assignmentKeys.groupSubmissions(groupId),
        queryFn: async () => {
            if (!groupId) {
                throw new Error('Assignment group id is required.');
            }

            try {
                const response = await assignmentGroupAPI.listSubmissions(groupId);
                return unwrapList(response);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to load group submissions.'));
            }
        },
        enabled,
        staleTime: 30_000,
    });

    return {
        submissions: query.data ?? [],
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useAssignmentEvaluations(
    filters?: AssignmentEvaluationFilters,
    options?: UseAssignmentsOptions
) {
    const enabled = options?.enabled ?? true;
    const normalizedFilters = useMemo(() => compactFilters({
        assignment: filters?.assignment,
        student: filters?.student,
        submission: filters?.submission,
        evaluation_type: filters?.evaluation_type,
        evidence_created: filters?.evidence_created,
        page: filters?.page,
        page_size: filters?.page_size,
    }), [
        filters?.assignment,
        filters?.evidence_created,
        filters?.evaluation_type,
        filters?.page,
        filters?.page_size,
        filters?.student,
        filters?.submission,
    ]);

    const query = useQuery<AssignmentEvaluation[], Error>({
        queryKey: assignmentKeys.evaluations(
            typeof filters?.assignment === 'number' ? filters.assignment : null,
            normalizedFilters
        ),
        queryFn: async () => {
            try {
                const response = await assignmentEvaluationAPI.list(
                    normalizedFilters as AssignmentEvaluationFilters
                );
                return unwrapList(response);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to load assignment evaluations.'));
            }
        },
        enabled,
        staleTime: 30_000,
    });

    return {
        evaluations: query.data ?? [],
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useAssignmentGroupEvaluations(
    filters?: AssignmentGroupEvaluationFilters,
    options?: UseAssignmentsOptions
) {
    const enabled = options?.enabled ?? true;
    const normalizedFilters = useMemo(() => compactFilters({
        assignment: filters?.assignment,
        group: filters?.group,
        group_submission: filters?.group_submission,
        evaluation_type: filters?.evaluation_type,
        projection_mode: filters?.projection_mode,
        page: filters?.page,
        page_size: filters?.page_size,
    }), [
        filters?.assignment,
        filters?.evaluation_type,
        filters?.group,
        filters?.group_submission,
        filters?.page,
        filters?.page_size,
        filters?.projection_mode,
    ]);

    const query = useQuery<AssignmentGroupEvaluation[], Error>({
        queryKey: assignmentKeys.groupEvaluations(
            typeof filters?.assignment === 'number' ? filters.assignment : null,
            normalizedFilters
        ),
        queryFn: async () => {
            try {
                const response = await assignmentGroupEvaluationAPI.list(
                    normalizedFilters as AssignmentGroupEvaluationFilters
                );
                return unwrapList(response);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to load group evaluations.'));
            }
        },
        enabled,
        staleTime: 30_000,
    });

    return {
        evaluations: query.data ?? [],
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useAssignmentEvaluationDetail(
    evaluationId: number | null,
    options?: UseAssignmentsOptions
) {
    const enabled = (options?.enabled ?? true) && typeof evaluationId === 'number' && evaluationId > 0;

    const query = useQuery<AssignmentEvaluation, Error>({
        queryKey: assignmentKeys.evaluationDetail(evaluationId),
        queryFn: async () => {
            if (!evaluationId) {
                throw new Error('Evaluation id is required.');
            }

            try {
                return await assignmentEvaluationAPI.getById(evaluationId);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to load assignment evaluation.'));
            }
        },
        enabled,
        staleTime: 30_000,
    });

    return {
        evaluation: query.data ?? null,
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useAssignmentGroupEvaluationDetail(
    evaluationId: number | null,
    options?: UseAssignmentsOptions
) {
    const enabled = (options?.enabled ?? true) && typeof evaluationId === 'number' && evaluationId > 0;

    const query = useQuery<AssignmentGroupEvaluation, Error>({
        queryKey: assignmentKeys.groupEvaluationDetail(evaluationId),
        queryFn: async () => {
            if (!evaluationId) {
                throw new Error('Group evaluation id is required.');
            }

            try {
                return await assignmentGroupEvaluationAPI.getById(evaluationId);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to load group evaluation.'));
            }
        },
        enabled,
        staleTime: 30_000,
    });

    return {
        evaluation: query.data ?? null,
        loading: query.isLoading,
        error: query.error?.message ?? null,
        refetch: query.refetch,
    };
}

export function useCreateAssignment() {
    const queryClient = useQueryClient();
    const instructorAccess = useInstructorCohortAccess();
    const allowedCohortSubjectIds = useMemo(
        () => toIdSet(instructorAccess.cohortSubjectIdsKey),
        [instructorAccess.cohortSubjectIdsKey]
    );

    return useMutation({
        mutationFn: async (data: AssignmentCreatePayload) => {
            ensureInstructorCohortSubjectAccess(
                instructorAccess.isTeachingActor,
                allowedCohortSubjectIds,
                data.cohort_subject
            );

            try {
                return await assignmentsAPI.create(data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to create assignment.'));
            }
        },
        onSuccess: async (assignment) => {
            await invalidateAssignmentDependencies(queryClient, assignment.id);
        },
    });
}

export function usePrepareAssignmentFromLessonPlan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            lessonPlanId,
            data,
        }: {
            lessonPlanId: number;
            data: PrepareAssignmentFromLessonPlanPayload;
        }): Promise<PrepareAssignmentFromLessonPlanResponse> => {
            try {
                return await lessonPlanAPI.prepareAssignment(lessonPlanId, data);
            } catch (err) {
                throw new Error(
                    extractErrorMessage(
                        err as ApiError,
                        'Failed to prepare a learner task for this lesson.'
                    )
                );
            }
        },
        onSuccess: async (result) => {
            await Promise.all([
                invalidateAssignmentDependencies(queryClient, result.assignment.id),
                queryClient.invalidateQueries({
                    queryKey: assignmentKeys.preparedForLessonPlan(result.assignment.lesson_plan),
                }),
            ]);
            emitLessonPlanDataChanged();
            emitSessionDataChanged();
        },
    });
}

export function useUpdateAssignment(currentCohortSubjectId?: number | null) {
    const queryClient = useQueryClient();
    const instructorAccess = useInstructorCohortAccess();
    const allowedCohortSubjectIds = useMemo(
        () => toIdSet(instructorAccess.cohortSubjectIdsKey),
        [instructorAccess.cohortSubjectIdsKey]
    );

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: AssignmentUpdatePayload }) => {
            ensureInstructorCohortSubjectAccess(
                instructorAccess.isTeachingActor,
                allowedCohortSubjectIds,
                data.cohort_subject ?? currentCohortSubjectId
            );

            try {
                return await assignmentsAPI.update(id, data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to update assignment.'));
            }
        },
        onSuccess: async (assignment) => {
            await invalidateAssignmentDependencies(queryClient, assignment.id);
        },
    });
}

export function useDeleteAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (assignmentId: number) => {
            try {
                await assignmentsAPI.delete(assignmentId);
                return assignmentId;
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to delete assignment.'));
            }
        },
        onSuccess: async (assignmentId) => {
            await invalidateAssignmentDependencies(queryClient, assignmentId);
        },
    });
}

export function usePublishAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            assignmentId,
            data,
        }: {
            assignmentId: number;
            data?: AssignmentPublishPayload;
        }): Promise<AssignmentPublishResponse> => {
            try {
                return await assignmentsAPI.publish(assignmentId, data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to publish assignment.'));
            }
        },
        onSuccess: async (result) => {
            await invalidateAssignmentDependencies(queryClient, result.assignment.id);
        },
    });
}

export function useIssuePreparedAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            sessionId,
            data,
        }: {
            sessionId: number;
            data: IssuePreparedAssignmentPayload;
        }): Promise<IssuePreparedAssignmentResponse> => {
            try {
                return await sessionAPI.issuePreparedAssignment(sessionId, data);
            } catch (err) {
                throw new Error(
                    extractErrorMessage(
                        err as ApiError,
                        'Failed to issue the learner task.'
                    )
                );
            }
        },
        onSuccess: async (result) => {
            await Promise.all([
                invalidateAssignmentDependencies(queryClient, result.assignment.id),
                queryClient.invalidateQueries({
                    queryKey: assignmentKeys.preparedForLessonPlan(result.assignment.lesson_plan),
                }),
            ]);
            emitLessonPlanDataChanged();
            emitSessionDataChanged();
        },
    });
}

export function useCloseAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (assignmentId: number) => {
            try {
                return await assignmentsAPI.close(assignmentId);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to close assignment.'));
            }
        },
        onSuccess: async (assignment) => {
            await invalidateAssignmentDependencies(queryClient, assignment.id);
        },
    });
}

export function useArchiveAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (assignmentId: number) => {
            try {
                return await assignmentsAPI.archive(assignmentId);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to archive assignment.'));
            }
        },
        onSuccess: async (assignment) => {
            await invalidateAssignmentDependencies(queryClient, assignment.id);
        },
    });
}

export function useReopenAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (assignmentId: number) => {
            try {
                return await assignmentsAPI.reopenLearnerWork(assignmentId);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to reopen assignment.'));
            }
        },
        onSuccess: async (assignment) => {
            await invalidateAssignmentDependencies(queryClient, assignment.id);
        },
    });
}

export function useReopenLearnerWork() {
    return useReopenAssignment();
}

export function useRestoreAssignmentToReview() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (assignmentId: number) => {
            try {
                return await assignmentsAPI.restoreToReview(assignmentId);
            } catch (err) {
                throw new Error(
                    extractErrorMessage(err as ApiError, 'Failed to restore assignment to review.')
                );
            }
        },
        onSuccess: async (assignment) => {
            await invalidateAssignmentDependencies(queryClient, assignment.id);
        },
    });
}

export function useCreateAssignmentGroup(assignmentId: number | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AssignmentGroupCreatePayload) => {
            if (!assignmentId) {
                throw new Error('Assignment id is required.');
            }

            try {
                return await assignmentsAPI.createAssignmentGroup(assignmentId, data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to create assignment group.'));
            }
        },
        onSuccess: async (result: AssignmentGroupCreateResponse) => {
            const firstGroup = result.groups[0] ?? null;
            await invalidateAssignmentGroupDependencies(
                queryClient,
                assignmentId ?? firstGroup?.assignment ?? null,
                firstGroup?.id ?? null
            );
        },
    });
}

export function useUpdateAssignmentGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            groupId,
            data,
        }: {
            groupId: number;
            data: AssignmentGroupUpdatePayload;
        }) => {
            try {
                return await assignmentGroupAPI.update(groupId, data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to update assignment group.'));
            }
        },
        onSuccess: async (group) => {
            await invalidateAssignmentGroupDependencies(queryClient, group.assignment, group.id);
        },
    });
}

export function useDeleteAssignmentGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            assignmentId,
            groupId,
        }: {
            assignmentId: number;
            groupId: number;
        }) => {
            try {
                await assignmentGroupAPI.delete(groupId);
                return { assignmentId, groupId };
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to delete assignment group.'));
            }
        },
        onSuccess: async ({ assignmentId, groupId }) => {
            await invalidateAssignmentGroupDependencies(queryClient, assignmentId, groupId);
        },
    });
}

export function useAddAssignmentGroupMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            groupId,
            data,
        }: {
            groupId: number;
            data: AssignmentGroupMemberCreatePayload;
        }) => {
            try {
                return await assignmentGroupAPI.addMember(groupId, data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to add learner to group.'));
            }
        },
        onSuccess: async (group) => {
            await invalidateAssignmentGroupDependencies(queryClient, group.assignment, group.id);
        },
    });
}

export function useBulkAddAssignmentGroupMembers() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            groupId,
            data,
        }: {
            groupId: number;
            data: AssignmentGroupBulkMemberCreatePayload;
        }) => {
            try {
                return await assignmentGroupAPI.bulkAddMembers(groupId, data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to add learners to group.'));
            }
        },
        onSuccess: async (result: AssignmentGroupBulkMemberCreateResponse) => {
            await invalidateAssignmentGroupDependencies(
                queryClient,
                result.group.assignment,
                result.group.id
            );
        },
    });
}

export function useRemoveAssignmentGroupMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            assignmentId,
            groupId,
            studentId,
        }: {
            assignmentId: number;
            groupId: number;
            studentId: number;
        }) => {
            try {
                await assignmentGroupAPI.removeMember(groupId, studentId);
                return { assignmentId, groupId };
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to remove learner from group.'));
            }
        },
        onSuccess: async ({ assignmentId, groupId }) => {
            await invalidateAssignmentGroupDependencies(queryClient, assignmentId, groupId);
        },
    });
}

export function useUpdateAssignmentGroupMemberParticipation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            groupId,
            memberId,
            data,
        }: {
            assignmentId: number;
            groupId: number;
            memberId: number;
            data: AssignmentGroupMemberParticipationPayload;
        }) => {
            try {
                return await assignmentGroupAPI.updateMemberParticipation(groupId, memberId, data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to update learner participation.'));
            }
        },
        onSuccess: async (member, variables) => {
            await invalidateAssignmentGroupDependencies(
                queryClient,
                variables.assignmentId,
                variables.groupId
            );
            if (member.group !== variables.groupId) {
                await invalidateAssignmentGroupDependencies(
                    queryClient,
                    variables.assignmentId,
                    member.group
                );
            }
        },
    });
}

export function useMoveAssignmentGroupMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            groupId,
            memberId,
            data,
        }: {
            assignmentId: number;
            groupId: number;
            memberId: number;
            data: AssignmentGroupMemberMovePayload;
        }) => {
            try {
                return await assignmentGroupAPI.moveMember(groupId, memberId, data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to move learner to another group.'));
            }
        },
        onSuccess: async (member, variables) => {
            await invalidateAssignmentGroupDependencies(
                queryClient,
                variables.assignmentId,
                variables.groupId
            );
            await invalidateAssignmentGroupDependencies(
                queryClient,
                variables.assignmentId,
                member.group
            );
        },
    });
}

export function useAutoGenerateAssignmentGroups(assignmentId: number | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AssignmentAutoGenerateGroupsPayload) => {
            if (!assignmentId) {
                throw new Error('Assignment id is required.');
            }

            try {
                return await assignmentsAPI.autoGenerateGroups(assignmentId, data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to generate groups.'));
            }
        },
        onSuccess: async (result: AssignmentAutoGenerateGroupsResponse) => {
            const firstGroup = result.groups[0] ?? null;
            await invalidateAssignmentGroupDependencies(
                queryClient,
                assignmentId ?? firstGroup?.assignment ?? null,
                firstGroup?.id ?? null
            );
        },
    });
}

export function useCopyAssignmentGroupsFromSource(assignmentId: number | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AssignmentGroupCopyFromPayload) => {
            if (!assignmentId) {
                throw new Error('Assignment id is required.');
            }

            try {
                return await assignmentsAPI.copyGroupsFromSource(assignmentId, data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to reuse assignment groups.'));
            }
        },
        onSuccess: async (result: AssignmentGroupCopyFromResponse) => {
            const firstGroup = result.groups[0] ?? null;
            await invalidateAssignmentGroupDependencies(
                queryClient,
                assignmentId ?? firstGroup?.assignment ?? null,
                firstGroup?.id ?? null
            );
            await queryClient.invalidateQueries({
                queryKey: assignmentKeys.groupReuseSources(assignmentId),
            });
        },
    });
}

export function useCreateAssignmentRecipients(assignmentId: number | null) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AssignmentRecipientSelectionPayload) => {
            if (!assignmentId) {
                throw new Error('Assignment id is required.');
            }

            try {
                return await assignmentsAPI.createRecipients(assignmentId, data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to assign recipients.'));
            }
        },
        onSuccess: async () => {
            await invalidateAssignmentDependencies(queryClient, assignmentId);
        },
    });
}

export function useCreateAssignmentRecipient() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AssignmentRecipientCreatePayload) => {
            try {
                return await assignmentRecipientAPI.create(data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to create assignment recipient.'));
            }
        },
        onSuccess: async (recipient: AssignmentRecipient) => {
            await invalidateAssignmentDependencies(queryClient, recipient.assignment);
        },
    });
}

export function useCreateAssignmentSubmission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AssignmentSubmissionCreatePayload) => {
            try {
                return await assignmentSubmissionAPI.create(data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to submit assignment response.'));
            }
        },
        onSuccess: async (submission: AssignmentSubmission) => {
            await invalidateAssignmentDependencies(queryClient, submission.assignment);
        },
    });
}

export function useCreateAssignmentGroupSubmission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            groupId,
            data,
        }: {
            groupId: number;
            data: AssignmentGroupSubmissionCreatePayload;
        }) => {
            try {
                return await assignmentGroupAPI.createSubmission(groupId, data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to record group submission.'));
            }
        },
        onSuccess: async (submission) => {
            await invalidateAssignmentGroupDependencies(queryClient, submission.assignment, submission.group);
        },
    });
}

export function useCreateAssignmentEvaluation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AssignmentEvaluationCreatePayload) => {
            try {
                return await assignmentEvaluationAPI.create(data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to create assignment evaluation.'));
            }
        },
        onSuccess: async (evaluation) => {
            await invalidateAssignmentDependencies(queryClient, evaluation.assignment);
            await queryClient.invalidateQueries({
                queryKey: assignmentKeys.evaluationDetail(evaluation.id),
            });
        },
    });
}

export function useUpdateAssignmentEvaluation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            data,
        }: {
            id: number;
            data: AssignmentEvaluationUpdatePayload;
        }) => {
            try {
                return await assignmentEvaluationAPI.update(id, data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to update assignment evaluation.'));
            }
        },
        onSuccess: async (evaluation) => {
            await invalidateAssignmentDependencies(queryClient, evaluation.assignment);
            await queryClient.invalidateQueries({
                queryKey: assignmentKeys.evaluationDetail(evaluation.id),
            });
        },
    });
}

export function useCreateAssignmentGroupEvaluation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: AssignmentGroupEvaluationCreatePayload) => {
            try {
                return await assignmentGroupEvaluationAPI.create(data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to create group evaluation.'));
            }
        },
        onSuccess: async (evaluation) => {
            await invalidateAssignmentGroupDependencies(
                queryClient,
                evaluation.assignment,
                evaluation.group,
                evaluation.id
            );
        },
    });
}

export function useUpdateAssignmentGroupEvaluation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            data,
        }: {
            id: number;
            data: AssignmentGroupEvaluationUpdatePayload;
        }) => {
            try {
                return await assignmentGroupEvaluationAPI.update(id, data);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to update group evaluation.'));
            }
        },
        onSuccess: async (evaluation) => {
            await invalidateAssignmentGroupDependencies(
                queryClient,
                evaluation.assignment,
                evaluation.group,
                evaluation.id
            );
        },
    });
}

export function useBridgeAssignmentEvaluation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (variables: {
            assignmentId: number;
            evaluationId: number;
        }): Promise<AssignmentEvidenceBridgeResponse> => {
            try {
                return await assignmentEvaluationAPI.bridgeToEvidence(variables.evaluationId);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to bridge evaluation to evidence.'));
            }
        },
        onSuccess: async (_, variables) => {
            await invalidateAssignmentDependencies(queryClient, variables.assignmentId);
            await queryClient.invalidateQueries({
                queryKey: assignmentKeys.evaluationDetail(variables.evaluationId),
            });
        },
    });
}

export function useBridgeAssignmentGroupEvaluation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (variables: {
            assignmentId: number;
            groupId: number;
            evaluationId: number;
        }): Promise<AssignmentGroupEvidenceBridgeResponse> => {
            try {
                return await assignmentGroupEvaluationAPI.bridgeToEvidence(variables.evaluationId);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to bridge group evaluation to evidence.'));
            }
        },
        onSuccess: async (_, variables) => {
            await invalidateAssignmentGroupDependencies(
                queryClient,
                variables.assignmentId,
                variables.groupId,
                variables.evaluationId
            );
        },
    });
}

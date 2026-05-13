import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    assignmentEvaluationAPI,
    assignmentRecipientAPI,
    assignmentsAPI,
    assignmentSubmissionAPI,
} from '@/app/core/api/assignments';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { assignmentKeys } from '@/app/core/lib/queryKeys';
import type { PaginatedResponse } from '@/app/core/types/api';
import type {
    Assignment,
    AssignmentCreatePayload,
    AssignmentEvaluation,
    AssignmentEvaluationCreatePayload,
    AssignmentEvaluationFilters,
    AssignmentEvaluationUpdatePayload,
    AssignmentFilters,
    AssignmentRecipient,
    AssignmentRecipientCreatePayload,
    AssignmentRecipientSelectionPayload,
    AssignmentSubmission,
    AssignmentSubmissionCreatePayload,
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
    isInstructor: boolean,
    allowedCohortSubjectIds: Set<number>,
    cohortSubjectId: number | null | undefined
) {
    if (!isInstructor) return;

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
        assignmentId
            ? queryClient.invalidateQueries({ queryKey: assignmentKeys.detail(assignmentId) })
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
    ]);
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
    const accessReady = !instructorAccess.isInstructor || !instructorAccess.isLoading;

    const query = useQuery<{ assignments: Assignment[]; totalCount: number }, Error>({
        queryKey: assignmentKeys.list(normalizedFilters),
        queryFn: async () => {
            try {
                const response = await assignmentsAPI.list(normalizedFilters as AssignmentFilters);
                const items = unwrapList(response);
                const scopedItems = instructorAccess.isInstructor
                    ? items.filter((assignment) => allowedCohortSubjectIds.has(assignment.cohort_subject))
                    : items;

                return {
                    assignments: scopedItems,
                    totalCount: instructorAccess.isInstructor ? scopedItems.length : unwrapCount(response),
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
        loading: query.isLoading || (enabled && instructorAccess.isInstructor && instructorAccess.isLoading),
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
    const accessReady = !instructorAccess.isInstructor || !instructorAccess.isLoading;

    const query = useQuery<Assignment, Error>({
        queryKey: assignmentKeys.detail(assignmentId),
        queryFn: async () => {
            if (!assignmentId) {
                throw new Error('Assignment id is required.');
            }

            try {
                const assignment = await assignmentsAPI.getById(assignmentId);
                ensureInstructorCohortSubjectAccess(
                    instructorAccess.isInstructor,
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
        loading: query.isLoading || (enabled && instructorAccess.isInstructor && instructorAccess.isLoading),
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
                instructorAccess.isInstructor,
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
                instructorAccess.isInstructor,
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
        mutationFn: async (assignmentId: number) => {
            try {
                return await assignmentsAPI.publish(assignmentId);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to publish assignment.'));
            }
        },
        onSuccess: async (assignment) => {
            await invalidateAssignmentDependencies(queryClient, assignment.id);
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
                return await assignmentsAPI.reopen(assignmentId);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to reopen assignment.'));
            }
        },
        onSuccess: async (assignment) => {
            await invalidateAssignmentDependencies(queryClient, assignment.id);
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

export function useBridgeAssignmentEvaluation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (evaluationId: number) => {
            try {
                return await assignmentEvaluationAPI.bridgeToEvidence(evaluationId);
            } catch (err) {
                throw new Error(extractErrorMessage(err as ApiError, 'Failed to bridge evaluation to evidence.'));
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

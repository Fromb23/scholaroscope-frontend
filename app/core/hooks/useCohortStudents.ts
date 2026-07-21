// ============================================================================
// app/core/hooks/useCohortStudents.ts
//
// Owns cohort placement data and mutations backed by active StudentCohortEnrollment.
// ============================================================================

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cohortAPI } from '@/app/core/api/academic';
import { academicKeys } from '@/app/core/lib/queryKeys';
import { resolveErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';

export interface EnrolledStudent {
    id: number;
    admission_number: string;
    full_name: string;
    enrollment_id: number;
    enrollment_type: string;
    enrolled_date: string;
    is_primary_cohort: boolean;
    email: string;
    phone: string;
}

export interface AvailableStudent {
    id: number;
    admission_number: string;
    full_name: string;
    primary_cohort_name?: string;
    email: string;
}

export interface BulkEnrollResult {
    created: number;
    reactivated: number;
    already_active: number;
}

export interface BulkUnenrollResult {
    unenrolled: number;
    primary_cleared: number;
}

interface EnrolledStudentsPayload {
    cohort_name: string;
    students: EnrolledStudent[];
}

interface AvailableStudentsPayload {
    students: AvailableStudent[];
    total: number;
}

function normalizeEnrolledStudents(data: unknown): EnrolledStudentsPayload {
    if (Array.isArray(data)) {
        return { cohort_name: '', students: data as EnrolledStudent[] };
    }

    if (data && typeof data === 'object') {
        const payload = data as {
            cohort_name?: string;
            enrolled_students?: EnrolledStudent[];
            results?: EnrolledStudent[];
        };

        return {
            cohort_name: payload.cohort_name ?? '',
            students: payload.enrolled_students ?? payload.results ?? [],
        };
    }

    return { cohort_name: '', students: [] };
}

function normalizeAvailableStudents(data: unknown): AvailableStudentsPayload {
    if (Array.isArray(data)) {
        return {
            students: data as AvailableStudent[],
            total: data.length,
        };
    }

    if (data && typeof data === 'object') {
        const payload = data as {
            count?: number;
            available_students?: AvailableStudent[];
            results?: AvailableStudent[];
        };
        const students = payload.available_students ?? payload.results ?? [];

        return {
            students,
            total: typeof payload.count === 'number' ? payload.count : students.length,
        };
    }

    return { students: [], total: 0 };
}

async function invalidatePlacementDependencies(
    queryClient: ReturnType<typeof useQueryClient>,
    cohortId: number,
    studentIds: number[],
) {
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: academicKeys.cohorts.enrolledStudents(cohortId) }),
        queryClient.invalidateQueries({ queryKey: academicKeys.cohorts.availableStudents(cohortId) }),
        queryClient.invalidateQueries({ queryKey: academicKeys.cohorts.detail(cohortId) }),
        queryClient.invalidateQueries({ queryKey: academicKeys.cohorts.subjectParticipationPrefix(cohortId) }),
        ...studentIds.map((studentId) => (
            queryClient.invalidateQueries({ queryKey: academicKeys.students.detail(studentId) })
        )),
    ]);
}

export function useCohortEnrolledStudents(cohortId: number) {
    const enabled = Number.isFinite(cohortId) && cohortId > 0;

    return useQuery<EnrolledStudentsPayload, Error>({
        queryKey: academicKeys.cohorts.enrolledStudents(cohortId),
        queryFn: async () => normalizeEnrolledStudents(
            await cohortAPI.getEnrolledStudents(cohortId)
        ),
        enabled,
        staleTime: 30_000,
    });
}

function useCohortAvailableStudents(cohortId: number) {
    const enabled = Number.isFinite(cohortId) && cohortId > 0;

    return useQuery<AvailableStudentsPayload, Error>({
        queryKey: academicKeys.cohorts.availableStudents(cohortId),
        queryFn: async () => normalizeAvailableStudents(
            await cohortAPI.getAvailableStudents(cohortId)
        ),
        enabled,
        staleTime: 30_000,
    });
}

export function useCohortStudents(cohortId: number) {
    const queryClient = useQueryClient();
    const [actionError, setActionError] = useState<string | null>(null);
    const enrolledQuery = useCohortEnrolledStudents(cohortId);
    const availableQuery = useCohortAvailableStudents(cohortId);

    const bulkEnroll = async (
        studentIds: number[],
        enrollmentType: string,
        notes: string
    ): Promise<BulkEnrollResult> => {
        try {
            setActionError(null);
            const result = await cohortAPI.bulkEnrollStudents(
                cohortId,
                studentIds,
                enrollmentType,
                notes || 'Bulk enrollment'
            );
            await invalidatePlacementDependencies(queryClient, cohortId, studentIds);
            return result as BulkEnrollResult;
        } catch (err) {
            const message = resolveErrorMessage(err as ApiError, 'Failed to enroll learners in the cohort.');
            setActionError(message);
            throw err;
        }
    };

    const bulkUnenroll = async (
        studentIds: number[],
        notes: string
    ): Promise<BulkUnenrollResult> => {
        try {
            setActionError(null);
            const result = await cohortAPI.bulkUnenrollStudents(
                cohortId,
                studentIds,
                notes || 'Bulk unenrollment'
            );
            await invalidatePlacementDependencies(queryClient, cohortId, studentIds);
            return result as BulkUnenrollResult;
        } catch (err) {
            const message = resolveErrorMessage(err as ApiError, 'Failed to remove learners from the cohort.');
            setActionError(message);
            throw err;
        }
    };

    return {
        cohortName: enrolledQuery.data?.cohort_name ?? '',
        enrolled: enrolledQuery.data?.students ?? [],
        enrolledCount: enrolledQuery.data?.students.length ?? 0,
        available: availableQuery.data?.students ?? [],
        availableCount: availableQuery.data?.total ?? 0,
        loading: enrolledQuery.isLoading || availableQuery.isLoading,
        error: actionError ?? enrolledQuery.error?.message ?? availableQuery.error?.message ?? null,
        refetch: async () => {
            await Promise.all([enrolledQuery.refetch(), availableQuery.refetch()]);
        },
        bulkEnroll,
        bulkUnenroll,
        clearError: () => {
            setActionError(null);
            if (enrolledQuery.error || availableQuery.error) {
                void Promise.all([enrolledQuery.refetch(), availableQuery.refetch()]);
            }
        },
    };
}

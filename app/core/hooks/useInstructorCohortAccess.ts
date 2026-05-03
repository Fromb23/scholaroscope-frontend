'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import { globalUsersAPI } from '@/app/core/api/globalUsers';
import { isCambridgeCurriculumType } from '@/app/core/lib/curriculumBridge';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';

export type InstructorCurriculumKey = 'CBC' | 'CAMBRIDGE';
export type MyTeachingLoadResponse = Awaited<ReturnType<typeof globalUsersAPI.getMyTeachingLoad>>;

export function useMyTeachingLoad(options?: { enabled?: boolean }) {
    const { user, activeRole } = useAuth();
    const isInstructor = activeRole === 'INSTRUCTOR';
    const enabled = options?.enabled ?? true;

    return useQuery<MyTeachingLoadResponse, Error>({
        queryKey: ['my-teaching-load', user?.id],
        queryFn: async () => {
            try {
                return await globalUsersAPI.getMyTeachingLoad();
            } catch (err) {
                throw new Error(
                    extractErrorMessage(err as ApiError, 'Failed to fetch teaching load.')
                );
            }
        },
        enabled: enabled && Boolean(user) && isInstructor,
        staleTime: 60_000,
    });
}

function uniqueSortedNumbers(values: Array<number | null | undefined>): number[] {
    return Array.from(new Set(values.filter((value): value is number => typeof value === 'number')))
        .sort((a, b) => a - b);
}

export function useInstructorCohortAccess(options?: { enabled?: boolean }) {
    const { activeRole } = useAuth();
    const isInstructor = activeRole === 'INSTRUCTOR';
    const { data, isLoading, error } = useMyTeachingLoad(options);

    const assignments = useMemo(
        () => data?.assignments ?? [],
        [data?.assignments]
    );
    const cohortAssignments = useMemo(
        () => data?.cohort_assignments ?? [],
        [data?.cohort_assignments]
    );

    const cohortIds = useMemo(
        () => uniqueSortedNumbers(cohortAssignments.map(assignment => assignment.cohort_id)),
        [cohortAssignments]
    );

    const cohortSubjectIds = useMemo(
        () => uniqueSortedNumbers(assignments.map(assignment => assignment.cohort_subject_id)),
        [assignments]
    );

    const subjectIds = useMemo(
        () => uniqueSortedNumbers(assignments.map(assignment => assignment.subject_id)),
        [assignments]
    );

    const cohortIdsKey = useMemo(
        () => cohortIds.join(','),
        [cohortIds]
    );

    const cohortSubjectIdsKey = useMemo(
        () => cohortSubjectIds.join(','),
        [cohortSubjectIds]
    );

    const subjectIdsKey = useMemo(
        () => subjectIds.join(','),
        [subjectIds]
    );

    const curriculumTypes = useMemo(
        () => Array.from(new Set(cohortAssignments.map(assignment => assignment.curriculum_type))),
        [cohortAssignments]
    );

    const hasCBCAccess = useMemo(
        () => cohortAssignments.some(assignment => assignment.curriculum_type === 'CBE'),
        [cohortAssignments]
    );

    const hasCambridgeAccess = useMemo(
        () => cohortAssignments.some(assignment => isCambridgeCurriculumType(assignment.curriculum_type)),
        [cohortAssignments]
    );

    const hasCurriculumAccess = (curriculum: InstructorCurriculumKey): boolean => {
        if (!isInstructor) return true;
        return curriculum === 'CBC' ? hasCBCAccess : hasCambridgeAccess;
    };

    return {
        isInstructor,
        isLoading: isInstructor ? isLoading : false,
        error,
        assignments,
        cohortAssignments,
        cohortIds,
        cohortIdsKey,
        cohortSubjectIds,
        cohortSubjectIdsKey,
        subjectIds,
        subjectIdsKey,
        curriculumTypes,
        hasCBCAccess,
        hasCambridgeAccess,
        hasAssignedCohorts: cohortIds.length > 0,
        hasCurriculumAccess,
    };
}

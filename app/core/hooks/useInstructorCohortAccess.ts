'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import { teachingLoadAPI, type MyTeachingLoadResponse } from '@/app/core/api/teachingLoad';
import { isCambridgeCurriculumType } from '@/app/core/lib/curriculumBridge';
import {
    isSelfManagedTeachingAdmin,
    isTeachingActorView,
} from '@/app/core/lib/workspaces';
import { resolveErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';

export type InstructorCurriculumKey = 'CBC' | 'CAMBRIDGE';
export function useMyTeachingLoad(options?: { enabled?: boolean; includeProgress?: boolean }) {
    const { user, activeRole, activeOrg, capabilities } = useAuth();
    const isTeachingActor = isTeachingActorView({
        activeRole,
        activeOrg,
        capabilities,
        user,
    });
    const enabled = options?.enabled ?? true;

    return useQuery<MyTeachingLoadResponse, Error>({
        queryKey: ['my-teaching-load', activeOrg?.id ?? null, user?.id ?? null, activeRole, options?.includeProgress ?? false],
        queryFn: async () => {
            try {
                return await teachingLoadAPI.getMyTeachingLoad(
                    options?.includeProgress ? { include_progress: true } : undefined
                );
            } catch (err) {
                throw new Error(
                    resolveErrorMessage(err as ApiError, 'Failed to fetch teaching load.')
                );
            }
        },
        enabled: enabled && Boolean(user) && isTeachingActor,
        staleTime: 60_000,
    });
}

function uniqueSortedNumbers(values: Array<number | null | undefined>): number[] {
    return Array.from(new Set(values.filter((value): value is number => typeof value === 'number')))
        .sort((a, b) => a - b);
}

export function useInstructorCohortAccess(options?: { enabled?: boolean }) {
    const { user, activeRole, activeOrg, capabilities } = useAuth();
    const isInstructor = activeRole === 'INSTRUCTOR';
    const selfManagedTeachingAdmin = isSelfManagedTeachingAdmin({
        activeRole,
        activeOrg,
        capabilities,
        user,
    });
    const isTeachingActor = isInstructor || selfManagedTeachingAdmin;
    const { data, isLoading, error } = useMyTeachingLoad(options);

    const assignments = useMemo(
        () => (data?.assignments ?? []).filter(
            assignment => assignment.subject_offering_status !== 'DROPPED_HISTORICAL'
        ),
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

    const hasCurriculumAccess = useCallback((curriculum: InstructorCurriculumKey): boolean => {
        if (!isTeachingActor) return true;
        return curriculum === 'CBC' ? hasCBCAccess : hasCambridgeAccess;
    }, [hasCBCAccess, hasCambridgeAccess, isTeachingActor]);

    return {
        isInstructor,
        isSelfManagedTeachingAdmin: selfManagedTeachingAdmin,
        isTeachingActor,
        isLoading: isTeachingActor ? isLoading : false,
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
        hasAssignedCohortSubjects: cohortSubjectIds.length > 0,
        hasAssignedCohorts: cohortIds.length > 0,
        hasCurriculumAccess,
    };
}

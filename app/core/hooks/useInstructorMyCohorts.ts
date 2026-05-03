'use client';

import { useMemo } from 'react';
import type { InstructorCohortAccessAssignment } from '@/app/core/types/academic';
import { useMyTeachingLoad } from '@/app/core/hooks/useInstructorCohortAccess';

export type InstructorAcademicYearFilterMode = 'id' | 'name' | 'none';

export type InstructorMyCohort = Record<string, unknown> & {
    id: number;
    name: string;
    curriculum_id: number | null;
    curriculum_name: string;
    curriculum_type: string;
    academic_year_id: number | null;
    academic_year_name: string | null;
    level: string | null;
    stream: string | null;
    students_count: number | null;
    subjects_count: number | null;
    is_current_year: boolean;
};

function resolveAcademicYearName(
    assignment: InstructorCohortAccessAssignment
): string | null {
    const value = assignment.academic_year_name ?? assignment.academic_year ?? null;
    if (typeof value !== 'string') return null;

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

function toNullableNumber(value: number | null | undefined): number | null {
    return typeof value === 'number' ? value : null;
}

export function useInstructorMyCohorts(options?: { enabled?: boolean }) {
    const { data, isLoading, error, refetch } = useMyTeachingLoad(options);

    const cohortAssignments = useMemo(
        () => data?.cohort_assignments ?? [],
        [data?.cohort_assignments]
    );

    const cohorts = useMemo<InstructorMyCohort[]>(() => {
        const cohortMap = new Map<number, InstructorMyCohort>();

        cohortAssignments.forEach((assignment) => {
            const academicYearName = resolveAcademicYearName(assignment);
            const existing = cohortMap.get(assignment.cohort_id);

            if (!existing) {
                cohortMap.set(assignment.cohort_id, {
                    id: assignment.cohort_id,
                    name: assignment.cohort_name,
                    curriculum_id: toNullableNumber(assignment.curriculum_id),
                    curriculum_name: assignment.curriculum_name,
                    curriculum_type: assignment.curriculum_type,
                    academic_year_id: toNullableNumber(assignment.academic_year_id),
                    academic_year_name: academicYearName,
                    level: assignment.level ?? null,
                    stream: assignment.stream ?? null,
                    students_count: assignment.students_count ?? null,
                    subjects_count: assignment.subjects_count ?? null,
                    is_current_year: assignment.is_current_year,
                });
                return;
            }

            existing.curriculum_id = existing.curriculum_id ?? toNullableNumber(assignment.curriculum_id);
            existing.academic_year_id = existing.academic_year_id ?? toNullableNumber(assignment.academic_year_id);
            existing.academic_year_name = existing.academic_year_name ?? academicYearName;
            existing.level = existing.level ?? assignment.level ?? null;
            existing.stream = existing.stream ?? assignment.stream ?? null;
            existing.students_count = existing.students_count ?? assignment.students_count ?? null;
            existing.subjects_count = existing.subjects_count ?? assignment.subjects_count ?? null;
            existing.is_current_year = existing.is_current_year || assignment.is_current_year;
        });

        return Array.from(cohortMap.values());
    }, [cohortAssignments]);

    const academicYearFilterMode = useMemo<InstructorAcademicYearFilterMode>(() => {
        if (cohortAssignments.some((assignment) => typeof assignment.academic_year_id === 'number')) {
            return 'id';
        }

        if (cohortAssignments.some((assignment) => Boolean(resolveAcademicYearName(assignment)))) {
            return 'name';
        }

        return 'none';
    }, [cohortAssignments]);

    return {
        cohorts,
        cohortAssignments,
        academicYearFilterMode,
        loading: isLoading,
        error: error?.message ?? null,
        refetch,
    };
}

'use client';

import { useMemo } from 'react';
import type {
    InstructorCohortAccessAssignment,
    TeachingAssignment,
} from '@/app/core/types/academic';
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

export type InstructorTeachingLoadSubject = {
    teaching_key: string;
    cohort_subject_id: number | null;
    subject_name: string;
    subject_code: string | null;
    curriculum_name: string | null;
    curriculum_type: string;
    academic_year_name: string | null;
    learner_count: number | null;
    level: string | null;
    is_current_year: boolean;
};

export type InstructorTeachingLoadGroup = {
    cohort_id: number;
    cohort_name: string;
    curriculum_name: string;
    curriculum_type: string;
    academic_year_id: number | null;
    academic_year_name: string | null;
    level: string | null;
    stream: string | null;
    learner_count: number | null;
    is_current_year: boolean;
    subjects: InstructorTeachingLoadSubject[];
};

function normalizeText(value: string | null | undefined): string | null {
    if (typeof value !== 'string') return null;

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

function resolveAcademicYearName(
    assignment: InstructorCohortAccessAssignment
): string | null {
    return normalizeText(assignment.academic_year_name ?? assignment.academic_year ?? null);
}

function toNullableNumber(value: number | null | undefined): number | null {
    return typeof value === 'number' ? value : null;
}

function getTeachingAssignmentKey(assignment: Pick<
    TeachingAssignment,
    | 'source'
    | 'subject_source'
    | 'curriculum_type'
    | 'teaching_link_id'
    | 'cbc_cohort_subject_id'
    | 'cambridge_cohort_subject_id'
    | 'cohort_subject_id'
    | 'subject_id'
>) {
    const source =
        assignment.source?.trim().toLowerCase() ||
        assignment.subject_source?.trim().toLowerCase() ||
        (assignment.curriculum_type === 'CBE' ? 'cbc' : 'unknown');
    const identity =
        assignment.teaching_link_id ??
        assignment.cbc_cohort_subject_id ??
        assignment.cambridge_cohort_subject_id ??
        assignment.cohort_subject_id ??
        assignment.subject_id ??
        'unresolved';

    return `${source}-${identity}`;
}

export function useInstructorMyCohorts(options?: { enabled?: boolean }) {
    const { data, isLoading, error, refetch } = useMyTeachingLoad(options);

    const assignments = useMemo(
        () => data?.assignments ?? [],
        [data?.assignments]
    );
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

    const cohortSubjectGroups = useMemo<InstructorTeachingLoadGroup[]>(() => {
        const cohortMetaById = new Map<number, InstructorCohortAccessAssignment>();
        const groupMap = new Map<number, InstructorTeachingLoadGroup>();

        cohortAssignments.forEach((assignment) => {
            const existing = cohortMetaById.get(assignment.cohort_id);

            if (!existing) {
                cohortMetaById.set(assignment.cohort_id, assignment);
                return;
            }

            cohortMetaById.set(assignment.cohort_id, {
                ...existing,
                curriculum_id: existing.curriculum_id ?? assignment.curriculum_id ?? null,
                academic_year_id: existing.academic_year_id ?? assignment.academic_year_id ?? null,
                academic_year_name: existing.academic_year_name ?? assignment.academic_year_name ?? assignment.academic_year ?? null,
                level: existing.level ?? assignment.level ?? null,
                stream: existing.stream ?? assignment.stream ?? null,
                students_count: existing.students_count ?? assignment.students_count ?? null,
                subjects_count: existing.subjects_count ?? assignment.subjects_count ?? null,
                is_current_year: existing.is_current_year || assignment.is_current_year,
            });
        });

        assignments.forEach((assignment) => {
            const cohortMeta = cohortMetaById.get(assignment.cohort_id);
            const academicYearName =
                resolveAcademicYearName(cohortMeta ?? {
                    cohort_id: assignment.cohort_id,
                    cohort_name: assignment.cohort_name,
                    curriculum_name: assignment.curriculum_name ?? '',
                    curriculum_type: assignment.curriculum_type,
                    academic_year_name: assignment.academic_year_name ?? assignment.academic_year ?? null,
                    is_current_year: assignment.is_current_year,
                })
                ?? normalizeText(assignment.academic_year_name ?? assignment.academic_year);
            const teachingKey = getTeachingAssignmentKey(assignment);
            const existingGroup = groupMap.get(assignment.cohort_id);

            if (!existingGroup) {
                groupMap.set(assignment.cohort_id, {
                    cohort_id: assignment.cohort_id,
                    cohort_name: assignment.cohort_name,
                    curriculum_name: cohortMeta?.curriculum_name ?? assignment.curriculum_name ?? 'Curriculum',
                    curriculum_type: cohortMeta?.curriculum_type ?? assignment.curriculum_type,
                    academic_year_id: toNullableNumber(cohortMeta?.academic_year_id),
                    academic_year_name: academicYearName,
                    level: cohortMeta?.level ?? assignment.level ?? null,
                    stream: cohortMeta?.stream ?? null,
                    learner_count: cohortMeta?.students_count ?? null,
                    is_current_year: cohortMeta?.is_current_year ?? assignment.is_current_year,
                    subjects: [],
                });
            }

            const group = groupMap.get(assignment.cohort_id);
            if (!group) return;

            const alreadyAdded = group.subjects.some((subject) => subject.teaching_key === teachingKey);
            if (alreadyAdded) {
                return;
            }

            group.subjects.push({
                teaching_key: teachingKey,
                cohort_subject_id: typeof assignment.cohort_subject_id === 'number' ? assignment.cohort_subject_id : null,
                subject_name: assignment.subject_name,
                subject_code: assignment.subject_code ?? null,
                curriculum_name: assignment.curriculum_name ?? cohortMeta?.curriculum_name ?? null,
                curriculum_type: assignment.curriculum_type,
                academic_year_name: academicYearName,
                learner_count: cohortMeta?.students_count ?? null,
                level: assignment.level ?? cohortMeta?.level ?? null,
                is_current_year: assignment.is_current_year,
            });
        });

        return Array.from(groupMap.values())
            .map((group) => ({
                ...group,
                subjects: [...group.subjects].sort((left, right) => (
                    left.subject_name.localeCompare(right.subject_name)
                )),
            }))
            .sort((left, right) => {
                if (left.is_current_year !== right.is_current_year) {
                    return left.is_current_year ? -1 : 1;
                }

                return left.cohort_name.localeCompare(right.cohort_name);
            });
    }, [assignments, cohortAssignments]);

    const missingCohortSubjectIdCount = useMemo(() => (
        new Set(
            assignments
                .filter((assignment) => typeof assignment.cohort_subject_id !== 'number')
                .map((assignment) => getTeachingAssignmentKey(assignment))
        ).size
    ), [assignments]);

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
        cohortSubjectGroups,
        academicYearFilterMode,
        loading: isLoading,
        error: error?.message ?? null,
        missingCohortSubjectIdCount,
        refetch,
    };
}

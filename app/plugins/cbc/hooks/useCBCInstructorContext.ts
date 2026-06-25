'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import type { CohortSubject, Subject } from '@/app/core/types/academic';
import { isTeachingActorView } from '@/app/core/lib/workspaces';
import { cbcTeachingLoadAPI, cbcCatalogAPI } from '@/app/plugins/cbc/api/cbc';
import { cbcKeys } from '@/app/plugins/cbc/lib/queryKeys';
import {
    buildCBCInstructorAssignmentSelections,
    CBCInstructorSubjectSelection,
    resolveCBCVisibleProfilesFromAssignments,
} from '@/app/plugins/cbc/lib/visibility';
import type { CBCCatalog, CBCTeachingAssignment, CBCVisibleProfile } from '@/app/plugins/cbc/types/cbc';

interface InstructorCohortOption {
    id: number;
    name: string;
}

interface CBCInstructorContextData {
    assignments: CBCTeachingAssignment[];
    cohortSubjects: CohortSubject[];
    assignedCohorts: InstructorCohortOption[];
    visibleProfiles: CBCVisibleProfile[];
    catalog: CBCCatalog;
    curriculumName: string;
}

function mapAssignmentsToCohortSubjects(assignments: CBCTeachingAssignment[]): CohortSubject[] {
    return assignments.map(assignment => ({
        id: assignment.cohort_subject_id,
        cohort: assignment.cohort_id,
        cohort_name: assignment.cohort_name,
        cohort_level: assignment.level,
        subject: assignment.subject_id,
        subject_name: assignment.subject_name,
        subject_code: assignment.subject_code,
        curriculum_name: 'CBC',
        curriculum_type: 'CBE',
        is_compulsory: true,
    }));
}

function buildAssignedCohorts(assignments: CBCTeachingAssignment[]): InstructorCohortOption[] {
    return Array.from(
        new Map(
            assignments.map(assignment => [assignment.cohort_id, {
                id: assignment.cohort_id,
                name: assignment.cohort_name,
            }])
        ).values()
    ).sort((left, right) => left.name.localeCompare(right.name) || left.id - right.id);
}

function uniqueSortedIds(values: number[]) {
    return Array.from(new Set(values.filter(value => Number.isFinite(value))))
        .sort((left, right) => left - right);
}

export function useCBCInstructorContext(selectedCurriculumId: number | null) {
    const { user, activeOrg, activeRole, capabilities } = useAuth();
    const isTeachingActor = isTeachingActorView({
        activeRole,
        activeOrg,
        capabilities,
        user,
    });
    const userId = user?.id ?? 0;
    const organizationId = activeOrg?.id ?? 0;
    const curriculumId = selectedCurriculumId ?? 0;

    return useQuery<CBCInstructorContextData>({
        queryKey: cbcKeys.instructorContext.detail(userId, organizationId, curriculumId),
        queryFn: async () => {
            const [teachingLoad, catalog] = await Promise.all([
                cbcTeachingLoadAPI.myTeachingLoad(),
                cbcCatalogAPI.getCatalog(),
            ]);

            const assignments = (teachingLoad.assignments ?? []).filter(
                assignment => assignment.subject_offering_status !== 'DROPPED_HISTORICAL'
            );

            return {
                assignments,
                cohortSubjects: mapAssignmentsToCohortSubjects(assignments),
                assignedCohorts: buildAssignedCohorts(assignments),
                visibleProfiles: resolveCBCVisibleProfilesFromAssignments(catalog, assignments),
                catalog,
                curriculumName: catalog.curriculum_name ?? 'CBC',
            };
        },
        enabled: isTeachingActor && Boolean(userId) && Boolean(organizationId) && Boolean(curriculumId),
        staleTime: 5 * 60 * 1000,
    });
}

export function useResolvedCBCInstructorContext({
    selectedCurriculumId,
    requestedCohortId,
    requestedSubjectId,
}: {
    selectedCurriculumId: number | null;
    requestedCohortId: number | null;
    requestedSubjectId: number | null;
}) {
    const query = useCBCInstructorContext(selectedCurriculumId);
    const data = query.data;

    const effectiveCohortId = useMemo(() => {
        if (!data) return null;
        if (requestedCohortId !== null && data.assignedCohorts.some(cohort => cohort.id === requestedCohortId)) {
            return requestedCohortId;
        }
        return data.assignedCohorts.length === 1 ? data.assignedCohorts[0].id : null;
    }, [data, requestedCohortId]);

    const effectiveCohort = useMemo(
        () => data?.assignedCohorts.find(cohort => cohort.id === effectiveCohortId) ?? null,
        [data?.assignedCohorts, effectiveCohortId]
    );

    const scopedAssignments = useMemo(() => {
        if (!data) return [];
        if (effectiveCohortId === null) return data.assignments;
        return data.assignments.filter(assignment => assignment.cohort_id === effectiveCohortId);
    }, [data, effectiveCohortId]);

    const scopedVisibleProfiles = useMemo(
        () => data?.catalog
            ? resolveCBCVisibleProfilesFromAssignments(data.catalog, scopedAssignments)
            : [],
        [data, scopedAssignments]
    );

    const subjectSelections = useMemo<CBCInstructorSubjectSelection[]>(
        () => buildCBCInstructorAssignmentSelections(
            scopedAssignments,
            scopedVisibleProfiles,
            selectedCurriculumId,
            data?.curriculumName ?? 'CBC'
        ),
        [data?.curriculumName, scopedAssignments, scopedVisibleProfiles, selectedCurriculumId]
    );

    const selectedSubjectId = useMemo(() => {
        if (requestedSubjectId !== null && subjectSelections.some(selection => selection.filter_id === requestedSubjectId)) {
            return requestedSubjectId;
        }
        return subjectSelections.length === 1 ? subjectSelections[0].filter_id : null;
    }, [requestedSubjectId, subjectSelections]);

    const selectedSelection = useMemo(
        () => subjectSelections.find(selection => selection.filter_id === selectedSubjectId) ?? null,
        [selectedSubjectId, subjectSelections]
    );

    const selectedProfileIds = useMemo(
        () => uniqueSortedIds(
            selectedSelection?.subject_profile_ids?.length
                ? selectedSelection.subject_profile_ids
                : scopedVisibleProfiles.map(profile => profile.subject_profile_id)
        ),
        [scopedVisibleProfiles, selectedSelection]
    );

    const subjectOptions = useMemo<Subject[]>(
        () => subjectSelections.map(selection => selection.subject),
        [subjectSelections]
    );

    return {
        ...query,
        assignedCohorts: data?.assignedCohorts ?? [],
        cohortSubjects: data?.cohortSubjects ?? [],
        allAssignments: data?.assignments ?? [],
        visibleProfiles: scopedVisibleProfiles,
        effectiveCohortId,
        effectiveCohort,
        scopedAssignments,
        subjectSelections,
        subjectOptions,
        selectedSubjectId,
        selectedSelection,
        selectedProfileIds,
        hasVisibleProfiles: subjectOptions.length > 0 || selectedProfileIds.length > 0,
    };
}

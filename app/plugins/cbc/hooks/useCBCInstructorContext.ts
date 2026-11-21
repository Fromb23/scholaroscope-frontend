'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import type { CohortSubject, Subject } from '@/app/core/types/academic';
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
        subject: assignment.topic_subject_id ?? assignment.subject_id,
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
    const { user, activeOrg, activeOperatingContext, capabilities } = useAuth();
    const isTeachingActor = activeOperatingContext === 'MY_TEACHING'
        && Boolean(capabilities.can_teach);
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
    requestedCohortSubjectId,
}: {
    selectedCurriculumId: number | null;
    requestedCohortId: number | null;
    requestedSubjectId: number | null;
    requestedCohortSubjectId?: number | null;
}) {
    const query = useCBCInstructorContext(selectedCurriculumId);
    const data = query.data;

    const subjectSelections = useMemo<CBCInstructorSubjectSelection[]>(
        () => buildCBCInstructorAssignmentSelections(
            data?.assignments ?? [],
            data?.visibleProfiles ?? [],
            selectedCurriculumId,
            data?.curriculumName ?? 'CBC'
        ),
        [data?.assignments, data?.curriculumName, data?.visibleProfiles, selectedCurriculumId]
    );

    const requestedAssignment = useMemo(() => {
        if (requestedCohortSubjectId === null || requestedCohortSubjectId === undefined) return null;
        return data?.assignments.find(
            assignment => assignment.cohort_subject_id === requestedCohortSubjectId
        ) ?? null;
    }, [data?.assignments, requestedCohortSubjectId]);

    const invalidRequestedCohortSubject = Boolean(
        requestedCohortSubjectId && data && !requestedAssignment
    );

    const selectedSubjectId = useMemo(() => {
        if (requestedCohortSubjectId !== null && requestedCohortSubjectId !== undefined) {
            if (!requestedAssignment) return null;
            return subjectSelections.find(selection => (
                selection.cohort_subject_ids?.includes(requestedAssignment.cohort_subject_id)
            ))?.filter_id ?? null;
        }
        if (requestedSubjectId !== null && subjectSelections.some(selection => selection.filter_id === requestedSubjectId)) {
            return requestedSubjectId;
        }
        return subjectSelections.length === 1 ? subjectSelections[0].filter_id : null;
    }, [requestedAssignment, requestedCohortSubjectId, requestedSubjectId, subjectSelections]);

    const baseSelectedSelection = useMemo(
        () => subjectSelections.find(selection => selection.filter_id === selectedSubjectId) ?? null,
        [selectedSubjectId, subjectSelections]
    );

    const eligibleAssignments = useMemo(
        () => baseSelectedSelection?.assignments
            ?? (invalidRequestedCohortSubject ? [] : data?.assignments ?? []),
        [baseSelectedSelection, data?.assignments, invalidRequestedCohortSubject]
    );

    const assignedCohorts = useMemo(
        () => buildAssignedCohorts(eligibleAssignments),
        [eligibleAssignments]
    );

    const effectiveCohortId = useMemo(() => {
        if (invalidRequestedCohortSubject) return null;
        if (requestedAssignment) return requestedAssignment.cohort_id;
        if (
            requestedCohortId !== null
            && eligibleAssignments.some(assignment => assignment.cohort_id === requestedCohortId)
        ) {
            return requestedCohortId;
        }
        return assignedCohorts.length === 1 ? assignedCohorts[0].id : null;
    }, [assignedCohorts, eligibleAssignments, invalidRequestedCohortSubject, requestedAssignment, requestedCohortId]);

    const effectiveCohort = useMemo(
        () => assignedCohorts.find(cohort => cohort.id === effectiveCohortId) ?? null,
        [assignedCohorts, effectiveCohortId]
    );

    const selectedAssignment = useMemo(() => {
        if (!baseSelectedSelection || effectiveCohortId === null) return null;
        return (baseSelectedSelection.assignments ?? []).find(
            assignment => assignment.cohort_id === effectiveCohortId
        ) ?? null;
    }, [baseSelectedSelection, effectiveCohortId]);

    const selectedSelection = useMemo<CBCInstructorSubjectSelection | null>(() => {
        if (!baseSelectedSelection) return null;
        return {
            ...baseSelectedSelection,
            cohort_id: selectedAssignment?.cohort_id ?? null,
            cohort_name: selectedAssignment?.cohort_name ?? null,
            cohort_subject_id: selectedAssignment?.cohort_subject_id ?? null,
        };
    }, [baseSelectedSelection, selectedAssignment]);

    const scopedAssignments = useMemo(() => {
        if (effectiveCohortId === null) return eligibleAssignments;
        return eligibleAssignments.filter(assignment => assignment.cohort_id === effectiveCohortId);
    }, [effectiveCohortId, eligibleAssignments]);

    const scopedVisibleProfiles = useMemo(() => {
        if (invalidRequestedCohortSubject) return [];
        const selectedIds = new Set(baseSelectedSelection?.subject_profile_ids ?? []);
        if (!baseSelectedSelection) return data?.visibleProfiles ?? [];
        return (data?.visibleProfiles ?? []).filter(profile => (
            selectedIds.has(profile.subject_profile_id)
        ));
    }, [baseSelectedSelection, data?.visibleProfiles, invalidRequestedCohortSubject]);

    const selectedProfileIds = useMemo(
        () => uniqueSortedIds(
            baseSelectedSelection?.subject_profile_ids?.length
                ? baseSelectedSelection.subject_profile_ids
                : scopedVisibleProfiles.map(profile => profile.subject_profile_id)
        ),
        [baseSelectedSelection, scopedVisibleProfiles]
    );

    const subjectOptions = useMemo<Subject[]>(
        () => subjectSelections.map(selection => selection.subject),
        [subjectSelections]
    );

    return {
        ...query,
        assignedCohorts,
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
        selectedAssignment,
        selectedProfileIds,
        invalidRequestedCohortSubject,
        hasVisibleProfiles: subjectOptions.length > 0 || selectedProfileIds.length > 0,
    };
}

import { useMemo, useState } from 'react';
import {
    useStrandsByCurriculum,
    useStrandDetailsBySubjectProfiles,
} from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { useCohorts, useSubjects } from '@/app/core/hooks/useAcademic';
import { useResolvedCBCInstructorContext } from '@/app/plugins/cbc/hooks/useCBCInstructorContext';
import { matchesCBCStrandToSubjectSelection } from '@/app/plugins/cbc/lib/visibility';
import type { Subject } from '@/app/core/types/academic';

type StrandLike = {
    id: number;
    code: string;
    name: string;
    sequence?: number | null;
    subject?: number | null;
    subject_org_id?: number | null;
    subject_profile_id?: number | null;
    subject_name?: string | null;
    subject_level?: string | null;
    is_assigned?: boolean;
    sub_strands?: Array<{ outcomes_count?: number | null }>;
    sub_strands_count?: number | null;
};

function getSubStrandCount(strand: StrandLike) {
    const explicitCount = strand.sub_strands_count ?? 0;
    const nestedCount = strand.sub_strands?.length ?? 0;

    return Math.max(explicitCount, nestedCount);
}

function getOutcomeCount(strand: StrandLike) {
    return strand.sub_strands?.reduce(
        (sum, subStrand) => sum + (subStrand.outcomes_count ?? 0),
        0
    ) ?? 0;
}

export function useCBCProgressPage() {
    const [selectedSubjectFilterId, setSelectedSubjectFilterId] = useState<number | null>(null);

    const {
        selectedCurriculumId,
        setSelectedCohort,
        selectedCohortId,
        isAdmin,
        curriculumLoading,
    } = useCBCContext();

    const { cohorts = [], loading: cohortsLoading } = useCohorts(
        isAdmin ? { curriculum: selectedCurriculumId ?? undefined } : undefined,
        { enabled: isAdmin }
    );

    const { subjects: adminSubjects = [], loading: subjectsLoading } = useSubjects(
        selectedCurriculumId ?? undefined,
        { enabled: isAdmin }
    );

    const instructorContext = useResolvedCBCInstructorContext({
        selectedCurriculumId,
        requestedCohortId: selectedCohortId,
        requestedSubjectId: selectedSubjectFilterId,
    });

    const {
        assignedCohorts,
        effectiveCohortId,
        effectiveCohort,
        subjectSelections: instructorSubjectSelections,
        subjectOptions: instructorSubjectOptions,
        selectedSubjectId: selectedVisibleSubjectId,
        selectedSelection: resolvedInstructorSubjectSelection,
        selectedProfileIds,
        hasVisibleProfiles,
        isLoading: instructorContextLoading,
        error: instructorContextError,
        refetch: refetchInstructorContext,
    } = instructorContext;

    const {
        data: adminStrands = [],
        isLoading: adminStrandsLoading,
        error: adminStrandsError,
        refetch: refetchAdminStrands,
    } = useStrandsByCurriculum(isAdmin ? selectedCurriculumId : null);

    const {
        data: instructorStrands = [],
        isLoading: instructorStrandsLoading,
        error: instructorStrandsError,
        refetch: refetchInstructorStrands,
    } = useStrandDetailsBySubjectProfiles({
        curriculumId: selectedCurriculumId,
        subjectProfileIds: selectedProfileIds,
    });

    const strandSource = useMemo(
        () => (isAdmin ? adminStrands : instructorStrands),
        [adminStrands, instructorStrands, isAdmin]
    );

    const subjectsForCurriculum = useMemo(() => {
        if (!selectedCurriculumId) return [];

        if (!isAdmin) {
            return instructorSubjectOptions;
        }

        const subjectIdsWithStrands = new Set(
            strandSource
                .filter(strand => getSubStrandCount(strand) > 0)
                .map(strand => strand.subject_org_id)
                .filter((value): value is number => value !== null && value !== undefined)
        );

        return adminSubjects.filter((subject: Subject) => subjectIdsWithStrands.has(subject.id));
    }, [
        adminSubjects,
        instructorSubjectOptions,
        isAdmin,
        selectedCurriculumId,
        strandSource,
    ]);

    const visibleStrands = useMemo(() => {
        const withContent = strandSource.filter(strand => getSubStrandCount(strand) > 0);

        if (!isAdmin) {
            if (!resolvedInstructorSubjectSelection) {
                return withContent;
            }

            return withContent.filter(strand => (
                matchesCBCStrandToSubjectSelection(strand, resolvedInstructorSubjectSelection)
            ));
        }

        if (selectedVisibleSubjectId === null) {
            return withContent;
        }

        return withContent.filter(strand => strand.subject_org_id === selectedVisibleSubjectId);
    }, [
        isAdmin,
        resolvedInstructorSubjectSelection,
        selectedVisibleSubjectId,
        strandSource,
    ]);

    const resolvedSubject = useMemo(
        () => subjectsForCurriculum.find(subject => subject.id === selectedVisibleSubjectId)
            ?? (subjectsForCurriculum.length === 1 ? subjectsForCurriculum[0] : null),
        [selectedVisibleSubjectId, subjectsForCurriculum]
    );

    const stats = useMemo(
        () => ({
            strands: visibleStrands.length,
            subStrands: visibleStrands.reduce(
                (sum, strand) => sum + getSubStrandCount(strand),
                0
            ),
            outcomes: visibleStrands.reduce(
                (sum, strand) => sum + getOutcomeCount(strand),
                0
            ),
            subjects: isAdmin
                ? new Set(
                    visibleStrands
                        .map(strand => strand.subject_org_id)
                        .filter((value): value is number => value !== null && value !== undefined)
                ).size
                : subjectsForCurriculum.length,
        }),
        [isAdmin, subjectsForCurriculum.length, visibleStrands]
    );

    const isLoading = isAdmin
        ? curriculumLoading || cohortsLoading || subjectsLoading || adminStrandsLoading
        : curriculumLoading || instructorContextLoading || instructorStrandsLoading;
    const error = isAdmin ? adminStrandsError : (instructorContextError ?? instructorStrandsError);

    const refetch = () => {
        if (isAdmin) {
            refetchAdminStrands();
            return;
        }

        refetchInstructorContext();
        refetchInstructorStrands();
    };

    const handleCohortChange = (cohortId: number | null) => {
        setSelectedCohort(cohortId);
        setSelectedSubjectFilterId(null);
    };

    return {
        selectedCurriculumId,
        selectedSubjectFilterId,
        setSelectedSubjectFilterId,
        isAdmin,
        cohorts,
        assignedCohorts,
        effectiveCohortId,
        effectiveCohort,
        instructorSubjectSelections,
        subjectsForCurriculum,
        resolvedSubject,
        resolvedInstructorSubjectSelection,
        visibleStrands,
        stats,
        hasVisibleProfiles,
        isLoading,
        error,
        refetch,
        handleCohortChange,
    };
}

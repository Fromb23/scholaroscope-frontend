import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useStrands } from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { useSubjects } from '@/app/core/hooks/useAcademic';
import { useResolvedCBCInstructorContext } from '@/app/plugins/cbc/hooks/useCBCInstructorContext';
import { matchesCBCStrandToSubjectSelection } from '@/app/plugins/cbc/lib/visibility';
import type { Subject } from '@/app/core/types/academic';
import type { Strand } from '@/app/plugins/cbc/types/cbc';
import type { CBCQueryError } from '@/app/plugins/cbc/hooks/useCBC';

export function useCBCBrowserPage() {
    const [setupStrand, setSetupStrand] = useState<Strand | null>(null);
    const [selectedSubjectFilterId, setSelectedSubjectFilterId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const requestedCohortSubjectId = useMemo(() => {
        const value = Number(searchParams.get('cohort_subject_id') ?? '');
        return Number.isFinite(value) && value > 0 ? value : null;
    }, [searchParams]);

    const {
        selectedCurriculumId,
        selectedSubjectId,
        selectedCohortId,
        allowedSubjectIds,
        allowedCohortIds,
        teachingLoading,
        isAdmin,
        curriculumLoading,
    } = useCBCContext();

    const {
        subjects: adminSubjects = [],
        loading: subjectsLoading,
    } = useSubjects(selectedCurriculumId ?? undefined, { enabled: isAdmin });

    const strandQueryParams = useMemo(
        () => (selectedCurriculumId ? { curriculum: selectedCurriculumId } : undefined),
        [selectedCurriculumId]
    );

    const {
        data: curriculumStrands = [],
        isLoading: strandsLoading,
        error: strandsError,
        refetch: refetchStrands,
    } = useStrands(strandQueryParams);

    const instructorContext = useResolvedCBCInstructorContext({
        selectedCurriculumId,
        requestedCohortId: selectedCohortId,
        requestedSubjectId: selectedSubjectFilterId,
        requestedCohortSubjectId,
    });

    const {
        effectiveCohort,
        effectiveCohortId,
        assignedCohorts,
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

    const subjectsForCurriculum = useMemo(() => {
        if (!selectedCurriculumId) return [];

        if (isAdmin) {
            const subjectIdsWithStrands = new Set(
                curriculumStrands
                    .filter(strand => strand.sub_strands_count > 0)
                    .map(strand => strand.subject_org_id)
                    .filter((value): value is number => value !== null)
            );

            return adminSubjects.filter((subject: Subject) => subjectIdsWithStrands.has(subject.id));
        }

        return instructorSubjectOptions;
    }, [
        curriculumStrands,
        adminSubjects,
        instructorSubjectOptions,
        isAdmin,
        selectedCurriculumId,
    ]);

    const assignedVisibleStrands = useMemo(
        () => (
            isAdmin
                ? curriculumStrands.filter(strand => strand.sub_strands_count > 0)
                : curriculumStrands.filter(strand => (
                    strand.sub_strands_count > 0 &&
                    instructorSubjectSelections.some(selection => (
                        matchesCBCStrandToSubjectSelection(strand, selection)
                    ))
                ))
        ),
        [curriculumStrands, instructorSubjectSelections, isAdmin]
    );

    const visible = useMemo(() => {
        let result = assignedVisibleStrands;

        if (selectedVisibleSubjectId !== null) {
            result = result.filter(strand => (
                isAdmin
                    ? strand.subject_org_id === selectedVisibleSubjectId
                    : (resolvedInstructorSubjectSelection
                        ? matchesCBCStrandToSubjectSelection(strand, resolvedInstructorSubjectSelection)
                        : true)
            ));
        }

        if (search.trim()) {
            const query = search.toLowerCase();
            result = result.filter(strand => (
                strand.code.toLowerCase().includes(query) ||
                strand.name.toLowerCase().includes(query) ||
                strand.description?.toLowerCase().includes(query)
            ));
        }

        return result;
    }, [
        assignedVisibleStrands,
        isAdmin,
        resolvedInstructorSubjectSelection,
        search,
        selectedVisibleSubjectId,
    ]);

    const resolvedSubject = useMemo(
        () => subjectsForCurriculum.find(subject => subject.id === selectedVisibleSubjectId)
            ?? (subjectsForCurriculum.length === 1 ? subjectsForCurriculum[0] : null),
        [selectedVisibleSubjectId, subjectsForCurriculum]
    );

    const isLoading = isAdmin
        ? curriculumLoading || subjectsLoading || strandsLoading
        : curriculumLoading || instructorContextLoading || strandsLoading;
    const error = isAdmin ? strandsError : (instructorContextError ?? strandsError);

    const refetch = () => {
        if (isAdmin) {
            return refetchStrands();
        }

        refetchInstructorContext();
        return refetchStrands();
    };

    const strandErrorDiagnostic = (strandsError as CBCQueryError | null)?.diagnostic ?? null;
    const strandFetchDebugContext = useMemo(
        () => (
            strandsError
                ? {
                    endpointUrl: strandErrorDiagnostic?.url ?? strandErrorDiagnostic?.endpoint ?? null,
                    queryParams: strandErrorDiagnostic?.params ?? strandQueryParams ?? null,
                    statusCode: strandErrorDiagnostic?.statusCode ?? null,
                    backendDetail: strandErrorDiagnostic?.backendDetail ?? null,
                    backendMessage: strandErrorDiagnostic?.backendMessage ?? null,
                    responseData: strandErrorDiagnostic?.responseData ?? null,
                    selectedCurriculumId,
                    selectedSubjectId,
                    selectedCohortId,
                    allowedSubjectIds: isAdmin ? allowedSubjectIds : selectedProfileIds,
                    allowedCohortIds: isAdmin
                        ? allowedCohortIds
                        : assignedCohorts.map(cohort => cohort.id),
                    finalUseStrandsParams: strandQueryParams ?? null,
                }
                : null
        ),
        [
            allowedCohortIds,
            allowedSubjectIds,
            assignedCohorts,
            isAdmin,
            selectedCohortId,
            selectedCurriculumId,
            selectedProfileIds,
            selectedSubjectId,
            strandErrorDiagnostic,
            strandQueryParams,
            strandsError,
        ]
    );

    useEffect(() => {
        if (typeof window === 'undefined' || !pathname.startsWith('/cbc/browser')) return;

        console.debug('[CBCBrowser.mobile-debug]', {
            width: window.innerWidth,
            route: pathname,
            selectedCurriculumId,
            selectedSubjectId,
            selectedSubjectFilterId,
            selectedVisibleSubjectId,
            selectedCohortId,
            allowedSubjectIds: isAdmin ? allowedSubjectIds : selectedProfileIds,
            allowedCohortIds: isAdmin
                ? allowedCohortIds
                : assignedCohorts.map(cohort => cohort.id),
            teachingLoading,
            teachingContextLoading: instructorContextLoading,
            finalUseStrandsParams: strandQueryParams ?? null,
            strandsReturned: {
                count: curriculumStrands.length,
                ids: curriculumStrands.map(strand => strand.id),
            },
            visibleAfterAssignmentFilter: {
                count: assignedVisibleStrands.length,
                ids: assignedVisibleStrands.map(strand => strand.id),
            },
            visibleAfterFilters: {
                count: visible.length,
                ids: visible.map(strand => strand.id),
            },
            effectiveCohortId,
            resolvedSelectionFilterId: resolvedInstructorSubjectSelection?.filter_id ?? null,
        });
    }, [
        allowedCohortIds,
        allowedSubjectIds,
        assignedCohorts,
        assignedVisibleStrands,
        curriculumStrands,
        effectiveCohortId,
        instructorContextLoading,
        isAdmin,
        pathname,
        selectedCohortId,
        selectedCurriculumId,
        selectedProfileIds,
        selectedSubjectFilterId,
        selectedSubjectId,
        selectedVisibleSubjectId,
        resolvedInstructorSubjectSelection,
        strandQueryParams,
        teachingLoading,
        visible,
    ]);

    useEffect(() => {
        if (typeof window === 'undefined' || !pathname.startsWith('/cbc/browser') || !strandsError) return;

        console.error('[CBC Browser] strand fetch failed', {
            width: window.innerWidth,
            route: pathname,
            ...strandFetchDebugContext,
        });
    }, [pathname, strandFetchDebugContext, strandsError]);

    return {
        setupStrand,
        setSetupStrand,
        selectedSubjectFilterId,
        setSelectedSubjectFilterId,
        search,
        setSearch,
        isAdmin,
        isLoading,
        error,
        refetch,
        subjectsForCurriculum,
        instructorSubjectSelections,
        visible,
        hasVisibleProfiles,
        effectiveCohort,
        effectiveCohortId,
        assignedCohorts,
        resolvedSubject,
        resolvedInstructorSubjectSelection,
        strandsError,
        strandFetchDebugContext,
    };
}

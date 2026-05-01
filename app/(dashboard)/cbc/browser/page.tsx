'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, ChevronRight, Search, Layers } from 'lucide-react';
import {
    useStrands,
} from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { useSubjects } from '@/app/core/hooks/useAcademic';
import {
    CBCNav, CBCError, CBCLoading, CBCEmpty, SubjectGroupPicker,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Badge } from '@/app/components/ui/Badge';
import { GuidedCohortSetupModal } from '@/app/plugins/cbc/components/GuidedCohortSetupModal';
import type { Strand } from '@/app/plugins/cbc/types/cbc';
import {
    matchesCBCStrandToSubjectSelection,
} from '@/app/plugins/cbc/lib/visibility';
import { useResolvedCBCInstructorContext } from '@/app/plugins/cbc/hooks/useCBCInstructorContext';
import type { Subject } from '@/app/core/types/academic';
import type { CBCQueryError } from '@/app/plugins/cbc/hooks/useCBC';

function formatLevelLabel(level: string | null | undefined) {
    return (level ?? '')
        .replace('grade', 'Grade ')
        .replace(/(\d+)/, ' $1')
        .replace(/\s+/, ' ')
        .trim();
}

export default function CBCBrowserPage() {
    const [setupStrand, setSetupStrand] = useState<Strand | null>(null);
    const [selectedSubjectFilterId, setSelectedSubjectFilterId] = useState<number | null>(null);
    const pathname = usePathname();
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
    const [search, setSearch] = useState('');
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
        () => (isAdmin
            ? curriculumStrands.filter(strand => strand.sub_strands_count > 0)
            : curriculumStrands.filter(strand => (
                strand.sub_strands_count > 0 &&
                instructorSubjectSelections.some(selection => matchesCBCStrandToSubjectSelection(strand, selection))
            ))),
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
            const q = search.toLowerCase();
            result = result.filter(
                s => s.code.toLowerCase().includes(q) ||
                    s.name.toLowerCase().includes(q) ||
                    s.description?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [assignedVisibleStrands, isAdmin, resolvedInstructorSubjectSelection, search, selectedVisibleSubjectId]);

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
        if (isAdmin) return refetchStrands();
        refetchInstructorContext();
        return refetchStrands();
    };
    const strandErrorDiagnostic = (strandsError as CBCQueryError | null)?.diagnostic ?? null;
    const strandFetchDebugContext = useMemo(
        () => (strandsError ? {
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
            allowedCohortIds: isAdmin ? allowedCohortIds : assignedCohorts.map(cohort => cohort.id),
            finalUseStrandsParams: strandQueryParams ?? null,
        } : null),
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
            allowedCohortIds: isAdmin ? allowedCohortIds : assignedCohorts.map(cohort => cohort.id),
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
    }, [
        pathname,
        strandFetchDebugContext,
        strandsError,
    ]);

    if (isLoading) {
        return <CBCLoading message="Loading your assignments…" />;
    }

    return (
        <div className="space-y-6">
            <CBCNav />

            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Curriculum Browser</h1>
                    <p className="text-gray-500 mt-1">Explore strands, sub-strands, and learning outcomes</p>
                </div>
            </div>

            {!isAdmin && hasVisibleProfiles && (
                <Card className="border-blue-100 bg-blue-50 p-4">
                    <div className="flex flex-wrap items-start gap-6">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Resolved CBC Subject
                            </p>
                            {resolvedSubject ? (
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="purple" size="md">{resolvedSubject.name}</Badge>
                                    <Badge variant="blue" size="md">{formatLevelLabel(resolvedSubject.level)}</Badge>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600">Across assigned CBC subjects</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Cohort Context
                            </p>
                            {effectiveCohort ? (
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="indigo" size="md">{effectiveCohort.name}</Badge>
                                    <Badge variant="default" size="md">Cohort {effectiveCohort.id}</Badge>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-600">
                                    Across {assignedCohorts.length} assigned CBC cohort{assignedCohorts.length !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-900">
                                {isAdmin ? 'Subject' : 'My CBC Subject'}
                            </h3>
                        </div>
                        <SubjectGroupPicker
                            subjects={subjectsForCurriculum}
                            selectedSubjectId={selectedVisibleSubjectId}
                            onSelect={setSelectedSubjectFilterId}
                            showAllOption={isAdmin || subjectsForCurriculum.length > 1}
                            autoExpandSelected={!isAdmin}
                            mode={isAdmin ? 'catalog' : 'instructor'}
                            instructorSelections={instructorSubjectSelections}
                        />
                    </Card>
                </div>

                {/* Content */}
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <Input
                                label=""
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search strands…"
                            />
                        </div>
                        {!isLoading && (
                            <p className="text-sm text-gray-500 whitespace-nowrap shrink-0">
                                <span className="font-semibold text-gray-900">{visible.length}</span>{' '}
                                strand{visible.length !== 1 ? 's' : ''}
                            </p>
                        )}
                    </div>

                    {error ? (
                        <CBCError
                            error={error}
                            onRetry={refetch}
                            debugContext={error === strandsError ? strandFetchDebugContext : null}
                        />
                    ) : isLoading ? (
                        <CBCLoading message="Loading strands…" />
                    ) : !isAdmin && !hasVisibleProfiles ? (
                        <Card>
                            <CBCEmpty
                                icon={BookOpen}
                                title="No CBC Subjects Attached"
                                description="No CBC subjects are attached to your assigned cohorts."
                            />
                        </Card>
                    ) : visible.length === 0 ? (
                        <Card>
                            <CBCEmpty
                                icon={Search}
                                title="No Strands Found"
                                description={
                                    effectiveCohortId
                                        ? 'No strands are available for the selected cohort.'
                                        : 'No strands match your current filters.'
                                }
                            />
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {visible.map(strand => (
                                <Link key={strand.id} href={`/cbc/browser/strands/${strand.id}`} className="block group">
                                    <Card className="h-full hover:shadow-md hover:border-blue-200 transition-all duration-200">
                                        <div className="flex flex-col h-full">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                                    <Badge variant="blue" size="md" className="font-mono shrink-0">
                                                        {strand.code}
                                                    </Badge>
                                                    {strand.subject_name && (
                                                        <Badge variant="purple" size="sm" className="truncate">
                                                            {strand.subject_name}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-gray-400
                                                    group-hover:text-blue-600 shrink-0 transition-colors" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2
                                                    group-hover:text-blue-600 transition-colors">
                                                    {strand.name}
                                                </h3>
                                                {strand.description && (
                                                    <p className="text-sm text-gray-600 line-clamp-2">
                                                        {strand.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-gray-100">
                                                <Layers className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    <span className="font-semibold text-gray-900">
                                                        {strand.sub_strands_count}
                                                    </span>
                                                    {' '}sub-strand{strand.sub_strands_count !== 1 ? 's' : ''}
                                                </span>
                                                {!strand.is_assigned && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); e.preventDefault(); setSetupStrand(strand); }}
                                                        className="ml-auto shrink-0"
                                                    >
                                                        <Badge variant="warning" size="sm" className="cursor-pointer hover:bg-yellow-100">
                                                            No cohort yet — fix
                                                        </Badge>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {setupStrand && (
                <GuidedCohortSetupModal
                    strand={setupStrand}
                    subjectLevel={setupStrand.subject_level ?? ''}
                    onComplete={refetch}
                    onClose={() => setSetupStrand(null)}
                />
            )}
        </div>
    );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight, Search, Layers } from 'lucide-react';
import {
    useCBCCatalog,
    useStrands,
} from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { useCohorts, useSubjects } from '@/app/core/hooks/useAcademic';
import { useCohortSubjectsByCohorts } from '@/app/core/hooks/useCohortSubjects';
import { useMyCBCTeachingLoad } from '@/app/plugins/cbc/hooks/useCBCTeaching';
import {
    CBCNav, CBCError, CBCLoading, CBCEmpty, SubjectGroupPicker,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Badge } from '@/app/components/ui/Badge';
import { GuidedCohortSetupModal } from '@/app/plugins/cbc/components/GuidedCohortSetupModal';
import type { Strand } from '@/app/plugins/cbc/types/cbc';
import {
    buildCBCInstructorSubjectSelections,
    buildCBCSubjectOptionsFromProfiles,
    CBCInstructorSubjectSelection,
    isCBCStrandVisibleForAssignedCohortSubjects,
    matchesCBCStrandToSubjectSelection,
    matchesCBCVisibleProfile,
    resolveCBCVisibleProfiles,
    resolveCBCVisibleProfilesFromAssignments,
} from '@/app/plugins/cbc/lib/visibility';
import type { Cohort, Subject } from '@/app/core/types/academic';

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
    const {
        selectedCurriculumId,
        selectedCohortId,
        setSelectedCohort,
        isAdmin, teachingLoading, curriculumLoading,
    } = useCBCContext();
    const {
        assignments: teachingAssignments,
    } = useMyCBCTeachingLoad();
    const [search, setSearch] = useState('');
    const {
        cohorts = [],
        loading: cohortsLoading,
    } = useCohorts({ curriculum: selectedCurriculumId ?? undefined });
    const {
        subjects: adminSubjects = [],
        loading: subjectsLoading,
    } = useSubjects(selectedCurriculumId ?? undefined);
    const assignedCohortIds = useMemo(
        () => cohorts.map((cohort: Cohort) => cohort.id),
        [cohorts]
    );
    const {
        subjects: assignedCohortSubjects,
        loading: cohortSubjectsLoading,
    } = useCohortSubjectsByCohorts(isAdmin ? null : assignedCohortIds);
    const {
        data: catalog,
        refetch: refetchCatalog,
    } = useCBCCatalog();
    const assignedProfilesFromTeachingLoad = useMemo(
        () => (isAdmin ? [] : resolveCBCVisibleProfilesFromAssignments(catalog, teachingAssignments)),
        [catalog, isAdmin, teachingAssignments]
    );
    const visibleCohortIds = useMemo(() => {
        if (isAdmin) return new Set<number>();

        if (assignedCohortSubjects.length > 0) {
            return new Set(assignedCohortSubjects.map(subject => subject.cohort));
        }

        if (assignedProfilesFromTeachingLoad.length > 0) {
            return new Set(
                teachingAssignments
                    .filter(assignment => assignedProfilesFromTeachingLoad.some(profile => (
                        (typeof assignment.subject_profile_id === 'number' &&
                            assignment.subject_profile_id === profile.subject_profile_id) ||
                        matchesCBCVisibleProfile({
                            subject_name: assignment.subject_name,
                            subject_code: assignment.subject_code,
                            cohort_level: assignment.level,
                        }, profile)
                    )))
                    .map(assignment => assignment.cohort_id)
            );
        }

        return new Set(
            assignedCohortSubjects
                .filter(subject => resolveCBCVisibleProfiles(catalog, assignedCohortSubjects).some(profile => (
                    matchesCBCVisibleProfile(subject, profile)
                )))
                .map(subject => subject.cohort)
        );
    }, [assignedCohortSubjects, assignedProfilesFromTeachingLoad, catalog, isAdmin, teachingAssignments]);
    const visibleCohorts = useMemo(() => {
        if (isAdmin) return [];
        return cohorts.filter((cohort: Cohort) => visibleCohortIds.has(cohort.id));
    }, [cohorts, isAdmin, visibleCohortIds]);
    const effectiveCohort = useMemo(() => {
        if (isAdmin) return null;
        return visibleCohorts.find(cohort => cohort.id === selectedCohortId)
            ?? (visibleCohorts.length === 1 ? visibleCohorts[0] : null);
    }, [isAdmin, selectedCohortId, visibleCohorts]);

    useEffect(() => {
        if (isAdmin || teachingLoading) return;

        if (selectedCohortId !== null && !visibleCohortIds.has(selectedCohortId)) {
            setSelectedCohort(visibleCohorts.length === 1 ? visibleCohorts[0].id : null);
            return;
        }

        if (selectedCohortId === null && visibleCohorts.length === 1) {
            setSelectedCohort(visibleCohorts[0].id);
        }
    }, [
        isAdmin,
        selectedCohortId,
        setSelectedCohort,
        teachingLoading,
        visibleCohortIds,
        visibleCohorts,
    ]);

    const cohortSubjectLinks = useMemo(() => {
        if (isAdmin) return assignedCohortSubjects;
        return assignedCohortSubjects.filter(subject => {
            if (!visibleCohortIds.has(subject.cohort)) return false;
            if (!effectiveCohort) return true;
            return subject.cohort === effectiveCohort.id;
        });
    }, [assignedCohortSubjects, effectiveCohort, isAdmin, visibleCohortIds]);
    const scopedTeachingAssignments = useMemo(() => {
        if (isAdmin) return [];

        return teachingAssignments.filter(assignment => {
            if (!visibleCohortIds.has(assignment.cohort_id)) return false;
            if (!effectiveCohort) return true;
            return assignment.cohort_id === effectiveCohort.id;
        });
    }, [effectiveCohort, isAdmin, teachingAssignments, visibleCohortIds]);
    const visibleProfilesFromTeachingLoad = useMemo(() => {
        if (isAdmin) return [];
        return resolveCBCVisibleProfilesFromAssignments(catalog, scopedTeachingAssignments);
    }, [catalog, isAdmin, scopedTeachingAssignments]);
    const visibleProfilesFromCatalog = useMemo(
        () => resolveCBCVisibleProfiles(catalog, cohortSubjectLinks),
        [catalog, cohortSubjectLinks]
    );
    const visibleProfiles = useMemo(
        () => (visibleProfilesFromTeachingLoad.length > 0
            ? visibleProfilesFromTeachingLoad
            : visibleProfilesFromCatalog),
        [visibleProfilesFromCatalog, visibleProfilesFromTeachingLoad]
    );
    const {
        data: adminStrands = [],
        isLoading: adminStrandsLoading,
        error: adminStrandsError,
        refetch: refetchAdminStrands,
    } = useStrands(
        selectedCurriculumId
            ? { curriculum: selectedCurriculumId }
            : undefined
    );
    const instructorStrands = useMemo(
        () => adminStrands.filter(strand => (
            isCBCStrandVisibleForAssignedCohortSubjects(strand, cohortSubjectLinks)
        )),
        [adminStrands, cohortSubjectLinks]
    );
    const instructorSubjectSelections = useMemo<CBCInstructorSubjectSelection[]>(
        () => (isAdmin
            ? []
            : buildCBCInstructorSubjectSelections(
                cohortSubjectLinks,
                instructorStrands,
                selectedCurriculumId,
                catalog?.curriculum_name ?? 'CBC'
            )),
        [catalog?.curriculum_name, cohortSubjectLinks, instructorStrands, isAdmin, selectedCurriculumId]
    );

    const subjectsForCurriculum = useMemo(() => {
        if (!selectedCurriculumId) return [];

        if (isAdmin) {
            const subjectIdsWithStrands = new Set(
                adminStrands
                    .filter(strand => strand.sub_strands_count > 0)
                    .map(strand => strand.subject_org_id)
                    .filter((value): value is number => value !== null)
            );

            return adminSubjects.filter((subject: Subject) => subjectIdsWithStrands.has(subject.id));
        }

        if (instructorSubjectSelections.length > 0) {
            return instructorSubjectSelections.map(selection => selection.subject);
        }

        return buildCBCSubjectOptionsFromProfiles(
            visibleProfiles,
            selectedCurriculumId,
            catalog?.curriculum_name ?? 'CBC'
        );
    }, [
        adminStrands,
        adminSubjects,
        catalog?.curriculum_name,
        instructorSubjectSelections,
        isAdmin,
        selectedCurriculumId,
        visibleProfiles,
    ]);

    useEffect(() => {
        if (selectedSubjectFilterId === null) return;
        if (!subjectsForCurriculum.some(subject => subject.id === selectedSubjectFilterId)) {
            setSelectedSubjectFilterId(null);
        }
    }, [selectedSubjectFilterId, subjectsForCurriculum]);

    useEffect(() => {
        if (isAdmin || selectedSubjectFilterId !== null) return;
        if (subjectsForCurriculum.length === 1) {
            setSelectedSubjectFilterId(subjectsForCurriculum[0].id);
        }
    }, [isAdmin, selectedSubjectFilterId, subjectsForCurriculum]);

    const selectedVisibleSubjectId = useMemo(
        () => selectedSubjectFilterId ?? (subjectsForCurriculum.length === 1 ? subjectsForCurriculum[0].id : null),
        [selectedSubjectFilterId, subjectsForCurriculum]
    );
    const resolvedInstructorSubjectSelection = useMemo(
        () => instructorSubjectSelections.find(selection => selection.filter_id === selectedVisibleSubjectId)
            ?? (instructorSubjectSelections.length === 1 ? instructorSubjectSelections[0] : null),
        [instructorSubjectSelections, selectedVisibleSubjectId]
    );

    const assignedVisibleStrands = useMemo(
        () => (isAdmin
            ? adminStrands.filter(strand => strand.sub_strands_count > 0)
            : instructorStrands.filter(strand => strand.sub_strands_count > 0)),
        [adminStrands, instructorStrands, isAdmin]
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
    const hasVisibleProfiles = isAdmin
        ? subjectsForCurriculum.length > 0
        : (subjectsForCurriculum.length > 0 || assignedVisibleStrands.length > 0);
    const isLoading = isAdmin
        ? curriculumLoading || cohortsLoading || subjectsLoading || adminStrandsLoading
        : teachingLoading || curriculumLoading || cohortsLoading || cohortSubjectsLoading || adminStrandsLoading;
    const error = adminStrandsError;
    const refetch = () => {
        if (isAdmin) {
            refetchAdminStrands();
            return;
        }
        refetchCatalog();
        refetchAdminStrands();
    };

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
                                    Across {visibleCohorts.length} assigned CBC cohort{visibleCohorts.length !== 1 ? 's' : ''}
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
                            <h3 className="text-sm font-semibold text-gray-900">Subject</h3>
                        </div>
                        <SubjectGroupPicker
                            subjects={subjectsForCurriculum}
                            selectedSubjectId={selectedVisibleSubjectId}
                            onSelect={setSelectedSubjectFilterId}
                            showAllOption={isAdmin || subjectsForCurriculum.length > 1}
                            autoExpandSelected={!isAdmin}
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

                    {error && <CBCError error={error} onRetry={refetch} />}

                    {isLoading ? (
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
                                    selectedCohortId
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

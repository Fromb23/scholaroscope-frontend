'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Target, TrendingUp, Users, ChevronRight, Filter } from 'lucide-react';
import {
    useCBCCatalog,
    useStrandsByCurriculum,
} from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { useCohorts, useSubjects } from '@/app/core/hooks/useAcademic';
import { useMyCBCTeachingLoad } from '@/app/plugins/cbc/hooks/useCBCTeaching';
import {
    CBCNav, CBCError, CBCLoading, CBCEmpty, SubjectGroupPicker,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { Select } from '@/app/components/ui/Select';
import type { Cohort, Subject } from '@/app/core/types/academic';
import { useCohortSubjectsByCohorts } from '@/app/core/hooks/useCohortSubjects';
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

function formatLevelLabel(level: string | null | undefined) {
    return (level ?? '')
        .replace('grade', 'Grade ')
        .replace(/(\d+)/, ' $1')
        .replace(/\s+/, ' ')
        .trim();
}

export default function CBCProgressPage() {
    const [selectedSubjectFilterId, setSelectedSubjectFilterId] = useState<number | null>(null);
    const {
        selectedCurriculumId,
        setSelectedCohort,
        selectedCohortId,
        isAdmin, teachingLoading, curriculumLoading,
    } = useCBCContext();
    const {
        assignments: teachingAssignments,
    } = useMyCBCTeachingLoad();
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
        if (isAdmin) return cohorts;
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
    } =
        useStrandsByCurriculum(selectedCurriculumId);
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
                    .filter(strand => strand.sub_strands.length > 0)
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
            ? adminStrands.filter(strand => strand.sub_strands.length > 0)
            : instructorStrands.filter(strand => strand.sub_strands.length > 0)),
        [adminStrands, instructorStrands, isAdmin]
    );

    const visibleStrands = useMemo(() => {
        const base = assignedVisibleStrands;

        if (selectedVisibleSubjectId === null) return base;
        return base.filter(strand => (
            isAdmin
                ? strand.subject_org_id === selectedVisibleSubjectId
                : (resolvedInstructorSubjectSelection
                    ? matchesCBCStrandToSubjectSelection(strand, resolvedInstructorSubjectSelection)
                    : true)
        ));
    }, [assignedVisibleStrands, isAdmin, resolvedInstructorSubjectSelection, selectedVisibleSubjectId]);

    const resolvedSubject = useMemo(
        () => subjectsForCurriculum.find(subject => subject.id === selectedVisibleSubjectId)
            ?? (subjectsForCurriculum.length === 1 ? subjectsForCurriculum[0] : null),
        [selectedVisibleSubjectId, subjectsForCurriculum]
    );

    const handleCohortChange = (cohortId: number | null) => {
        setSelectedCohort(cohortId);
        setSelectedSubjectFilterId(null);
    };
    const stats = useMemo(() => ({
        strands: visibleStrands.length,
        subStrands: visibleStrands.reduce((s, st) => s + st.sub_strands.length, 0),
        outcomes: visibleStrands.reduce(
            (s, st) => s + st.sub_strands.reduce((a, ss) => a + (ss.outcomes_count ?? 0), 0), 0
        ),
        subjects: new Set(
            visibleStrands.map(strand => (
                isAdmin ? strand.subject_org_id : (resolvedInstructorSubjectSelection?.filter_id ?? null)
            )).filter(
                (value): value is number => value !== null
            )
        ).size,
    }), [isAdmin, resolvedInstructorSubjectSelection?.filter_id, visibleStrands]);

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
                <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">CBC Progress</h1>
                    <p className="text-gray-500 mt-1">Track competency emergence across outcomes</p>
                </div>
            </div>

            {!isAdmin && hasVisibleProfiles && (
                <Card className="border-purple-100 bg-purple-50 p-4">
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
                <div className="lg:col-span-1 space-y-4">
                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <Filter className="h-4 w-4 text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-900">Cohort</h3>
                        </div>
                        <Select
                            label=""
                            value={effectiveCohort?.id.toString() ?? selectedCohortId?.toString() ?? ''}
                            onChange={e => handleCohortChange(e.target.value ? Number(e.target.value) : null)}
                            options={[
                                { value: '', label: 'All cohorts' },
                                ...visibleCohorts.map((c: Cohort) => ({
                                    value: String(c.id), label: c.name,
                                })),
                            ]}
                        />
                    </Card>
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
                    {selectedCurriculumId && !error && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <StatsCard title="Strands" value={stats.strands} icon={BookOpen} color="blue" />
                            <StatsCard title="Sub-Strands" value={stats.subStrands} icon={TrendingUp} color="green" />
                            <StatsCard title="Outcomes" value={stats.outcomes} icon={Target} color="purple" />
                            <StatsCard title="Subjects" value={stats.subjects} icon={Users} color="orange" />
                        </div>
                    )}

                    {error && <CBCError error={error} onRetry={refetch} />}

                    <Card>
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Target className="h-5 w-5 text-blue-600" />
                                Strands
                                {visibleStrands.length > 0 && (
                                    <Badge variant="blue" size="sm">{visibleStrands.length}</Badge>
                                )}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Click a strand to explore sub-strands and learning outcomes
                            </p>
                        </div>

                        {isLoading ? (
                            <CBCLoading message="Loading strands…" />
                        ) : !isAdmin && !hasVisibleProfiles ? (
                            <CBCEmpty
                                icon={BookOpen}
                                title="No CBC Subjects Attached"
                                description="No CBC subjects are attached to your assigned cohorts."
                            />
                        ) : visibleStrands.length === 0 ? (
                            <CBCEmpty
                                icon={Target}
                                title="No Strands Found"
                                description="No strands match the selected filters"
                            />
                        ) : (
                            <div className="space-y-1">
                                {visibleStrands.map(strand => {
                                    const outcomeCount = strand.sub_strands.reduce(
                                        (s, ss) => s + (ss.outcomes_count ?? 0), 0
                                    );
                                    return (
                                        <Link
                                            key={strand.id}
                                            href={`/cbc/progress/strand/${strand.id}?cohort=${effectiveCohort?.id ?? selectedCohortId ?? ''}&subject=${isAdmin ? (strand.subject_org_id ?? '') : (resolvedInstructorSubjectSelection?.subject_ids[0] ?? strand.subject_org_id ?? strand.subject ?? '')}`}
                                            className="flex items-center justify-between hover:bg-gray-50
                -mx-2 px-2 py-3 rounded-lg transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Badge variant="blue" size="sm" className="font-mono shrink-0">
                                                    {strand.code}
                                                </Badge>
                                                <span className="font-medium text-gray-900 truncate">
                                                    {strand.name}
                                                </span>
                                                {!selectedCohortId && !strand.is_assigned && (
                                                    <Badge variant="warning" size="sm" className="shrink-0">
                                                        No cohort yet
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                <span className="text-sm text-gray-500">
                                                    {strand.sub_strands.length} sub-strands · {outcomeCount} outcomes
                                                </span>
                                                <ChevronRight className="h-5 w-5 text-gray-400
                    group-hover:text-blue-600 transition-colors" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}

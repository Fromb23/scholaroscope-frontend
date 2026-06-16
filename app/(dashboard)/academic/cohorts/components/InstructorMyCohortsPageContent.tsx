'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
    BookOpen,
    ClipboardList,
    GraduationCap,
    History,
    Users,
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Input } from '@/app/components/ui/Input';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { DesktopOnly } from '@/app/core/components/DesktopOnly';
import { useAcademicYears } from '@/app/core/hooks/useAcademic';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { usePersistedFilters } from '@/app/core/hooks/usePersistedFilters';
import { getAcademicLevelLabel } from '@/app/core/lib/curriculumLevels';
import {
    type InstructorTeachingLoadGroup,
    useInstructorMyCohorts,
} from '@/app/core/hooks/useInstructorMyCohorts';
import {
    buildAcademicYearOptions,
    getInstructorAcademicYearFilterNotice,
    parseOptionalNumber,
} from '@/app/(dashboard)/academic/cohorts/components/cohortsPageShared';

export function InstructorMyCohortsPageContent() {
    const { academicYears } = useAcademicYears();
    const [filters, updateFilters] = usePersistedFilters('/academic/cohorts', {
        academic_year: '',
    });
    const {
        cohortSubjectGroups,
        loading,
        error,
        academicYearFilterMode,
        missingCohortSubjectIdCount,
    } = useInstructorMyCohorts();
    const [isErrorDismissed, setIsErrorDismissed] = useState(false);
    const [search, setSearch] = useState('');

    const currentYear = useMemo(
        () => academicYears.find((academicYear) => academicYear.is_current),
        [academicYears]
    );
    const selectedYearId = parseOptionalNumber(filters.academic_year);
    const selectedYear = useMemo(
        () => academicYears.find((academicYear) => academicYear.id === selectedYearId),
        [academicYears, selectedYearId]
    );
    const academicYearFilterNotice = useMemo(
        () => getInstructorAcademicYearFilterNotice(academicYearFilterMode),
        [academicYearFilterMode]
    );
    const canFilterByAcademicYear = academicYearFilterMode !== 'none';
    const normalizedSearch = search.trim().toLowerCase();

    useEffect(() => {
        if (currentYear && !filters.academic_year && canFilterByAcademicYear) {
            updateFilters({ academic_year: String(currentYear.id) });
        }
    }, [canFilterByAcademicYear, currentYear, filters.academic_year, updateFilters]);

    useEffect(() => {
        setIsErrorDismissed(false);
    }, [error]);

    const filteredGroups = useMemo<InstructorTeachingLoadGroup[]>(() => {
        const yearFilteredGroups = cohortSubjectGroups.filter((group) => {
            if (!selectedYearId) {
                return true;
            }

            if (academicYearFilterMode === 'id') {
                return group.academic_year_id === selectedYearId;
            }

            if (academicYearFilterMode === 'name' && selectedYear) {
                return group.academic_year_name === null || group.academic_year_name === selectedYear.name;
            }

            return true;
        });

        if (!normalizedSearch) {
            return yearFilteredGroups;
        }

        return yearFilteredGroups.reduce<InstructorTeachingLoadGroup[]>((results, group) => {
            const groupMatches = [
                group.cohort_name,
                group.curriculum_name,
                group.academic_year_name,
                group.level,
                group.stream,
            ].some((value) => value?.toLowerCase().includes(normalizedSearch));

            if (groupMatches) {
                results.push(group);
                return results;
            }

            const matchingSubjects = group.subjects.filter((subject) => (
                subject.subject_name.toLowerCase().includes(normalizedSearch)
                || subject.subject_code?.toLowerCase().includes(normalizedSearch)
            ));

            if (matchingSubjects.length > 0) {
                results.push({
                    ...group,
                    subjects: matchingSubjects,
                });
            }

            return results;
        }, []);
    }, [academicYearFilterMode, cohortSubjectGroups, normalizedSearch, selectedYear, selectedYearId]);

    const assignedSubjectCount = useMemo(
        () => filteredGroups.reduce((count, group) => count + group.subjects.length, 0),
        [filteredGroups]
    );
    const currentYearCohortCount = useMemo(
        () => filteredGroups.filter((group) => group.is_current_year).length,
        [filteredGroups]
    );
    const isHistoricalView = selectedYear ? !selectedYear.is_current : false;
    const learnerCount = useMemo(
        () => filteredGroups.reduce((count, group) => count + (group.learner_count ?? 0), 0),
        [filteredGroups]
    );
    const assistantContext = useMemo(() => ({
        pageKey: 'my_classes_overview',
        pageTitle: 'My Teaching Load',
        state: {
            academic_year: selectedYear?.name ?? selectedYearId ?? null,
            is_empty: !loading && filteredGroups.length === 0,
            selected_cohort: filteredGroups[0]?.cohort_name ?? '',
            subject_count: assignedSubjectCount,
            learner_count: learnerCount,
            instructor_count: 1,
            role: 'INSTRUCTOR',
        },
        visibleActions: [
            ...(filteredGroups[0]
                ? [{
                    label: 'Open Cohort',
                    type: 'navigate' as const,
                    href: `/academic/cohorts/${filteredGroups[0].cohort_id}`,
                }]
                : []),
        ],
        nextSafeAction: filteredGroups[0]
            ? {
                label: 'Open Cohort',
                type: 'navigate' as const,
                href: `/academic/cohorts/${filteredGroups[0].cohort_id}`,
            }
            : undefined,
        workflowStep: filteredGroups.length > 0 ? 'open_assigned_class' : 'await_teaching_load',
        emptyStateReason: !loading && filteredGroups.length === 0
            ? 'No teaching assignments match the current academic year or search filters.'
            : undefined,
    }), [
        assignedSubjectCount,
        filteredGroups,
        learnerCount,
        loading,
        selectedYear?.name,
        selectedYearId,
    ]);

    useAssistantPageContext(assistantContext);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Teaching Load</h1>
                    <p className="mt-1 text-gray-500">
                        Your assigned classes and subjects for lesson preparation, teaching, learners, and follow-up work.
                    </p>
                </div>
            </div>

            {error && !isErrorDismissed && (
                <ErrorBanner message={error} onDismiss={() => setIsErrorDismissed(true)} />
            )}

            <DesktopOnly>
                <div className="grid gap-4 md:grid-cols-3">
                    <StatsCard title="Assigned Classes" value={filteredGroups.length} icon={GraduationCap} color="blue" />
                    <StatsCard title="Assigned Subjects" value={assignedSubjectCount} icon={BookOpen} color="green" />
                    <StatsCard title="Current Year Classes" value={currentYearCohortCount} icon={Users} color="yellow" />
                </div>
            </DesktopOnly>

            <Card>
                <div className="space-y-3">
                    <div className="flex flex-col gap-3 lg:flex-row">
                        <Select
                            value={selectedYearId?.toString() ?? ''}
                            onChange={(event) => updateFilters({ academic_year: event.target.value })}
                            disabled={!canFilterByAcademicYear}
                            options={buildAcademicYearOptions(
                                academicYears,
                                canFilterByAcademicYear
                                    ? 'All Academic Years'
                                    : 'Academic year filtering unavailable'
                            )}
                        />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search classes or subjects..."
                        />
                        {isHistoricalView && (
                            <div className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                <History className="h-3.5 w-3.5 shrink-0" />
                                Historical view — records are read-only
                            </div>
                        )}
                    </div>

                    {academicYearFilterNotice && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                            {academicYearFilterNotice}
                        </div>
                    )}

                    {missingCohortSubjectIdCount > 0 && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                            Learner links are unavailable for {missingCohortSubjectIdCount} teaching assignment{missingCohortSubjectIdCount === 1 ? '' : 's'} right now. If this stays missing, contact your administrator to confirm the class-subject assignment setup.
                        </div>
                    )}
                </div>
            </Card>

            {loading ? (
                <Card>
                    <LoadingSpinner fullScreen={false} />
                </Card>
            ) : filteredGroups.length === 0 ? (
                <Card>
                    <div className="py-12 text-center">
                        <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No teaching load found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {selectedYearId && canFilterByAcademicYear
                                ? 'No teaching assignments match the selected academic year.'
                                : normalizedSearch
                                    ? 'No teaching assignments match your search.'
                                    : 'Your teaching load is not assigned yet. Once your administrator assigns classes or subjects, your lessons, learners, and progress tools will appear here.'}
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredGroups.map((group) => (
                        <Card key={group.cohort_id}>
                            <div className="space-y-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="info">{group.curriculum_name}</Badge>
                                            {group.academic_year_name ? (
                                                <Badge variant="default">{group.academic_year_name}</Badge>
                                            ) : null}
                                            {!group.is_current_year ? (
                                                <Badge variant="default" size="sm">
                                                    <History className="mr-1 h-3 w-3" />
                                                    Historical
                                                </Badge>
                                            ) : null}
                                        </div>
                                        <div>
                                            <Link
                                                href={`/academic/cohorts/${group.cohort_id}`}
                                                className="text-lg font-semibold text-blue-600 hover:underline"
                                            >
                                                {group.cohort_name}
                                            </Link>
                                            <p className="mt-1 text-sm text-gray-500">
                                                {group.level
                                                    ? getAcademicLevelLabel(group.level, group.curriculum_type)
                                                    : 'Level not set'}
                                                {group.stream ? ` · Stream ${group.stream}` : ''}
                                            </p>
                                        </div>
                                    </div>

                                    <Link href={`/academic/cohorts/${group.cohort_id}`} className="w-full lg:w-auto">
                                        <Button variant="secondary" size="sm" className="w-full lg:w-auto">
                                            Open Cohort
                                        </Button>
                                    </Link>
                                </div>

                                <div className="grid gap-3">
                                    {group.subjects.map((subject) => (
                                        <div key={subject.teaching_key} className="rounded-xl border border-gray-200 p-4">
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                <div className="min-w-0 space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-base font-semibold text-gray-900">{subject.subject_name}</h3>
                                                        {subject.subject_code ? (
                                                            <Badge variant="info">{subject.subject_code}</Badge>
                                                        ) : null}
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                                                        {subject.academic_year_name ? (
                                                            <span>Academic Year: {subject.academic_year_name}</span>
                                                        ) : null}
                                                        {typeof subject.learner_count === 'number' ? (
                                                            <span>Cohort Learners: {subject.learner_count}</span>
                                                        ) : null}
                                                    </div>
                                                    {!subject.cohort_subject_id ? (
                                                        <p className="text-xs text-amber-700">
                                                            Learner management link unavailable until teaching load exposes a kernel cohort subject id for this assignment.
                                                        </p>
                                                    ) : null}
                                                </div>

                                                <div className="flex flex-col gap-2 sm:flex-row">
                                                    {subject.cohort_subject_id ? (
                                                        <Link
                                                            href={`/academic/cohort-subjects/${subject.cohort_subject_id}/learners`}
                                                            className="w-full sm:w-auto"
                                                        >
                                                            <Button size="sm" className="w-full sm:w-auto">
                                                                View Learners
                                                            </Button>
                                                        </Link>
                                                    ) : (
                                                        <Button size="sm" className="w-full sm:w-auto" disabled>
                                                            View Learners
                                                        </Button>
                                                    )}
                                                    <Link
                                                        href={subject.cohort_subject_id
                                                            ? `/sessions?cohort_subject=${subject.cohort_subject_id}`
                                                            : `/sessions?cohort=${group.cohort_id}`}
                                                        className="w-full sm:w-auto"
                                                    >
                                                        <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                                                            Sessions
                                                        </Button>
                                                    </Link>
                                                    <Link
                                                        href={subject.cohort_subject_id
                                                            ? `/assessments?cohort_subject=${subject.cohort_subject_id}`
                                                            : '/assessments'}
                                                        className="w-full sm:w-auto"
                                                    >
                                                        <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                                                            Assessments
                                                        </Button>
                                                    </Link>
                                                    <Link
                                                        href={subject.cohort_subject_id
                                                            ? `/academic/cohorts/${group.cohort_id}/assignments?cohort_subject=${subject.cohort_subject_id}`
                                                            : `/academic/cohorts/${group.cohort_id}/assignments`}
                                                        className="w-full sm:w-auto"
                                                    >
                                                        <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                                                            <ClipboardList className="mr-1 h-4 w-4" />
                                                            Assignments
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

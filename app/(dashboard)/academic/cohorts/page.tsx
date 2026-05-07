'use client';

// ============================================================================
// app/(dashboard)/academic/cohorts/page.tsx
//
// Responsibility: branch by role, fetch via hooks, manage state, compose
// components, render. No direct kernel cohort listing for instructors.
// ============================================================================

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    BookOpen,
    Edit,
    Eye,
    GraduationCap,
    History,
    Plus,
    RotateCcw,
    Trash2,
    Users,
} from 'lucide-react';
import { useAcademicYears, useCohorts, useCurricula } from '@/app/core/hooks/useAcademic';
import {
    type InstructorAcademicYearFilterMode,
    type InstructorTeachingLoadGroup,
    useInstructorMyCohorts,
} from '@/app/core/hooks/useInstructorMyCohorts';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { DataTable, type Column } from '@/app/components/ui/Table';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { CohortFormModal, RolloverModal } from '@/app/core/components/cohorts/CohortComponents';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import { CURRICULUM_TYPE_OPTIONS } from '@/app/core/types/academic';
import type { Cohort, CurriculumType } from '@/app/core/types/academic';
import { DesktopOnly } from '@/app/core/components/DesktopOnly';
import { usePersistedFilters } from '@/app/core/hooks/usePersistedFilters';
import { useCambridgeOffering } from '@/app/plugins/cambridge/hooks';
import { useAuth } from '@/app/context/AuthContext';
import {
    CAMBRIDGE_BRIDGE_NAME,
    getCurriculumBridgeName,
    getCurriculumOptionLabel,
    isCambridgeCurriculum,
} from '@/app/core/lib/curriculumBridge';

type CohortWithIndex = Record<string, unknown> & Cohort;

function parseOptionalNumber(value: string | number | null | undefined): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function buildAcademicYearOptions(
    academicYears: Array<{ id: number; name: string; is_current: boolean }>,
    emptyLabel = 'All Academic Years'
) {
    return [
        { value: '', label: emptyLabel },
        ...academicYears.map((academicYear) => ({
            value: String(academicYear.id),
            label: academicYear.is_current
                ? `${academicYear.name} (Current)`
                : `${academicYear.name} — Historical`,
        })),
    ];
}

function getInstructorAcademicYearFilterNotice(
    academicYearFilterMode: InstructorAcademicYearFilterMode
): string | null {
    if (academicYearFilterMode === 'id') {
        return null;
    }

    if (academicYearFilterMode === 'name') {
        return 'Academic year filtering is matched by year name because /users/my_teaching_load/ does not currently expose academic_year_id in cohort_assignments.';
    }

    return 'Academic year filtering is unavailable because /users/my_teaching_load/ does not currently expose academic year metadata in cohort_assignments.';
}

function AdminCohortsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { academicYears } = useAcademicYears();
    const { curricula, createCurriculum } = useCurricula();
    const [filters, updateFilters] = usePersistedFilters('/academic/cohorts', {
        academic_year: '',
        curriculum: '',
    });
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
    const [rolloverCohort, setRolloverCohort] = useState<Cohort | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const [isProvisioningQuickActionCurriculum, setIsProvisioningQuickActionCurriculum] = useState(false);

    const currentYear = useMemo(
        () => academicYears.find((academicYear) => academicYear.is_current),
        [academicYears]
    );
    const selectedYearId = parseOptionalNumber(filters.academic_year);
    const selectedCurriculumId = parseOptionalNumber(filters.curriculum);
    const shouldOpenCreate = searchParams.get('create') === '1';
    const returnTo = searchParams.get('returnTo');
    const quickActionCurriculumType = searchParams.get('curriculum_type') as CurriculumType | null;
    const isCambridgeQuickAction = Boolean(returnTo?.startsWith('/cambridge/'));
    const quickActionOfferingId = useMemo(() => {
        if (!returnTo) return null;

        const match = returnTo.match(/\/cambridge\/offerings\/(\d+)\/cohorts/);
        return match ? Number(match[1]) : null;
    }, [returnTo]);
    const { data: quickActionOffering, isLoading: quickActionOfferingLoading } = useCambridgeOffering(
        isCambridgeQuickAction && !quickActionCurriculumType ? quickActionOfferingId : null
    );
    const resolvedQuickActionCurriculumType = quickActionCurriculumType
        ?? (quickActionOffering?.programme_code as CurriculumType | undefined)
        ?? null;
    const quickActionCurriculum = useMemo(() => {
        if (selectedCurriculumId) {
            return curricula.find((curriculum) => curriculum.id === selectedCurriculumId) ?? null;
        }
        if (isCambridgeQuickAction) {
            return curricula.find((curriculum) => curriculum.is_active && isCambridgeCurriculum(curriculum)) ?? null;
        }
        if (!resolvedQuickActionCurriculumType) {
            return null;
        }

        return curricula.find(
            (curriculum) => curriculum.is_active && curriculum.curriculum_type === resolvedQuickActionCurriculumType
        ) ?? null;
    }, [curricula, isCambridgeQuickAction, resolvedQuickActionCurriculumType, selectedCurriculumId]);
    const quickActionCurriculumName = useMemo(() => {
        if (isCambridgeQuickAction) {
            return CAMBRIDGE_BRIDGE_NAME;
        }
        if (!resolvedQuickActionCurriculumType) {
            return CAMBRIDGE_BRIDGE_NAME;
        }

        return CURRICULUM_TYPE_OPTIONS.find(
            (option) => option.value === resolvedQuickActionCurriculumType
        )?.label ?? resolvedQuickActionCurriculumType;
    }, [isCambridgeQuickAction, resolvedQuickActionCurriculumType]);

    useEffect(() => {
        if (currentYear && !filters.academic_year) {
            updateFilters({ academic_year: String(currentYear.id) });
        }
    }, [currentYear, filters.academic_year, updateFilters]);

    useEffect(() => {
        if (
            isCambridgeQuickAction &&
            quickActionCurriculum &&
            filters.curriculum !== String(quickActionCurriculum.id)
        ) {
            updateFilters({ curriculum: String(quickActionCurriculum.id) });
        }
    }, [filters.curriculum, isCambridgeQuickAction, quickActionCurriculum, updateFilters]);

    useEffect(() => {
        const shouldProvision =
            isCambridgeQuickAction
            && shouldOpenCreate
            && !selectedCurriculumId
            && !quickActionCurriculum
            && !isProvisioningQuickActionCurriculum
            && Boolean(resolvedQuickActionCurriculumType)
            && !quickActionOfferingLoading;

        if (!shouldProvision) {
            return;
        }

        let cancelled = false;

        const provisionCurriculum = async () => {
            setIsProvisioningQuickActionCurriculum(true);
            setPageError(null);
            try {
                const createdCurriculum = await createCurriculum({
                    name: quickActionCurriculumName,
                    curriculum_type: resolvedQuickActionCurriculumType as CurriculumType,
                    description: '',
                    is_active: true,
                });
                if (!cancelled) {
                    updateFilters({ curriculum: String(createdCurriculum.id) });
                }
            } catch (err) {
                if (!cancelled) {
                    setPageError(
                        extractErrorMessage(
                            err as ApiError,
                            'Failed to prepare the Cambridge curriculum for cohort creation.'
                        )
                    );
                }
            } finally {
                if (!cancelled) {
                    setIsProvisioningQuickActionCurriculum(false);
                }
            }
        };

        void provisionCurriculum();

        return () => {
            cancelled = true;
        };
    }, [
        createCurriculum,
        isCambridgeQuickAction,
        isProvisioningQuickActionCurriculum,
        quickActionCurriculum,
        quickActionCurriculumName,
        quickActionOfferingLoading,
        resolvedQuickActionCurriculumType,
        selectedCurriculumId,
        shouldOpenCreate,
        updateFilters,
    ]);

    const { cohorts, loading, refetch, createCohort, updateCohort, deleteCohort } = useCohorts({
        ...(selectedYearId ? { academic_year: selectedYearId } : {}),
        ...(selectedCurriculumId ? { curriculum: selectedCurriculumId } : {}),
    });

    const selectedYear = academicYears.find((academicYear) => academicYear.id === selectedYearId);
    const selectedCurriculum = curricula.find((curriculum) => curriculum.id === selectedCurriculumId);
    const isHistoricalView = selectedYear ? !selectedYear.is_current : false;
    const totalStudents = cohorts.reduce(
        (studentCount, cohort) => studentCount + (cohort.students_count ?? 0),
        0
    );

    const openCreate = () => {
        setEditingCohort(null);
        setShowFormModal(true);
    };
    const openEdit = (cohort: Cohort) => {
        setEditingCohort(cohort);
        setShowFormModal(true);
    };
    const clearCreateFlag = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('create');
        const nextQuery = params.toString();
        router.replace(nextQuery ? `/academic/cohorts?${nextQuery}` : '/academic/cohorts', { scroll: false });
    };
    const closeModal = () => {
        setShowFormModal(false);
        setEditingCohort(null);
        if (shouldOpenCreate) {
            clearCreateFlag();
        }
    };

    const quickActionSetupPending = isCambridgeQuickAction && (
        quickActionOfferingLoading
        || isProvisioningQuickActionCurriculum
        || (!quickActionCurriculum && Boolean(resolvedQuickActionCurriculumType))
    );

    useEffect(() => {
        if (shouldOpenCreate && !editingCohort && !quickActionSetupPending) {
            setShowFormModal(true);
        }
    }, [editingCohort, quickActionSetupPending, shouldOpenCreate]);

    const handleSave = async (
        data: { academic_year: string; curriculum: string; level: string; stream: string },
        isEdit: boolean,
        cohortId?: number
    ) => {
        const payload = {
            academic_year: Number(data.academic_year),
            curriculum: Number(data.curriculum),
            level: data.level,
            stream: data.stream || undefined,
        };

        if (isEdit && cohortId) {
            await updateCohort(cohortId, payload);
            return;
        }

        await createCohort(payload);
    };

    const handleDelete = async (cohort: Cohort) => {
        if (!confirm(`Delete cohort "${cohort.name}"? This will affect all enrolled students.`)) {
            return;
        }

        setPageError(null);
        try {
            await deleteCohort(cohort.id);
        } catch (err) {
            setPageError(extractErrorMessage(err as ApiError, 'Failed to delete cohort.'));
        }
    };

    const initialFormData = useMemo(() => ({
        academic_year: editingCohort
            ? String(editingCohort.academic_year)
            : currentYear
                ? String(currentYear.id)
                : '',
        curriculum: editingCohort
            ? String(editingCohort.curriculum)
            : selectedCurriculumId
                ? String(selectedCurriculumId)
                : quickActionCurriculum
                    ? String(quickActionCurriculum.id)
                    : '',
        level: editingCohort?.level ?? '',
        stream: editingCohort?.stream ?? '',
    }), [
        currentYear,
        editingCohort,
        quickActionCurriculum,
        selectedCurriculumId,
    ]);

    const columns: Column<Cohort>[] = [
        {
            key: 'name',
            header: 'Cohort',
            sortable: true,
            render: (cohort) => (
                <div className="flex items-center gap-2">
                    <Link
                        href={`/academic/cohorts/${cohort.id}`}
                        className="font-medium text-blue-600 hover:underline"
                    >
                        {cohort.name}
                    </Link>
                    {!cohort.is_current_year && (
                        <Badge variant="default" size="sm">
                            <History className="mr-1 h-3 w-3" />
                            Historical
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            key: 'academic_year_name',
            header: 'Academic Year',
            sortable: true,
            render: (cohort) => (
                <span className={cohort.is_current_year ? 'font-medium text-gray-900' : 'text-gray-400'}>
                    {cohort.academic_year_name}
                </span>
            ),
        },
        {
            key: 'curriculum_name',
            header: 'Curriculum',
            render: (cohort) => <Badge variant="info">{getCurriculumBridgeName(cohort)}</Badge>,
        },
        { key: 'level', header: 'Level', sortable: true },
        {
            key: 'stream',
            header: 'Stream',
            render: (cohort) => <span className="text-gray-500">{cohort.stream || '—'}</span>,
        },
        {
            key: 'students_count',
            header: 'Students',
            sortable: true,
            render: (cohort) => (
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{cohort.students_count ?? 0}</span>
                </div>
            ),
        },
        {
            key: 'subjects_count',
            header: 'Subjects',
            render: (cohort) => <Badge variant="default">{cohort.subjects_count ?? 0}</Badge>,
        },
        {
            key: 'actions',
            header: '',
            render: (cohort) => {
                const isHistoricalCohort = !cohort.is_current_year;
                return (
                    <div className="flex justify-end gap-1">
                        {isHistoricalCohort ? (
                            <>
                                <Link href={`/academic/cohorts/${cohort.id}/students`}>
                                    <Button size="sm" variant="ghost">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </Link>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setRolloverCohort(cohort)}
                                >
                                    <RotateCcw className="h-4 w-4 text-blue-500" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button size="sm" variant="ghost" onClick={() => openEdit(cohort)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDelete(cohort)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            </>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Cohorts</h1>
                    <p className="mt-1 text-gray-500">
                        {isHistoricalView
                            ? 'Viewing historical records — read only'
                            : 'Manage student cohorts and classes'}
                    </p>
                </div>
                {!isHistoricalView && (
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Cohort
                    </Button>
                )}
            </div>

            {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

            {returnTo ? (
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">Cambridge Setup Flow</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Create the cohort. The matching Cambridge curriculum will be used automatically, then return to the offering assignment.
                            </p>
                            {quickActionSetupPending ? (
                                <p className="mt-2 text-xs text-gray-500">
                                    Preparing the Cambridge curriculum for this cohort...
                                </p>
                            ) : null}
                        </div>
                        <Link href={returnTo} className="text-sm text-blue-600 hover:text-blue-700">
                            Return to Cambridge offering
                        </Link>
                    </div>
                </Card>
            ) : null}

            <DesktopOnly>
                <div className="grid gap-4 md:grid-cols-3">
                    <StatsCard title="Total Cohorts" value={cohorts.length} icon={GraduationCap} color="blue" />
                    <StatsCard title="Total Students" value={totalStudents} icon={Users} color="green" />
                    <StatsCard
                        title="Avg per Cohort"
                        value={cohorts.length > 0 ? Math.round(totalStudents / cohorts.length) : 0}
                        icon={Users}
                        color="yellow"
                    />
                </div>
            </DesktopOnly>

            <Card>
                <div className="flex items-center gap-3">
                    <Select
                        value={selectedYearId?.toString() ?? ''}
                        onChange={(event) => updateFilters({ academic_year: event.target.value })}
                        options={buildAcademicYearOptions(academicYears)}
                    />
                    <Select
                        value={selectedCurriculumId?.toString() ?? ''}
                        onChange={(event) => updateFilters({ curriculum: event.target.value })}
                        options={[
                            { value: '', label: 'All Curricula' },
                            ...curricula
                                .filter((curriculum) => curriculum.is_active)
                                .map((curriculum) => ({
                                    value: String(curriculum.id),
                                    label: getCurriculumOptionLabel(curriculum),
                                })),
                        ]}
                    />
                    {isHistoricalView && (
                        <div className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                            <History className="h-3.5 w-3.5 shrink-0" />
                            Historical view — records are read-only
                        </div>
                    )}
                </div>
            </Card>

            <Card>
                {loading ? (
                    <LoadingSpinner fullScreen={false} />
                ) : cohorts.length === 0 ? (
                    <div className="py-12 text-center">
                        <GraduationCap className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No cohorts found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {isHistoricalView
                                ? 'No cohorts exist for this academic year.'
                                : selectedCurriculum
                                    ? `No cohorts exist yet for ${getCurriculumBridgeName(selectedCurriculum)}.`
                                    : 'Get started by creating a new cohort.'}
                        </p>
                        {!isHistoricalView && (
                            <Button className="mt-4" onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Cohort
                            </Button>
                        )}
                    </div>
                ) : (
                    <DataTable
                        data={cohorts as CohortWithIndex[]}
                        columns={columns}
                        enableSearch
                        enableSort
                        searchPlaceholder="Search cohorts..."
                        emptyMessage="No cohorts found"
                        onSort={() => {}}
                    />
                )}
            </Card>

            <CohortFormModal
                isOpen={showFormModal}
                onClose={closeModal}
                editingCohort={editingCohort}
                academicYears={academicYears}
                curricula={curricula}
                lockedCurriculum={isCambridgeQuickAction ? quickActionCurriculum : null}
                onSave={handleSave}
                initialData={initialFormData}
            />

            {rolloverCohort && (
                <RolloverModal
                    cohort={rolloverCohort}
                    onClose={() => setRolloverCohort(null)}
                    onSuccess={refetch}
                />
            )}
        </div>
    );
}

function InstructorMyCohortsPageContent() {
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Cohorts</h1>
                    <p className="mt-1 text-gray-500">
                        Assigned cohort subjects grouped by cohort for teaching, learner access, and follow-up actions.
                    </p>
                </div>
            </div>

            {error && !isErrorDismissed && (
                <ErrorBanner message={error} onDismiss={() => setIsErrorDismissed(true)} />
            )}

            <DesktopOnly>
                <div className="grid gap-4 md:grid-cols-3">
                    <StatsCard title="Assigned Cohorts" value={filteredGroups.length} icon={GraduationCap} color="blue" />
                    <StatsCard title="Assigned Subjects" value={assignedSubjectCount} icon={BookOpen} color="green" />
                    <StatsCard title="Current Year Cohorts" value={currentYearCohortCount} icon={Users} color="yellow" />
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
                            placeholder="Search cohorts or subjects..."
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
                            View Learners links are unavailable for {missingCohortSubjectIdCount} teaching assignment{missingCohortSubjectIdCount === 1 ? '' : 's'} because <code>/users/my_teaching_load/</code> does not expose a kernel <code>cohort_subject_id</code> for those rows.
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
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No cohort subjects found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {selectedYearId && canFilterByAcademicYear
                                ? 'No assigned cohort subjects match the selected academic year.'
                                : normalizedSearch
                                    ? 'No assigned cohort subjects match your search.'
                                    : 'No cohort subject teaching assignments are currently available.'}
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
                                                {group.level ?? 'Level not set'}
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

export default function CohortsPage() {
    const { activeRole, loading: authLoading } = useAuth();

    if (authLoading) {
        return <LoadingSpinner fullScreen={false} />;
    }

    if (!activeRole) {
        return null;
    }

    return activeRole === 'INSTRUCTOR'
        ? <InstructorMyCohortsPageContent />
        : <AdminCohortsPageContent />;
}

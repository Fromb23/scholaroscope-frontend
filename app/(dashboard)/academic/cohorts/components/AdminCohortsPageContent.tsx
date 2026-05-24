'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Edit,
    Eye,
    GraduationCap,
    History,
    Plus,
    RotateCcw,
    Trash2,
    Users,
} from 'lucide-react';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { DataTable, type Column } from '@/app/components/ui/Table';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { useAcademicYears, useCohorts, useCurricula } from '@/app/core/hooks/useAcademic';
import { usePersistedFilters } from '@/app/core/hooks/usePersistedFilters';
import { useAssistantPageContext } from '@/app/core/components/assistant/useAssistantPageContext';
import { DesktopOnly } from '@/app/core/components/DesktopOnly';
import { CohortFormModal, RolloverModal } from '@/app/core/components/cohorts/CohortComponents';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { Cohort } from '@/app/core/types/academic';
import { getCurriculumBridgeName, getCurriculumOptionLabel } from '@/app/core/lib/curriculumBridge';
import { useCambridgeCohortQuickAction } from '@/app/plugins/cambridge/lib/cohortQuickAction';
import { buildAcademicYearOptions, parseOptionalNumber } from '@/app/(dashboard)/academic/cohorts/components/cohortsPageShared';

type CohortWithIndex = Record<string, unknown> & Cohort;

export function AdminCohortsPageContent() {
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

    const currentYear = useMemo(
        () => academicYears.find((academicYear) => academicYear.is_current),
        [academicYears]
    );
    const selectedYearId = parseOptionalNumber(filters.academic_year);
    const selectedCurriculumId = parseOptionalNumber(filters.curriculum);
    const shouldOpenCreate = searchParams.get('create') === '1';
    const quickAction = useCambridgeCohortQuickAction({
        searchParams,
        curricula,
        selectedCurriculumId,
        shouldOpenCreate,
        createCurriculum,
        updateFilters,
    });

    useEffect(() => {
        if (currentYear && !filters.academic_year) {
            updateFilters({ academic_year: String(currentYear.id) });
        }
    }, [currentYear, filters.academic_year, updateFilters]);

    const {
        cohorts,
        loading,
        refetch,
        createCohort,
        updateCohort,
        deleteCohort,
    } = useCohorts({
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
    const totalSubjects = cohorts.reduce(
        (subjectCount, cohort) => subjectCount + (cohort.subjects_count ?? 0),
        0
    );
    const assistantAcademicYear = selectedYear?.name ?? (selectedYearId === null ? null : String(selectedYearId));
    const cohortCount = cohorts.length;
    const firstCohort = cohorts[0];
    const firstCohortId = firstCohort?.id;
    const firstCohortName = firstCohort?.name ?? '';

    const openCreate = useCallback(() => {
        setEditingCohort(null);
        setShowFormModal(true);
    }, []);

    const openEdit = useCallback((cohort: Cohort) => {
        setEditingCohort(cohort);
        setShowFormModal(true);
    }, []);

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

    useEffect(() => {
        if (shouldOpenCreate && !editingCohort && !quickAction.setupPending) {
            setShowFormModal(true);
        }
    }, [editingCohort, quickAction.setupPending, shouldOpenCreate]);

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
        } catch (error) {
            setPageError(extractErrorMessage(error as ApiError, 'Failed to delete cohort.'));
        }
    };

    const initialFormData = {
        academic_year: editingCohort
            ? String(editingCohort.academic_year)
            : currentYear
                ? String(currentYear.id)
                : '',
        curriculum: editingCohort
            ? String(editingCohort.curriculum)
            : selectedCurriculumId
                ? String(selectedCurriculumId)
                : quickAction.curriculum
                    ? String(quickAction.curriculum.id)
                    : '',
        level: editingCohort?.level ?? '',
        stream: editingCohort?.stream ?? '',
    };

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
    const assistantContext = useMemo(() => ({
        pageKey: 'academic_cohorts_overview',
        pageTitle: 'Cohorts',
        state: {
            academic_year: assistantAcademicYear,
            is_empty: !loading && cohortCount === 0,
            selected_cohort: firstCohortName,
            subject_count: totalSubjects,
            learner_count: totalStudents,
            instructor_count: null,
            role: 'ADMIN',
        },
        visibleActions: [
            ...(!isHistoricalView
                ? [{
                    label: 'Add Cohort',
                    type: 'page_action' as const,
                    target: 'open_add_cohort',
                    handler: openCreate,
                }]
                : []),
            ...(firstCohortId
                ? [{
                    label: 'Open Cohort',
                    type: 'navigate' as const,
                    href: `/academic/cohorts/${firstCohortId}`,
                }]
                : []),
        ],
        nextSafeAction: !isHistoricalView
            ? {
                label: 'Add Cohort',
                type: 'page_action' as const,
                target: 'open_add_cohort',
                handler: openCreate,
            }
            : (firstCohortId
                ? {
                    label: 'Open Cohort',
                    type: 'navigate' as const,
                    href: `/academic/cohorts/${firstCohortId}`,
                }
                : undefined),
        workflowStep: isHistoricalView ? 'review_historical_cohorts' : 'manage_cohorts',
        emptyStateReason: !loading && cohortCount === 0
            ? 'No cohorts match the current academic year or curriculum filters.'
            : undefined,
    }), [
        assistantAcademicYear,
        cohortCount,
        firstCohortId,
        firstCohortName,
        isHistoricalView,
        loading,
        openCreate,
        totalStudents,
        totalSubjects,
    ]);

    useAssistantPageContext(assistantContext);

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

            {(pageError || quickAction.error) && (
                <ErrorBanner
                    message={pageError ?? quickAction.error ?? ''}
                    onDismiss={() => {
                        setPageError(null);
                        quickAction.clearError();
                    }}
                />
            )}

            {quickAction.returnTo ? (
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">{quickAction.noticeTitle}</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                {quickAction.noticeDescription}
                            </p>
                            {quickAction.setupPending ? (
                                <p className="mt-2 text-xs text-gray-500">
                                    {quickAction.pendingMessage}
                                </p>
                            ) : null}
                        </div>
                        <Link href={quickAction.returnTo} className="text-sm text-blue-600 hover:text-blue-700">
                            {quickAction.returnLabel}
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
                lockedCurriculum={quickAction.isActive ? quickAction.curriculum : null}
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

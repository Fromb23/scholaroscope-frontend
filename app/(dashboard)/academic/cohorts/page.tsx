'use client';

// ============================================================================
// app/(dashboard)/academic/cohorts/page.tsx
//
// Responsibility: fetch data, handle state, compose components, render.
// No inline component definitions. No any.
// ============================================================================

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Users, Plus, Edit, Trash2, GraduationCap,
    History, RotateCcw, Eye,
} from 'lucide-react';
import { useCohorts, useAcademicYears, useCurricula } from '@/app/core/hooks/useAcademic';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Select } from '@/app/components/ui/Select';
import { DataTable, Column } from '@/app/components/ui/Table';
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

type CohortWithIndex = { [key: string]: unknown } & Cohort;

export default function CohortsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { academicYears } = useAcademicYears();
    const { curricula, createCurriculum } = useCurricula();
    const [filters, updateFilters] = usePersistedFilters('/academic/cohorts', {
        academic_year: '',
        curriculum: '',
    });

    const currentYear = useMemo(() => academicYears.find(y => y.is_current), [academicYears]);
    const selectedYearId = filters.academic_year ? Number(filters.academic_year) : undefined;
    const selectedCurriculumId = filters.curriculum ? Number(filters.curriculum) : undefined;
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
            return curricula.find(c => c.id === selectedCurriculumId) ?? null;
        }
        if (!resolvedQuickActionCurriculumType) {
            return null;
        }
        return curricula.find(
            c => c.is_active && c.curriculum_type === resolvedQuickActionCurriculumType
        ) ?? null;
    }, [curricula, resolvedQuickActionCurriculumType, selectedCurriculumId]);
    const quickActionCurriculumName = useMemo(() => {
        if (quickActionOffering?.programme_title) {
            return quickActionOffering.programme_title;
        }
        if (!resolvedQuickActionCurriculumType) {
            return 'Cambridge Curriculum';
        }
        return CURRICULUM_TYPE_OPTIONS.find(
            option => option.value === resolvedQuickActionCurriculumType
        )?.label ?? resolvedQuickActionCurriculumType;
    }, [quickActionOffering?.programme_title, resolvedQuickActionCurriculumType]);
    const [isProvisioningQuickActionCurriculum, setIsProvisioningQuickActionCurriculum] = useState(false);

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
                const created = await createCurriculum({
                    name: quickActionCurriculumName,
                    curriculum_type: resolvedQuickActionCurriculumType as CurriculumType,
                    description: quickActionOffering?.programme_title
                        ? `${quickActionOffering.programme_title} quick-action curriculum`
                        : '',
                    is_active: true,
                });
                if (!cancelled) {
                    updateFilters({ curriculum: String(created.id) });
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
        quickActionOffering?.programme_title,
        quickActionOfferingLoading,
        resolvedQuickActionCurriculumType,
        selectedCurriculumId,
        shouldOpenCreate,
        updateFilters,
    ]);

    const { cohorts, loading, refetch, createCohort, updateCohort, deleteCohort } = useCohorts(
        {
            ...(selectedYearId ? { academic_year: selectedYearId } : {}),
            ...(selectedCurriculumId ? { curriculum: selectedCurriculumId } : {}),
        }
    );

    const [showFormModal, setShowFormModal] = useState(false);
    const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
    const [rolloverCohort, setRolloverCohort] = useState<Cohort | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);

    const selectedYear = academicYears.find(y => y.id === selectedYearId);
    const selectedCurriculum = curricula.find(c => c.id === selectedCurriculumId);
    const isHistoricalView = selectedYear ? !selectedYear.is_current : false;
    const totalStudents = cohorts.reduce((sum, c) => sum + (c.students_count ?? 0), 0);

    const openCreate = () => { setEditingCohort(null); setShowFormModal(true); };
    const openEdit = (c: Cohort) => { setEditingCohort(c); setShowFormModal(true); };
    const clearCreateFlag = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('create');
        const next = params.toString();
        router.replace(next ? `/academic/cohorts?${next}` : '/academic/cohorts', { scroll: false });
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
        } else {
            await createCohort(payload);
        }
    };

    const handleDelete = async (cohort: Cohort) => {
        if (!confirm(`Delete cohort "${cohort.name}"? This will affect all enrolled students.`)) return;
        setPageError(null);
        try {
            await deleteCohort(cohort.id);
        } catch (err) {
            setPageError(extractErrorMessage(err as ApiError, 'Failed to delete cohort.'));
        }
    };

    const initialFormData = useMemo(() => ({
        academic_year: editingCohort ? String(editingCohort.academic_year) : currentYear ? String(currentYear.id) : '',
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

    // ── Table columns ─────────────────────────────────────────────────────

    const columns: Column<Cohort>[] = [
        {
            key: 'name', header: 'Cohort', sortable: true,
            render: cohort => (
                <div className="flex items-center gap-2">
                    <Link href={`/academic/cohorts/${cohort.id}/students`} className="font-medium text-blue-600 hover:underline">
                        {cohort.name}
                    </Link>
                    {!cohort.is_current_year && (
                        <Badge variant="default" size="sm"><History className="h-3 w-3 mr-1" />Historical</Badge>
                    )}
                </div>
            ),
        },
        {
            key: 'academic_year_name', header: 'Academic Year', sortable: true,
            render: cohort => (
                <span className={cohort.is_current_year ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                    {cohort.academic_year_name}
                </span>
            ),
        },
        { key: 'curriculum_name', header: 'Curriculum', render: c => <Badge variant="info">{c.curriculum_name}</Badge> },
        { key: 'level', header: 'Level', sortable: true },
        { key: 'stream', header: 'Stream', render: c => <span className="text-gray-500">{c.stream || '—'}</span> },
        {
            key: 'students_count', header: 'Students', sortable: true,
            render: c => (
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="font-medium">{c.students_count ?? 0}</span>
                </div>
            ),
        },
        { key: 'subjects_count', header: 'Subjects', render: c => <Badge variant="default">{c.subjects_count ?? 0}</Badge> },
        {
            key: 'actions', header: '',
            render: cohort => {
                const isHistorical = !cohort.is_current_year;
                return (
                    <div className="flex gap-1 justify-end">
                        {isHistorical ? (
                            <>
                                <Link href={`/academic/cohorts/${cohort.id}/students`}>
                                    <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                                </Link>
                                <Button size="sm" variant="ghost" onClick={() => setRolloverCohort(cohort)}>
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

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Cohorts</h1>
                    <p className="mt-1 text-gray-500">
                        {isHistoricalView ? 'Viewing historical records — read only' : 'Manage student cohorts and classes'}
                    </p>
                </div>
                {!isHistoricalView && (
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" />Add Cohort
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
                    <StatsCard title="Avg per Cohort" value={cohorts.length > 0 ? Math.round(totalStudents / cohorts.length) : 0} icon={Users} color="yellow" />
                </div>
            </DesktopOnly>

            <Card>
                <div className="flex items-center gap-3">
                    <Select
                        value={selectedYearId?.toString() ?? ''}
                        onChange={e => updateFilters({ academic_year: e.target.value })}
                        options={[
                            { value: '', label: 'All Academic Years' },
                            ...academicYears.map(y => ({
                                value: String(y.id),
                                label: y.is_current ? `${y.name} (Current)` : `${y.name} — Historical`,
                            })),
                        ]}
                    />
                    <Select
                        value={selectedCurriculumId?.toString() ?? ''}
                        onChange={e => updateFilters({ curriculum: e.target.value })}
                        options={[
                            { value: '', label: 'All Curricula' },
                            ...curricula
                                .filter(c => c.is_active)
                                .map(c => ({
                                    value: String(c.id),
                                    label: `${c.name} · ${c.curriculum_type_display}`,
                                })),
                        ]}
                    />
                    {isHistoricalView && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 whitespace-nowrap">
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
                                    ? `No cohorts exist yet for ${selectedCurriculum.name}.`
                                    : 'Get started by creating a new cohort.'}
                        </p>
                        {!isHistoricalView && (
                            <Button className="mt-4" onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" />Add Cohort
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
                        onSort={() => { }}
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

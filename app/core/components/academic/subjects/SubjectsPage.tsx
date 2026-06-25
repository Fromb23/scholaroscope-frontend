'use client';

import { BookOpen, ChevronDown, ChevronRight, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import {
    ButtonPendingContent,
    CardSkeleton,
    PageSkeleton,
    SectionLoading,
} from '@/app/components/ui/loading';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { AcademicSetupGate } from '@/app/core/components/academic/setup/AcademicSetupGate';
import { AssignSubjectToCohortModal } from '@/app/core/components/academic/AssignSubjectToCohortModal';
import {
    CurriculumGroup,
    SubjectFormModal,
} from '@/app/core/components/academic/SubjectComponents';
import { useAcademicSetupStatus } from '@/app/core/hooks/useAcademicSetupStatus';
import { useSubjectsPage } from '@/app/core/hooks/academic/useSubjectsPage';
import { subjectOfferingAPI } from '@/app/core/api/academic';
import {
    getAcademicSetupPageState,
    withAcademicSetupMode,
} from '@/app/core/lib/academicSetup';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { SubjectCatalogItem } from '@/app/core/types/academic';
import {
    canRemove,
    canRestore,
    catalogRowLabel,
    contentReadinessLabel,
    formatCatalogLevel,
    getCatalogStatus,
    groupRowsByLevel,
    isContentReady,
    isDroppedHistoricalOffering,
    isScheduledRemoval,
    isSetupReadyWorkspaceOffering,
    isWorkspaceOffering,
    matchesCatalogSearch,
    statusBadgeVariant,
    statusLabel,
    uniqueCatalogLevels,
} from './subjectCatalogUtils';

function catalogueHref(curriculumId: number, level?: string): string {
    const params = new URLSearchParams({
        curriculum: String(curriculumId),
        returnTo: '/academic/subjects',
    });
    if (level) {
        params.set('level', level);
    }
    return `/academic/subjects/catalogue?${params.toString()}`;
}

export function SubjectsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const setupMode = searchParams.get('setup') === '1';
    const blockedNotice = searchParams.get('blocked') === '1';
    const requestedLevel = searchParams.get('level');
    const setupStatusQuery = useAcademicSetupStatus({ enabled: setupMode });
    const {
        subjects,
        loading,
        curricula,
        search,
        isModalOpen,
        editing,
        pageError,
        addingLevelTo,
        assigningSubject,
        canManageSubjects,
        grouped,
        isCurriculumExpanded,
        isSubjectExpanded,
        setSearch,
        setPageError,
        setAssigningSubject,
        openCreate,
        openAddLevel,
        openEdit,
        toggleCurriculum,
        toggleSubject,
        closeModal,
        handleSave: saveSubject,
        handleDelete,
    } = useSubjectsPage();
    const setupStatus = setupStatusQuery.data ?? null;
    const setupPageState = getAcademicSetupPageState(setupStatus, 'SUBJECTS');
    const selectedCurriculumId = Number(searchParams.get('curriculum') ?? '') || null;
    const activeCurriculum = useMemo(() => {
        if (selectedCurriculumId) {
            return curricula.find((curriculum) => curriculum.id === selectedCurriculumId) ?? null;
        }
        return curricula.find((curriculum) => curriculum.is_active) ?? curricula[0] ?? null;
    }, [curricula, selectedCurriculumId]);
    const pluginManaged = activeCurriculum?.source === 'plugin';
    const customCurricula = curricula.filter((curriculum) => curriculum.source !== 'plugin');
    const [catalog, setCatalog] = useState<SubjectCatalogItem[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);
    const [catalogActionId, setCatalogActionId] = useState<string | null>(null);
    const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [setupActionMessage, setSetupActionMessage] = useState<string | null>(null);
    const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());

    const loadCatalog = async () => {
        if (!pluginManaged || !activeCurriculum) {
            setCatalog([]);
            return;
        }
        setCatalogLoading(true);
        try {
            setCatalog(await subjectOfferingAPI.getCatalog(activeCurriculum.id));
        } catch (error) {
            setPageError(extractErrorMessage(error as ApiError, 'Failed to load subject offerings.'));
        } finally {
            setCatalogLoading(false);
        }
    };

    useEffect(() => {
        let alive = true;
        if (!pluginManaged || !activeCurriculum) {
            setCatalog([]);
            return;
        }
        setCatalogLoading(true);
        subjectOfferingAPI.getCatalog(activeCurriculum.id)
            .then((items) => {
                if (alive) setCatalog(items);
            })
            .catch((error) => {
                if (alive) setPageError(extractErrorMessage(error as ApiError, 'Failed to load subject offerings.'));
            })
            .finally(() => {
                if (alive) setCatalogLoading(false);
            });
        return () => {
            alive = false;
        };
    }, [activeCurriculum, pluginManaged, setPageError]);

    const workspaceRows = useMemo(
        () => catalog.filter(isWorkspaceOffering),
        [catalog],
    );
    const filteredWorkspaceRows = useMemo(
        () => workspaceRows.filter((item) => matchesCatalogSearch(item, search)),
        [workspaceRows, search],
    );
    const workspaceGroups = useMemo(
        () => groupRowsByLevel(filteredWorkspaceRows),
        [filteredWorkspaceRows],
    );
    const workspaceGroupSummaries = useMemo(() => {
        return new Map(
            workspaceGroups.map((group) => {
                const offered = group.rows.filter(isSetupReadyWorkspaceOffering).length;
                const scheduledRemoval = group.rows.filter(isScheduledRemoval).length;
                const contentMissing = group.rows.filter((item) => !isDroppedHistoricalOffering(item) && !isContentReady(item)).length;
                const cohortAssignments = group.rows.reduce(
                    (total, item) => total + (item.cohort_assignment_count ?? 0),
                    0,
                );
                return [group.key, { offered, scheduledRemoval, contentMissing, cohortAssignments }];
            }),
        );
    }, [workspaceGroups]);
    const levels = useMemo(() => uniqueCatalogLevels(catalog), [catalog]);
    const levelCounts = useMemo(() => {
        const counts = new Map<string, number>();
        workspaceRows
            .filter(isSetupReadyWorkspaceOffering)
            .forEach((item) => counts.set(item.level, (counts.get(item.level) ?? 0) + 1));
        return counts;
    }, [workspaceRows]);
    const scheduledRemovalCount = workspaceRows.filter(isScheduledRemoval).length;
    const offeredCount = workspaceRows.filter(isSetupReadyWorkspaceOffering).length;
    const availableCount = catalog.filter((item) => getCatalogStatus(item) === 'AVAILABLE').length;
    const contentMissingCount = catalog.filter((item) => !isDroppedHistoricalOffering(item) && !isContentReady(item)).length;

    useEffect(() => {
        if (search.trim()) {
            setExpandedLevels(new Set(workspaceGroups.map((group) => group.key)));
            return;
        }
        if (requestedLevel) {
            setExpandedLevels(new Set([requestedLevel]));
            return;
        }
        setExpandedLevels(new Set());
    }, [requestedLevel, search, workspaceGroups]);

    const openLevelGroup = (level: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('level', level);
        router.replace(`/academic/subjects?${params.toString()}`, { scroll: false });
        setExpandedLevels((current) => new Set(current).add(level));
    };

    const toggleLevelGroup = (level: string) => {
        setExpandedLevels((current) => {
            const next = new Set(current);
            if (next.has(level)) {
                next.delete(level);
            } else {
                next.add(level);
            }
            return next;
        });
    };

    const expandAllLevels = () => {
        setExpandedLevels(new Set(workspaceGroups.map((group) => group.key)));
    };

    const collapseAllLevels = () => {
        setExpandedLevels(new Set());
    };

    const handleSave = async (...args: Parameters<typeof saveSubject>) => {
        await saveSubject(...args);
        if (!setupMode) {
            return;
        }

        await setupStatusQuery.refetch();
        setSetupActionMessage(args[1] ? 'Saved. Continue setup?' : 'Subject saved. Continue setup?');
    };

    const handleRemoveOffering = async (item: SubjectCatalogItem) => {
        if (!item.offering_id) return;
        const label = catalogRowLabel(item);
        if (item.cohort_assignment_count > 0 && !confirm(`${label} is already assigned to cohorts. Removing the offering schedules removal after the current term closes and preserves historical records. Continue?`)) {
            return;
        }
        setCatalogActionId(item.id);
        setRowErrors((current) => ({ ...current, [item.id]: '' }));
        try {
            const result = await subjectOfferingAPI.remove(item.offering_id, activeCurriculum?.id);
            await loadCatalog();
            await setupStatusQuery.refetch();
            const message = result.detail ?? `${label} was removed from this workspace. Historical records remain available.`;
            setToastMessage(message);
            setSetupActionMessage(message);
        } catch (error) {
            const message = extractErrorMessage(error as ApiError, `Failed to remove ${label}.`);
            setRowErrors((current) => ({ ...current, [item.id]: message }));
            setToastMessage(message);
        } finally {
            setCatalogActionId(null);
        }
    };

    const handleRestoreOffering = async (item: SubjectCatalogItem) => {
        if (!item.offering_id || !activeCurriculum) return;
        const label = catalogRowLabel(item);
        setCatalogActionId(item.id);
        setRowErrors((current) => ({ ...current, [item.id]: '' }));
        try {
            await subjectOfferingAPI.restore(item.offering_id, activeCurriculum.id);
            await loadCatalog();
            await setupStatusQuery.refetch();
            const message = `${label} has been restored.`;
            setToastMessage(message);
            setSetupActionMessage(setupMode ? `${message} Continue setup?` : message);
        } catch (error) {
            const message = extractErrorMessage(error as ApiError, `Failed to restore ${label}.`);
            setRowErrors((current) => ({ ...current, [item.id]: message }));
            setToastMessage(message);
        } finally {
            setCatalogActionId(null);
        }
    };

    if (setupMode && setupStatusQuery.isLoading && !setupStatus) {
        return (
            <div className="space-y-6">
                <SectionLoading title="Loading academic setup..." />
                <PageSkeleton variant="generic" />
            </div>
        );
    }

    if (setupMode && setupPageState === 'blocked') {
        return (
            <div className="space-y-6">
                <AcademicSetupGate
                    status={setupStatus}
                    stepKey="SUBJECTS"
                    setupMode={setupMode}
                    blockedNotice={blockedNotice}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AcademicSetupGate
                status={setupStatus}
                stepKey="SUBJECTS"
                setupMode={setupMode}
                blockedNotice={blockedNotice}
            />
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold theme-text">
                        {pluginManaged ? 'Subject offerings' : 'Subjects'}
                    </h1>
                    <p className="mt-1 theme-muted">
                        {pluginManaged
                            ? 'These are the subject levels this workspace has selected from the curriculum catalogue.'
                            : canManageSubjects
                                ? 'Create custom subjects for your curriculum.'
                                : 'Read-only subject catalog across all curricula and levels'}
                    </p>
                </div>
                {canManageSubjects && !pluginManaged ? (
                    <Button onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-2" />Create Subject
                    </Button>
                ) : pluginManaged && activeCurriculum ? (
                    <Link href={catalogueHref(activeCurriculum.id)}>
                        <Button type="button">
                            <Plus className="h-4 w-4" />
                            Add from curriculum catalogue
                        </Button>
                    </Link>
                ) : null}
            </div>

            {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}
            {toastMessage ? (
                <ErrorBanner
                    message={toastMessage}
                    variant="info"
                    onDismiss={() => setToastMessage(null)}
                    autoDismissMs={3000}
                />
            ) : null}
            {setupActionMessage ? (
                <Card>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm font-medium theme-text">{setupActionMessage}</p>
                        <div className="flex flex-wrap gap-2">
                            <Link href={withAcademicSetupMode('/academic')}>
                                <Button type="button" variant="secondary">Back to setup overview</Button>
                            </Link>
                            <Link href={withAcademicSetupMode(setupStatus?.next_action.href ?? '/academic/cohorts?create=1')}>
                                <Button type="button">Continue setup</Button>
                            </Link>
                        </div>
                    </div>
                </Card>
            ) : null}

            {pluginManaged ? (
                <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <Card className="py-4 px-5">
                            <p className="text-xs font-medium theme-subtle">Total offered subject levels</p>
                            <p className="mt-1 text-2xl font-bold theme-text">{offeredCount}</p>
                        </Card>
                        {levels.slice(0, 3).map((level) => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => openLevelGroup(level)}
                                className="theme-card rounded-lg px-5 py-4 text-left transition-colors hover:theme-surface-muted"
                            >
                                <p className="text-xs font-medium theme-subtle">{formatCatalogLevel(level)}</p>
                                <p className="mt-1 text-2xl font-bold theme-text">{levelCounts.get(level) ?? 0}</p>
                            </button>
                        ))}
                        <Card className="py-4 px-5">
                            <p className="text-xs font-medium theme-subtle">Scheduled removals</p>
                            <p className="mt-1 text-2xl font-bold theme-text">{scheduledRemovalCount}</p>
                        </Card>
                    </div>

                    <Card>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h2 className="text-sm font-semibold theme-text">Catalogue summary</h2>
                                <p className="mt-1 text-sm theme-muted">{activeCurriculum?.name ?? 'Active curriculum'}</p>
                            </div>
                            <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <p className="text-xs theme-subtle">Total catalogue subject levels</p>
                                    <p className="font-semibold theme-text">{catalog.length}</p>
                                </div>
                                <div>
                                    <p className="text-xs theme-subtle">Already offered</p>
                                    <p className="font-semibold theme-text">{workspaceRows.length}</p>
                                </div>
                                <div>
                                    <p className="text-xs theme-subtle">Available</p>
                                    <p className="font-semibold theme-text">{availableCount}</p>
                                </div>
                                <div>
                                    <p className="text-xs theme-subtle">Needs curriculum import</p>
                                    <p className="font-semibold theme-text">{contentMissingCount}</p>
                                </div>
                            </div>
                            {activeCurriculum ? (
                                <Link href={catalogueHref(activeCurriculum.id)}>
                                    <Button type="button" variant="secondary">
                                        Add from curriculum catalogue
                                    </Button>
                                </Link>
                            ) : null}
                        </div>
                    </Card>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 theme-subtle" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search workspace subjects..."
                            className="theme-input theme-focus-ring w-full rounded-xl py-2.5 pl-9 pr-4 text-sm"
                        />
                    </div>

                    <div className="flex flex-col gap-3 rounded-lg border theme-border px-4 py-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium theme-text">Group by:</span>
                            <Button type="button" size="sm" variant="secondary">Level</Button>
                            <Button type="button" size="sm" variant="ghost" disabled title="Subject grouping is planned for a later update.">
                                Subject
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="secondary" onClick={expandAllLevels}>
                                Expand all
                            </Button>
                            <Button type="button" size="sm" variant="secondary" onClick={collapseAllLevels}>
                                Collapse all
                            </Button>
                        </div>
                    </div>

                    {catalogLoading ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <CardSkeleton key={index} lines={3} />
                            ))}
                        </div>
                    ) : workspaceGroups.length === 0 ? (
                        <Card>
                            <div className="py-16 text-center">
                                <BookOpen className="mx-auto mb-3 h-12 w-12 theme-subtle" />
                                <h3 className="text-sm font-medium theme-text">
                                    {search ? 'No workspace subjects match your search' : 'No workspace subject offerings found'}
                                </h3>
                                <p className="mt-1 text-sm theme-muted">
                                    {search ? 'Try a different subject name, code, or level.' : 'Add subject levels from the curriculum catalogue.'}
                                </p>
                                {activeCurriculum ? (
                                    <Link href={catalogueHref(activeCurriculum.id)}>
                                        <Button className="mt-4">
                                            <Plus className="h-4 w-4" />
                                            Add from curriculum catalogue
                                        </Button>
                                    </Link>
                                ) : null}
                            </div>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {workspaceGroups.map((group) => (
                                <Card key={group.key} className="p-0">
                                    <button
                                        type="button"
                                        onClick={() => toggleLevelGroup(group.key)}
                                        className="flex w-full flex-col gap-3 border-b px-5 py-4 text-left theme-border lg:flex-row lg:items-center lg:justify-between"
                                        aria-expanded={expandedLevels.has(group.key)}
                                    >
                                        <div className="flex min-w-0 items-center gap-2">
                                            {expandedLevels.has(group.key) ? (
                                                <ChevronDown className="h-4 w-4 shrink-0 theme-subtle" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 shrink-0 theme-subtle" />
                                            )}
                                            <h2 className="font-semibold theme-text">{formatCatalogLevel(group.level)}</h2>
                                        </div>
                                        {(() => {
                                            const summary = workspaceGroupSummaries.get(group.key);
                                            return (
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm theme-muted">
                                                    <span>{summary?.offered ?? 0} offered</span>
                                                    <span>{summary?.scheduledRemoval ?? 0} scheduled removal</span>
                                                    <span>{summary?.contentMissing ?? 0} need curriculum import</span>
                                                    <span>{summary?.cohortAssignments ?? 0} cohort assignments</span>
                                                    <span className="font-medium theme-text">
                                                        {expandedLevels.has(group.key) ? 'Collapse' : 'Expand'}
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </button>
                                    {expandedLevels.has(group.key) ? (
                                        <div className="divide-y theme-border">
                                            {group.rows.map((item) => {
                                            const rowStatus = getCatalogStatus(item);
                                            const rowError = rowErrors[item.id];
                                            const rowHistorical = isDroppedHistoricalOffering(item);
                                            return (
                                                <div key={item.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="font-medium theme-text">{item.name}</p>
                                                            <Badge variant="default">{item.subject_code ?? item.code}</Badge>
                                                            <Badge variant={statusBadgeVariant(rowStatus)}>{statusLabel(item)}</Badge>
                                                            {!rowHistorical ? (
                                                                <Badge variant={isContentReady(item) ? 'success' : 'warning'}>
                                                                    {contentReadinessLabel(item)}
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                        <p className="mt-1 text-sm theme-muted">
                                                            {item.cohort_assignment_count === 1 ? '1 cohort assignment' : `${item.cohort_assignment_count} cohort assignments`}
                                                        </p>
                                                        {isScheduledRemoval(item) ? (
                                                            <p className="mt-1 text-xs text-amber-700">
                                                                This offering is scheduled for removal after the current term closes. Historical records will remain available.
                                                            </p>
                                                        ) : null}
                                                        {rowStatus === 'DROPPED_HISTORICAL' ? (
                                                            <p className="mt-1 text-xs theme-subtle">
                                                                This offering is retained for historical records.
                                                            </p>
                                                        ) : null}
                                                        {rowError ? <p className="mt-2 text-sm text-red-600">{rowError}</p> : null}
                                                    </div>
                                                    {canManageSubjects ? (
                                                        <div className="flex shrink-0 flex-wrap gap-2">
                                                            {canRemove(item) && item.offering_id ? (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    disabled={catalogActionId === item.id}
                                                                    onClick={() => handleRemoveOffering(item)}
                                                                >
                                                                    <ButtonPendingContent pending={catalogActionId === item.id} pendingLabel="Removing...">
                                                                        <Trash2 className="h-4 w-4" />
                                                                        Remove from workspace
                                                                    </ButtonPendingContent>
                                                                </Button>
                                                            ) : null}
                                                            {canRestore(item) && item.offering_id ? (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    disabled={catalogActionId === item.id}
                                                                    onClick={() => handleRestoreOffering(item)}
                                                                >
                                                                    <ButtonPendingContent pending={catalogActionId === item.id} pendingLabel="Restoring...">
                                                                        <RotateCcw className="h-4 w-4" />
                                                                        Restore offering
                                                                    </ButtonPendingContent>
                                                                </Button>
                                                            ) : null}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                            })}
                                        </div>
                                    ) : null}
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {[
                            { label: 'Total Entries', value: subjects.length },
                            { label: 'Unique Subjects', value: new Set(subjects.map(s => s.name)).size },
                            { label: 'Curricula', value: grouped.length },
                        ].map(s => (
                            <Card key={s.label} className="py-4 px-5">
                                <p className="text-xs font-medium theme-subtle">{s.label}</p>
                                <p className="mt-1 text-2xl font-bold theme-text">{s.value}</p>
                            </Card>
                        ))}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 theme-subtle" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by subject, code, level or curriculum..."
                            className="theme-input theme-focus-ring w-full rounded-xl py-2.5 pl-9 pr-4 text-sm"
                        />
                    </div>

                    {loading ? (
                        <SectionLoading title="Loading subject offerings..." />
                    ) : grouped.length === 0 ? (
                        <Card>
                            <div className="py-16 text-center">
                                <BookOpen className="mx-auto mb-3 h-12 w-12 theme-subtle" />
                                <h3 className="text-sm font-medium theme-text">No subjects found</h3>
                                <p className="mt-1 text-sm theme-muted">
                                    {search
                                        ? 'No subjects match your search.'
                                        : canManageSubjects
                                            ? 'Get started by adding a subject.'
                                            : 'No subjects are available to display.'}
                                </p>
                                {!search && canManageSubjects ? (
                                    <Button className="mt-4" onClick={openCreate}>
                                        <Plus className="mr-2 h-4 w-4" />Create Subject
                                    </Button>
                                ) : null}
                            </div>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {grouped.map(({ curriculumName, curriculumType, subjects: subjectGroups }) => (
                                <CurriculumGroup
                                    key={curriculumName}
                                    curriculumName={curriculumName}
                                    curriculumType={curriculumType}
                                    subjectGroups={subjectGroups}
                                    open={isCurriculumExpanded(curriculumName)}
                                    onToggle={() => toggleCurriculum(curriculumName)}
                                    isSubjectOpen={(subjectName: string) => isSubjectExpanded(curriculumName, subjectName)}
                                    onSubjectToggle={(subjectName: string) => toggleSubject(curriculumName, subjectName)}
                                    onEdit={openEdit}
                                    onDelete={handleDelete}
                                    onAssignToCohort={setAssigningSubject}
                                    onAddLevel={openAddLevel}
                                    canManage={canManageSubjects}
                                />
                            ))}
                        </div>
                    )}

                    <SubjectFormModal
                        isOpen={isModalOpen}
                        onClose={closeModal}
                        editing={editing}
                        addingLevelTo={addingLevelTo}
                        curricula={customCurricula}
                        defaultCurriculumId={customCurricula[0]?.id ?? 0}
                        onSave={handleSave}
                    />

                    {assigningSubject && (
                        <AssignSubjectToCohortModal
                            isOpen={!!assigningSubject}
                            onClose={() => setAssigningSubject(null)}
                            subject={assigningSubject}
                        />
                    )}
                </>
            )}
        </div>
    );
}

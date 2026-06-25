'use client';

// ============================================================================
// app/(dashboard)/academic/subjects/page.tsx
//
// Responsibility: fetch data, handle state, compose components, render.
// No alert(). No any. No inline component definitions.
// ============================================================================

import { BookOpen, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import type {
    SubjectCatalogItem,
    SubjectOfferingCatalogStatus,
} from '@/app/core/types/academic';

interface CatalogSubjectGroup {
    key: string;
    code: string;
    name: string;
    rows: SubjectCatalogItem[];
}

function getCatalogStatus(item: SubjectCatalogItem): SubjectOfferingCatalogStatus {
    return item.status ?? item.metadata?.offering_status ?? (item.offered ? 'OFFERED' : 'AVAILABLE');
}

function formatCatalogLevel(level: string): string {
    const normalized = level.trim();
    const gradeMatch = normalized.match(/^grade(\d+)$/i);
    if (gradeMatch) {
        return `Grade ${gradeMatch[1]}`;
    }
    return normalized || 'All levels';
}

function catalogRowLabel(item: SubjectCatalogItem): string {
    return `${item.name} — ${formatCatalogLevel(item.level)}`;
}

function statusLabel(item: SubjectCatalogItem): string {
    const metadataLabel = item.metadata?.status_label;
    if (typeof metadataLabel === 'string' && metadataLabel.trim()) {
        return metadataLabel;
    }

    switch (getCatalogStatus(item)) {
        case 'OFFERED':
            return 'Offered by this workspace';
        case 'DROP_SCHEDULED':
        case 'DROP_PENDING_TERM_CLOSE':
            return 'Scheduled removal';
        case 'DROPPED_HISTORICAL':
            return 'Dropped historical';
        case 'AVAILABLE':
        default:
            return 'Available in catalogue';
    }
}

function statusBadgeVariant(status: SubjectOfferingCatalogStatus): 'success' | 'warning' | 'danger' | 'default' {
    switch (status) {
        case 'OFFERED':
            return 'success';
        case 'DROP_SCHEDULED':
        case 'DROP_PENDING_TERM_CLOSE':
            return 'warning';
        case 'DROPPED_HISTORICAL':
            return 'danger';
        case 'AVAILABLE':
        default:
            return 'default';
    }
}

function canOffer(item: SubjectCatalogItem): boolean {
    return item.metadata?.can_offer ?? getCatalogStatus(item) === 'AVAILABLE';
}

function canRemove(item: SubjectCatalogItem): boolean {
    return item.metadata?.can_remove ?? getCatalogStatus(item) === 'OFFERED';
}

function canRestore(item: SubjectCatalogItem): boolean {
    const status = getCatalogStatus(item);
    return item.metadata?.can_restore ?? (status === 'DROP_SCHEDULED' || status === 'DROP_PENDING_TERM_CLOSE');
}

function compareCatalogLevels(left: string, right: string): number {
    const normalize = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
    const rank = (value: string): [number, number | string] => {
        const normalized = normalize(value);
        if (normalized === 'pp1') return [0, 1];
        if (normalized === 'pp2') return [0, 2];
        const gradeMatch = normalized.match(/^grade(\d+)$/);
        if (gradeMatch) {
            return [1, Number(gradeMatch[1])];
        }
        return [2, formatCatalogLevel(value).toLowerCase()];
    };

    const [leftGroup, leftValue] = rank(left);
    const [rightGroup, rightValue] = rank(right);
    if (leftGroup !== rightGroup) {
        return leftGroup - rightGroup;
    }
    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return leftValue - rightValue;
    }
    return String(leftValue).localeCompare(String(rightValue));
}

function groupCatalogRows(catalog: SubjectCatalogItem[]): CatalogSubjectGroup[] {
    const groups = new Map<string, CatalogSubjectGroup>();

    catalog.forEach((item) => {
        const code = item.subject_code ?? item.code;
        const name = item.title ?? item.name;
        const key = `${code.toLowerCase()}::${name.toLowerCase()}`;
        const current = groups.get(key);
        if (current) {
            current.rows.push(item);
            return;
        }
        groups.set(key, {
            key,
            code,
            name,
            rows: [item],
        });
    });

    return Array.from(groups.values())
        .map((group) => ({
            ...group,
            rows: group.rows.sort((left, right) => compareCatalogLevels(left.level, right.level)),
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
}

export function SubjectsPage() {
    const searchParams = useSearchParams();
    const setupMode = searchParams.get('setup') === '1';
    const blockedNotice = searchParams.get('blocked') === '1';
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
    const [setupActionMessage, setSetupActionMessage] = useState<string | null>(null);
    const catalogSectionRef = useRef<HTMLElement | null>(null);
    const catalogHeadingRef = useRef<HTMLHeadingElement | null>(null);

    useEffect(() => {
        if (!pluginManaged || !activeCurriculum) {
            setCatalog([]);
            return;
        }

        let alive = true;
        setCatalogLoading(true);
        subjectOfferingAPI.getCatalog(activeCurriculum.id)
            .then((items) => {
                if (alive) setCatalog(items);
            })
            .catch((error) => {
                if (alive) setPageError(extractErrorMessage(error as ApiError, 'Failed to load subject catalog.'));
            })
            .finally(() => {
                if (alive) setCatalogLoading(false);
            });
        return () => {
            alive = false;
        };
    }, [activeCurriculum, pluginManaged, setPageError]);

    const catalogGroups = useMemo(() => groupCatalogRows(catalog), [catalog]);

    const handleSave = async (...args: Parameters<typeof saveSubject>) => {
        await saveSubject(...args);
        if (!setupMode) {
            return;
        }

        await setupStatusQuery.refetch();
        setSetupActionMessage(args[1] ? 'Saved. Continue setup?' : 'Subject saved. Continue setup?');
    };

    const refetchCatalog = async () => {
        if (!activeCurriculum) return;
        const items = await subjectOfferingAPI.getCatalog(activeCurriculum.id);
        setCatalog(items);
    };

    const handleSelectSubjects = () => {
        catalogSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
        window.requestAnimationFrame(() => {
            catalogHeadingRef.current?.focus({ preventScroll: true });
        });
    };

    const handleOfferSubject = async (item: SubjectCatalogItem) => {
        if (!activeCurriculum) return;
        setCatalogActionId(item.id);
        setPageError(null);
        try {
            await subjectOfferingAPI.offer({
                curriculum: activeCurriculum.id,
                catalog_subject_id: item.catalog_subject_id,
                level: item.level,
            });
            await refetchCatalog();
            await setupStatusQuery.refetch();
            setSetupActionMessage(`${catalogRowLabel(item)} is now offered by this workspace. Continue setup?`);
        } catch (error) {
            setPageError(extractErrorMessage(error as ApiError, `Failed to offer ${catalogRowLabel(item)}.`));
        } finally {
            setCatalogActionId(null);
        }
    };

    const handleRemoveOffering = async (item: SubjectCatalogItem) => {
        if (!item.offering_id) return;
        const label = catalogRowLabel(item);
        if (item.cohort_assignment_count > 0 && !confirm(`${label} is already assigned to cohorts. Removing the offering schedules removal after the current term closes and preserves historical records. Continue?`)) {
            return;
        }
        setCatalogActionId(item.id);
        setPageError(null);
        try {
            const result = await subjectOfferingAPI.remove(item.offering_id, activeCurriculum?.id);
            await refetchCatalog();
            await setupStatusQuery.refetch();
            setSetupActionMessage(
                result.detail
                    ?? `${label} is scheduled for removal after the current term is closed. You can restore it before term closure.`
            );
        } catch (error) {
            setPageError(extractErrorMessage(error as ApiError, `Failed to remove ${label}.`));
        } finally {
            setCatalogActionId(null);
        }
    };

    const handleRestoreOffering = async (item: SubjectCatalogItem) => {
        if (!item.offering_id || !activeCurriculum) return;
        const label = catalogRowLabel(item);
        setCatalogActionId(item.id);
        setPageError(null);
        try {
            await subjectOfferingAPI.restore(item.offering_id, activeCurriculum.id);
            await refetchCatalog();
            await setupStatusQuery.refetch();
            setSetupActionMessage(`${label} has been restored. Continue setup?`);
        } catch (error) {
            setPageError(extractErrorMessage(error as ApiError, `Failed to restore ${label}.`));
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold theme-text">
                        {pluginManaged ? 'Subject Offerings' : 'Subjects'}
                    </h1>
                    <p className="mt-1 theme-muted">
                        {pluginManaged
                            ? 'Choose the subjects this workspace will teach from the curriculum catalog.'
                            : canManageSubjects
                                ? 'Create custom subjects for your curriculum.'
                                : 'Read-only subject catalog across all curricula and levels'}
                    </p>
                </div>
                {canManageSubjects && !pluginManaged ? (
                    <Button onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-2" />Create Subject
                    </Button>
                ) : pluginManaged ? (
                    <Link href="/admin/settings?tab=plugins&from=curricula">
                        <Button type="button" variant="secondary">Plugin configuration</Button>
                    </Link>
                ) : null}
            </div>

            {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}
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
                    <Card>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="text-sm font-semibold theme-text">Catalogue and offering state</h2>
                                <p className="mt-1 text-sm theme-muted">
                                    Catalogue rows are globally available curriculum subjects. Offering state shows whether this workspace teaches each subject level.
                                </p>
                                <p className="mt-1 text-xs theme-subtle">
                                    Scheduled removal is reversible before term closure. Historical academic records are preserved.
                                </p>
                            </div>
                            <Button type="button" variant="secondary" onClick={handleSelectSubjects}>
                                Select subjects
                            </Button>
                        </div>
                    </Card>

                    <section
                        id="curriculum-catalog"
                        ref={catalogSectionRef}
                        aria-labelledby="curriculum-catalog-heading"
                        className="scroll-mt-6"
                    >
                        <Card>
                            <div>
                                <h2
                                    id="curriculum-catalog-heading"
                                    ref={catalogHeadingRef}
                                    tabIndex={-1}
                                    className="text-sm font-semibold theme-text outline-none"
                                >
                                    Curriculum catalogue offering matrix
                                </h2>
                                <p className="mt-1 text-sm theme-muted">
                                    Select subject levels from the global curriculum catalogue. Manual subject code/name entry is disabled for plugin-managed curricula.
                                </p>
                            </div>

                            {catalogLoading ? (
                                <div className="mt-4">
                                    <SectionLoading
                                        title={`Loading ${activeCurriculum?.name ?? 'curriculum'} subject catalog...`}
                                        description="Scholaroscope is reading available subjects and current offerings for this curriculum."
                                    />
                                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                                        {Array.from({ length: 6 }).map((_, index) => (
                                            <CardSkeleton key={index} lines={3} />
                                        ))}
                                    </div>
                                </div>
                            ) : catalogGroups.length === 0 ? (
                                <div className="mt-4 rounded-xl border border-dashed p-5 text-sm theme-muted theme-border">
                                    This plugin has no catalogue entries available for this curriculum.
                                </div>
                            ) : (
                                <div className="mt-4 space-y-4">
                                    {catalogGroups.map((group) => (
                                        <div key={group.key} className="overflow-hidden rounded-xl border theme-border">
                                            <div className="theme-surface-muted px-4 py-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-semibold theme-text">{group.name}</h3>
                                                    <Badge variant="default">{group.code}</Badge>
                                                </div>
                                            </div>
                                            <div className="divide-y theme-border">
                                                {group.rows.map((item) => {
                                                    const rowStatus = getCatalogStatus(item);
                                                    const label = catalogRowLabel(item);
                                                    const assignmentCount = item.cohort_assignment_count;
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                                                        >
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <p className="font-medium theme-text">{formatCatalogLevel(item.level)}</p>
                                                                    <Badge variant={statusBadgeVariant(rowStatus)}>
                                                                        {statusLabel(item)}
                                                                    </Badge>
                                                                </div>
                                                                <p className="mt-1 text-sm theme-muted">
                                                                    {assignmentCount === 1
                                                                        ? '1 cohort assignment'
                                                                        : `${assignmentCount} cohort assignment(s)`}
                                                                </p>
                                                                {rowStatus === 'DROP_SCHEDULED' || rowStatus === 'DROP_PENDING_TERM_CLOSE' ? (
                                                                    <p className="mt-1 text-xs text-amber-700">
                                                                        {label} is scheduled for removal after the current term is closed. You can restore it before term closure.
                                                                    </p>
                                                                ) : null}
                                                                {rowStatus === 'DROPPED_HISTORICAL' && !canOffer(item) ? (
                                                                    <p className="mt-1 text-xs theme-subtle">
                                                                        {label} is retained for historical records and cannot be reactivated from this page.
                                                                    </p>
                                                                ) : null}
                                                                {item.description ? (
                                                                    <p className="mt-1 line-clamp-2 text-xs theme-subtle">{item.description}</p>
                                                                ) : null}
                                                            </div>

                                                            {canManageSubjects ? (
                                                                <div className="flex shrink-0 flex-wrap gap-2">
                                                                    {canOffer(item) ? (
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            disabled={catalogActionId === item.id}
                                                                            onClick={() => handleOfferSubject(item)}
                                                                        >
                                                                            <ButtonPendingContent
                                                                                pending={catalogActionId === item.id}
                                                                                pendingLabel={`Adding ${label}...`}
                                                                            >
                                                                                Offer subject
                                                                            </ButtonPendingContent>
                                                                        </Button>
                                                                    ) : null}
                                                                    {canRemove(item) && item.offering_id ? (
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant="secondary"
                                                                            disabled={catalogActionId === item.id}
                                                                            onClick={() => handleRemoveOffering(item)}
                                                                        >
                                                                            <ButtonPendingContent
                                                                                pending={catalogActionId === item.id}
                                                                                pendingLabel={`Removing ${label}...`}
                                                                            >
                                                                                Remove offering
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
                                                                            <ButtonPendingContent
                                                                                pending={catalogActionId === item.id}
                                                                                pendingLabel={`Restoring ${label}...`}
                                                                            >
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
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </section>
                </>
            ) : (
                <>

            {/* Stats */}
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

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 theme-subtle" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by subject, code, level or curriculum..."
                    className="theme-input theme-focus-ring w-full rounded-xl py-2.5 pl-9 pr-4 text-sm"
                />
            </div>

            {/* Grouped list */}
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
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onAddLevel={openAddLevel}
                            onAssignToCohort={setAssigningSubject}
                            canManage={canManageSubjects}
                            open={isCurriculumExpanded(curriculumName)}
                            onToggle={() => toggleCurriculum(curriculumName)}
                            isSubjectOpen={(name) => isSubjectExpanded(curriculumName, name)}
                            onSubjectToggle={(name) => toggleSubject(curriculumName, name)}
                        />
                    ))}
                </div>
            )}

            {canManageSubjects ? (
                <SubjectFormModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    editing={editing}
                    curricula={customCurricula}
                    onSave={handleSave}
                    defaultCurriculumId={customCurricula[0]?.id ?? 0}
                    addingLevelTo={addingLevelTo}
                />
            ) : null}

            {canManageSubjects ? (
                <AssignSubjectToCohortModal
                    isOpen={!!assigningSubject}
                    onClose={() => setAssigningSubject(null)}
                    subject={assigningSubject}
                />
            ) : null}
                </>
            )}
        </div>
    );
}

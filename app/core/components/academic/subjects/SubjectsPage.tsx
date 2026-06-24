'use client';

// ============================================================================
// app/(dashboard)/academic/subjects/page.tsx
//
// Responsibility: fetch data, handle state, compose components, render.
// No alert(). No any. No inline component definitions.
// ============================================================================

import { BookOpen, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
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

    const offeredCatalog = catalog.filter((item) => item.offered);
    const availableCatalog = catalog.filter((item) => !item.offered);

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
            setSetupActionMessage('Subject offering saved. Continue setup?');
        } catch (error) {
            setPageError(extractErrorMessage(error as ApiError, 'Failed to offer subject.'));
        } finally {
            setCatalogActionId(null);
        }
    };

    const handleRemoveOffering = async (item: SubjectCatalogItem) => {
        if (!item.offering_id) return;
        if (item.cohort_assignment_count > 0 && !confirm('This subject is already assigned to cohorts. Removing the offering can affect teaching setup. Continue?')) {
            return;
        }
        setCatalogActionId(item.id);
        setPageError(null);
        try {
            await subjectOfferingAPI.remove(item.offering_id);
            await refetchCatalog();
            await setupStatusQuery.refetch();
            setSetupActionMessage('Subject offering updated. Continue setup?');
        } catch (error) {
            setPageError(extractErrorMessage(error as ApiError, 'Failed to remove subject offering.'));
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
                                <h2 className="text-sm font-semibold theme-text">Selected subject offerings</h2>
                                <p className="mt-1 text-sm theme-muted">
                                    These selected catalog subjects count toward the Subjects setup step.
                                </p>
                            </div>
                            <a href="#curriculum-catalog">
                                <Button type="button" variant="secondary">
                                    Select subjects
                                </Button>
                            </a>
                        </div>
                        {catalogLoading ? (
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <CardSkeleton key={index} lines={2} className="theme-card-muted" />
                                ))}
                            </div>
                        ) : offeredCatalog.length === 0 ? (
                            <div className="mt-4 rounded-xl border border-dashed p-5 text-sm theme-muted theme-border">
                                No subject offerings selected yet. Select from the curriculum catalog below.
                            </div>
                        ) : (
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {offeredCatalog.map((item) => (
                                    <div key={item.id} className="rounded-xl border p-4 theme-border theme-surface-muted">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold theme-text">{item.name}</p>
                                                <p className="text-sm theme-muted">{item.code} · {item.level}</p>
                                                <p className="mt-1 text-xs theme-subtle">
                                                    {item.cohort_assignment_count > 0
                                                        ? `${item.cohort_assignment_count} cohort assignment(s)`
                                                        : 'Ready for cohort assignment'}
                                                </p>
                                            </div>
                                            {canManageSubjects ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={catalogActionId === item.id}
                                                    onClick={() => handleRemoveOffering(item)}
                                                >
                                                    <ButtonPendingContent
                                                        pending={catalogActionId === item.id}
                                                        pendingLabel={`Removing ${item.name}...`}
                                                    >
                                                        Remove offering
                                                    </ButtonPendingContent>
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card id="curriculum-catalog">
                        <div>
                            <h2 className="text-sm font-semibold theme-text">Available curriculum catalog</h2>
                            <p className="mt-1 text-sm theme-muted">
                                Select from curriculum catalog. Manual subject code/name entry is disabled for plugin-managed curricula.
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
                        ) : availableCatalog.length === 0 ? (
                            <div className="mt-4 rounded-xl border border-dashed p-5 text-sm theme-muted theme-border">
                                All available catalog subjects are already offered, or this plugin has no catalog entries available.
                            </div>
                        ) : (
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {availableCatalog.map((item) => (
                                    <div key={item.id} className="rounded-xl border p-4 theme-border">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold theme-text">{item.name}</p>
                                                <p className="text-sm theme-muted">{item.code} · {item.level}</p>
                                                {item.description ? (
                                                    <p className="mt-1 line-clamp-2 text-xs theme-subtle">{item.description}</p>
                                                ) : null}
                                            </div>
                                            {canManageSubjects ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    disabled={catalogActionId === item.id}
                                                    onClick={() => handleOfferSubject(item)}
                                                >
                                                    <ButtonPendingContent
                                                        pending={catalogActionId === item.id}
                                                        pendingLabel={`Adding ${item.name}...`}
                                                    >
                                                        Offer subject
                                                    </ButtonPendingContent>
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
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

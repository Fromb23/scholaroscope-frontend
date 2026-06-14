'use client';

// ============================================================================
// app/(dashboard)/academic/subjects/page.tsx
//
// Responsibility: fetch data, handle state, compose components, render.
// No alert(). No any. No inline component definitions.
// ============================================================================

import { BookOpen, Plus, Search } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { AcademicSetupGate } from '@/app/core/components/academic/setup/AcademicSetupGate';
import { AssignSubjectToCohortModal } from '@/app/core/components/academic/AssignSubjectToCohortModal';
import {
    CurriculumGroup,
    SubjectFormModal,
} from '@/app/core/components/academic/SubjectComponents';
import { useAcademicSetupStatus } from '@/app/core/hooks/useAcademicSetupStatus';
import { useSubjectsPage } from '@/app/core/hooks/academic/useSubjectsPage';
import {
    getAcademicSetupPageState,
    withAcademicSetupMode,
} from '@/app/core/lib/academicSetup';

export function SubjectsPage() {
    const router = useRouter();
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

    const handleSave = async (...args: Parameters<typeof saveSubject>) => {
        await saveSubject(...args);
        if (!setupMode || args[1]) {
            return;
        }

        const refreshedStatus = (await setupStatusQuery.refetch()).data;
        router.push(
            withAcademicSetupMode(
                refreshedStatus?.next_action.href ?? '/academic/cohorts?create=1',
            ),
        );
    };

    if (setupMode && setupStatusQuery.isLoading && !setupStatus) {
        return <LoadingSpinner fullScreen={false} message="Loading academic setup..." />;
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
                    <h1 className="text-2xl font-semibold theme-text">Subjects</h1>
                    <p className="mt-1 theme-muted">
                        {canManageSubjects
                            ? 'Manage subjects across all curricula and levels'
                            : 'Read-only subject catalog across all curricula and levels'}
                    </p>
                </div>
                {canManageSubjects ? (
                    <Button onClick={openCreate}>
                        <Plus className="w-4 h-4 mr-2" />Add Subject
                    </Button>
                ) : null}
            </div>

            {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

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
                <LoadingSpinner fullScreen={false} message="Loading subjects..." />
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
                                <Plus className="mr-2 h-4 w-4" />Add Subject
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
                    curricula={curricula}
                    onSave={handleSave}
                    defaultCurriculumId={curricula[0]?.id ?? 0}
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
        </div>
    );
}

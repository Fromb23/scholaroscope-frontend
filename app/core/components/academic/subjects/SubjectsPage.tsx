'use client';

// ============================================================================
// app/(dashboard)/academic/subjects/page.tsx
//
// Responsibility: fetch data, handle state, compose components, render.
// No alert(). No any. No inline component definitions.
// ============================================================================

import { useState, useMemo } from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { useAuth } from '@/app/context/AuthContext';
import { useSubjects, useCurricula } from '@/app/core/hooks/useAcademic';
import { AssignSubjectToCohortModal } from '@/app/core/components/academic/AssignSubjectToCohortModal';
import {
    groupSubjects,
    CurriculumGroup,
    SubjectFormModal,
} from '@/app/core/components/academic/SubjectComponents';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { Subject, SubjectFormData } from '@/app/core/types/academic';
import { isAdminOrAbove } from '@/app/utils/permissions';

export function SubjectsPage() {
    const { user, activeRole } = useAuth();
    const { subjects, loading, createSubject, updateSubject, deleteSubject } = useSubjects();
    const { curricula } = useCurricula();

    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Subject | null>(null);
    const [pageError, setPageError] = useState<string | null>(null);
    const [addingLevelTo, setAddingLevelTo] = useState<Subject | null>(null);
    const [assigningSubject, setAssigningSubject] = useState<Subject | null>(null);
    const canManageSubjects = isAdminOrAbove(user, activeRole);

    const grouped = useMemo(() => groupSubjects(subjects, search), [subjects, search]);

    const openCreate = () => { setEditing(null); setAddingLevelTo(null); setIsModalOpen(true); };
    const openAddLevel = (s: Subject) => { setEditing(null); setAddingLevelTo(s); setIsModalOpen(true); };
    const openEdit = (s: Subject) => { setEditing(s); setAddingLevelTo(null); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditing(null); setAddingLevelTo(null); };

    const handleSave = async (data: SubjectFormData, editingId?: number) => {
        if (editingId) {
            await updateSubject(editingId, data);
        } else {
            await createSubject(data);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this subject?')) return;
        setPageError(null);
        try {
            await deleteSubject(id);
        } catch (err) {
            setPageError(extractErrorMessage(err as ApiError, 'Failed to delete subject.'));
        }
    };

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Subjects</h1>
                    <p className="text-gray-600 mt-1">
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
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total Entries', value: subjects.length },
                    { label: 'Unique Subjects', value: new Set(subjects.map(s => s.name)).size },
                    { label: 'Curricula', value: grouped.length },
                ].map(s => (
                    <Card key={s.label} className="py-4 px-5">
                        <p className="text-xs font-medium text-gray-500">{s.label}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by subject, code, level or curriculum..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Grouped list */}
            {loading ? (
                <LoadingSpinner fullScreen={false} message="Loading subjects..." />
            ) : grouped.length === 0 ? (
                <Card>
                    <div className="py-16 text-center">
                        <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <h3 className="text-sm font-medium text-gray-900">No subjects found</h3>
                        <p className="text-sm text-gray-500 mt-1">
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

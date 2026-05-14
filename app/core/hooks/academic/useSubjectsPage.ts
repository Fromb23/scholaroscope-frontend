'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useCurricula, useSubjects } from '@/app/core/hooks/useAcademic';
import { groupSubjects } from '@/app/core/components/academic/SubjectComponents';
import { extractErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { Subject, SubjectFormData } from '@/app/core/types/academic';
import { isAdminOrAbove } from '@/app/utils/permissions';

export function useSubjectsPage() {
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

    const openCreate = () => {
        setEditing(null);
        setAddingLevelTo(null);
        setIsModalOpen(true);
    };

    const openAddLevel = (subject: Subject) => {
        setEditing(null);
        setAddingLevelTo(subject);
        setIsModalOpen(true);
    };

    const openEdit = (subject: Subject) => {
        setEditing(subject);
        setAddingLevelTo(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditing(null);
        setAddingLevelTo(null);
    };

    const handleSave = async (data: SubjectFormData, editingId?: number) => {
        if (editingId) {
            await updateSubject(editingId, data);
            return;
        }

        await createSubject(data);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this subject?')) return;

        setPageError(null);
        try {
            await deleteSubject(id);
        } catch (error) {
            setPageError(extractErrorMessage(error as ApiError, 'Failed to delete subject.'));
        }
    };

    return {
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
        setSearch,
        setPageError,
        setAssigningSubject,
        openCreate,
        openAddLevel,
        openEdit,
        closeModal,
        handleSave,
        handleDelete,
    };
}

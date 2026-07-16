'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useCurricula, useSubjects } from '@/app/core/hooks/useAcademic';
import {
    getCurriculumGroupKey,
    getSubjectGroupKey,
    groupSubjects,
} from '@/app/core/components/academic/SubjectComponents';
import { resolveErrorMessage } from '@/app/core/types/errors';
import type { ApiError } from '@/app/core/types/errors';
import type { Subject, SubjectFormData } from '@/app/core/types/academic';
import { isAdminOrAbove } from '@/app/utils/permissions';

export function useSubjectsPage() {
    const searchParams = useSearchParams();
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
    const deepLinkedCurriculum = searchParams.get('curriculum')?.trim().toLowerCase() ?? '';
    const deepLinkedSubject = searchParams.get('subject')?.trim().toLowerCase() ?? '';
    const [expandedCurriculumKeys, setExpandedCurriculumKeys] = useState<Set<string>>(() => new Set());
    const [collapsedCurriculumKeys, setCollapsedCurriculumKeys] = useState<Set<string>>(() => new Set());
    const [expandedSubjectKeys, setExpandedSubjectKeys] = useState<Set<string>>(() => new Set());
    const [collapsedSubjectKeys, setCollapsedSubjectKeys] = useState<Set<string>>(() => new Set());

    const autoExpandedCurriculumKeys = useMemo(() => {
        const keys = new Set<string>();

        grouped.forEach((group) => {
            const curriculumKey = getCurriculumGroupKey(group.curriculumName);
            const matchesSearch = search.trim().length > 0;
            const matchesCurriculum = deepLinkedCurriculum
                ? group.curriculumName.toLowerCase().includes(deepLinkedCurriculum)
                : false;
            const matchesSubject = deepLinkedSubject
                ? Array.from(group.subjects.keys()).some((name) => name.toLowerCase().includes(deepLinkedSubject))
                : false;

            if (matchesSearch || matchesCurriculum || matchesSubject) {
                keys.add(curriculumKey);
            }
        });

        return keys;
    }, [deepLinkedCurriculum, deepLinkedSubject, grouped, search]);

    const autoExpandedSubjectKeys = useMemo(() => {
        const keys = new Set<string>();

        grouped.forEach((group) => {
            Array.from(group.subjects.keys()).forEach((subjectName) => {
                const matchesSearch = search.trim().length > 0;
                const matchesDeepLink = deepLinkedSubject
                    ? subjectName.toLowerCase().includes(deepLinkedSubject)
                    : false;

                if (matchesSearch || matchesDeepLink) {
                    keys.add(getSubjectGroupKey(group.curriculumName, subjectName));
                }
            });
        });

        return keys;
    }, [deepLinkedSubject, grouped, search]);

    useEffect(() => {
        setCollapsedCurriculumKeys((current) => (
            new Set(Array.from(current).filter((key) => autoExpandedCurriculumKeys.has(key)))
        ));
    }, [autoExpandedCurriculumKeys]);

    useEffect(() => {
        setCollapsedSubjectKeys((current) => (
            new Set(Array.from(current).filter((key) => autoExpandedSubjectKeys.has(key)))
        ));
    }, [autoExpandedSubjectKeys]);

    const isCurriculumExpanded = useCallback((curriculumName: string) => {
        const curriculumKey = getCurriculumGroupKey(curriculumName);

        if (autoExpandedCurriculumKeys.has(curriculumKey)) {
            return !collapsedCurriculumKeys.has(curriculumKey);
        }

        return expandedCurriculumKeys.has(curriculumKey);
    }, [autoExpandedCurriculumKeys, collapsedCurriculumKeys, expandedCurriculumKeys]);

    const isSubjectExpanded = useCallback((curriculumName: string, subjectName: string) => {
        const subjectKey = getSubjectGroupKey(curriculumName, subjectName);

        if (autoExpandedSubjectKeys.has(subjectKey)) {
            return !collapsedSubjectKeys.has(subjectKey);
        }

        return expandedSubjectKeys.has(subjectKey);
    }, [autoExpandedSubjectKeys, collapsedSubjectKeys, expandedSubjectKeys]);

    const toggleCurriculum = useCallback((curriculumName: string) => {
        const curriculumKey = getCurriculumGroupKey(curriculumName);

        if (autoExpandedCurriculumKeys.has(curriculumKey)) {
            setCollapsedCurriculumKeys((current) => {
                const next = new Set(current);
                if (next.has(curriculumKey)) {
                    next.delete(curriculumKey);
                } else {
                    next.add(curriculumKey);
                }
                return next;
            });
            return;
        }

        setExpandedCurriculumKeys((current) => {
            const next = new Set(current);
            if (next.has(curriculumKey)) {
                next.delete(curriculumKey);
            } else {
                next.add(curriculumKey);
            }
            return next;
        });
    }, [autoExpandedCurriculumKeys]);

    const toggleSubject = useCallback((curriculumName: string, subjectName: string) => {
        const subjectKey = getSubjectGroupKey(curriculumName, subjectName);

        if (autoExpandedSubjectKeys.has(subjectKey)) {
            setCollapsedSubjectKeys((current) => {
                const next = new Set(current);
                if (next.has(subjectKey)) {
                    next.delete(subjectKey);
                } else {
                    next.add(subjectKey);
                }
                return next;
            });
            return;
        }

        setExpandedSubjectKeys((current) => {
            const next = new Set(current);
            if (next.has(subjectKey)) {
                next.delete(subjectKey);
            } else {
                next.add(subjectKey);
            }
            return next;
        });
    }, [autoExpandedSubjectKeys]);

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
            setPageError(resolveErrorMessage(error as ApiError, 'Failed to delete subject.'));
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
        handleSave,
        handleDelete,
    };
}

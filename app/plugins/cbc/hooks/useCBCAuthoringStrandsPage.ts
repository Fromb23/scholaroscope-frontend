import { useMemo, useState } from 'react';
import {
    useStrands,
    useCreateStrand,
    useUpdateStrand,
    useDeleteStrand,
} from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { useAcademic } from '@/app/core/hooks/useAcademic';
import { resolveErrorMessage } from '@/app/plugins/cbc/components/CBCComponents';
import type { Strand, StrandFormData } from '@/app/plugins/cbc/types/cbc';
import type { Subject } from '@/app/core/types/academic';

const EMPTY_FORM: Partial<StrandFormData> = { name: '', description: '', subject: null };

export function useCBCAuthoringStrandsPage() {
    const { selectedCurriculumId, selectedSubjectId, setSelectedSubject } = useCBCContext();
    const { subjects = [] } = useAcademic();

    const { data: strands = [], isLoading, error, refetch } = useStrands(
        selectedCurriculumId ? { curriculum: selectedCurriculumId } : undefined
    );

    const createMutation = useCreateStrand();
    const updateMutation = useUpdateStrand();
    const deleteMutation = useDeleteStrand();

    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState<Partial<StrandFormData>>(EMPTY_FORM);
    const [createError, setCreateError] = useState<string | null>(null);
    const [editId, setEditId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<StrandFormData>>({});
    const [editError, setEditError] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const subjectsForCurriculum = useMemo(
        () => subjects.filter((subject: Subject) => subject.curriculum === selectedCurriculumId),
        [subjects, selectedCurriculumId]
    );

    const visibleStrands = useMemo(() => {
        if (!selectedSubjectId) return strands;
        return strands.filter(strand => strand.subject_org_id === selectedSubjectId);
    }, [strands, selectedSubjectId]);

    const subjectOptions = [
        { value: '', label: 'None' },
        ...subjectsForCurriculum.map((subject: Subject) => ({
            value: String(subject.id),
            label: subject.name,
        })),
    ];

    const handleCreate = async () => {
        if (!selectedCurriculumId || !createForm.name) return;

        setCreateError(null);
        try {
            await createMutation.mutateAsync({
                curriculum: selectedCurriculumId,
                subject: createForm.subject ?? null,
                name: createForm.name,
                description: createForm.description ?? '',
            });
            setShowCreate(false);
            setCreateForm(EMPTY_FORM);
        } catch (error) {
            setCreateError(resolveErrorMessage(error));
        }
    };

    const startEdit = (strand: Strand) => {
        setEditId(strand.id);
        setEditForm({
            name: strand.name,
            description: strand.description,
            subject: strand.subject_org_id ?? null,
        });
        setEditError(null);
    };

    const saveEdit = async () => {
        if (!editId) return;

        setEditError(null);
        try {
            await updateMutation.mutateAsync({ id: editId, data: editForm });
            setEditId(null);
        } catch (error) {
            setEditError(resolveErrorMessage(error));
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        try {
            await deleteMutation.mutateAsync(deleteId);
            setDeleteId(null);
        } catch {
            setDeleteId(null);
        }
    };

    return {
        selectedCurriculumId,
        selectedSubjectId,
        setSelectedSubject,
        isLoading,
        error,
        refetch,
        showCreate,
        setShowCreate,
        createForm,
        setCreateForm,
        createError,
        setCreateError,
        editId,
        setEditId,
        editForm,
        setEditForm,
        editError,
        deleteId,
        setDeleteId,
        subjectsForCurriculum,
        visibleStrands,
        subjectOptions,
        createMutation,
        updateMutation,
        deleteMutation,
        handleCreate,
        startEdit,
        saveEdit,
        confirmDelete,
    };
}

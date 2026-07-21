import { useMemo, useState } from 'react';
import {
    useSubStrandDetail,
    useLearningOutcomes,
    useCreateOutcome,
    useUpdateOutcome,
    useDeleteOutcome,
} from '@/app/plugins/cbc/hooks/useCBC';
import { resolveErrorMessage } from '@/app/plugins/cbc/components/CBCComponents';
import type { LearningOutcome, LearningOutcomeFormData } from '@/app/plugins/cbc/types/cbc';

type OutcomeForm = Omit<Partial<LearningOutcomeFormData>, 'sub_strand' | 'grade'>;

export function useCBCAuthoringOutcomesPage(subStrandId: number) {
    const { data: subStrand, isLoading: subStrandLoading, error: subStrandError } = useSubStrandDetail(subStrandId);
    const { data: outcomes = [], isLoading, error, refetch } = useLearningOutcomes({ sub_strand: subStrandId });

    const inferredLevel = useMemo(() => {
        if (!subStrand) return '';
        return '';
    }, [subStrand]);

    const createMutation = useCreateOutcome();
    const updateMutation = useUpdateOutcome();
    const deleteMutation = useDeleteOutcome();

    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState<OutcomeForm>({ description: '', level: inferredLevel });
    const [createError, setCreateError] = useState<string | null>(null);
    const [editId, setEditId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<OutcomeForm>({});
    const [editError, setEditError] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const handleCreate = async () => {
        if (!createForm.description) return;

        setCreateError(null);
        try {
            await createMutation.mutateAsync({
                sub_strand: subStrandId,
                description: createForm.description,
                grade: null,
                level: subStrand?.subject_level ?? '',
            });
            setShowCreate(false);
            setCreateForm({ description: '', level: inferredLevel });
        } catch (error) {
            setCreateError(resolveErrorMessage(error));
        }
    };

    const startEdit = (outcome: LearningOutcome) => {
        setEditId(outcome.id);
        setEditForm({ description: outcome.description, level: outcome.level });
        setEditError(null);
    };

    const saveEdit = async () => {
        if (!editId) return;

        setEditError(null);
        try {
            await updateMutation.mutateAsync({
                id: editId,
                data: {
                    ...editForm,
                    level: subStrand?.subject_level ?? '',
                },
            });
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
        subStrand,
        subStrandLoading,
        subStrandError,
        outcomes,
        isLoading,
        error,
        refetch,
        inferredLevel,
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
        createMutation,
        updateMutation,
        deleteMutation,
        handleCreate,
        startEdit,
        saveEdit,
        confirmDelete,
    };
}

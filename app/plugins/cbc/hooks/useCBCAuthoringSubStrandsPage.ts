import { useState } from 'react';
import {
    useStrandDetail,
    useSubStrands,
    useCreateSubStrand,
    useUpdateSubStrand,
    useDeleteSubStrand,
} from '@/app/plugins/cbc/hooks/useCBC';
import { resolveErrorMessage } from '@/app/plugins/cbc/components/CBCComponents';
import type { SubStrand, SubStrandFormData } from '@/app/plugins/cbc/types/cbc';

const EMPTY_FORM: Partial<SubStrandFormData> = { name: '', description: '' };

export function useCBCAuthoringSubStrandsPage(strandId: number) {
    const { data: strand, isLoading: strandLoading, error: strandError } = useStrandDetail(strandId);
    const { data: subStrands = [], isLoading, error, refetch } = useSubStrands(strandId);

    const createMutation = useCreateSubStrand();
    const updateMutation = useUpdateSubStrand();
    const deleteMutation = useDeleteSubStrand();

    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState<Partial<SubStrandFormData>>(EMPTY_FORM);
    const [createError, setCreateError] = useState<string | null>(null);
    const [editId, setEditId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<SubStrandFormData>>({});
    const [editError, setEditError] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const handleCreate = async () => {
        if (!createForm.name) return;

        setCreateError(null);
        try {
            await createMutation.mutateAsync({
                strand: strandId,
                name: createForm.name,
                description: createForm.description ?? '',
            });
            setShowCreate(false);
            setCreateForm(EMPTY_FORM);
        } catch (error) {
            setCreateError(resolveErrorMessage(error));
        }
    };

    const startEdit = (subStrand: SubStrand) => {
        setEditId(subStrand.id);
        setEditForm({ name: subStrand.name, description: subStrand.description });
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
        strand,
        strandLoading,
        strandError,
        subStrands,
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
        createMutation,
        updateMutation,
        deleteMutation,
        handleCreate,
        startEdit,
        saveEdit,
        confirmDelete,
    };
}

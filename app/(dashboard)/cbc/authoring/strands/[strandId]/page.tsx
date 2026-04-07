'use client';
// app/(dashboard)/cbc/authoring/strands/[strandId]/page.tsx

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, ChevronRight, Layers, X } from 'lucide-react';
import {
    useStrandDetail, useSubStrands,
    useCreateSubStrand, useUpdateSubStrand, useDeleteSubStrand,
} from '@/app/plugins/cbc/hooks/useCBC';
import {
    CBCNav, CBCBreadcrumb, CBCError, CBCLoading, CBCEmpty, extractErrorMessage,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import Modal from '@/app/components/ui/Modal';
import { DataTable, Column } from '@/app/components/ui/Table';
import type { SubStrand, SubStrandFormData } from '@/app/plugins/cbc/types/cbc';

const EMPTY_FORM: Partial<SubStrandFormData> = { name: '', description: '' };

export default function ManageSubStrandsPage() {
    const { strandId: raw } = useParams<{ strandId: string }>();
    const strandId = Number(raw);
    const router = useRouter();

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
                strand: strandId, name: createForm.name,
                description: createForm.description ?? '',
            });
            setShowCreate(false);
            setCreateForm(EMPTY_FORM);
        } catch (e) { setCreateError(extractErrorMessage(e)); }
    };

    const startEdit = (ss: SubStrand) => {
        setEditId(ss.id);
        setEditForm({ name: ss.name, description: ss.description });
        setEditError(null);
    };

    const saveEdit = async () => {
        if (!editId) return;
        setEditError(null);
        try {
            await updateMutation.mutateAsync({ id: editId, data: editForm });
            setEditId(null);
        } catch (e) { setEditError(extractErrorMessage(e)); }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteMutation.mutateAsync(deleteId);
            setDeleteId(null);
        } catch { setDeleteId(null); }
    };

    const columns: Column<SubStrand>[] = [
        {
            key: 'code', header: 'Code', sortable: true,
            render: r => <Badge variant="indigo" size="md" className="font-mono">{r.code}</Badge>,
        },
        {
            key: 'name', header: 'Sub-Strand', sortable: true,
            render: r => (
                <div>
                    <p className="font-medium text-gray-900">{r.name}</p>
                    {r.description && <p className="text-xs text-gray-500 line-clamp-1">{r.description}</p>}
                </div>
            ),
        },
        {
            key: 'outcomes_count', header: 'Outcomes', sortable: true,
            render: r => (
                <div className="flex items-center justify-center gap-1.5">
                    <span className="text-sm font-medium">{r.outcomes_count}</span>
                </div>
            ),
            headerClassName: 'text-center', className: 'text-center',
        },
        {
            key: 'actions', header: '',
            render: r => (
                <div className="flex items-center justify-end gap-1">
                    <Link href={`/cbc/authoring/sub-strands/${r.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                    <button onClick={() => startEdit(r)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteId(r.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
            className: 'w-28',
        },
    ];

    if (strandLoading) return <CBCLoading />;
    if (strandError || !strand) return (
        <div className="space-y-6">
            <CBCNav />
            <CBCError error={strandError ?? 'Strand not found'} />
        </div>
    );

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Authoring', href: '/cbc/authoring' },
                { label: 'Strands', href: '/cbc/authoring/strands' },
                { label: strand.name },
            ]} />

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/cbc/authoring/strands"
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="p-2.5 bg-blue-100 rounded-lg">
                        <Layers className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <Badge variant="blue" size="md" className="font-mono">{strand.code}</Badge>
                            <h1 className="text-xl font-bold text-gray-900">{strand.name}</h1>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {strand.subject_name ?? strand.curriculum_name}
                        </p>
                    </div>
                </div>
                <Button variant="primary" size="md"
                    onClick={() => { setShowCreate(true); setCreateError(null); }}>
                    <Plus className="h-4 w-4 mr-2" />Add Sub-Strand
                </Button>
            </div>

            {error && <CBCError error={error} onRetry={refetch} />}

            {/* Create form */}
            {showCreate && (
                <Card className="border-blue-200 bg-blue-50/50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <div className="p-1.5 bg-blue-600 rounded-lg">
                                <Plus className="h-4 w-4 text-white" />
                            </div>
                            New Sub-Strand
                        </h3>
                        <button onClick={() => setShowCreate(false)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Name *" placeholder="Sub-strand name"
                            value={createForm.name ?? ''}
                            onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} />
                        <Input label="Description (optional)"
                            value={createForm.description ?? ''}
                            onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    {createError && (
                        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            {createError}
                        </p>
                    )}
                    <div className="flex gap-3 mt-5">
                        <Button variant="primary" size="md"
                            onClick={handleCreate}
                            disabled={createMutation.isPending || !createForm.name}>
                            {createMutation.isPending ? 'Creating…' : 'Create Sub-Strand'}
                        </Button>
                        <Button variant="ghost" size="md" onClick={() => setShowCreate(false)}>Cancel</Button>
                    </div>
                </Card>
            )}

            {/* Edit form */}
            {editId !== null && (
                <Card className="border-purple-200 bg-purple-50/50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <div className="p-1.5 bg-purple-600 rounded-lg">
                                <Pencil className="h-4 w-4 text-white" />
                            </div>
                            Edit Sub-Strand
                        </h3>
                        <button onClick={() => setEditId(null)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Name *" value={editForm.name ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                        <Input label="Description" value={editForm.description ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    {editError && (
                        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            {editError}
                        </p>
                    )}
                    <div className="flex gap-3 mt-5">
                        <Button variant="primary" size="md"
                            onClick={saveEdit} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                        </Button>
                        <Button variant="ghost" size="md" onClick={() => setEditId(null)}>Cancel</Button>
                    </div>
                </Card>
            )}

            {/* Table */}
            <Card>
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Layers className="h-5 w-5 text-blue-600" />
                        Sub-Strands
                        {subStrands.length > 0 && <Badge variant="blue" size="sm">{subStrands.length}</Badge>}
                    </h2>
                </div>
                <DataTable
                    data={subStrands}
                    columns={columns}
                    loading={isLoading}
                    enableSearch
                    enableSort
                    searchPlaceholder="Search sub-strands…"
                    emptyMessage="No sub-strands yet."
                    onRowClick={r => router.push(`/cbc/authoring/sub-strands/${r.id}`)}
                />
            </Card>

            <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)}
                title="Delete Sub-Strand" size="sm">
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                            This will permanently delete the sub-strand and all its learning outcomes.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" size="md" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="danger" size="md"
                            onClick={confirmDelete} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
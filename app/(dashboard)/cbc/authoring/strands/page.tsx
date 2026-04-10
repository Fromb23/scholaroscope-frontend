'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Pencil, Trash2, ChevronRight, BookOpen, X, Layers } from 'lucide-react';
import {
    useStrands, useCreateStrand, useUpdateStrand, useDeleteStrand,
} from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { useAcademic } from '@/app/core/hooks/useAcademic';
import {
    CBCNav, CBCBreadcrumb, CBCError, CBCLoading, CBCEmpty,
    SubjectGroupPicker, extractErrorMessage,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import Modal from '@/app/components/ui/Modal';
import { DataTable, Column } from '@/app/components/ui/Table';
import type { Strand, StrandFormData } from '@/app/plugins/cbc/types/cbc';

const EMPTY_FORM: Partial<StrandFormData> = { name: '', description: '', subject: null };

export default function ManageStrandsPage() {
    const router = useRouter();
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
        () => subjects.filter((s: any) => s.curriculum === selectedCurriculumId),
        [subjects, selectedCurriculumId]
    );

    const visibleStrands = useMemo(() => {
        if (!selectedSubjectId) return strands;
        return strands.filter(s => s.subject === selectedSubjectId);
    }, [strands, selectedSubjectId]);

    const subjectOptions = [
        { value: '', label: 'None' },
        ...subjectsForCurriculum.map((s: any) => ({ value: String(s.id), label: s.name })),
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
        } catch (e) {
            setCreateError(extractErrorMessage(e));
        }
    };

    const startEdit = (strand: Strand) => {
        setEditId(strand.id);
        setEditForm({ name: strand.name, description: strand.description, subject: strand.subject });
        setEditError(null);
    };

    const saveEdit = async () => {
        if (!editId) return;
        setEditError(null);
        try {
            await updateMutation.mutateAsync({ id: editId, data: editForm });
            setEditId(null);
        } catch (e) {
            setEditError(extractErrorMessage(e));
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteMutation.mutateAsync(deleteId);
            setDeleteId(null);
        } catch { setDeleteId(null); }
    };

    const columns: Column<Strand & Record<string, unknown>>[] = [
        {
            key: 'code',
            header: 'Code',
            sortable: true,
            render: r => (
                <Badge variant="blue" size="md" className="font-mono font-semibold">{r.code}</Badge>
            ),
        },
        {
            key: 'name',
            header: 'Strand',
            sortable: true,
            render: r => (
                <div>
                    <p className="font-medium text-gray-900">{r.name}</p>
                    {r.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.description as string}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'subject_name',
            header: 'Subject',
            sortable: true,
            render: r => r.subject_name
                ? <Badge variant="purple" size="sm">{r.subject_name as string}</Badge>
                : <span className="text-xs text-gray-400">—</span>,
            className: 'text-center',
        },
        {
            key: 'sub_strands_count',
            header: 'Sub-Strands',
            sortable: true,
            render: r => (
                <div className="flex items-center justify-center gap-1.5">
                    <Layers className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{r.sub_strands_count as number}</span>
                </div>
            ),
            headerClassName: 'text-center',
            className: 'text-center',
        },
        {
            key: 'actions',
            header: '',
            render: r => (
                <div className="flex items-center justify-end gap-1">
                    <Link
                        href={`/cbc/authoring/strands/${r.id}`}
                        onClick={e => e.stopPropagation()}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                    <button
                        onClick={e => { e.stopPropagation(); startEdit(r as unknown as Strand); }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={e => { e.stopPropagation(); setDeleteId(r.id as number); }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
            className: 'w-32',
        },
    ];

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Authoring', href: '/cbc/authoring' },
                { label: 'Strands' },
            ]} />

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/cbc/authoring"
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="p-2.5 bg-blue-100 rounded-lg">
                        <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Manage Strands</h1>
                        <p className="text-sm text-gray-500">Create and organise curriculum strands</p>
                    </div>
                </div>
                {selectedCurriculumId && (
                    <Button variant="primary" size="md"
                        onClick={() => { setShowCreate(true); setCreateError(null); }}>
                        <Plus className="h-4 w-4 mr-2" />Add Strand
                    </Button>
                )}
            </div>

            {error && <CBCError error={error} onRetry={refetch} />}

            {showCreate && selectedCurriculumId && (
                <Card className="border-blue-200 bg-blue-50/50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <div className="p-1.5 bg-blue-600 rounded-lg">
                                <Plus className="h-4 w-4 text-white" />
                            </div>
                            New Strand
                        </h3>
                        <button onClick={() => setShowCreate(false)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input label="Name *" placeholder="e.g. Algebra"
                            value={createForm.name ?? ''}
                            onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} />
                        <Select label="Subject (optional)" value={createForm.subject?.toString() ?? ''}
                            onChange={e => setCreateForm(p => ({ ...p, subject: e.target.value ? Number(e.target.value) : null }))}
                            options={subjectOptions} />
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
                            {createMutation.isPending ? 'Creating…' : 'Create Strand'}
                        </Button>
                        <Button variant="ghost" size="md" onClick={() => setShowCreate(false)}>
                            Cancel
                        </Button>
                    </div>
                </Card>
            )}

            {editId !== null && (
                <Card className="border-purple-200 bg-purple-50/50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <div className="p-1.5 bg-purple-600 rounded-lg">
                                <Pencil className="h-4 w-4 text-white" />
                            </div>
                            Edit Strand
                        </h3>
                        <button onClick={() => setEditId(null)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input label="Name *" value={editForm.name ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                        <Select label="Subject" value={editForm.subject?.toString() ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, subject: e.target.value ? Number(e.target.value) : null }))}
                            options={subjectOptions} />
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

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-900">Subject</h3>
                        </div>
                        <SubjectGroupPicker
                            subjects={subjectsForCurriculum}
                            selectedSubjectId={selectedSubjectId}
                            onSelect={setSelectedSubject}
                        />
                    </Card>
                </div>

                {/* Table */}
                <div className="lg:col-span-3">
                    <Card>
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-blue-600" />
                                Curriculum Strands
                                {visibleStrands.length > 0 && (
                                    <Badge variant="blue" size="sm">{visibleStrands.length}</Badge>
                                )}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Click a strand to manage its sub-strands</p>
                        </div>

                        {!selectedCurriculumId ? (
                            <CBCEmpty icon={BookOpen} title="No curriculum"
                                description="No CBC curriculum found for your organisation." />
                        ) : isLoading ? (
                            <CBCLoading />
                        ) : (
                            <DataTable<Strand & Record<string, unknown>>
                                data={visibleStrands.map(s => s as Strand & Record<string, unknown>)}
                                columns={columns}
                                loading={isLoading}
                                enableSearch
                                enableSort
                                searchPlaceholder="Search strands…"
                                emptyMessage="No strands yet. Click 'Add Strand' to create one."
                                onRowClick={r => router.push(`/cbc/authoring/strands/${r.id as number}`)}
                            />
                        )}
                    </Card>
                </div>
            </div>

            <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)}
                title="Delete Strand" size="sm">
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800 font-medium mb-1">This cannot be undone.</p>
                        <p className="text-sm text-red-700">
                            All sub-strands and learning outcomes under this strand will be deleted.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" size="md" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="danger" size="md"
                            onClick={confirmDelete} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? 'Deleting…' : 'Delete Strand'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
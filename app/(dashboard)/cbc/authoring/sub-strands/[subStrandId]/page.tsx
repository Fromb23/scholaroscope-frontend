'use client';
// app/(dashboard)/cbc/authoring/sub-strands/[subStrandId]/page.tsx

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    ArrowLeft, Plus, Pencil, Trash2, BookOpen, Target, FileText, X,
} from 'lucide-react';
import {
    useSubStrandDetail, useLearningOutcomes,
    useCreateOutcome, useUpdateOutcome, useDeleteOutcome,
} from '@/app/plugins/cbc/hooks/useCBC';
import { useAcademic } from '@/app/core/hooks/useAcademic';
import {
    CBCNav, CBCBreadcrumb, CBCError, CBCLoading, extractErrorMessage,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import Modal from '@/app/components/ui/Modal';
import { DataTable, Column } from '@/app/components/ui/Table';
import type { LearningOutcome, LearningOutcomeFormData } from '@/app/plugins/cbc/types/cbc';

type OutcomeForm = Omit<Partial<LearningOutcomeFormData>, 'sub_strand'>;
const EMPTY: OutcomeForm = { description: '', grade: null, level: '' };

export default function ManageSubStrandDetailPage() {
    const { subStrandId: raw } = useParams<{ subStrandId: string }>();
    const subStrandId = Number(raw);

    const { data: subStrand, isLoading: ssLoading, error: ssError } = useSubStrandDetail(subStrandId);
    const { data: outcomes = [], isLoading, error, refetch } = useLearningOutcomes({ sub_strand: subStrandId });
    const { grades = [] } = useAcademic();

    const createMutation = useCreateOutcome();
    const updateMutation = useUpdateOutcome();
    const deleteMutation = useDeleteOutcome();

    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState<OutcomeForm>(EMPTY);
    const [createError, setCreateError] = useState<string | null>(null);

    const [editId, setEditId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<OutcomeForm>({});
    const [editError, setEditError] = useState<string | null>(null);

    const [deleteId, setDeleteId] = useState<number | null>(null);

    const gradeOptions = [
        { value: '', label: 'All Grades' },
        ...grades.map((g: any) => ({ value: String(g.id), label: g.name })),
    ];

    const handleCreate = async () => {
        if (!createForm.description) return;
        setCreateError(null);
        try {
            await createMutation.mutateAsync({
                sub_strand: subStrandId,
                description: createForm.description,
                grade: createForm.grade ?? null,
                level: createForm.level ?? '',
            });
            setShowCreate(false);
            setCreateForm(EMPTY);
        } catch (e) { setCreateError(extractErrorMessage(e)); }
    };

    const startEdit = (o: LearningOutcome) => {
        setEditId(o.id);
        setEditForm({ description: o.description, grade: o.grade, level: o.level });
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

    const columns: Column<LearningOutcome>[] = [
        {
            key: 'code', header: 'Code', sortable: true,
            render: r => (
                <Badge variant="purple" size="md" className="font-mono font-semibold">{r.code}</Badge>
            ),
        },
        {
            key: 'description', header: 'Learning Outcome',
            render: r => <p className="text-sm text-gray-900 line-clamp-2 max-w-md">{r.description}</p>,
        },
        {
            key: 'grade', header: 'Grade', sortable: true,
            render: r => r.grade_name
                ? <Badge variant="blue" size="sm">{r.grade_name}</Badge>
                : <span className="text-xs text-gray-400">All</span>,
            headerClassName: 'text-center', className: 'text-center',
        },
        {
            key: 'evidence_count', header: 'Evidence', sortable: true,
            render: r => (
                <div className="flex items-center justify-center gap-1.5">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{r.evidence_count}</span>
                </div>
            ),
            headerClassName: 'text-center', className: 'text-center',
        },
        {
            key: 'actions', header: '',
            render: r => (
                <div className="flex items-center justify-end gap-1">
                    <button onClick={() => startEdit(r)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setDeleteId(r.id)}
                        disabled={r.evidence_count > 0}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg
              disabled:opacity-30 disabled:cursor-not-allowed"
                        title={r.evidence_count > 0 ? 'Has evidence records' : 'Delete'}>
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
            className: 'w-24',
        },
    ];

    if (ssLoading) return <CBCLoading />;
    if (ssError || !subStrand) return (
        <div className="space-y-6"><CBCNav /><CBCError error={ssError ?? 'Not found'} /></div>
    );

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Authoring', href: '/cbc/authoring' },
                { label: 'Strands', href: '/cbc/authoring/strands' },
                { label: subStrand.strand_name, href: `/cbc/authoring/strands/${subStrand.strand}` },
                { label: subStrand.name },
            ]} />

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <Link href={`/cbc/authoring/strands/${subStrand.strand}`}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="p-2.5 bg-purple-100 rounded-lg">
                        <BookOpen className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{subStrand.strand_name} /</span>
                            <Badge variant="purple" size="lg" className="font-mono">{subStrand.code}</Badge>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 mt-0.5">{subStrand.name}</h1>
                    </div>
                </div>
                <Button variant="primary" size="md"
                    onClick={() => { setShowCreate(true); setCreateError(null); }}>
                    <Plus className="h-4 w-4 mr-2" />Add Outcome
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
                            New Learning Outcome
                            <span className="text-xs text-gray-400 font-normal">
                                — code assigned automatically
                            </span>
                        </h3>
                        <button onClick={() => setShowCreate(false)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select label="Grade (optional)" value={createForm.grade?.toString() ?? ''}
                            onChange={e => setCreateForm(p => ({ ...p, grade: e.target.value ? Number(e.target.value) : null }))}
                            options={gradeOptions} />
                        <Input label="Level (optional)" placeholder="e.g. Grade 7"
                            value={createForm.level ?? ''}
                            onChange={e => setCreateForm(p => ({ ...p, level: e.target.value }))} />
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description *
                        </label>
                        <textarea
                            placeholder="What the learner should demonstrate…"
                            value={createForm.description ?? ''}
                            onChange={e => setCreateForm(p => ({ ...p, description: e.target.value }))}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>
                    {createError && (
                        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            {createError}
                        </p>
                    )}
                    <div className="flex gap-3 mt-4">
                        <Button variant="primary" size="md"
                            onClick={handleCreate}
                            disabled={createMutation.isPending || !createForm.description}>
                            {createMutation.isPending ? 'Creating…' : 'Create Outcome'}
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
                            Edit Learning Outcome
                        </h3>
                        <button onClick={() => setEditId(null)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select label="Grade" value={editForm.grade?.toString() ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, grade: e.target.value ? Number(e.target.value) : null }))}
                            options={gradeOptions} />
                        <Input label="Level" value={editForm.level ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, level: e.target.value }))} />
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                        <textarea
                            value={editForm.description ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        />
                    </div>
                    {editError && (
                        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            {editError}
                        </p>
                    )}
                    <div className="flex gap-3 mt-4">
                        <Button variant="primary" size="md"
                            onClick={saveEdit} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                        </Button>
                        <Button variant="ghost" size="md" onClick={() => setEditId(null)}>Cancel</Button>
                    </div>
                </Card>
            )}

            {/* Outcomes table */}
            <Card>
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            Learning Outcomes
                            <Badge variant="blue" size="sm">{outcomes.length}</Badge>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Codes are auto-generated as <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                                {subStrand.code}.N
                            </span>
                        </p>
                    </div>
                </div>
                <DataTable
                    data={outcomes}
                    columns={columns}
                    loading={isLoading}
                    enableSearch
                    enableSort
                    searchPlaceholder="Search outcomes by code or description…"
                    emptyMessage="No outcomes yet. Click 'Add Outcome' to create one."
                />
            </Card>

            <Modal isOpen={deleteId !== null} onClose={() => setDeleteId(null)}
                title="Delete Learning Outcome" size="sm">
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                            This will permanently delete this learning outcome.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" size="md" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="danger" size="md"
                            onClick={confirmDelete} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? 'Deleting…' : 'Delete Outcome'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
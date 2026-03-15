// ============================================================================
// app/(dashboard)/cbc/authoring/sub-strands/[subStrandId]/page.tsx
// Learning-Outcome CRUD for a single Sub-Strand (Admin) - REDESIGNED
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Pencil,
    Check,
    X,
    BookOpen,
    GraduationCap,
    Target,
    FileText
} from 'lucide-react';
import { subStrandAPI } from '@/app/plugins/cbc/api/cbc';
import { useLearningOutcomes } from '@/app/plugins/cbc/hooks/useCBC';
import { useAcademic } from '@/app/core/hooks/useAcademic';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import Modal from '@/app/components/ui/Modal';
import { DataTable, Column } from '@/app/components/ui/Table';
import { SubStrandDetail, LearningOutcomeFormData } from '@/app/plugins/cbc/types/cbc';

export default function ManageSubStrandDetailPage() {
    const { subStrandId: rawId } = useParams<{ subStrandId: string }>();
    const subStrandId = Number(rawId);

    // ---------------------------------------------------------------
    // Fetch sub-strand detail (includes parent strand name)
    // ---------------------------------------------------------------
    const [subStrand, setSubStrand] = useState<SubStrandDetail | null>(null);
    const [headerLoading, setHeaderLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                setHeaderLoading(true);
                const data = await subStrandAPI.getById(subStrandId);
                setSubStrand(data);
            } catch {
                setSubStrand(null);
            } finally {
                setHeaderLoading(false);
            }
        };
        fetch();
    }, [subStrandId]);

    // ---------------------------------------------------------------
    // Learning outcomes for this sub-strand
    // ---------------------------------------------------------------
    const { outcomes, loading: outcomesLoading, createOutcome, updateOutcome, deleteOutcome } = useLearningOutcomes({ sub_strand: subStrandId });

    const { grades = [] } = useAcademic();

    // ---------------------------------------------------------------
    // Sub-strand edit
    // ---------------------------------------------------------------
    const [editingHeader, setEditingHeader] = useState(false);
    const [headerForm, setHeaderForm] = useState({ code: '', name: '', description: '', sequence: 0 });
    const [headerError, setHeaderError] = useState<string | null>(null);
    const [savingHeader, setSavingHeader] = useState(false);

    const openHeaderEdit = () => {
        if (!subStrand) return;
        setHeaderForm({
            code: subStrand.code,
            name: subStrand.name,
            description: subStrand.description,
            sequence: subStrand.sequence,
        });
        setEditingHeader(true);
        setHeaderError(null);
    };

    const saveHeaderEdit = async () => {
        setSavingHeader(true);
        setHeaderError(null);
        try {
            await subStrandAPI.update(subStrandId, {
                ...headerForm,
                strand: subStrand!.strand,
            });
            setSubStrand(prev => prev ? { ...prev, ...headerForm } : prev);
            setEditingHeader(false);
        } catch (err: any) {
            setHeaderError(err.message || 'Failed to save');
        } finally {
            setSavingHeader(false);
        }
    };

    // ---------------------------------------------------------------
    // Outcome create
    // ---------------------------------------------------------------
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState<Partial<LearningOutcomeFormData>>({
        code: '', description: '', grade: null, level: ''
    });
    const [createError, setCreateError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    const handleCreate = async () => {
        if (!createForm.code || !createForm.description) return;
        setCreating(true);
        setCreateError(null);
        try {
            await createOutcome({
                ...createForm,
                sub_strand: subStrandId,
            } as LearningOutcomeFormData);
            setShowCreate(false);
            setCreateForm({ code: '', description: '', grade: null, level: '' });
        } catch (err: any) {
            setCreateError(err.message || 'Failed to create');
        } finally {
            setCreating(false);
        }
    };

    // ---------------------------------------------------------------
    // Outcome inline edit
    // ---------------------------------------------------------------
    const [editId, setEditId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<LearningOutcomeFormData>>({});
    const [editError, setEditError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);

    const handleEdit = (outcome: any) => {
        setEditId(outcome.id);
        setEditForm({
            sub_strand: outcome.sub_strand,
            code: outcome.code,
            description: outcome.description,
            grade: outcome.grade,
            level: outcome.level,
        });
        setEditError(null);
    };

    const handleSaveEdit = async () => {
        if (!editId) return;
        setEditing(true);
        setEditError(null);
        try {
            await updateOutcome(editId, editForm);
            setEditId(null);
        } catch (err: any) {
            setEditError(err.message || 'Failed to update');
        } finally {
            setEditing(false);
        }
    };

    // ---------------------------------------------------------------
    // Outcome delete
    // ---------------------------------------------------------------
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await deleteOutcome(deleteId);
            setDeleteId(null);
        } catch {
            setDeleteId(null);
        } finally {
            setDeleting(false);
        }
    };

    // ---------------------------------------------------------------
    // Table columns configuration
    // ---------------------------------------------------------------
    const columns: Column<any>[] = [
        {
            key: 'code',
            header: 'Code',
            sortable: true,
            render: (row) => (
                <Badge variant="purple" size="md" className="font-mono font-semibold">
                    {row.code}
                </Badge>
            )
        },
        {
            key: 'description',
            header: 'Learning Outcome',
            sortable: false,
            render: (row) => (
                <div className="max-w-md">
                    <p className="text-sm text-gray-900 line-clamp-2">
                        {row.description}
                    </p>
                </div>
            ),
            className: 'max-w-md'
        },
        {
            key: 'grade',
            header: 'Grade',
            sortable: true,
            filterable: true,
            filterOptions: [
                { value: '', label: 'All Grades' },
                ...grades.map((g: any) => ({ value: String(g.id), label: g.name }))
            ],
            render: (row) => (
                row.grade_name ? (
                    <Badge variant="blue" size="sm">
                        {row.grade_name}
                    </Badge>
                ) : (
                    <span className="text-xs text-gray-400">All</span>
                )
            ),
            headerClassName: 'text-center',
            className: 'text-center'
        },
        {
            key: 'evidence_count',
            header: 'Evidence',
            sortable: true,
            render: (row) => (
                <div className="flex items-center justify-center gap-1.5">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                        {row.evidence_count}
                    </span>
                </div>
            ),
            headerClassName: 'text-center',
            className: 'text-center'
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit outcome"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setDeleteId(row.id)}
                        disabled={row.evidence_count > 0}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={row.evidence_count > 0 ? 'Cannot delete: has evidence records' : 'Delete outcome'}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
            headerClassName: 'text-right',
            className: 'w-28 whitespace-nowrap'
        }
    ];

    // ---------------------------------------------------------------
    // Loading / not found
    // ---------------------------------------------------------------
    if (headerLoading) {
        return (
            <div className="py-16 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                <p className="mt-2 text-sm text-gray-500">Loading…</p>
            </div>
        );
    }

    if (!subStrand) {
        return (
            <div className="py-16 text-center">
                <p className="text-sm text-gray-500">Sub-strand not found</p>
                <Link href="/cbc/authoring" className="text-sm text-blue-600 hover:underline mt-2 inline-block">← Back to Authoring</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* CBC nav */}
            <nav className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
                <Link
                    href="/cbc/authoring"
                    className="flex-1 text-center text-sm font-semibold text-white bg-blue-600 rounded-lg py-2.5 shadow-sm"
                >
                    Authoring
                </Link>
                <Link
                    href="/cbc/browser"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Browser
                </Link>
                <Link
                    href="/cbc/progress"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Progress
                </Link>
                <Link
                    href="/cbc/teaching"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Teaching
                </Link>
            </nav>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/cbc/authoring/strands/${subStrand.strand}`}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2.5 bg-purple-100 rounded-lg">
                                <BookOpen className="h-6 w-6 text-purple-600" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{subStrand.strand_name} /</span>
                                <Badge variant="purple" size="lg" className="font-mono">
                                    {subStrand.code}
                                </Badge>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 ml-14">
                            {subStrand.name}
                        </h1>
                        <div className="flex items-center gap-2 ml-14 mt-1">
                            <Badge variant="blue" size="sm">
                                {outcomes.length} outcome{outcomes.length !== 1 ? 's' : ''}
                            </Badge>
                            {subStrand.description && (
                                <span className="text-sm text-gray-500">• {subStrand.description}</span>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    onClick={openHeaderEdit}
                    className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit sub-strand"
                >
                    <Pencil className="h-5 w-5" />
                </button>
            </div>

            {/* Sub-strand edit panel */}
            {editingHeader && (
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <div className="p-1.5 bg-purple-600 rounded-lg">
                                <Pencil className="h-4 w-4 text-white" />
                            </div>
                            Edit Sub-Strand Details
                        </h3>
                        <button
                            onClick={() => setEditingHeader(false)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="Code"
                            value={headerForm.code}
                            onChange={(e) => setHeaderForm(p => ({ ...p, code: e.target.value }))}
                        />
                        <Input
                            label="Name"
                            value={headerForm.name}
                            onChange={(e) => setHeaderForm(p => ({ ...p, name: e.target.value }))}
                        />
                        <Input
                            label="Sequence"
                            type="number"
                            value={headerForm.sequence.toString()}
                            onChange={(e) => setHeaderForm(p => ({ ...p, sequence: Number(e.target.value) }))}
                        />
                    </div>
                    <div className="mt-4">
                        <Input
                            label="Description (Optional)"
                            value={headerForm.description}
                            onChange={(e) => setHeaderForm(p => ({ ...p, description: e.target.value }))}
                        />
                    </div>
                    {headerError && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{headerError}</p>
                        </div>
                    )}
                    <div className="flex gap-3 mt-5">
                        <Button
                            variant="primary"
                            size="md"
                            onClick={saveHeaderEdit}
                            disabled={savingHeader}
                            className="shadow-sm"
                        >
                            {savingHeader ? 'Saving…' : 'Save Changes'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="md"
                            onClick={() => setEditingHeader(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </Card>
            )}

            {/* Learning Outcomes section */}
            <Card className="shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            Learning Outcomes
                            <Badge variant="blue" size="sm" className="ml-2">
                                {outcomes.length}
                            </Badge>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Define specific learning outcomes for this sub-strand
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        size="md"
                        onClick={() => {
                            setShowCreate(true);
                            setCreateError(null);
                        }}
                        className="shadow-sm"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Outcome
                    </Button>
                </div>

                {/* Create form */}
                {showCreate && (
                    <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <div className="p-1.5 bg-blue-600 rounded-lg">
                                    <Plus className="h-4 w-4 text-white" />
                                </div>
                                Create New Learning Outcome
                            </h3>
                            <button
                                onClick={() => setShowCreate(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="Code"
                                placeholder={`e.g. ${subStrand.code}.1`}
                                value={createForm.code ?? ''}
                                onChange={(e) => setCreateForm(p => ({ ...p, code: e.target.value }))}
                            />
                            <Select
                                label="Grade (optional)"
                                value={createForm.grade?.toString() ?? ''}
                                onChange={(e) => setCreateForm(p => ({ ...p, grade: e.target.value ? Number(e.target.value) : null }))}
                                options={[
                                    { value: '', label: 'All Grades' },
                                    ...grades.map((g: any) => ({ value: String(g.id), label: g.name }))
                                ]}
                            />
                            <Input
                                label="Level (optional)"
                                placeholder="e.g. Grade 10"
                                value={createForm.level ?? ''}
                                onChange={(e) => setCreateForm(p => ({ ...p, level: e.target.value }))}
                            />
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                placeholder="What the learner should demonstrate…"
                                value={createForm.description ?? ''}
                                onChange={(e) => setCreateForm(p => ({ ...p, description: e.target.value }))}
                                rows={3}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-500 resize-none"
                            />
                        </div>
                        {createError && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{createError}</p>
                            </div>
                        )}
                        <div className="flex gap-3 mt-4">
                            <Button
                                variant="primary"
                                size="md"
                                onClick={handleCreate}
                                disabled={creating || !createForm.code || !createForm.description}
                                className="shadow-sm"
                            >
                                {creating ? 'Creating…' : 'Create Outcome'}
                            </Button>
                            <Button
                                variant="ghost"
                                size="md"
                                onClick={() => setShowCreate(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {/* Edit inline form */}
                {editId !== null && (
                    <div className="mb-6 p-5 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                                <div className="p-1.5 bg-purple-600 rounded-lg">
                                    <Pencil className="h-4 w-4 text-white" />
                                </div>
                                Edit Learning Outcome
                            </h3>
                            <button
                                onClick={() => setEditId(null)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="Code"
                                value={editForm.code ?? ''}
                                onChange={(e) => setEditForm(p => ({ ...p, code: e.target.value }))}
                            />
                            <Select
                                label="Grade"
                                value={editForm.grade?.toString() ?? ''}
                                onChange={(e) => setEditForm(p => ({ ...p, grade: e.target.value ? Number(e.target.value) : null }))}
                                options={[
                                    { value: '', label: 'All Grades' },
                                    ...grades.map((g: any) => ({ value: String(g.id), label: g.name }))
                                ]}
                            />
                            <Input
                                label="Level"
                                value={editForm.level ?? ''}
                                onChange={(e) => setEditForm(p => ({ ...p, level: e.target.value }))}
                            />
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                value={editForm.description ?? ''}
                                onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))}
                                rows={3}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:border-purple-500 focus:ring-purple-500 resize-none"
                            />
                        </div>
                        {editError && (
                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-600">{editError}</p>
                            </div>
                        )}
                        <div className="flex gap-3 mt-4">
                            <Button
                                variant="primary"
                                size="md"
                                onClick={handleSaveEdit}
                                disabled={editing}
                                className="shadow-sm"
                            >
                                <Check className="h-4 w-4 mr-2" />
                                {editing ? 'Saving…' : 'Save Changes'}
                            </Button>
                            <Button
                                variant="ghost"
                                size="md"
                                onClick={() => setEditId(null)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}

                {/* DataTable */}
                <DataTable
                    data={outcomes}
                    columns={columns}
                    loading={outcomesLoading}
                    enableSearch={true}
                    enableSort={true}
                    enableFilter={true}
                    searchPlaceholder="Search learning outcomes by code or description..."
                    emptyMessage="No learning outcomes yet. Click 'Add Outcome' to create one."
                />
            </Card>

            {/* Delete modal */}
            <Modal
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                title="Delete Learning Outcome"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                            This action cannot be undone. This will permanently delete this learning outcome.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="primary"
                            size="md"
                            onClick={() => setDeleteId(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            size="md"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting…' : 'Delete Outcome'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
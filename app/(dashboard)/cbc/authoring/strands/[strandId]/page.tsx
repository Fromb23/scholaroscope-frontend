// ============================================================================
// app/(dashboard)/cbc/authoring/strands/[strandId]/page.tsx
// Sub-Strand Management for a single Strand (Admin) - REDESIGNED
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    Check,
    X,
    ChevronRight,
    Layers
} from 'lucide-react';

import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import Modal from '@/app/components/ui/Modal';
import { DataTable, Column } from '@/app/components/ui/Table';

import { subStrandAPI } from '@/app/plugins/cbc/api/cbc';

import { SubStrand, SubStrandFormData } from '@/app/plugins/cbc/types/cbc';

export default function ManageSubStrandsPage() {
    const params = useParams();
    const router = useRouter();
    const strandId = Number(params.strandId);

    // ------------------------------------------------------------------
    // Data state
    // ------------------------------------------------------------------
    const [subStrands, setSubStrands] = useState<SubStrand[]>([]);
    const [loading, setLoading] = useState(true);

    type SubStrandWithIndex = {
        [key: string]: unknown;
    } & SubStrand;

    // ------------------------------------------------------------------
    // Create state
    // ------------------------------------------------------------------
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState<Partial<SubStrandFormData>>({
        code: '',
        name: '',
        description: '',
        sequence: 1,
    });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // ------------------------------------------------------------------
    // Edit state
    // ------------------------------------------------------------------
    const [editId, setEditId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<SubStrandFormData>>({});
    const [editing, setEditing] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    // ------------------------------------------------------------------
    // Delete state
    // ------------------------------------------------------------------
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    // ------------------------------------------------------------------
    // Fetch sub-strands
    // ------------------------------------------------------------------
    const fetchSubStrands = async () => {
        setLoading(true);
        try {
            const data = await subStrandAPI.getAll({ strand: strandId });
            const subStrandArray = Array.isArray(data)
                ? data
                : (data && typeof data === 'object' && 'results' in data) ? (data as any).results ?? [] : []
            setSubStrands(subStrandArray);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!Number.isNaN(strandId)) fetchSubStrands();
    }, [strandId]);

    // ------------------------------------------------------------------
    // Handlers
    // ------------------------------------------------------------------
    const handleCreate = async () => {
        if (!createForm.code || !createForm.name) return;
        setCreating(true);
        setCreateError(null);

        try {
            const created = await subStrandAPI.create({
                ...createForm,
                strand: strandId,
            } as SubStrandFormData);

            setSubStrands(prev => [...prev, created]);
            setShowCreate(false);
            setCreateForm({ code: '', name: '', description: '', sequence: 1 });
        } catch (err: any) {
            setCreateError(err.message || 'Failed to create');
        } finally {
            setCreating(false);
        }
    };

    const startEdit = (ss: SubStrand) => {
        setEditId(ss.id);
        setEditForm({
            code: ss.code,
            name: ss.name,
            description: ss.description,
            sequence: ss.sequence,
        });
        setEditError(null);
    };

    const saveEdit = async () => {
        if (!editId) return;
        setEditing(true);
        setEditError(null);

        try {
            const updated = await subStrandAPI.update(editId, editForm);
            setSubStrands(prev =>
                prev.map(s => (s.id === editId ? updated : s))
            );
            setEditId(null);
        } catch (err: any) {
            setEditError(err.message || 'Failed to update');
        } finally {
            setEditing(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);

        try {
            await subStrandAPI.delete(deleteId);
            setSubStrands(prev => prev.filter(s => s.id !== deleteId));
            setDeleteId(null);
        } finally {
            setDeleting(false);
        }
    };

    // ------------------------------------------------------------------
    // Table columns configuration
    // ------------------------------------------------------------------
    const columns: Column<SubStrand>[] = [
        {
            key: 'code',
            header: 'Code',
            sortable: true,
            render: (row) => (
                <Badge variant="indigo" size="md" className="font-mono font-semibold">
                    {row.code}
                </Badge>
            ),
            className: 'font-medium'
        },
        {
            key: 'name',
            header: 'Sub-Strand Name',
            sortable: true,
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{row.name}</span>
                    {row.description && (
                        <span className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {row.description}
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'sequence',
            header: 'Sequence',
            sortable: true,
            render: (row) => (
                <Badge variant="default" size="sm">
                    #{row.sequence}
                </Badge>
            ),
            headerClassName: 'text-center',
            className: 'text-center'
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <Link
                        href={`/cbc/authoring/sub-strands/${row.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Manage learning outcomes"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                    <button
                        onClick={() => startEdit(row)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit sub-strand"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setDeleteId(row.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete sub-strand"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
            className: 'text-right'
        }
    ];

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------
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
                        href="/cbc/authoring/strands"
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-100 rounded-lg">
                                <Layers className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Manage Sub-Strands
                                </h1>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Define sub-strands under this strand
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <Button
                    variant="primary"
                    size="md"
                    onClick={() => setShowCreate(true)}
                    className="shadow-sm"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sub-Strand
                </Button>
            </div>

            {/* Create form */}
            {showCreate && (
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <div className="p-1.5 bg-blue-600 rounded-lg">
                                <Plus className="h-4 w-4 text-white" />
                            </div>
                            Create New Sub-Strand
                        </h3>
                        <button
                            onClick={() => setShowCreate(false)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="Code"
                            placeholder="e.g., SS.1"
                            value={createForm.code ?? ''}
                            onChange={e => setCreateForm(p => ({ ...p, code: e.target.value }))}
                        />
                        <Input
                            label="Name"
                            placeholder="Sub-strand name"
                            value={createForm.name ?? ''}
                            onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))}
                        />
                        <Input
                            label="Sequence"
                            type="number"
                            placeholder="1"
                            value={createForm.sequence?.toString() ?? '1'}
                            onChange={e =>
                                setCreateForm(p => ({ ...p, sequence: Number(e.target.value) }))
                            }
                        />
                    </div>
                    <div className="mt-4">
                        <Input
                            label="Description (Optional)"
                            placeholder="Brief description of this sub-strand..."
                            value={createForm.description ?? ''}
                            onChange={e =>
                                setCreateForm(p => ({ ...p, description: e.target.value }))
                            }
                        />
                    </div>
                    {createError && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{createError}</p>
                        </div>
                    )}
                    <div className="flex gap-3 mt-5">
                        <Button
                            variant="primary"
                            size="md"
                            onClick={handleCreate}
                            disabled={creating || !createForm.code || !createForm.name}
                            className="shadow-sm"
                        >
                            {creating ? 'Creating…' : 'Create Sub-Strand'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="md"
                            onClick={() => setShowCreate(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </Card>
            )}

            {/* Edit inline form */}
            {editId !== null && (
                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <div className="p-1.5 bg-purple-600 rounded-lg">
                                <Pencil className="h-4 w-4 text-white" />
                            </div>
                            Edit Sub-Strand
                        </h3>
                        <button
                            onClick={() => setEditId(null)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="Code"
                            value={editForm.code ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, code: e.target.value }))}
                        />
                        <Input
                            label="Name"
                            value={editForm.name ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                        />
                        <Input
                            label="Sequence"
                            type="number"
                            value={editForm.sequence?.toString() ?? '0'}
                            onChange={e => setEditForm(p => ({ ...p, sequence: Number(e.target.value) }))}
                        />
                    </div>
                    <div className="mt-4">
                        <Input
                            label="Description (Optional)"
                            value={editForm.description ?? ''}
                            onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                        />
                    </div>
                    {editError && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{editError}</p>
                        </div>
                    )}
                    <div className="flex gap-3 mt-5">
                        <Button
                            variant="primary"
                            size="md"
                            onClick={saveEdit}
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
                </Card>
            )}

            {/* DataTable */}
            <Card className="shadow-sm">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Layers className="h-5 w-5 text-blue-600" />
                        Sub-Strands
                        <Badge variant="blue" size="sm" className="ml-2">
                            {subStrands.length}
                        </Badge>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage and organize sub-strands for this strand
                    </p>
                </div>

                <DataTable
                    data={subStrands as unknown as SubStrandWithIndex[]}
                    columns={columns}
                    loading={loading}
                    enableSearch={true}
                    enableSort={true}
                    searchPlaceholder="Search sub-strands by code or name..."
                    emptyMessage="No sub-strands found. Click 'Add Sub-Strand' to create one."
                    onRowClick={(row) => router.push(`/cbc/authoring/sub-strands/${row.id}`)}
                />
            </Card>

            {/* Delete modal */}
            <Modal
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                title="Delete Sub-Strand"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                            This action cannot be undone. This will permanently delete this sub-strand and all associated learning outcomes.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            size="md"
                            onClick={() => setDeleteId(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            size="md"
                            onClick={confirmDelete}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting…' : 'Delete Sub-Strand'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
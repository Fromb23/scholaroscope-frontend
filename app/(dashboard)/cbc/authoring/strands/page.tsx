// ============================================================================
// app/(dashboard)/cbc/authoring/strands/page.tsx — Strand Management - REDESIGNED
// ============================================================================

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Pencil,
    Check,
    X,
    ChevronRight,
    Layers,
    BookOpen,
    Filter
} from 'lucide-react';
import { useStrands } from '@/app/plugins/cbc/hooks/useCBC';
import { useAcademic } from '@/app/core/hooks/useAcademic';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import Modal from '@/app/components/ui/Modal';
import { DataTable, Column } from '@/app/components/ui/Table';
import { StrandFormData } from '@/app/plugins/cbc/types/cbc';

export default function ManageStraandsPage() {
    const [selectedCurriculum, setSelectedCurriculum] = useState<number | null>(null);

    const { curricula = [], subjects = [] } = useAcademic();

    const { strands, loading, createStrand, updateStrand, deleteStrand, refetch } = useStrands(
        selectedCurriculum ? { curriculum: selectedCurriculum } : undefined
    );

    // ---------------------------------------------------------------
    // Create form state
    // ---------------------------------------------------------------
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState<Partial<StrandFormData>>({
        code: '', name: '', description: '', sequence: 1
    });
    const [createError, setCreateError] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    // ---------------------------------------------------------------
    // Edit state — one row at a time
    // ---------------------------------------------------------------
    const [editId, setEditId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<StrandFormData>>({});
    const [editError, setEditError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);

    // ---------------------------------------------------------------
    // Delete confirmation
    // ---------------------------------------------------------------
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    // ---------------------------------------------------------------
    // ✅ NEW: Search, Sort, Filter state
    // ---------------------------------------------------------------
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
    const [subjectFilter, setSubjectFilter] = useState('');

    // Subjects scoped to curriculum
    const filteredSubjects = useMemo(() => {
        if (!selectedCurriculum) return [];
        return subjects.filter((s: any) => s.curriculum === selectedCurriculum);
    }, [subjects, selectedCurriculum]);

    // ✅ NEW: Client-side filtering and sorting
    const filteredAndSortedStrands = useMemo(() => {
        let result = [...strands];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(strand =>
                strand.code.toLowerCase().includes(query) ||
                strand.name.toLowerCase().includes(query) ||
                (strand.description && strand.description.toLowerCase().includes(query))
            );
        }

        // Apply subject filter (if enabled in column config)
        if (subjectFilter) {
            result = result.filter(strand => strand.subject_name === subjectFilter);
        }

        // Apply sorting
        if (sortConfig) {
            result.sort((a, b) => {
                const aVal = a[sortConfig.field as keyof typeof a];
                const bVal = b[sortConfig.field as keyof typeof b];

                // Handle null/undefined values
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;

                // Compare values
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [strands, searchQuery, sortConfig, subjectFilter]);

    // ✅ NEW: Handlers for DataTable
    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const handleSort = (field: string, direction: 'asc' | 'desc') => {
        setSortConfig({ field, direction });
    };

    const handleFilter = (filters: any[]) => {
        // Handle subject filter
        const subjectFilterConfig = filters.find(f => f.field === 'subject_name');
        setSubjectFilter(subjectFilterConfig?.value || '');
    };

    // ---------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------
    const handleCreate = async () => {
        if (!selectedCurriculum || !createForm.code || !createForm.name) return;
        setCreating(true);
        setCreateError(null);
        try {
            await createStrand({
                ...createForm,
                curriculum: selectedCurriculum,
                subject: createForm.subject || null,
            } as StrandFormData);
            setShowCreate(false);
            setCreateForm({ code: '', name: '', description: '', sequence: 1 });
        } catch (err: any) {
            setCreateError(err.message || 'Failed to create');
        } finally {
            setCreating(false);
        }
    };

    const handleEdit = (strand: any) => {
        setEditId(strand.id);
        setEditForm({
            curriculum: strand.curriculum,
            subject: strand.subject,
            code: strand.code,
            name: strand.name,
            description: strand.description,
            sequence: strand.sequence,
        });
        setEditError(null);
    };

    const handleSaveEdit = async () => {
        if (!editId) return;
        setEditing(true);
        setEditError(null);
        try {
            await updateStrand(editId, editForm);
            setEditId(null);
        } catch (err: any) {
            setEditError(err.message || 'Failed to update');
        } finally {
            setEditing(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await deleteStrand(deleteId);
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
                <Badge variant="blue" size="md" className="font-mono font-semibold">
                    {row.code}
                </Badge>
            )
        },
        {
            key: 'name',
            header: 'Strand Name',
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
            key: 'subject_name',
            header: 'Subject',
            sortable: true,
            filterable: true,
            filterOptions: [
                { value: '', label: 'All Subjects' },
                ...filteredSubjects.map((s: any) => ({ value: s.name, label: s.name }))
            ],
            render: (row) => (
                row.subject_name ? (
                    <Badge variant="purple" size="sm">
                        {row.subject_name}
                    </Badge>
                ) : (
                    <span className="text-xs text-gray-400">—</span>
                )
            ),
            className: 'text-center'
        },
        {
            key: 'sequence',
            header: 'Seq',
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
            key: 'sub_strands_count',
            header: 'Sub-Strands',
            sortable: true,
            render: (row) => (
                <div className="flex items-center justify-center gap-1.5">
                    <Layers className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                        {row.sub_strands_count}
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
                    <Link
                        href={`/cbc/authoring/strands/${row.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Manage sub-strands"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                    <button
                        onClick={() => handleEdit(row)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit strand"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setDeleteId(row.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete strand"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
            className: 'text-right'
        }
    ];

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
                        href="/cbc/authoring"
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-100 rounded-lg">
                                <BookOpen className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Manage Strands</h1>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Create, edit, and organize curriculum strands
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Curriculum selector */}
            <Card className="shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <h3 className="text-base font-semibold text-gray-900">Filter Strands</h3>
                </div>
                <div className="flex items-end gap-4 flex-wrap">
                    <div className="flex-1 min-w-[250px]">
                        <Select
                            label="Curriculum"
                            value={selectedCurriculum?.toString() ?? ''}
                            onChange={(e) => setSelectedCurriculum(e.target.value ? Number(e.target.value) : null)}
                            options={[
                                { value: '', label: 'Select Curriculum' },
                                ...curricula.map((c: any) => ({ value: String(c.id), label: c.name }))
                            ]}
                        />
                    </div>
                    {selectedCurriculum && (
                        <Button
                            variant="primary"
                            size="md"
                            onClick={() => { setShowCreate(true); setCreateError(null); }}
                            className="shadow-sm"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Strand
                        </Button>
                    )}
                </div>
            </Card>

            {/* Create form */}
            {showCreate && selectedCurriculum && (
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <div className="p-1.5 bg-blue-600 rounded-lg">
                                <Plus className="h-4 w-4 text-white" />
                            </div>
                            Create New Strand
                        </h3>
                        <button
                            onClick={() => setShowCreate(false)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Input
                            label="Code"
                            placeholder="e.g. ALG"
                            value={createForm.code ?? ''}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, code: e.target.value }))}
                        />
                        <Input
                            label="Name"
                            placeholder="e.g. Algebra"
                            value={createForm.name ?? ''}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <Select
                            label="Subject (optional)"
                            value={createForm.subject?.toString() ?? ''}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, subject: e.target.value ? Number(e.target.value) : null }))}
                            options={[
                                { value: '', label: 'None' },
                                ...filteredSubjects.map((s: any) => ({ value: String(s.id), label: s.name }))
                            ]}
                        />
                        <Input
                            label="Sequence"
                            type="number"
                            placeholder="1"
                            value={createForm.sequence?.toString() ?? '1'}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, sequence: Number(e.target.value) }))}
                        />
                    </div>
                    <div className="mt-4">
                        <Input
                            label="Description (optional)"
                            placeholder="Brief description of this strand..."
                            value={createForm.description ?? ''}
                            onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
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
                            {creating ? 'Creating…' : 'Create Strand'}
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
                            Edit Strand
                        </h3>
                        <button
                            onClick={() => setEditId(null)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Input
                            label="Code"
                            value={editForm.code ?? ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, code: e.target.value }))}
                        />
                        <Input
                            label="Name"
                            value={editForm.name ?? ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <Select
                            label="Subject"
                            value={editForm.subject?.toString() ?? ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, subject: e.target.value ? Number(e.target.value) : null }))}
                            options={[
                                { value: '', label: 'None' },
                                ...filteredSubjects.map((s: any) => ({ value: String(s.id), label: s.name }))
                            ]}
                        />
                        <Input
                            label="Sequence"
                            type="number"
                            value={editForm.sequence?.toString() ?? '0'}
                            onChange={(e) => setEditForm(prev => ({ ...prev, sequence: Number(e.target.value) }))}
                        />
                    </div>
                    <div className="mt-4">
                        <Input
                            label="Description (optional)"
                            value={editForm.description ?? ''}
                            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
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
                </Card>
            )}

            {/* Strand table */}
            <Card className="shadow-sm">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        Curriculum Strands
                        {strands.length > 0 && (
                            <Badge variant="blue" size="sm" className="ml-2">
                                {strands.length}
                            </Badge>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage high-level curriculum strands and their sub-strands
                    </p>
                </div>

                {!selectedCurriculum ? (
                    <div className="py-16 text-center">
                        <Filter className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">Select a curriculum to manage strands</p>
                    </div>
                ) : (
                    <DataTable
                        data={filteredAndSortedStrands}
                        columns={columns}
                        loading={loading}
                        enableSearch={true}
                        enableSort={true}
                        enableFilter={true}
                        onSearch={handleSearch}
                        onSort={handleSort}
                        onFilter={handleFilter}
                        searchPlaceholder="Search strands by code or name..."
                        emptyMessage="No strands found. Click 'Add Strand' to create one."
                    />
                )}
            </Card>

            {/* Delete confirmation modal */}
            <Modal
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                title="Delete Strand"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800 font-medium mb-2">
                            This action cannot be undone!
                        </p>
                        <p className="text-sm text-red-700">
                            This will permanently delete the strand and all its sub-strands and learning outcomes.
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
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting…' : 'Delete Strand'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
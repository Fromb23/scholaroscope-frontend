'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    ChevronRight,
    Layers,
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { useCBCAuthoringSubStrandsPage } from '@/app/plugins/cbc/hooks/useCBCAuthoringSubStrandsPage';
import {
    CBCNav,
    CBCBreadcrumb,
    CBCError,
    CBCLoading,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import Modal from '@/app/components/ui/Modal';
import { DataTable, Column } from '@/app/components/ui/Table';
import type { SubStrand } from '@/app/plugins/cbc/types/cbc';

export function CBCAuthoringSubStrandsPage() {
    const { strandId: raw } = useParams<{ strandId: string }>();
    const strandId = Number(raw);
    const router = useRouter();
    const page = useCBCAuthoringSubStrandsPage(strandId);

    const columns: Column<SubStrand>[] = [
        {
            key: 'code',
            header: 'Code',
            sortable: true,
            render: row => <Badge variant="indigo" size="md" className="font-mono">{row.code}</Badge>,
        },
        {
            key: 'name',
            header: 'Sub-Strand',
            sortable: true,
            render: row => (
                <div>
                    <p className="font-medium text-gray-900">{row.name}</p>
                    {row.description && <p className="text-xs text-gray-500 line-clamp-1">{row.description}</p>}
                </div>
            ),
        },
        {
            key: 'outcomes_count',
            header: 'Outcomes',
            sortable: true,
            render: row => (
                <div className="flex items-center justify-center gap-1.5">
                    <span className="text-sm font-medium">{row.outcomes_count}</span>
                </div>
            ),
            headerClassName: 'text-center',
            className: 'text-center',
        },
        {
            key: 'actions',
            header: '',
            render: row => (
                <div className="flex items-center justify-end gap-1">
                    <Link
                        href={`/cbc/authoring/sub-strands/${row.id}`}
                        onClick={event => event.stopPropagation()}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                    <button
                        onClick={event => {
                            event.stopPropagation();
                            page.startEdit(row);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={event => {
                            event.stopPropagation();
                            page.setDeleteId(row.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
            className: 'w-28',
        },
    ];

    if (page.strandLoading) {
        return <CBCLoading />;
    }

    if (page.strandError || !page.strand) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCError error={page.strandError ?? 'Strand not found'} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Authoring', href: '/cbc/authoring' },
                { label: 'Strands', href: '/cbc/authoring/strands' },
                { label: page.strand.name },
            ]} />

            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/cbc/authoring/strands"
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="p-2.5 bg-blue-100 rounded-lg">
                        <Layers className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <Badge variant="blue" size="md" className="font-mono">{page.strand.code}</Badge>
                            <h1 className="text-xl font-bold text-gray-900">{page.strand.name}</h1>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                            {page.strand.subject_name ?? page.strand.curriculum_name}
                        </p>
                    </div>
                </div>
                <Button
                    variant="primary"
                    size="md"
                    onClick={() => {
                        page.setShowCreate(true);
                        page.setCreateError(null);
                    }}
                >
                    <Plus className="h-4 w-4 mr-2" />Add Sub-Strand
                </Button>
            </div>

            {page.error && <CBCError error={page.error} onRetry={page.refetch} />}

            {page.showCreate && (
                <Card className="border-blue-200 bg-blue-50/50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <div className="p-1.5 bg-blue-600 rounded-lg">
                                <Plus className="h-4 w-4 text-white" />
                            </div>
                            New Sub-Strand
                        </h3>
                        <button
                            onClick={() => page.setShowCreate(false)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Name *"
                            placeholder="Sub-strand name"
                            value={page.createForm.name ?? ''}
                            onChange={event => page.setCreateForm(previous => ({ ...previous, name: event.target.value }))}
                        />
                        <Input
                            label="Description (optional)"
                            value={page.createForm.description ?? ''}
                            onChange={event => page.setCreateForm(previous => ({ ...previous, description: event.target.value }))}
                        />
                    </div>
                    {page.createError && (
                        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            {page.createError}
                        </p>
                    )}
                    <div className="flex gap-3 mt-5">
                        <Button
                            variant="primary"
                            size="md"
                            onClick={page.handleCreate}
                            disabled={page.createMutation.isPending || !page.createForm.name}
                        >
                            {page.createMutation.isPending ? 'Creating…' : 'Create Sub-Strand'}
                        </Button>
                        <Button variant="ghost" size="md" onClick={() => page.setShowCreate(false)}>Cancel</Button>
                    </div>
                </Card>
            )}

            {page.editId !== null && (
                <Card className="border-purple-200 bg-purple-50/50">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <div className="p-1.5 bg-purple-600 rounded-lg">
                                <Pencil className="h-4 w-4 text-white" />
                            </div>
                            Edit Sub-Strand
                        </h3>
                        <button
                            onClick={() => page.setEditId(null)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Name *"
                            value={page.editForm.name ?? ''}
                            onChange={event => page.setEditForm(previous => ({ ...previous, name: event.target.value }))}
                        />
                        <Input
                            label="Description"
                            value={page.editForm.description ?? ''}
                            onChange={event => page.setEditForm(previous => ({ ...previous, description: event.target.value }))}
                        />
                    </div>
                    {page.editError && (
                        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            {page.editError}
                        </p>
                    )}
                    <div className="flex gap-3 mt-5">
                        <Button
                            variant="primary"
                            size="md"
                            onClick={page.saveEdit}
                            disabled={page.updateMutation.isPending}
                        >
                            {page.updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                        </Button>
                        <Button variant="ghost" size="md" onClick={() => page.setEditId(null)}>Cancel</Button>
                    </div>
                </Card>
            )}

            <Card>
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Layers className="h-5 w-5 text-blue-600" />
                        Sub-Strands
                        {page.subStrands.length > 0 && <Badge variant="blue" size="sm">{page.subStrands.length}</Badge>}
                    </h2>
                </div>
                <DataTable<SubStrand & Record<string, unknown>>
                    data={page.subStrands as (SubStrand & Record<string, unknown>)[]}
                    columns={columns as Column<SubStrand & Record<string, unknown>>[]}
                    loading={page.isLoading}
                    enableSearch
                    enableSort
                    searchPlaceholder="Search sub-strands…"
                    emptyMessage="No sub-strands yet."
                    onRowClick={row => router.push(`/cbc/authoring/sub-strands/${row.id}`)}
                />
            </Card>

            <Modal isOpen={page.deleteId !== null} onClose={() => page.setDeleteId(null)} title="Delete Sub-Strand" size="sm">
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                            This will permanently delete the sub-strand and all its learning outcomes.
                        </p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" size="md" onClick={() => page.setDeleteId(null)}>Cancel</Button>
                        <Button
                            variant="danger"
                            size="md"
                            onClick={page.confirmDelete}
                            disabled={page.deleteMutation.isPending}
                        >
                            {page.deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

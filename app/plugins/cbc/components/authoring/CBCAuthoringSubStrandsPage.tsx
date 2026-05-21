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
                    <p className="font-medium theme-text">{row.name}</p>
                    {row.description && <p className="line-clamp-1 text-xs theme-muted">{row.description}</p>}
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
                        className="theme-link rounded-lg p-2 transition-colors theme-hover-info"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                    <button
                        onClick={event => {
                            event.stopPropagation();
                            page.startEdit(row);
                        }}
                        className="rounded-lg p-2 theme-muted transition-colors theme-hover-surface"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={event => {
                            event.stopPropagation();
                            page.setDeleteId(row.id);
                        }}
                        className="rounded-lg p-2 text-red-600 transition-colors theme-hover-danger"
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
                        className="rounded-lg p-2 theme-muted transition-colors theme-hover-surface"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="theme-info-surface rounded-lg p-2.5">
                        <Layers className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <Badge variant="blue" size="md" className="font-mono">{page.strand.code}</Badge>
                            <h1 className="text-xl font-bold theme-text">{page.strand.name}</h1>
                        </div>
                        <p className="mt-0.5 text-sm theme-muted">
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
                <Card className="theme-info-surface">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="flex items-center gap-2 font-semibold theme-text">
                            <div className="p-1.5 bg-blue-600 rounded-lg">
                                <Plus className="h-4 w-4 text-white" />
                            </div>
                            New Sub-Strand
                        </h3>
                        <button
                            onClick={() => page.setShowCreate(false)}
                            className="rounded-lg p-1.5 theme-subtle transition-colors theme-hover-surface"
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
                        <p className="theme-danger-surface mt-3 rounded-lg p-3 text-sm">
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
                <Card className="theme-surface-elevated">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="flex items-center gap-2 font-semibold theme-text">
                            <div className="p-1.5 bg-purple-600 rounded-lg">
                                <Pencil className="h-4 w-4 text-white" />
                            </div>
                            Edit Sub-Strand
                        </h3>
                        <button
                            onClick={() => page.setEditId(null)}
                            className="rounded-lg p-1.5 theme-subtle transition-colors theme-hover-surface"
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
                        <p className="theme-danger-surface mt-3 rounded-lg p-3 text-sm">
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
                    <h2 className="flex items-center gap-2 text-lg font-semibold theme-text">
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
                    <div className="theme-danger-surface rounded-lg p-4">
                        <p className="text-sm">
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

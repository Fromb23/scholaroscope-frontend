'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    ArrowLeft,
    BookOpen,
    FileText,
    Pencil,
    Plus,
    Target,
    Trash2,
    X,
} from 'lucide-react';
import { useCBCAuthoringOutcomesPage } from '@/app/plugins/cbc/hooks/useCBCAuthoringOutcomesPage';
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
import type { LearningOutcome } from '@/app/plugins/cbc/types/cbc';

export function CBCAuthoringOutcomesPage() {
    const { subStrandId: raw } = useParams<{ subStrandId: string }>();
    const subStrandId = Number(raw);
    const page = useCBCAuthoringOutcomesPage(subStrandId);

    const columns: Column<LearningOutcome & Record<string, unknown>>[] = [
        {
            key: 'code',
            header: 'Code',
            sortable: true,
            render: row => (
                <Badge variant="purple" size="md" className="font-mono font-semibold">
                    {row.code as string}
                </Badge>
            ),
        },
        {
            key: 'description',
            header: 'Learning Outcome',
            render: row => (
                <p className="text-sm text-gray-900 line-clamp-2 max-w-md">
                    {row.description as string}
                </p>
            ),
        },
        {
            key: 'level',
            header: 'Level',
            sortable: true,
            render: row => row.level
                ? <Badge variant="blue" size="sm">{row.level as string}</Badge>
                : <span className="text-xs text-gray-400">—</span>,
            headerClassName: 'text-center',
            className: 'text-center',
        },
        {
            key: 'evidence_count',
            header: 'Evidence',
            sortable: true,
            render: row => (
                <div className="flex items-center justify-center gap-1.5">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{row.evidence_count as number}</span>
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
                    <button
                        onClick={event => {
                            event.stopPropagation();
                            page.startEdit(row as unknown as LearningOutcome);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={event => {
                            event.stopPropagation();
                            page.setDeleteId(row.id as number);
                        }}
                        disabled={(row.evidence_count as number) > 0}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
                        title={(row.evidence_count as number) > 0 ? 'Has evidence records' : 'Delete'}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ),
            className: 'w-24',
        },
    ];

    if (page.subStrandLoading) {
        return <CBCLoading />;
    }

    if (page.subStrandError || !page.subStrand) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCError error={page.subStrandError ?? 'Not found'} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Authoring', href: '/cbc/authoring' },
                { label: 'Strands', href: '/cbc/authoring/strands' },
                { label: page.subStrand.strand_name, href: `/cbc/authoring/strands/${page.subStrand.strand}` },
                { label: page.subStrand.name },
            ]} />

            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href={`/cbc/authoring/strands/${page.subStrand.strand}`}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="p-2.5 bg-purple-100 rounded-lg">
                        <BookOpen className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{page.subStrand.strand_name} /</span>
                            <Badge variant="purple" size="lg" className="font-mono">{page.subStrand.code}</Badge>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 mt-0.5">{page.subStrand.name}</h1>
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
                    <Plus className="h-4 w-4 mr-2" />Add Outcome
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
                            New Learning Outcome
                            <span className="text-xs text-gray-400 font-normal">
                                — code assigned automatically
                            </span>
                        </h3>
                        <button
                            onClick={() => page.setShowCreate(false)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description *
                        </label>
                        <textarea
                            placeholder="What the learner should demonstrate…"
                            value={page.createForm.description ?? ''}
                            onChange={event => page.setCreateForm(previous => ({ ...previous, description: event.target.value }))}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>
                    {page.createError && (
                        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            {page.createError}
                        </p>
                    )}
                    <div className="flex gap-3 mt-4">
                        <Button
                            variant="primary"
                            size="md"
                            onClick={page.handleCreate}
                            disabled={page.createMutation.isPending || !page.createForm.description}
                        >
                            {page.createMutation.isPending ? 'Creating…' : 'Create Outcome'}
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
                            Edit Learning Outcome
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
                            label="Level"
                            value={page.editForm.level ?? ''}
                            onChange={event => page.setEditForm(previous => ({ ...previous, level: event.target.value }))}
                        />
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description *
                        </label>
                        <textarea
                            value={page.editForm.description ?? ''}
                            onChange={event => page.setEditForm(previous => ({ ...previous, description: event.target.value }))}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        />
                    </div>
                    {page.editError && (
                        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            {page.editError}
                        </p>
                    )}
                    <div className="flex gap-3 mt-4">
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
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            Learning Outcomes
                            <Badge variant="blue" size="sm">{page.outcomes.length}</Badge>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Codes auto-generated as{' '}
                            <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                                {page.subStrand.code}.N
                            </span>
                        </p>
                    </div>
                </div>
                <DataTable<LearningOutcome & Record<string, unknown>>
                    data={page.outcomes.map(outcome => outcome as LearningOutcome & Record<string, unknown>)}
                    columns={columns}
                    loading={page.isLoading}
                    enableSearch
                    enableSort
                    searchPlaceholder="Search outcomes…"
                    emptyMessage="No outcomes yet. Click 'Add Outcome' to create one."
                />
            </Card>

            <Modal isOpen={page.deleteId !== null} onClose={() => page.setDeleteId(null)} title="Delete Learning Outcome" size="sm">
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                            This will permanently delete this learning outcome.
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
                            {page.deleteMutation.isPending ? 'Deleting…' : 'Delete Outcome'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

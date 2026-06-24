'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    BookOpen,
    ChevronRight,
    Layers,
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { useCBCAuthoringStrandsPage } from '@/app/plugins/cbc/hooks/useCBCAuthoringStrandsPage';
import {
    CBCNav,
    CBCBreadcrumb,
    CBCError,
    CBCLoading,
    CBCEmpty,
    SubjectGroupPicker,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import Modal from '@/app/components/ui/Modal';
import { DataTable, Column } from '@/app/components/ui/Table';
import type { Strand } from '@/app/plugins/cbc/types/cbc';

export function CBCAuthoringStrandsPage() {
    const router = useRouter();
    const page = useCBCAuthoringStrandsPage();

    const columns: Column<Strand & Record<string, unknown>>[] = [
        {
            key: 'code',
            header: 'Code',
            sortable: true,
            render: row => (
                <Badge variant="blue" size="md" className="font-mono font-semibold">{row.code}</Badge>
            ),
        },
        {
            key: 'name',
            header: 'Strand',
            sortable: true,
            render: row => (
                <div>
                    <p className="font-medium theme-text">{row.name}</p>
                    {row.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs theme-muted">{row.description as string}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'subject_name',
            header: 'Subject',
            sortable: true,
            render: row => row.subject_name
                ? <Badge variant="purple" size="sm">{row.subject_name as string}</Badge>
                : <span className="text-xs theme-subtle">—</span>,
            className: 'text-center',
        },
        {
            key: 'sub_strands_count',
            header: 'Sub-Strands',
            sortable: true,
            render: row => (
                <div className="flex items-center justify-center gap-1.5">
                    <Layers className="h-4 w-4 theme-subtle" />
                    <span className="text-sm font-medium">{row.sub_strands_count as number}</span>
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
                        href={`/cbc/authoring/strands/${row.id}`}
                        onClick={event => event.stopPropagation()}
                        className="theme-link rounded-lg p-2 transition-colors theme-hover-info"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                    <button
                        onClick={event => {
                            event.stopPropagation();
                            page.startEdit(row as unknown as Strand);
                        }}
                        className="rounded-lg p-2 theme-muted transition-colors theme-hover-surface"
                    >
                        <Pencil className="h-4 w-4" />
                    </button>
                    <button
                        onClick={event => {
                            event.stopPropagation();
                            page.setDeleteId(row.id as number);
                        }}
                        className="rounded-lg p-2 text-red-600 transition-colors theme-hover-danger"
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
                    <Link
                        href="/cbc/authoring"
                        className="rounded-lg p-2 theme-muted transition-colors theme-hover-surface"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="theme-info-surface rounded-lg p-2.5">
                        <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold theme-text">Manage Strands</h1>
                        <p className="text-sm theme-muted">Create and organise curriculum strands</p>
                    </div>
                </div>
                {page.selectedCurriculumId && (
                    <Button
                        variant="primary"
                        size="md"
                        onClick={() => {
                            page.setShowCreate(true);
                            page.setCreateError(null);
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />Add Strand
                    </Button>
                )}
            </div>

            {page.error && <CBCError error={page.error} onRetry={page.refetch} />}

            {page.showCreate && page.selectedCurriculumId && (
                <Card className="theme-info-surface">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="flex items-center gap-2 font-semibold theme-text">
                            <div className="p-1.5 bg-blue-600 rounded-lg">
                                <Plus className="h-4 w-4 text-white" />
                            </div>
                            New Strand
                        </h3>
                        <button
                            onClick={() => page.setShowCreate(false)}
                            className="rounded-lg p-1.5 theme-subtle transition-colors theme-hover-surface"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input
                            label="Name *"
                            placeholder="e.g. Algebra"
                            value={page.createForm.name ?? ''}
                            onChange={event => page.setCreateForm(previous => ({ ...previous, name: event.target.value }))}
                        />
                        <Select
                            label="Subject (optional)"
                            value={page.createForm.subject?.toString() ?? ''}
                            onChange={event => page.setCreateForm(previous => ({
                                ...previous,
                                subject: event.target.value ? Number(event.target.value) : null,
                            }))}
                            options={page.subjectOptions}
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
                            {page.createMutation.isPending ? 'Creating…' : 'Create Strand'}
                        </Button>
                        <Button variant="ghost" size="md" onClick={() => page.setShowCreate(false)}>
                            Cancel
                        </Button>
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
                            Edit Strand
                        </h3>
                        <button
                            onClick={() => page.setEditId(null)}
                            className="rounded-lg p-1.5 theme-subtle transition-colors theme-hover-surface"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input
                            label="Name *"
                            value={page.editForm.name ?? ''}
                            onChange={event => page.setEditForm(previous => ({ ...previous, name: event.target.value }))}
                        />
                        <Select
                            label="Subject"
                            value={page.editForm.subject?.toString() ?? ''}
                            onChange={event => page.setEditForm(previous => ({
                                ...previous,
                                subject: event.target.value ? Number(event.target.value) : null,
                            }))}
                            options={page.subjectOptions}
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

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="h-4 w-4 theme-subtle" />
                            <h3 className="text-sm font-semibold theme-text">Subject</h3>
                        </div>
                        <SubjectGroupPicker
                            subjects={page.subjectsForCurriculum}
                            selectedSubjectId={page.selectedSubjectId}
                            onSelect={page.setSelectedSubject}
                        />
                    </Card>
                </div>

                <div className="lg:col-span-3">
                    <Card>
                        <div className="mb-4">
                            <h2 className="flex items-center gap-2 text-lg font-semibold theme-text">
                                <BookOpen className="h-5 w-5 text-blue-600" />
                                Curriculum Strands
                                {page.visibleStrands.length > 0 && (
                                    <Badge variant="blue" size="sm">{page.visibleStrands.length}</Badge>
                                )}
                            </h2>
                            <p className="mt-1 text-sm theme-muted">Click a strand to manage its sub-strands</p>
                        </div>

                        {!page.selectedCurriculumId ? (
                            <CBCEmpty
                                icon={BookOpen}
                                title="No curriculum"
                                description="No CBC curriculum found for your organisation."
                            />
                        ) : page.isLoading ? (
                            <CBCLoading />
                        ) : (
                            <DataTable<Strand & Record<string, unknown>>
                                data={page.visibleStrands.map(strand => strand as Strand & Record<string, unknown>)}
                                columns={columns}
                                loading={page.isLoading}
                                loadingMessage="Loading CBC strands..."
                                loadingVariant="skeleton"
                                enableSearch
                                enableSort
                                searchPlaceholder="Search strands…"
                                emptyMessage="No strands yet. Click 'Add Strand' to create one."
                                onRowClick={row => router.push(`/cbc/authoring/strands/${row.id as number}`)}
                            />
                        )}
                    </Card>
                </div>
            </div>

            <Modal isOpen={page.deleteId !== null} onClose={() => page.setDeleteId(null)} title="Delete Strand" size="sm">
                <div className="space-y-4">
                    <div className="theme-danger-surface rounded-lg p-4">
                        <p className="mb-1 text-sm font-medium theme-text">This cannot be undone.</p>
                        <p className="text-sm theme-muted">
                            All sub-strands and learning outcomes under this strand will be deleted.
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
                            {page.deleteMutation.isPending ? 'Deleting…' : 'Delete Strand'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

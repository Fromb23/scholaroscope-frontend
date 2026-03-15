// ============================================================================
// (dashboard)/academic/topics/page.tsx
//
// Topic list page — Admin authors topics per subject.
// Layout mirrors academic/subjects/page.tsx exactly.
//
// Features:
//   - DataTable with search + filter by subject
//   - Create topic modal (Admin only)
//   - Edit / Delete inline actions
//   - Row click navigates to topic detail
// ============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, BookOpen, Layers } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useTopics } from '@/app/core/hooks/useTopics';
import { useSubjects } from '@/app/core/hooks/useAcademic';
import { Topic, TopicFormData } from '@/app/core/types/topics';
import { DataTable, Column } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import Modal from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { Card } from '@/app/components/ui/Card';

// ── Topic Form Modal ──────────────────────────────────────────────────────

interface TopicFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: TopicFormData) => Promise<void>;
    initialData?: Topic | null;
    subjects: Array<{ value: string | number; label: string }>;
    loading: boolean;
}

function TopicFormModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    subjects,
    loading,
}: TopicFormProps) {
    const [form, setForm] = useState<TopicFormData>({
        subject: initialData?.subject ?? (subjects[0]?.value as number) ?? 0,
        code: initialData?.code ?? '',
        name: initialData?.name ?? '',
        description: initialData?.description ?? '',
        sequence: initialData?.sequence ?? 0,
    });
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!form.subject || !form.code || !form.name) {
            setError('Subject, code and name are required.');
            return;
        }
        setError(null);
        await onSubmit(form);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Edit Topic' : 'Create Topic'}
            size="md"
        >
            <div className="space-y-4">
                {error && (
                    <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <Select
                    label="Subject *"
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: Number(e.target.value) }))}
                    options={[{ value: '', label: 'Select subject...' }, ...subjects]}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Code *"
                        placeholder="e.g. T1, UNIT-3"
                        value={form.code}
                        onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                    />
                    <Input
                        label="Sequence"
                        type="number"
                        min={0}
                        value={form.sequence}
                        onChange={e => setForm(f => ({ ...f, sequence: Number(e.target.value) }))}
                    />
                </div>

                <Input
                    label="Name *"
                    placeholder="e.g. Algebra, Organic Chemistry"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                    </label>
                    <textarea
                        rows={3}
                        placeholder="Optional description..."
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Create Topic'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────

function DeleteTopicModal({
    topic,
    onClose,
    onConfirm,
    loading,
}: {
    topic: Topic | null;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    loading: boolean;
}) {
    return (
        <Modal isOpen={!!topic} onClose={onClose} title="Delete Topic" size="sm">
            <div className="space-y-4">
                <p className="text-sm text-gray-600">
                    Are you sure you want to delete{' '}
                    <span className="font-semibold text-gray-900">{topic?.name}</span>?
                    All subtopics under this topic will also be deleted. This cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Deleting...' : 'Delete Topic'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function TopicsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

    const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>();
    const [searchQuery, setSearchQuery] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Topic | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const { topics, loading, error, createTopic, updateTopic, deleteTopic } =
        useTopics(selectedSubjectId);

    const { subjects: allSubjects } = useSubjects();
    const subjects = allSubjects?.filter(s => s.curriculum_type !== 'CBE');
    console.log('Fetched subjects for topic page:', subjects);

    const subjectOptions = [
        { value: '', label: 'All Subjects' },
        ...subjects.map(s => ({ value: s.id, label: `${s.code} – ${s.name}` })),
    ];

    const subjectSelectOptions = subjects.map(s => ({
        value: s.id,
        label: `${s.code} – ${s.name}`,
    }));

    // Client-side search filter (server handles subject filter)
    const filtered = topics.filter(t => {
        console.log("Topics to be filtered:", topics);
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            t.name.toLowerCase().includes(q) ||
            t.code.toLowerCase().includes(q) ||
            t.subject_name?.toLowerCase().includes(q)
        );
    });

    const handleCreate = async (data: TopicFormData) => {
        setActionLoading(true);
        try {
            await createTopic(data);
            setCreateOpen(false);
        } finally {
            setActionLoading(false);
        }
    };

    const handleEdit = async (data: TopicFormData) => {
        if (!editTarget) return;
        setActionLoading(true);
        try {
            await updateTopic(editTarget.id, data);
            setEditTarget(null);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setActionLoading(true);
        try {
            await deleteTopic(deleteTarget.id);
            setDeleteTarget(null);
        } finally {
            setActionLoading(false);
        }
    };

    const columns: Column<Topic>[] = [
        {
            key: 'code',
            header: 'Code',
            render: row => (
                <span className="font-mono text-sm font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {row.code}
                </span>
            ),
            sortable: true,
        },
        {
            key: 'name',
            header: 'Topic Name',
            render: row => (
                <div>
                    <p className="font-medium text-gray-900">{row.name}</p>
                    {row.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{row.description}</p>
                    )}
                </div>
            ),
            sortable: true,
        },
        {
            key: 'subject_name',
            header: 'Subject',
            render: row => (
                <Badge variant="info">
                    {row.subject_code} – {row.subject_name}
                </Badge>
            ),
        },
        {
            key: 'sequence',
            header: 'Seq',
            render: row => (
                <span className="text-sm text-gray-500">{row.sequence}</span>
            ),
            sortable: true,
        },
        {
            key: 'subtopics_count',
            header: 'Subtopics',
            render: row => (
                <Badge variant={row.subtopics_count > 0 ? 'success' : 'default'}>
                    {row.subtopics_count}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: row => (
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => router.push(`/academic/topics/${row.id}`)}
                        className="text-xs text-blue-600 hover:underline font-medium"
                    >
                        View
                    </button>
                    {isAdmin && (
                        <>
                            <span className="text-gray-300">|</span>
                            <button
                                onClick={() => setEditTarget(row)}
                                className="text-xs text-gray-600 hover:underline"
                            >
                                Edit
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                                onClick={() => setDeleteTarget(row)}
                                className="text-xs text-red-600 hover:underline"
                            >
                                Delete
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Layers className="w-6 h-6 text-blue-600" />
                        Topics
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Content hierarchy for non-CBC curricula. Topics contain subtopics
                        that are covered in teaching sessions.
                    </p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Topic
                    </Button>
                )}
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Card className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Total Topics</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{topics.length}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Total Subtopics</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                        {topics.reduce((sum, t) => sum + t.subtopics_count, 0)}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Subjects Covered</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                        {new Set(topics.map(t => t.subject)).size}
                    </p>
                </Card>
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-3">
                <select
                    value={selectedSubjectId ?? ''}
                    onChange={e =>
                        setSelectedSubjectId(e.target.value ? Number(e.target.value) : undefined)
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {subjectOptions.map(o => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Table */}
            <DataTable<Topic>
                data={filtered}
                columns={columns}
                loading={loading}
                enableSearch
                onSearch={setSearchQuery}
                searchPlaceholder="Search topics by name or code..."
                emptyMessage="No topics found. Create your first topic to get started."
                onRowClick={row => router.push(`/academic/topics/${row.id}`)}
            />

            {/* Modals */}
            <TopicFormModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
                subjects={subjectSelectOptions}
                loading={actionLoading}
            />

            {editTarget && (
                <TopicFormModal
                    isOpen={!!editTarget}
                    onClose={() => setEditTarget(null)}
                    onSubmit={handleEdit}
                    initialData={editTarget}
                    subjects={subjectSelectOptions}
                    loading={actionLoading}
                />
            )}

            <DeleteTopicModal
                topic={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                loading={actionLoading}
            />
        </div>
    );
}
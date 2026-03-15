// ============================================================================
// (dashboard)/academic/topics/[topicId]/page.tsx
//
// Topic detail — shows topic metadata + subtopic list inline.
// Admin: full CRUD on subtopics from this page.
// Instructor: read-only view.
// ============================================================================

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Layers, Hash, AlignLeft } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useTopicDetail, useSubtopics } from '@/app/core/hooks/useTopics';
import { Subtopic, SubtopicFormData } from '@/app/core/types/topics';
import { DataTable, Column } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import Modal from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';

// ── Subtopic Form Modal ───────────────────────────────────────────────────

interface SubtopicFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: SubtopicFormData) => Promise<void>;
    topicId: number;
    initialData?: Subtopic | null;
    loading: boolean;
}

function SubtopicFormModal({
    isOpen,
    onClose,
    onSubmit,
    topicId,
    initialData,
    loading,
}: SubtopicFormProps) {
    const [form, setForm] = useState<SubtopicFormData>({
        topic: topicId,
        code: initialData?.code ?? '',
        name: initialData?.name ?? '',
        description: initialData?.description ?? '',
        sequence: initialData?.sequence ?? 0,
    });
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!form.code || !form.name) {
            setError('Code and name are required.');
            return;
        }
        setError(null);
        await onSubmit({ ...form, topic: topicId });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Edit Subtopic' : 'Add Subtopic'}
            size="md"
        >
            <div className="space-y-4">
                {error && (
                    <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Code *"
                        placeholder="e.g. T1.1"
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
                    placeholder="e.g. Linear Equations"
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
                        {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Subtopic'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Delete Confirm ────────────────────────────────────────────────────────

function DeleteSubtopicModal({
    subtopic,
    onClose,
    onConfirm,
    loading,
}: {
    subtopic: Subtopic | null;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    loading: boolean;
}) {
    return (
        <Modal isOpen={!!subtopic} onClose={onClose} title="Delete Subtopic" size="sm">
            <div className="space-y-4">
                <p className="text-sm text-gray-600">
                    Delete{' '}
                    <span className="font-semibold text-gray-900">{subtopic?.name}</span>?
                    This will also remove any session links and coverage records for this subtopic.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={onConfirm} disabled={loading}>
                        {loading ? 'Deleting...' : 'Delete'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function TopicDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

    const topicId = Number(params.topicId);

    const { topic, loading: topicLoading } = useTopicDetail(topicId);
    const {
        subtopics,
        loading: subtopicsLoading,
        createSubtopic,
        updateSubtopic,
        deleteSubtopic,
    } = useSubtopics(topicId);

    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Subtopic | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Subtopic | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const handleCreate = async (data: SubtopicFormData) => {
        setActionLoading(true);
        try {
            await createSubtopic(data);
            setAddOpen(false);
        } finally {
            setActionLoading(false);
        }
    };

    const handleEdit = async (data: SubtopicFormData) => {
        if (!editTarget) return;
        setActionLoading(true);
        try {
            await updateSubtopic(editTarget.id, data);
            setEditTarget(null);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setActionLoading(true);
        try {
            await deleteSubtopic(deleteTarget.id);
            setDeleteTarget(null);
        } finally {
            setActionLoading(false);
        }
    };

    const columns: Column<Subtopic>[] = [
        {
            key: 'code',
            header: 'Code',
            render: row => (
                <span className="font-mono text-sm font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    {row.code}
                </span>
            ),
        },
        {
            key: 'name',
            header: 'Subtopic Name',
            render: row => (
                <div>
                    <p className="font-medium text-gray-900">{row.name}</p>
                    {row.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-sm">{row.description}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'sequence',
            header: 'Seq',
            render: row => <span className="text-sm text-gray-500">{row.sequence}</span>,
        },
        ...(isAdmin
            ? [
                {
                    key: 'actions',
                    header: 'Actions',
                    render: (row: Subtopic) => (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
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
                        </div>
                    ),
                } as Column<Subtopic>,
            ]
            : []),
    ];

    if (topicLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!topic) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500">Topic not found.</p>
                <Button variant="ghost" className="mt-4" onClick={() => router.push('/academic/topics')}>
                    Back to Topics
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back + header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.push('/academic/topics')}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <Layers className="w-6 h-6 text-blue-600" />
                        <h1 className="text-2xl font-bold text-gray-900">{topic.name}</h1>
                        <span className="font-mono text-sm font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {topic.code}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 ml-9">
                        {topic.subject_code} – {topic.subject_name}
                    </p>
                </div>
            </div>

            {/* Topic metadata */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="p-4 flex items-center gap-3">
                    <Hash className="w-5 h-5 text-blue-500" />
                    <div>
                        <p className="text-xs text-gray-500">Sequence</p>
                        <p className="font-semibold text-gray-900">{topic.sequence}</p>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                    <Layers className="w-5 h-5 text-purple-500" />
                    <div>
                        <p className="text-xs text-gray-500">Subtopics</p>
                        <p className="font-semibold text-gray-900">{subtopics.length}</p>
                    </div>
                </Card>
                {topic.description && (
                    <Card className="p-4 flex items-center gap-3 sm:col-span-1">
                        <AlignLeft className="w-5 h-5 text-gray-400" />
                        <div>
                            <p className="text-xs text-gray-500">Description</p>
                            <p className="text-sm text-gray-700 line-clamp-2">{topic.description}</p>
                        </div>
                    </Card>
                )}
            </div>

            {/* Subtopics table */}
            <Card>
                <CardHeader className="flex items-center justify-between mb-4">
                    <CardTitle>Subtopics</CardTitle>
                    {isAdmin && (
                        <Button size="sm" onClick={() => setAddOpen(true)}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add Subtopic
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <DataTable<Subtopic>
                        data={subtopics}
                        columns={columns}
                        loading={subtopicsLoading}
                        enableSearch={false}
                        emptyMessage="No subtopics yet. Add the first subtopic to this topic."
                    />
                </CardContent>
            </Card>

            {/* Modals */}
            <SubtopicFormModal
                isOpen={addOpen}
                onClose={() => setAddOpen(false)}
                onSubmit={handleCreate}
                topicId={topicId}
                loading={actionLoading}
            />

            {editTarget && (
                <SubtopicFormModal
                    isOpen={!!editTarget}
                    onClose={() => setEditTarget(null)}
                    onSubmit={handleEdit}
                    topicId={topicId}
                    initialData={editTarget}
                    loading={actionLoading}
                />
            )}

            <DeleteSubtopicModal
                subtopic={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                loading={actionLoading}
            />
        </div>
    );
}
'use client';

// ============================================================================
// app/(dashboard)/academic/topics/[topicId]/page.tsx
//
// Responsibility: fetch via hooks, handle modal state, compose components.
// No inline component definitions. No any.
// ============================================================================

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Layers, Hash, AlignLeft } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useTopicDetail, useSubtopics } from '@/app/core/hooks/useTopics';
import { DataTable, Column } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/app/components/ui/Card';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import {
    SubtopicFormModal,
    DeleteSubtopicModal,
} from '@/app/core/components/topics/SubtopicModals';
import type { Subtopic, SubtopicFormData } from '@/app/core/types/topics';

export default function TopicDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
    const topicId = Number(params.topicId);

    const { topic, loading: topicLoading } = useTopicDetail(topicId);
    const { subtopics, loading: subtopicsLoading,
        createSubtopic, updateSubtopic, deleteSubtopic } = useSubtopics(topicId);

    const [addOpen, setAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Subtopic | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Subtopic | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const withLoading = async (fn: () => Promise<void>) => {
        setActionLoading(true);
        try { await fn(); } finally { setActionLoading(false); }
    };

    const handleCreate = (data: SubtopicFormData) =>
        withLoading(async () => { await createSubtopic(data); setAddOpen(false); });

    const handleEdit = (data: SubtopicFormData) =>
        withLoading(async () => { if (!editTarget) return; await updateSubtopic(editTarget.id, data); setEditTarget(null); });

    const handleDelete = () =>
        withLoading(async () => { if (!deleteTarget) return; await deleteSubtopic(deleteTarget.id); setDeleteTarget(null); });

    // ── Table columns ─────────────────────────────────────────────────────

    const adminColumns: Column<Subtopic>[] = isAdmin ? [{
        key: 'actions',
        header: 'Actions',
        render: (row: Subtopic) => (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <button onClick={() => setEditTarget(row)} className="text-xs text-gray-600 hover:underline">
                    Edit
                </button>
                <span className="text-gray-300">|</span>
                <button onClick={() => setDeleteTarget(row)} className="text-xs text-red-600 hover:underline">
                    Delete
                </button>
            </div>
        ),
    }] : [];

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
        ...adminColumns,
    ];

    // ── Guards ────────────────────────────────────────────────────────────

    if (topicLoading) return <LoadingSpinner />;

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

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
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
                    <Card className="p-4 flex items-center gap-3">
                        <AlignLeft className="w-5 h-5 text-gray-400" />
                        <div>
                            <p className="text-xs text-gray-500">Description</p>
                            <p className="text-sm text-gray-700 line-clamp-2">{topic.description}</p>
                        </div>
                    </Card>
                )}
            </div>

            <Card>
                <CardHeader className="flex items-center justify-between mb-4">
                    <CardTitle>Subtopics</CardTitle>
                    {isAdmin && (
                        <Button size="sm" onClick={() => setAddOpen(true)}>
                            <Plus className="w-4 h-4 mr-1" />Add Subtopic
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

            <SubtopicFormModal
                isOpen={addOpen}
                onClose={() => setAddOpen(false)}
                onSubmit={handleCreate}
                topicId={topicId}
                loading={actionLoading}
            />

            <SubtopicFormModal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                onSubmit={handleEdit}
                topicId={topicId}
                initialData={editTarget}
                loading={actionLoading}
            />

            <DeleteSubtopicModal
                subtopic={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                loading={actionLoading}
            />
        </div>
    );
}
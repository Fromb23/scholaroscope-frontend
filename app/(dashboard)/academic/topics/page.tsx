'use client';

// ============================================================================
// app/(dashboard)/academic/topics/page.tsx
//
// Responsibility: fetch data, filter, compose components, render.
// No inline modals. No console.log. No any. Memoized derived data.
// ============================================================================

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Layers } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useTopics } from '@/app/core/hooks/useTopics';
import { useSubjects } from '@/app/core/hooks/useAcademic';
import { DataTable, Column } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { TopicFormModal, DeleteTopicModal } from '@/app/core/components/topics/TopicModals';
import type { Topic, TopicFormData } from '@/app/core/types/topics';

export default function TopicsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const isAdmin = activeRole === 'ADMIN' || user?.is_superadmin;

    const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>();
    const [searchQuery, setSearchQuery] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Topic | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const { topics, loading, error, createTopic, updateTopic, deleteTopic } = useTopics(selectedSubjectId);
    const { subjects: allSubjects } = useSubjects();

    // Filter CBE subjects — Subject type has curriculum_type field
    const subjects = useMemo(
        () => allSubjects.filter(s => s.curriculum_type !== 'CBE'),
        [allSubjects]
    );

    const subjectOptions = useMemo(() => subjects.map(s => ({
        value: s.id,
        label: `${s.code} – ${s.name}`,
    })), [subjects]);

    // Client-side search (server handles subject filter)
    const filtered = useMemo(() => {
        if (!searchQuery) return topics;
        const q = searchQuery.toLowerCase();
        return topics.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.code.toLowerCase().includes(q) ||
            t.subject_name?.toLowerCase().includes(q)
        );
    }, [topics, searchQuery]);

    // ── Stats ─────────────────────────────────────────────────────────────

    const totalSubtopics = useMemo(() => topics.reduce((s, t) => s + t.subtopics_count, 0), [topics]);
    const subjectsCovered = useMemo(() => new Set(topics.map(t => t.subject)).size, [topics]);

    // ── Handlers ──────────────────────────────────────────────────────────

    const withLoading = async (fn: () => Promise<void>) => {
        setActionLoading(true);
        try { await fn(); } finally { setActionLoading(false); }
    };

    const handleCreate = (data: TopicFormData) =>
        withLoading(async () => { await createTopic(data); setCreateOpen(false); });

    const handleEdit = (data: TopicFormData) =>
        withLoading(async () => { if (!editTarget) return; await updateTopic(editTarget.id, data); setEditTarget(null); });

    const handleDelete = () =>
        withLoading(async () => { if (!deleteTarget) return; await deleteTopic(deleteTarget.id); setDeleteTarget(null); });

    // ── Table columns ─────────────────────────────────────────────────────

    const columns: Column<Topic>[] = [
        {
            key: 'code', header: 'Code', sortable: true,
            render: row => (
                <span className="font-mono text-sm font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {row.code}
                </span>
            ),
        },
        {
            key: 'name', header: 'Topic Name', sortable: true,
            render: row => (
                <div>
                    <p className="font-medium text-gray-900">{row.name}</p>
                    {row.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{row.description}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'subject_name', header: 'Subject',
            render: row => (
                <Badge variant="info">{row.subject_code} – {row.subject_name}</Badge>
            ),
        },
        {
            key: 'sequence', header: 'Seq', sortable: true,
            render: row => <span className="text-sm text-gray-500">{row.sequence}</span>,
        },
        {
            key: 'subtopics_count', header: 'Subtopics',
            render: row => (
                <Badge variant={row.subtopics_count > 0 ? 'success' : 'default'}>
                    {row.subtopics_count}
                </Badge>
            ),
        },
        {
            key: 'actions', header: 'Actions',
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
                            <button onClick={() => setEditTarget(row)} className="text-xs text-gray-600 hover:underline">
                                Edit
                            </button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => setDeleteTarget(row)} className="text-xs text-red-600 hover:underline">
                                Delete
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
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
                        <Plus className="w-4 h-4 mr-2" />New Topic
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <StatsCard title="Total Topics" value={topics.length} icon={Layers} color="blue" />
                <StatsCard title="Total Subtopics" value={totalSubtopics} icon={Layers} color="green" />
                <StatsCard title="Subjects Covered" value={subjectsCovered} icon={Layers} color="yellow" />
            </div>

            {/* Subject filter */}
            <Card>
                <select
                    value={selectedSubjectId ?? ''}
                    onChange={e => setSelectedSubjectId(e.target.value ? Number(e.target.value) : undefined)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">All Subjects</option>
                    {subjectOptions.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </Card>

            {error && <ErrorBanner message={error} onDismiss={() => { }} />}

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

            <TopicFormModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
                subjects={subjectOptions}
                loading={actionLoading}
            />

            <TopicFormModal
                isOpen={!!editTarget}
                onClose={() => setEditTarget(null)}
                onSubmit={handleEdit}
                initialData={editTarget}
                subjects={subjectOptions}
                loading={actionLoading}
            />

            <DeleteTopicModal
                topic={deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                loading={actionLoading}
            />
        </div>
    );
}
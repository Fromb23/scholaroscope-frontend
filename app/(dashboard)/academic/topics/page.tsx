'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Layers, ChevronRight } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useTopics } from '@/app/core/hooks/useTopics';
import { useCurricula, useSubjects } from '@/app/core/hooks/useAcademic';
import { DataTable, Column } from '@/app/components/ui/Table';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Card } from '@/app/components/ui/Card';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { TopicFormModal, DeleteTopicModal } from '@/app/core/components/topics/TopicModals';
import type { Topic, TopicFormData } from '@/app/core/types/topics';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { usePersistedFilters } from '@/app/core/hooks/usePersistedFilters';

function TopicsPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, activeRole } = useAuth();
    const isAdmin = activeRole === 'ADMIN' || user?.is_superadmin;

    // ── Drill-down state ──────────────────────────────────────────────────
    const [selectedCurriculumId, setSelectedCurriculumId] = useState<number | null>(
        searchParams.get('curriculum') ? Number(searchParams.get('curriculum')) : null
    );
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(
        searchParams.get('subject') ? Number(searchParams.get('subject')) : null
    );
    const [selectedLevel, setSelectedLevel] = useState<string | null>(
        searchParams.get('level') ?? null
    );
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');

    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Topic | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);
    const [filters, updateFilters, backUrl] = usePersistedFilters('/academic/topics', {
        curriculum: null as number | null,
        subject: null as number | null,
        level: null as string | null,
        q: '',
    });
    filters.curriculum
    filters.subject
    filters.level

    // ── Data ──────────────────────────────────────────────────────────────
    const { curricula } = useCurricula();
    const { subjects: allSubjects } = useSubjects();

    const nonCbcSubjects = useMemo(
        () => allSubjects.filter(s => s.curriculum_type !== 'CBE'),
        [allSubjects]
    );

    // Subjects filtered by selected curriculum
    const curriculumSubjects = useMemo(() => {
        if (!selectedCurriculumId) return [];
        return nonCbcSubjects.filter(s => s.curriculum === selectedCurriculumId);
    }, [nonCbcSubjects, selectedCurriculumId]);

    // Unique subject names (group by name)
    const uniqueSubjectNames = useMemo(() => {
        const seen = new Set<string>();
        return curriculumSubjects.filter(s => {
            if (seen.has(s.name)) return false;
            seen.add(s.name);
            return true;
        });
    }, [curriculumSubjects]);

    // Levels for selected subject name
    const levelsForSubject = useMemo(() => {
        if (!selectedSubjectId) return [];
        const subject = nonCbcSubjects.find(s => s.id === selectedSubjectId);
        if (!subject) return [];
        return nonCbcSubjects
            .filter(s => s.name === subject.name && s.curriculum === selectedCurriculumId)
            .map(s => s.level)
            .filter((l): l is string => !!l && l !== 'all');
    }, [nonCbcSubjects, selectedSubjectId, selectedCurriculumId]);

    // Resolved subject id — subject matching name + level
    const resolvedSubjectId = useMemo(() => {
        if (!selectedSubjectId || !selectedLevel) return undefined;
        const subject = nonCbcSubjects.find(s => s.id === selectedSubjectId);
        if (!subject) return undefined;
        const match = nonCbcSubjects.find(
            s => s.name === subject.name &&
                s.curriculum === selectedCurriculumId &&
                s.level === selectedLevel
        );
        return match?.id;
    }, [nonCbcSubjects, selectedSubjectId, selectedLevel, selectedCurriculumId]);

    const { topics, loading, error, createTopic, updateTopic, deleteTopic } = useTopics(resolvedSubjectId);

    const filtered = useMemo(() => {
        if (!searchQuery) return topics;
        const q = searchQuery.toLowerCase();
        return topics.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.code.toLowerCase().includes(q)
        );
    }, [topics, searchQuery]);

    const totalSubtopics = useMemo(
        () => topics.reduce((s, t) => s + t.subtopics_count, 0),
        [topics]
    );

    // ── Handlers ──────────────────────────────────────────────────────────
    const withLoading = async (fn: () => Promise<void>) => {
        setActionLoading(true);
        try { await fn(); } finally { setActionLoading(false); }
    };

    const handleCreate = (data: TopicFormData) =>
        withLoading(async () => { await createTopic(data); setCreateOpen(false); });

    const handleEdit = (data: TopicFormData) =>
        withLoading(async () => {
            if (!editTarget) return;
            await updateTopic(editTarget.id, data);
            setEditTarget(null);
        });

    const handleDelete = () =>
        withLoading(async () => {
            if (!deleteTarget) return;
            await deleteTopic(deleteTarget.id);
            setDeleteTarget(null);
        });

    const handleCurriculumChange = (id: number | null) => {
        setSelectedCurriculumId(id);
        setSelectedSubjectId(null);
        setSelectedLevel(null);
    };

    const handleSubjectChange = (id: number | null) => {
        setSelectedSubjectId(id);
        setSelectedLevel(null);
    };

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
            key: 'actions', header: '',
            render: row => (
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={() => router.push(`/academic/topics/${row.id}?back=${backUrl}`)}
                        className="text-xs text-blue-600 hover:underline font-medium"
                    >
                        View
                    </button>
                    {isAdmin && (
                        <>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => setEditTarget(row)} className="text-xs text-gray-600 hover:underline">Edit</button>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => setDeleteTarget(row)} className="text-xs text-red-600 hover:underline">Delete</button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    const subjectOptions = useMemo(
        () => uniqueSubjectNames.map(s => ({ value: s.id, label: s.name })),
        [uniqueSubjectNames]
    );

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
                        Browse topics by curriculum, subject, and level.
                    </p>
                </div>
                {isAdmin && resolvedSubjectId && (
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />New Topic
                    </Button>
                )}
            </div>

            {/* Drill-down navigation */}
            <Card>
                <div className="flex items-center gap-3 flex-wrap p-1">
                    {/* Curriculum */}
                    <select
                        value={selectedCurriculumId ?? ''}
                        onChange={e => handleCurriculumChange(e.target.value ? Number(e.target.value) : null)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select Curriculum</option>
                        {curricula.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    {selectedCurriculumId && (
                        <>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            {/* Subject */}
                            <select
                                value={selectedSubjectId ?? ''}
                                onChange={e => handleSubjectChange(e.target.value ? Number(e.target.value) : null)}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Subject</option>
                                {uniqueSubjectNames.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </>
                    )}

                    {selectedSubjectId && levelsForSubject.length > 0 && (
                        <>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            {/* Level */}
                            <select
                                value={selectedLevel ?? ''}
                                onChange={e => setSelectedLevel(e.target.value || null)}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Level</option>
                                {levelsForSubject.map(l => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                        </>
                    )}
                </div>
            </Card>

            {resolvedSubjectId && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
                    <StatsCard title="Topics" value={topics.length} icon={Layers} color="blue" />
                    <StatsCard title="Subtopics" value={totalSubtopics} icon={Layers} color="green" />
                </div>
            )}

            {pageError && <ErrorBanner message={pageError} onDismiss={() => setPageError(null)} />}

            {!resolvedSubjectId ? (
                <Card>
                    <p className="text-sm text-gray-500 text-center py-8">
                        Select a curriculum, subject, and level to view topics.
                    </p>
                </Card>
            ) : (
                <DataTable<Topic>
                    data={filtered}
                    columns={columns}
                    loading={loading}
                    enableSearch
                    onSearch={setSearchQuery}
                    searchPlaceholder="Search topics..."
                    emptyMessage="No topics found for this subject and level."
                    onRowClick={row => router.push(`/academic/topics/${row.id}?back=${backUrl}`)}
                />
            )}

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

export default function TopicsPage() {
    return (
        <Suspense fallback={<LoadingSpinner />}>
            <TopicsPageInner />
        </Suspense>
    );
}
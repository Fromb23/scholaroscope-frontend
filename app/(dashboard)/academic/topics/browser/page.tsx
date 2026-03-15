'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
    BookOpen, ChevronDown, ChevronRight, Search,
    Layers, FileText, Plus, GraduationCap, History, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useTopics, useSubtopics } from '@/app/core/hooks/useTopics';
import { useAcademicYears } from '@/app/core/hooks/useAcademic';
import { cohortSubjectAPI } from '@/app/core/api/academic';
import { Topic } from '@/app/core/types/topics';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';

// ── Nav ───────────────────────────────────────────────────────────────────

function AcademicNav({ active }: { active: 'browser' | 'progress' | 'authoring' }) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

    return (
        <nav className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
            {isAdmin && (
                <Link
                    href="/academic/topics"
                    className={`flex-1 text-center text-sm font-medium rounded-lg py-2.5 transition-colors ${active === 'authoring'
                        ? 'font-semibold text-white bg-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                >
                    Authoring
                </Link>
            )}
            <Link
                href="/academic/topics/browser"
                className={`flex-1 text-center text-sm font-medium rounded-lg py-2.5 transition-colors ${active === 'browser'
                    ? 'font-semibold text-white bg-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
            >
                {isAdmin ? 'Browser' : 'My Topics'}
            </Link>
            <Link
                href="/academic/progress"
                className={`flex-1 text-center text-sm font-medium rounded-lg py-2.5 transition-colors ${active === 'progress'
                    ? 'font-semibold text-white bg-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
            >
                Progress
            </Link>
        </nav>
    );
}

// ── Topic row ─────────────────────────────────────────────────────────────

function TopicRow({ topic }: { topic: Topic }) {
    const [open, setOpen] = useState(false);
    const { subtopics, loading } = useSubtopics(open ? topic.id : undefined);

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all text-left"
            >
                <div className="shrink-0">
                    {open
                        ? <ChevronDown className="h-5 w-5 text-blue-600" />
                        : <ChevronRight className="h-5 w-5 text-gray-400" />
                    }
                </div>
                <Badge variant="blue" size="md" className="font-mono shrink-0">
                    {topic.code}
                </Badge>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{topic.name}</p>
                    {topic.description && (
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{topic.description}</p>
                    )}
                </div>
                <Badge variant="default" size="sm" className="shrink-0">
                    {topic.subtopics_count} subtopic{topic.subtopics_count !== 1 ? 's' : ''}
                </Badge>
            </button>

            {open && (
                <div className="border-t border-gray-100 bg-white">
                    {loading ? (
                        <div className="py-8 text-center">
                            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
                            <p className="text-sm text-gray-500">Loading subtopics...</p>
                        </div>
                    ) : subtopics.length === 0 ? (
                        <div className="px-5 py-6 text-center">
                            <FileText className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">No subtopics yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {subtopics.map(subtopic => (
                                <div
                                    key={subtopic.id}
                                    className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                                >
                                    <FileText className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <Badge variant="purple" size="sm" className="font-mono mb-1.5 inline-block">
                                            {subtopic.code}
                                        </Badge>
                                        <p className="text-sm font-medium text-gray-900">{subtopic.name}</p>
                                        {subtopic.description && (
                                            <p className="text-xs text-gray-500 mt-0.5">{subtopic.description}</p>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400 shrink-0">
                                        Seq {subtopic.sequence}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Subject section within a cohort ──────────────────────────────────────

function SubjectSection({
    csId,
    label,
    topics,
    isAdmin,
}: {
    csId: number;
    label: string;
    topics: Topic[];
    isAdmin: boolean;
}) {
    return (
        <div>
            <div className="flex items-center gap-3 mb-3">
                <Layers className="h-4 w-4 text-gray-400 shrink-0" />
                <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                <Badge variant="info" size="sm">{topics.length}</Badge>
            </div>

            {topics.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    No topics added for this subject yet.
                    {isAdmin && (
                        <Link
                            href="/academic/topics"
                            className="text-blue-600 hover:underline ml-1"
                        >
                            Add topics
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {topics.map(topic => (
                        <TopicRow key={topic.id} topic={topic} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function TopicsBrowserPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

    const { academicYears } = useAcademicYears();
    const currentYear = useMemo(
        () => academicYears.find(y => y.is_current),
        [academicYears]
    );

    const [selectedYearId, setSelectedYearId] = useState<number | undefined>(undefined);
    useEffect(() => {
        if (currentYear && selectedYearId === undefined) {
            setSelectedYearId(currentYear.id);
        }
    }, [currentYear]);

    const [search, setSearch] = useState('');
    const [cohortSubjects, setCohortSubjects] = useState<any[]>([]);
    const [csLoading, setCsLoading] = useState(false);

    // Fetch cohort subjects scoped to selected year — non-CBC only
    useEffect(() => {
        if (!selectedYearId && selectedYearId !== undefined) return;
        setCsLoading(true);
        const params: Record<string, string> = {};
        if (selectedYearId) params.academic_year = String(selectedYearId);

        cohortSubjectAPI.getAll(params)
            .then(data => {
                const arr = Array.isArray(data) ? data : (data as any)?.results ?? [];
                setCohortSubjects(arr.filter((cs: any) => cs.curriculum_type !== 'CBE'));
            })
            .catch(() => setCohortSubjects([]))
            .finally(() => setCsLoading(false));
    }, [selectedYearId]);

    // Topics scoped by backend to user's org/cohorts
    // No subject filter — group client-side after fetch
    const { topics, loading: topicsLoading } = useTopics(undefined);

    const loading = csLoading || topicsLoading;

    // Filter topics by search
    const visibleTopics = useMemo(() => {
        if (!search.trim()) return topics;
        const q = search.toLowerCase();
        return topics.filter(t =>
            t.name.toLowerCase().includes(q) ||
            t.code.toLowerCase().includes(q) ||
            t.subject_name?.toLowerCase().includes(q)
        );
    }, [topics, search]);

    // Group: cohort → subjects → topics
    // Use Number() on both sides to avoid string/number mismatch
    const grouped = useMemo(() => {
        const map = new Map<number, {
            cohortName: string;
            isCurrentYear: boolean;
            subjects: { csId: number; label: string; topics: Topic[] }[];
        }>();

        cohortSubjects.forEach((cs: any) => {
            const subjectTopics = visibleTopics.filter(
                t => Number(t.subject) === Number(cs.subject)
            );

            if (!map.has(cs.cohort)) {
                map.set(cs.cohort, {
                    cohortName: cs.cohort_name,
                    isCurrentYear: cs.is_current_year ?? true,
                    subjects: [],
                });
            }
            map.get(cs.cohort)!.subjects.push({
                csId: cs.id,
                label: `${cs.subject_code} – ${cs.subject_name}`,
                topics: subjectTopics,
            });
        });

        return Array.from(map.entries());
    }, [visibleTopics, cohortSubjects]);

    const isHistoricalView = selectedYearId
        ? !academicYears.find(y => y.id === selectedYearId)?.is_current
        : false;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <AcademicNav active="browser" />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                        <BookOpen className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isAdmin ? 'Topic Browser' : 'My Topics'}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {isAdmin
                                ? 'Browse topics grouped by cohort and subject'
                                : 'Topics and subtopics for your assigned cohorts'
                            }
                        </p>
                    </div>
                </div>
                {isAdmin && (
                    <Link href="/academic/topics">
                        <Button size="sm">
                            <Plus className="w-4 h-4 mr-1" />Manage Topics
                        </Button>
                    </Link>
                )}
            </div>

            {/* Filters */}
            <Card>
                <div className="space-y-4">
                    {/* Year filter — admins only */}
                    {isAdmin && (
                        <Select
                            label="Academic Year"
                            value={selectedYearId?.toString() ?? ''}
                            onChange={e =>
                                setSelectedYearId(e.target.value ? Number(e.target.value) : undefined)
                            }
                            options={[
                                { value: '', label: 'All Years' },
                                ...academicYears.map(y => ({
                                    value: String(y.id),
                                    label: y.is_current
                                        ? `${y.name} (Current)`
                                        : `${y.name} — Historical`,
                                })),
                            ]}
                        />
                    )}

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by topic name or code..."
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                ×
                            </button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Historical notice */}
            {isHistoricalView && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    <History className="h-4 w-4 shrink-0" />
                    Viewing topics for a historical academic year — curriculum content is read-only.
                </div>
            )}

            {/* Results count */}
            {!loading && (
                <div className="flex items-center justify-between px-1">
                    <p className="text-sm text-gray-500">
                        <span className="font-semibold text-gray-900">{visibleTopics.length}</span>{' '}
                        topic{visibleTopics.length !== 1 ? 's' : ''}
                        {search && <span className="text-gray-400"> matching "{search}"</span>}
                    </p>
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Clear search
                        </button>
                    )}
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="py-20 text-center">
                    <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
                    <p className="text-sm text-gray-500">Loading topics...</p>
                </div>
            ) : grouped.length === 0 ? (
                <Card>
                    <div className="py-16 text-center">
                        <div className="p-4 bg-gray-50 rounded-full inline-flex mb-4">
                            <Search className="h-10 w-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {search ? 'No topics match your search' : 'No Topics Found'}
                        </h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            {search
                                ? 'Try a different search term.'
                                : isAdmin
                                    ? 'No topics have been created yet. Go to Authoring to add topics.'
                                    : 'No topics found for your assigned subjects.'
                            }
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-10">
                    {grouped.map(([cohortId, { cohortName, isCurrentYear, subjects }]) => (
                        <div key={cohortId}>
                            {/* Cohort header */}
                            <div className="flex items-center gap-3 mb-4">
                                <GraduationCap className="h-5 w-5 text-blue-500 shrink-0" />
                                <h2 className="text-base font-bold text-gray-900">{cohortName}</h2>
                                {!isCurrentYear && (
                                    <Badge variant="default" size="sm">
                                        <History className="h-3 w-3 mr-1" />Historical
                                    </Badge>
                                )}
                            </div>

                            {/* Subjects */}
                            <div className="space-y-6 pl-4 border-l-2 border-gray-100">
                                {subjects.map(({ csId, label, topics: subjectTopics }) => (
                                    <SubjectSection
                                        key={csId}
                                        csId={csId}
                                        label={label}
                                        topics={subjectTopics}
                                        isAdmin={isAdmin}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
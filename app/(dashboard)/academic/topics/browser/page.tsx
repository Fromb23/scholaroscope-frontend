'use client';

// ============================================================================
// app/(dashboard)/academic/topics/browser/page.tsx
//
// Responsibility: fetch via hooks, filter state, group, compose components.
// No direct API calls. No any. AcademicNav reused from AcademicProgressComponents.
// ============================================================================

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Search, Plus, GraduationCap, History } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useTopics } from '@/app/core/hooks/useTopics';
import { useAcademicYears } from '@/app/core/hooks/useAcademic';
import { useCohortSubjects } from '@/app/core/hooks/useCohortSubjects';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Select } from '@/app/components/ui/Select';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { AcademicNav } from '@/app/core/components/academic/AcademicProgressComponents';
import { TopicRow, SubjectSection } from '@/app/core/components/topics/TopicBrowserComponents';
import type { Topic } from '@/app/core/types/topics';

// ── Grouping utility ──────────────────────────────────────────────────────

interface CohortGroup {
    cohortName: string;
    isCurrentYear: boolean;
    subjects: { csId: number; label: string; topics: Topic[] }[];
}

export default function TopicsBrowserPage() {
    const { user, activeRole } = useAuth();
    const isAdmin = activeRole === 'ADMIN' || !!user?.is_superadmin;

    const { academicYears } = useAcademicYears();
    const currentYear = useMemo(() => academicYears.find(y => y.is_current), [academicYears]);

    const [selectedYearId, setSelectedYearId] = useState<number | undefined>(undefined);
    const [search, setSearch] = useState('');

    // Default to current year once loaded
    useEffect(() => {
        if (currentYear && selectedYearId === undefined) {
            setSelectedYearId(currentYear.id);
        }
    }, [currentYear, selectedYearId]);

    // Hooks — no direct API calls
    const { cohortSubjects, loading: csLoading } = useCohortSubjects(selectedYearId);
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
    const grouped = useMemo<[number, CohortGroup][]>(() => {
        const map = new Map<number, CohortGroup>();

        cohortSubjects.forEach(cs => {
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

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <AcademicNav active="browser" />

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
                    {isAdmin && (
                        <Select
                            label="Academic Year"
                            value={selectedYearId?.toString() ?? ''}
                            onChange={e => setSelectedYearId(e.target.value ? Number(e.target.value) : undefined)}
                            options={[
                                { value: '', label: 'All Years' },
                                ...academicYears.map(y => ({
                                    value: String(y.id),
                                    label: y.is_current ? `${y.name} (Current)` : `${y.name} — Historical`,
                                })),
                            ]}
                        />
                    )}
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

            {isHistoricalView && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    <History className="h-4 w-4 shrink-0" />
                    Viewing topics for a historical academic year — curriculum content is read-only.
                </div>
            )}

            {!loading && (
                <div className="flex items-center justify-between px-1">
                    <p className="text-sm text-gray-500">
                        <span className="font-semibold text-gray-900">{visibleTopics.length}</span>{' '}
                        topic{visibleTopics.length !== 1 ? 's' : ''}
                        {search && <span className="text-gray-400"> matching &ldquo;{search}&rdquo;</span>}
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

            {loading ? (
                <LoadingSpinner fullScreen={false} message="Loading topics..." />
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
                            <div className="flex items-center gap-3 mb-4">
                                <GraduationCap className="h-5 w-5 text-blue-500 shrink-0" />
                                <h2 className="text-base font-bold text-gray-900">{cohortName}</h2>
                                {!isCurrentYear && (
                                    <Badge variant="default" size="sm">
                                        <History className="h-3 w-3 mr-1" />Historical
                                    </Badge>
                                )}
                            </div>
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
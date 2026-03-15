// ============================================================================
// app/(dashboard)/cbc/progress/page.tsx — CBC Progress Overview - REDESIGNED
// ============================================================================

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BookOpen, Target, TrendingUp, Users, Filter, ChevronRight } from 'lucide-react';
import { strandAPI } from '@/app/plugins/cbc/api/cbc';
import { useAcademic } from '@/app/core/hooks/useAcademic';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StrandProgressRow } from '@/app/plugins/cbc/components/CBCComponents';
import { StrandDetail } from '@/app/plugins/cbc/types/cbc';

export default function CBCProgressPage() {
    // ---------------------------------------------------------------
    // Filters
    // ---------------------------------------------------------------
    const [curriculum, setCurriculum] = useState<number | null>(null);
    const [subject, setSubject] = useState<number | null>(null);
    const [grade, setGrade] = useState<string>('');

    const { curricula = [], subjects = [], grades = [] } = useAcademic();

    // ---------------------------------------------------------------
    // Data — strand details for the selected curriculum
    // ---------------------------------------------------------------
    const [strands, setStrands] = useState<StrandDetail[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!curriculum) { setStrands([]); return; }
        let cancelled = false;

        (async () => {
            setLoading(true);
            try {
                const data = await strandAPI.getByCurriculum(curriculum);
                if (!cancelled) setStrands(data);
            } catch {
                if (!cancelled) setStrands([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [curriculum]);

    // Auto-select first curriculum on mount
    useEffect(() => {
        if (curricula.length > 0 && !curriculum) setCurriculum(curricula[0].id);
    }, [curricula]);

    // Reset dependents when curriculum changes
    useEffect(() => { setSubject(null); setGrade(''); }, [curriculum]);

    // ---------------------------------------------------------------
    // Derived / filtered
    // ---------------------------------------------------------------
    const subjectsForCurriculum = useMemo(
        () => (curriculum ? subjects.filter((s: any) => s.curriculum === curriculum) : []),
        [subjects, curriculum]
    );

    const visibleStrands = useMemo(() => {
        let rows = strands;
        if (subject) rows = rows.filter(s => s.subject === subject);
        return rows;
    }, [strands, subject]);

    // Aggregate counts
    const totalOutcomes = useMemo(
        () => visibleStrands.reduce(
            (sum, st) => sum + st.sub_strands.reduce((s, ss) => s + (ss.outcomes_count ?? 0), 0), 0
        ),
        [visibleStrands]
    );

    const totalSubStrands = useMemo(
        () => visibleStrands.reduce((sum, st) => sum + st.sub_strands.length, 0),
        [visibleStrands]
    );

    const uniqueSubjects = useMemo(
        () => new Set(visibleStrands.filter(s => s.subject).map(s => s.subject)).size,
        [visibleStrands]
    );

    // ---------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------
    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* CBC nav */}
            <nav className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
                <Link
                    href="/cbc/authoring"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Authoring
                </Link>
                <Link
                    href="/cbc/browser"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Browser
                </Link>
                <Link
                    href="/cbc/progress"
                    className="flex-1 text-center text-sm font-semibold text-white bg-blue-600 rounded-lg py-2.5 shadow-sm"
                >
                    Progress
                </Link>
                <Link
                    href="/cbc/teaching"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Teaching
                </Link>
            </nav>

            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">CBC Progress</h1>
                    <p className="text-gray-500 mt-1">
                        Track competency-based curriculum coverage and outcomes
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card className="shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <h3 className="text-base font-semibold text-gray-900">Filter Progress View</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                        label="Curriculum"
                        value={curriculum?.toString() ?? ''}
                        onChange={e => setCurriculum(e.target.value ? Number(e.target.value) : null)}
                        options={[
                            { value: '', label: 'Select curriculum' },
                            ...curricula.map((c: any) => ({ value: String(c.id), label: c.name })),
                        ]}
                    />
                    <Select
                        label="Subject"
                        value={subject?.toString() ?? ''}
                        onChange={e => setSubject(e.target.value ? Number(e.target.value) : null)}
                        options={[
                            { value: '', label: 'All subjects' },
                            ...subjectsForCurriculum.map((s: any) => ({ value: String(s.id), label: s.name })),
                        ]}
                    />
                    <Select
                        label="Grade"
                        value={grade}
                        onChange={e => setGrade(e.target.value)}
                        options={[
                            { value: '', label: 'All grades' },
                            ...grades.map((g: any) => ({ value: String(g.name), label: g.name })),
                        ]}
                    />
                </div>
            </Card>

            {/* Stats */}
            {curriculum && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatsCard
                        title="Strands"
                        value={visibleStrands.length}
                        icon={BookOpen}
                        color="blue"
                    />
                    <StatsCard
                        title="Sub-Strands"
                        value={totalSubStrands}
                        icon={TrendingUp}
                        color="green"
                    />
                    <StatsCard
                        title="Total Outcomes"
                        value={totalOutcomes}
                        icon={Target}
                        color="purple"
                    />
                    <StatsCard
                        title="Subjects"
                        value={uniqueSubjects}
                        icon={Users}
                        color="orange"
                    />
                </div>
            )}

            {/* Strand coverage table */}
            <Card className="shadow-sm">
                <div className="mb-5">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        Strand Coverage
                        {visibleStrands.length > 0 && (
                            <Badge variant="blue" size="sm" className="ml-2">
                                {visibleStrands.length}
                            </Badge>
                        )}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Click a strand to explore its sub-strands and learning outcomes in detail
                    </p>
                </div>

                {loading ? (
                    <div className="py-20 text-center">
                        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
                        <p className="text-sm text-gray-500">Loading strand data…</p>
                    </div>
                ) : !curriculum ? (
                    <div className="py-16 text-center">
                        <div className="p-4 bg-blue-50 rounded-full inline-flex mb-4">
                            <BookOpen className="h-12 w-12 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Select a Curriculum
                        </h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            Choose a curriculum from the filters above to view strands and progress
                        </p>
                    </div>
                ) : visibleStrands.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="p-4 bg-gray-50 rounded-full inline-flex mb-4">
                            <Target className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            No Strands Found
                        </h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            No strands match the selected filters
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {visibleStrands.map(strand => {
                            const outcomeCount = strand.sub_strands.reduce(
                                (s, ss) => s + (ss.outcomes_count ?? 0), 0
                            );
                            return (
                                <Link
                                    key={strand.id}
                                    href={`/cbc/browser/strands/${strand.id}`}
                                    className="block hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors group"
                                >
                                    <div className="flex items-center">
                                        <div className="flex-1">
                                            <StrandProgressRow
                                                strandCode={strand.code}
                                                strandName={strand.name}
                                                totalOutcomes={outcomeCount}
                                                completedOutcomes={strand.sub_strands.length}
                                                percentage={0}
                                            />
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors ml-4" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </Card>

            {/* Navigation cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/cbc/browser" className="block group">
                    <Card className="h-full hover:shadow-md hover:border-blue-200 transition-all">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shrink-0">
                                <BookOpen className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                                    Curriculum Browser
                                </h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Explore the full strand → sub-strand → outcome tree
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors shrink-0" />
                        </div>
                    </Card>
                </Link>

                <Link href="/learners" className="block group">
                    <Card className="h-full hover:shadow-md hover:border-emerald-200 transition-all">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl shrink-0">
                                <TrendingUp className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors mb-1">
                                    Learner Progress
                                </h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    View mastery levels per student or per cohort
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-emerald-600 transition-colors shrink-0" />
                        </div>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
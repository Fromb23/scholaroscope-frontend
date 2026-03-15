// ============================================================================
// app/(dashboard)/cbc/browser/page.tsx — Curriculum Browser - REDESIGNED
// ============================================================================

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight, Search, Filter, Layers } from 'lucide-react';
import { useStrands } from '@/app/plugins/cbc/hooks/useCBC';
import { useAcademic } from '@/app/core/hooks/useAcademic';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Input } from '@/app/components/ui/Input';
import { Badge } from '@/app/components/ui/Badge';

export default function StrandsPage() {
    const [curriculum, setCurriculum] = useState<number | null>(null);
    const [subject, setSubject] = useState<number | null>(null);
    const [search, setSearch] = useState('');

    const { curricula = [], subjects = [] } = useAcademic();

    const { strands, loading } = useStrands(
        curriculum
            ? { curriculum, ...(subject ? { subject } : {}) }
            : undefined
    );

    const subjectsForCurriculum = useMemo(
        () => (curriculum ? subjects.filter((s: any) => s.curriculum === curriculum) : []),
        [subjects, curriculum]
    );

    const handleCurriculumChange = (id: number | null) => {
        setCurriculum(id);
        setSubject(null);
    };

    // Client-side text filter
    const visible = useMemo(() => {
        if (!search.trim()) return strands;
        const q = search.toLowerCase();
        return strands.filter(
            s => s.code.toLowerCase().includes(q) ||
                s.name.toLowerCase().includes(q) ||
                s.description.toLowerCase().includes(q)
        );
    }, [strands, search]);

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
                    className="flex-1 text-center text-sm font-semibold text-white bg-blue-600 rounded-lg py-2.5 shadow-sm"
                >
                    Browser
                </Link>
                <Link
                    href="/cbc/progress"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
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
                <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Curriculum Browser</h1>
                    <p className="text-gray-500 mt-1">
                        Explore strands, sub-strands, and learning outcomes
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card className="shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <h3 className="text-base font-semibold text-gray-900">Filter Curriculum</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                        label="Curriculum"
                        value={curriculum?.toString() ?? ''}
                        onChange={e => handleCurriculumChange(e.target.value ? Number(e.target.value) : null)}
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
                    <Input
                        label="Search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search strands…"
                    />
                </div>
            </Card>

            {/* Results count */}
            {curriculum && (
                <div className="flex items-center justify-between px-1">
                    <p className="text-sm text-gray-600">
                        Found <span className="font-semibold text-gray-900">{visible.length}</span> strand{visible.length !== 1 ? 's' : ''}
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

            {/* Strand grid */}
            {loading ? (
                <div className="py-20 text-center">
                    <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
                    <p className="text-sm text-gray-500">Loading strands…</p>
                </div>
            ) : !curriculum ? (
                <Card className="shadow-sm">
                    <div className="py-16 text-center">
                        <div className="p-4 bg-blue-50 rounded-full inline-flex mb-4">
                            <BookOpen className="h-12 w-12 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            Select a Curriculum
                        </h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            Choose a curriculum from the filter above to explore its strands and learning outcomes
                        </p>
                    </div>
                </Card>
            ) : visible.length === 0 ? (
                <Card className="shadow-sm">
                    <div className="py-16 text-center">
                        <div className="p-4 bg-gray-50 rounded-full inline-flex mb-4">
                            <Search className="h-12 w-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            No Strands Found
                        </h3>
                        <p className="text-sm text-gray-500 max-w-sm mx-auto">
                            No strands match your current filters. Try adjusting your search or filters.
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visible.map(strand => (
                        <Link
                            key={strand.id}
                            href={`/cbc/browser/strands/${strand.id}`}
                            className="block group"
                        >
                            <Card className="h-full hover:shadow-md hover:border-blue-200 transition-all duration-200">
                                <div className="flex flex-col h-full">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <Badge variant="blue" size="md" className="font-mono shrink-0">
                                                {strand.code}
                                            </Badge>
                                            {strand.subject_name && (
                                                <Badge variant="purple" size="sm" className="truncate">
                                                    {strand.subject_name}
                                                </Badge>
                                            )}
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 shrink-0 transition-colors" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                            {strand.name}
                                        </h3>
                                        {strand.description && (
                                            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                                {strand.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-1.5">
                                            <Layers className="h-4 w-4 text-gray-400" />
                                            <span className="text-sm text-gray-600">
                                                <span className="font-semibold text-gray-900">{strand.sub_strands_count}</span>
                                                {' '}sub-strand{strand.sub_strands_count !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
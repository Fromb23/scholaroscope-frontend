'use client';
// app/(dashboard)/cbc/browser/page.tsx

import { useMemo } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight, Search, Filter, Layers } from 'lucide-react';
import { useStrands } from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { useAcademic } from '@/app/core/hooks/useAcademic';
import {
    CBCNav, CBCError, CBCLoading, CBCEmpty,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Input } from '@/app/components/ui/Input';
import { Badge } from '@/app/components/ui/Badge';
import { useState } from 'react';

export default function CBCBrowserPage() {
    const { selectedCurriculumId, selectedSubjectId, setSelectedCurriculum, setSelectedSubject } =
        useCBCContext();
    const [search, setSearch] = useState('');
    const { curricula = [], subjects = [] } = useAcademic();

    const { data: strands = [], isLoading, error, refetch } = useStrands(
        selectedCurriculumId
            ? { curriculum: selectedCurriculumId, ...(selectedSubjectId ? { subject: selectedSubjectId } : {}) }
            : undefined
    );

    const subjectsForCurriculum = useMemo(
        () => subjects.filter((s: any) => s.curriculum === selectedCurriculumId),
        [subjects, selectedCurriculumId]
    );

    const visible = useMemo(() => {
        if (!search.trim()) return strands;
        const q = search.toLowerCase();
        return strands.filter(
            s => s.code.toLowerCase().includes(q) ||
                s.name.toLowerCase().includes(q) ||
                s.description?.toLowerCase().includes(q)
        );
    }, [strands, search]);

    return (
        <div className="space-y-6">
            <CBCNav />

            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Curriculum Browser</h1>
                    <p className="text-gray-500 mt-1">Explore strands, sub-strands, and learning outcomes</p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <h3 className="text-base font-semibold text-gray-900">Filter</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Select
                        label="Curriculum"
                        value={selectedCurriculumId?.toString() ?? ''}
                        onChange={e => setSelectedCurriculum(e.target.value ? Number(e.target.value) : null)}
                        options={[
                            { value: '', label: 'Select curriculum' },
                            ...curricula.map((c: any) => ({ value: String(c.id), label: c.name })),
                        ]}
                    />
                    <Select
                        label="Subject"
                        value={selectedSubjectId?.toString() ?? ''}
                        onChange={e => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
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

            {error && <CBCError error={error} onRetry={refetch} />}

            {/* Result count */}
            {selectedCurriculumId && !isLoading && (
                <div className="flex items-center justify-between px-1">
                    <p className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">{visible.length}</span>{' '}
                        strand{visible.length !== 1 ? 's' : ''}
                    </p>
                    {search && (
                        <button onClick={() => setSearch('')}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                            Clear search
                        </button>
                    )}
                </div>
            )}

            {/* Body */}
            {isLoading ? (
                <CBCLoading message="Loading strands…" />
            ) : !selectedCurriculumId ? (
                <Card>
                    <CBCEmpty
                        icon={BookOpen}
                        title="Select a Curriculum"
                        description="Choose a curriculum from the filter above to explore its strands and learning outcomes"
                    />
                </Card>
            ) : visible.length === 0 ? (
                <Card>
                    <CBCEmpty
                        icon={Search}
                        title="No Strands Found"
                        description="No strands match your current filters. Try adjusting your search or subject filter."
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visible.map(strand => (
                        <Link key={strand.id} href={`/cbc/browser/strands/${strand.id}`} className="block group">
                            <Card className="h-full hover:shadow-md hover:border-blue-200 transition-all duration-200">
                                <div className="flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                                            <Badge variant="blue" size="md" className="font-mono shrink-0">
                                                {strand.code}
                                            </Badge>
                                            {strand.subject_name && (
                                                <Badge variant="purple" size="sm" className="truncate">
                                                    {strand.subject_name}
                                                </Badge>
                                            )}
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400
                      group-hover:text-blue-600 shrink-0 transition-colors" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2
                      group-hover:text-blue-600 transition-colors">
                                            {strand.name}
                                        </h3>
                                        {strand.description && (
                                            <p className="text-sm text-gray-600 line-clamp-2">{strand.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-gray-100">
                                        <Layers className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            <span className="font-semibold text-gray-900">{strand.sub_strands_count}</span>
                                            {' '}sub-strand{strand.sub_strands_count !== 1 ? 's' : ''}
                                        </span>
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
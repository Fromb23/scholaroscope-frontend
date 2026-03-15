// ============================================================================
// app/(dashboard)/cbc/authoring/page.tsx — Curriculum Authoring Landing
// ============================================================================

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BookOpen, Plus, Settings, ChevronRight } from 'lucide-react';
import { useStrands } from '@/app/plugins/cbc/hooks/useCBC';
import { useAcademic } from '@/app/core/hooks/useAcademic';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { StatsCard } from '@/app/components/dashboard/StatsCard';

export default function CBCAuthoringPage() {
    const [selectedCurriculum, setSelectedCurriculum] = useState<number | null>(null);

    const { curricula = [] } = useAcademic();

    // Auto-select first curriculum
    useEffect(() => {
        if (curricula.length > 0 && !selectedCurriculum) {
            setSelectedCurriculum(curricula[0].id);
        }
    }, [curricula]);

    const { strands, loading } = useStrands(
        selectedCurriculum ? { curriculum: selectedCurriculum } : undefined
    );

    // Derived stats from the strand list
    const stats = useMemo(() => {
        const subStrandCount = strands.reduce((sum, s) => sum + (s.sub_strands_count ?? 0), 0);
        const subjectIds = new Set(strands.filter(s => s.subject).map(s => s.subject));
        return {
            strands: strands.length,
            subStrands: subStrandCount,
            subjectsUsed: subjectIds.size,
        };
    }, [strands]);

    return (
        <div className="space-y-6">
            {/* CBC nav */}
            <nav className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <span className="flex-1 text-center text-sm font-semibold text-white bg-blue-600 rounded-md py-1.5">Authoring</span>
                <Link href="/cbc/browser" className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 rounded-md py-1.5">Browser</Link>
                <Link href="/cbc/progress" className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 rounded-md py-1.5">Progress</Link>
                <Link href="/cbc/teaching" className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 rounded-md py-1.5">Teaching</Link>
            </nav>

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Settings className="h-6 w-6 text-blue-600" />
                        <h1 className="text-2xl font-semibold text-gray-900">Curriculum Authoring</h1>
                    </div>
                    <p className="text-gray-500 mt-1">Author curriculum structure — strands, sub-strands, and learning outcomes</p>
                </div>
            </div>

            {/* Curriculum selector */}
            <Card>
                <div className="max-w-md">
                    <Select
                        label="Curriculum"
                        value={selectedCurriculum?.toString() ?? ''}
                        onChange={(e) => setSelectedCurriculum(e.target.value ? Number(e.target.value) : null)}
                        options={[
                            { value: '', label: 'Select Curriculum' },
                            ...curricula.map((c: any) => ({ value: String(c.id), label: c.name }))
                        ]}
                    />
                </div>
            </Card>

            {/* Stats row */}
            {selectedCurriculum && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatsCard title="Strands" value={stats.strands} icon={BookOpen} color="blue" />
                    <StatsCard title="Sub-Strands" value={stats.subStrands} icon={BookOpen} color="purple" />
                    <StatsCard title="Subjects" value={stats.subjectsUsed} icon={BookOpen} color="green" />
                </div>
            )}

            {/* Strand list */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Strands</h2>
                    {selectedCurriculum && (
                        <Link
                            href="/cbc/authoring/strands"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            Manage Strands
                        </Link>
                    )}
                </div>

                {loading ? (
                    <div className="py-10 text-center">
                        <div className="inline-block h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="mt-2 text-sm text-gray-500">Loading…</p>
                    </div>
                ) : !selectedCurriculum ? (
                    <p className="text-sm text-gray-500 py-6 text-center">Select a curriculum above</p>
                ) : strands.length === 0 ? (
                    <div className="py-8 text-center">
                        <BookOpen className="mx-auto h-9 w-9 text-gray-300" />
                        <p className="mt-2 text-sm text-gray-500">No strands yet</p>
                        <Link
                            href="/cbc/authoring/strands"
                            className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                            <Plus className="h-3.5 w-3.5" /> Create the first strand
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {strands.map(strand => (
                            <Link
                                key={strand.id}
                                href={`/cbc/authoring/strands/${strand.id}`}
                                className="flex items-center justify-between py-3 px-2 -mx-2 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-xs font-mono font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded shrink-0">
                                        {strand.code}
                                    </span>
                                    <span className="font-medium text-gray-900 truncate">{strand.name}</span>
                                    {strand.subject_name && (
                                        <span className="text-xs text-gray-400 shrink-0">{strand.subject_name}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-xs text-gray-400">{strand.sub_strands_count} sub-strand{strand.sub_strands_count !== 1 ? 's' : ''}</span>
                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </Card>

            {/* Scope reminder */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    <strong>Authoring scope:</strong> This area manages curriculum structure only — strands, sub-strands, and learning outcomes.
                    Sessions, learners, evidence, and progress are managed in their own sections.
                </p>
            </div>
        </div>
    );
}
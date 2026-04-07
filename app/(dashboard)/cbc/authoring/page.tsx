'use client';
// app/(dashboard)/cbc/authoring/page.tsx

import { useMemo } from 'react';
import Link from 'next/link';
import { Settings, BookOpen, Plus, ChevronRight, Layers, Target } from 'lucide-react';
import { useStrands } from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { useAcademic } from '@/app/core/hooks/useAcademic';
import { CBCNav, CBCError, CBCLoading } from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Select } from '@/app/components/ui/Select';
import { Badge } from '@/app/components/ui/Badge';

export default function CBCAuthoringPage() {
    const { selectedCurriculumId, setSelectedCurriculum } = useCBCContext();
    const { curricula = [] } = useAcademic();

    const { data: strands = [], isLoading, error, refetch } = useStrands(
        selectedCurriculumId ? { curriculum: selectedCurriculumId } : undefined
    );

    const stats = useMemo(() => ({
        strands: strands.length,
        subStrands: strands.reduce((s, st) => s + (st.sub_strands_count ?? 0), 0),
        subjects: new Set(strands.filter(s => s.subject).map(s => s.subject)).size,
    }), [strands]);

    return (
        <div className="space-y-6">
            <CBCNav />

            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Settings className="h-6 w-6 text-blue-600" />
                        <h1 className="text-2xl font-semibold text-gray-900">Curriculum Authoring</h1>
                    </div>
                    <p className="text-gray-500 mt-1">
                        Author curriculum structure — strands, sub-strands, and learning outcomes
                    </p>
                </div>
                {selectedCurriculumId && (
                    <Link
                        href="/cbc/authoring/strands"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white
              text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Manage Strands
                    </Link>
                )}
            </div>

            {/* Curriculum selector */}
            <Card>
                <div className="flex items-end gap-4 flex-wrap">
                    <div className="flex-1 min-w-[240px]">
                        <Select
                            label="Curriculum"
                            value={selectedCurriculumId?.toString() ?? ''}
                            onChange={e => setSelectedCurriculum(e.target.value ? Number(e.target.value) : null)}
                            options={[
                                { value: '', label: 'Select Curriculum' },
                                ...curricula.map((c: any) => ({ value: String(c.id), label: c.name })),
                            ]}
                        />
                    </div>
                </div>
            </Card>

            {error && <CBCError error={error} onRetry={refetch} />}

            {/* Stats row */}
            {selectedCurriculumId && !error && (
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Strands', value: stats.strands, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Sub-Strands', value: stats.subStrands, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { label: 'Subjects', value: stats.subjects, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    ].map(s => (
                        <Card key={s.label} className="text-center">
                            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Strand list */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        Strands
                        {strands.length > 0 && (
                            <Badge variant="blue" size="sm">{strands.length}</Badge>
                        )}
                    </h2>
                    {selectedCurriculumId && (
                        <Link
                            href="/cbc/authoring/strands"
                            className="text-sm font-medium text-blue-600 hover:text-blue-700
                flex items-center gap-1"
                        >
                            <Plus className="h-4 w-4" />
                            Manage
                        </Link>
                    )}
                </div>

                {isLoading ? (
                    <CBCLoading message="Loading strands…" />
                ) : !selectedCurriculumId ? (
                    <p className="text-sm text-gray-500 py-8 text-center">
                        Select a curriculum above
                    </p>
                ) : strands.length === 0 ? (
                    <div className="py-10 text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500 mb-3">No strands yet</p>
                        <Link
                            href="/cbc/authoring/strands"
                            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
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
                                className="flex items-center justify-between py-3 px-2 -mx-2
                  hover:bg-gray-50 rounded-lg transition-colors group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-xs font-mono font-semibold bg-blue-50
                    text-blue-700 px-2 py-0.5 rounded shrink-0">
                                        {strand.code}
                                    </span>
                                    <span className="font-medium text-gray-900 truncate">{strand.name}</span>
                                    {strand.subject_name && (
                                        <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">
                                            {strand.subject_name}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                                        <Layers className="h-3.5 w-3.5" />
                                        {strand.sub_strands_count}
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-400
                    group-hover:text-blue-600 transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    <strong>Authoring scope:</strong> Manage curriculum structure here.
                    Sessions, evidence, and learner progress live in their own sections.
                </p>
            </div>
        </div>
    );
}
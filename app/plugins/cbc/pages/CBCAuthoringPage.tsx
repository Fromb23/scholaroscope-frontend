'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Settings, BookOpen, Plus, ChevronRight, Layers } from 'lucide-react';
import { useStrands } from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import { CBCNav, CBCError, CBCLoading, CBCEmpty, SubjectGroupPicker } from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { useAcademic } from '@/app/core/hooks/useAcademic';
import type { Subject } from '@/app/core/types/academic';

export default function CBCAuthoringPage() {
    const { selectedCurriculumId, selectedSubjectId, setSelectedSubject, curriculumLoading } = useCBCContext();
    const { subjects = [] } = useAcademic();

    const { data: strands = [], isLoading, error, refetch } = useStrands(
        selectedCurriculumId ? { curriculum: selectedCurriculumId } : undefined
    );

    const subjectsForCurriculum = useMemo(
        () => subjects.filter((s: Subject) => s.curriculum === selectedCurriculumId),
        [subjects, selectedCurriculumId]
    );

    const visibleStrands = useMemo(() => {
        if (!selectedSubjectId) return strands;
        return strands.filter(s => s.subject_org_id === selectedSubjectId);
    }, [strands, selectedSubjectId]);

    const stats = useMemo(() => ({
        strands: visibleStrands.length,
        subStrands: visibleStrands.reduce((s, st) => s + (st.sub_strands_count ?? 0), 0),
        subjects: new Set(
            visibleStrands
                .filter(s => s.subject_org_id !== null)
                .map(s => s.subject_org_id)
        ).size,
    }), [visibleStrands]);

    return (
        <div className="space-y-6">
            <CBCNav />

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

            {curriculumLoading && <p className="text-sm text-gray-400">Loading curriculum…</p>}
            {error && <CBCError error={error} onRetry={refetch} />}

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

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <Card>
                        <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-900">Subject</h3>
                        </div>
                        <SubjectGroupPicker
                            subjects={subjectsForCurriculum}
                            selectedSubjectId={selectedSubjectId}
                            onSelect={setSelectedSubject}
                        />
                    </Card>
                </div>

                {/* Content */}
                <div className="lg:col-span-3">
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-blue-600" />
                                Strands
                                {visibleStrands.length > 0 && (
                                    <Badge variant="blue" size="sm">{visibleStrands.length}</Badge>
                                )}
                            </h2>
                            {selectedCurriculumId && (
                                <Link
                                    href="/cbc/authoring/strands"
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                    <Plus className="h-4 w-4" />
                                    Manage
                                </Link>
                            )}
                        </div>

                        {(isLoading || curriculumLoading) ? (
                            <CBCLoading message="Loading strands…" />
                        ) : !selectedCurriculumId ? (
                            <div className="py-12 text-center space-y-3">
                                <p className="text-sm text-gray-600 font-medium">
                                    No CBC curriculum found for your organisation.
                                </p>
                                <p className="text-sm text-gray-400">
                                    Set up your curriculum first, then return here to author strands.
                                </p>
                                <Link
                                    href="/academic"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600
                                        text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    Go to Academic Setup
                                </Link>
                            </div>
                        ) : visibleStrands.length === 0 ? (
                            <CBCEmpty
                                icon={BookOpen}
                                title="No strands yet"
                                description={selectedSubjectId ? "No strands for this subject." : "Create the first strand to get started."}
                                action={
                                    <Link
                                        href="/cbc/authoring/strands"
                                        className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Create the first strand
                                    </Link>
                                }
                            />
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {visibleStrands.map(strand => (
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
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    <strong>Authoring scope:</strong> Manage curriculum structure here.
                    Sessions, evidence, and learner progress live in their own sections.
                </p>
            </div>
        </div>
    );
}

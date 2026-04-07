'use client';
// app/(dashboard)/cbc/browser/strands/[strandId]/page.tsx

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, ChevronDown, ChevronRight,
    FileText, BookOpen, Layers, Target,
} from 'lucide-react';
import {
    useStrandDetail, useLearningOutcomes,
} from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import {
    CBCNav, CBCBreadcrumb, CBCError, CBCLoading,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import type { SubStrand } from '@/app/plugins/cbc/types/cbc';

// Sub-component: renders outcomes for one sub-strand, fetches lazily
function SubStrandOutcomes({ subStrand }: { subStrand: SubStrand }) {
    const { data: outcomes = [], isLoading } = useLearningOutcomes({
        sub_strand: subStrand.id,
    });

    if (isLoading) {
        return (
            <div className="py-6 text-center">
                <div className="inline-block h-5 w-5 animate-spin rounded-full
          border-2 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (outcomes.length === 0) {
        return (
            <div className="px-5 py-6 text-center">
                <FileText className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No outcomes recorded</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-gray-100">
            {outcomes.map(outcome => (
                <div key={outcome.id}
                    className="flex flex-col sm:flex-row sm:items-start gap-3 px-5 py-4
            hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                        <Badge variant="indigo" size="sm" className="font-mono mb-2 inline-block">
                            {outcome.code}
                        </Badge>
                        <p className="text-sm text-gray-700 leading-relaxed">{outcome.description}</p>
                        {outcome.grade_name && (
                            <Badge variant="blue" size="sm" className="mt-2">{outcome.grade_name}</Badge>
                        )}
                    </div>
                    {outcome.evidence_count > 0 && (
                        <Badge variant="green" size="sm" className="shrink-0 self-start">
                            {outcome.evidence_count} evidence
                        </Badge>
                    )}
                </div>
            ))}
        </div>
    );
}

export default function StrandDetailPage() {
    const { strandId: raw } = useParams<{ strandId: string }>();
    const strandId = Number(raw);

    const { expandedSubStrands, toggleSubStrand } = useCBCContext();
    const { data: strand, isLoading, error, refetch } = useStrandDetail(strandId);

    // Auto-expand when there's only one sub-strand
    useEffect(() => {
        if (strand?.sub_strands.length === 1) {
            const id = strand.sub_strands[0].id;
            if (!expandedSubStrands.has(id)) toggleSubStrand(id);
        }
    }, [strand]);

    if (isLoading) return (
        <div className="space-y-6"><CBCNav /><CBCLoading message="Loading strand…" /></div>
    );

    if (error || !strand) return (
        <div className="space-y-6">
            <CBCNav />
            <CBCError error={error ?? 'Strand not found'} onRetry={refetch} />
        </div>
    );

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Browser', href: '/cbc/browser' },
                { label: strand.name },
            ]} />

            <Link href="/cbc/browser">
                <Button variant="ghost" size="md">
                    <ArrowLeft className="mr-2 h-4 w-4" />Back to Browser
                </Button>
            </Link>

            {/* Strand info */}
            <Card>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100 shrink-0">
                        <span className="text-xl font-mono font-bold text-blue-700">{strand.code}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{strand.name}</h1>
                        {strand.description && (
                            <p className="text-gray-600 mb-3">{strand.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 pt-3 border-t border-gray-100 text-sm text-gray-500">
                            <div className="flex items-center gap-1.5">
                                <BookOpen className="h-4 w-4 text-gray-400" />
                                <span>Curriculum: <span className="font-medium text-gray-900">
                                    {strand.curriculum_name}
                                </span></span>
                            </div>
                            {strand.subject_name && (
                                <div className="flex items-center gap-1.5">
                                    <Target className="h-4 w-4 text-gray-400" />
                                    <span>Subject: <span className="font-medium text-gray-900">
                                        {strand.subject_name}
                                    </span></span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <Layers className="h-4 w-4 text-gray-400" />
                                <Badge variant="blue" size="sm">
                                    {strand.sub_strands.length} sub-strand{strand.sub_strands.length !== 1 ? 's' : ''}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Sub-strand tree */}
            <Card>
                <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Sub-Strands & Learning Outcomes</h2>
                    <Badge variant="blue" size="sm">{strand.sub_strands.length}</Badge>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                    Click a sub-strand to expand its learning outcomes
                </p>

                <div className="space-y-3">
                    {strand.sub_strands.map(ss => {
                        const isOpen = expandedSubStrands.has(ss.id);
                        return (
                            <div key={ss.id}
                                className="border border-gray-200 rounded-xl overflow-hidden
                  hover:border-gray-300 transition-colors">
                                {/* Header */}
                                <button
                                    type="button"
                                    onClick={() => toggleSubStrand(ss.id)}
                                    className="w-full flex flex-col sm:flex-row sm:items-center gap-3
                    px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-all text-left"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="shrink-0">
                                            {isOpen
                                                ? <ChevronDown className="h-5 w-5 text-blue-600" />
                                                : <ChevronRight className="h-5 w-5 text-gray-400" />
                                            }
                                        </div>
                                        <Badge variant="purple" size="md" className="font-mono shrink-0">
                                            {ss.code}
                                        </Badge>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900">{ss.name}</p>
                                            {ss.description && (
                                                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                                                    {ss.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Badge variant="default" size="sm" className="shrink-0 self-start sm:self-center">
                                        {ss.outcomes_count} outcome{ss.outcomes_count !== 1 ? 's' : ''}
                                    </Badge>
                                </button>

                                {/* Outcomes — only rendered when expanded; React Query caches the fetch */}
                                {isOpen && (
                                    <div className="border-t border-gray-100 bg-white">
                                        <SubStrandOutcomes subStrand={ss} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
}
// ============================================================================
// app/(dashboard)/cbc/browser/strands/[strandId]/page.tsx — Strand Detail 
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    FileText,
    BookOpen,
    Layers,
    Target
} from 'lucide-react';
import { useStrandDetail } from '@/app/plugins/cbc/hooks/useCBC';
import { learningOutcomeAPI } from '@/app/plugins/cbc/api/cbc';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { SubStrand, LearningOutcome } from '@/app/plugins/cbc/types/cbc';

export default function StrandDetailPage() {
    const params = useParams();
    const strandId = Number(params.strandId);

    const { strand, loading } = useStrandDetail(strandId);

    // Which sub-strands are expanded
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    // Lazy-fetched outcome cache keyed by sub-strand id
    const [outcomeCache, setOutcomeCache] = useState<Record<number, LearningOutcome[]>>({});
    // Which sub-strands are currently fetching
    const [fetching, setFetching] = useState<Set<number>>(new Set());

    // Toggle a sub-strand: if opening and no cached outcomes, fetch first
    const toggle = async (ss: SubStrand) => {
        const id = ss.id;

        if (expanded.has(id)) {
            setExpanded(prev => { const n = new Set(prev); n.delete(id); return n; });
            return;
        }

        if (!outcomeCache[id]) {
            setFetching(prev => { const n = new Set(prev); n.add(id); return n; });
            try {
                const outcomes = await learningOutcomeAPI.getAll({ sub_strand: id });
                const outcomesArray = Array.isArray(outcomes)
                    ? outcomes
                    : (outcomes && typeof outcomes === 'object' && 'results' in outcomes)
                        ? (outcomes as { results?: LearningOutcome[] }).results ?? []
                        : []
                setOutcomeCache(prev => ({ ...prev, [id]: outcomesArray }));
            } catch {
                setOutcomeCache(prev => ({ ...prev, [id]: [] }));
            } finally {
                setFetching(prev => { const n = new Set(prev); n.delete(id); return n; });
            }
        }

        setExpanded(prev => { const n = new Set(prev); n.add(id); return n; });
    };

    // Auto-expand when there is only one sub-strand
    useEffect(() => {
        if (!strand || strand.sub_strands.length !== 1) return;
        const id = strand.sub_strands[0].id;
        setExpanded(new Set([id]));
        learningOutcomeAPI.getAll({ sub_strand: id })
            .then(outcomes => setOutcomeCache(prev => ({ ...prev, [id]: outcomes })))
            .catch(() => {
                setOutcomeCache(prev => ({ ...prev, [strand.sub_strands[0].id]: [] }));
            });
    }, [strand]);

    // ---------------------------------------------------------------
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="text-sm text-gray-500">Loading strand details...</p>
                </div>
            </div>
        );
    }

    if (!strand) {
        return (
            <div className="py-20 text-center max-w-md mx-auto">
                <BookOpen className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-1">Strand not found</p>
                <p className="text-sm text-gray-500 mb-4">The strand you're looking for doesn't exist or has been removed.</p>
                <Link href="/cbc/browser">
                    <Button variant="primary">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Browser
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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

            {/* Back button */}
            <Link href="/cbc/browser">
                <Button variant="ghost" size="md" className="hover:bg-gray-100">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Browser
                </Button>
            </Link>

            {/* Strand info */}
            <Card className="shadow-sm">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shrink-0 border border-blue-100">
                        <span className="text-xl font-mono font-bold text-blue-700 whitespace-nowrap">{strand.code}</span>
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2 break-words">{strand.name}</h1>
                        {strand.description && (
                            <p className="text-gray-600 leading-relaxed mb-3 break-words">{strand.description}</p>
                        )}
                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-gray-400 shrink-0" />
                                <span className="text-sm text-gray-500 break-words">
                                    Curriculum: <span className="font-medium text-gray-900">{strand.curriculum_name}</span>
                                </span>
                            </div>
                            {strand.subject_name && (
                                <div className="flex items-center gap-2">
                                    <Target className="h-4 w-4 text-gray-400 shrink-0" />
                                    <span className="text-sm text-gray-500 break-words">
                                        Subject: <span className="font-medium text-gray-900">{strand.subject_name}</span>
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4 text-gray-400 shrink-0" />
                                <Badge variant="blue" size="sm">
                                    {strand.sub_strands.length} sub-strand{strand.sub_strands.length !== 1 ? 's' : ''}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Sub-strand tree */}
            <Card className="shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2 mb-4">
                    <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-blue-600 shrink-0" />
                        <h2 className="text-lg font-semibold text-gray-900">
                            Sub-Strands & Learning Outcomes
                        </h2>
                    </div>
                    <Badge variant="blue" size="sm">
                        {strand.sub_strands.length}
                    </Badge>
                </div>
                <p className="text-sm text-gray-500 mb-5">
                    Click on any sub-strand to view its learning outcomes
                </p>

                <div className="space-y-3">
                    {strand?.sub_strands?.map(ss => {
                        const isOpen = expanded.has(ss.id);
                        const isFetching = fetching.has(ss.id);
                        const outcomes = outcomeCache[ss?.id] ?? [];

                        return (
                            <div
                                key={ss.id}
                                className="border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors"
                            >
                                {/* Sub-strand header */}
                                <button
                                    type="button"
                                    onClick={() => toggle(ss)}
                                    className="w-full flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-4 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all text-left"
                                >
                                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                        <div className="shrink-0 pt-0.5 sm:pt-0">
                                            {isOpen
                                                ? <ChevronDown className="h-5 w-5 text-blue-600" />
                                                : <ChevronRight className="h-5 w-5 text-gray-400" />
                                            }
                                        </div>
                                        <Badge variant="purple" size="md" className="font-mono shrink-0">
                                            {ss.code}
                                        </Badge>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-gray-900 break-words">
                                                {ss.name}
                                            </div>
                                            {ss.description && (
                                                <div className="text-sm text-gray-500 mt-1 break-words">
                                                    {ss.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Badge variant="default" size="sm" className="shrink-0 self-start sm:self-center">
                                        {ss.outcomes_count} outcome{ss.outcomes_count !== 1 ? 's' : ''}
                                    </Badge>
                                </button>

                                {/* Outcomes (expanded) */}
                                {isOpen && (
                                    <div className="border-t border-gray-100 bg-white">
                                        {isFetching ? (
                                            <div className="py-8 text-center">
                                                <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
                                                <p className="text-sm text-gray-500">Loading outcomes...</p>
                                            </div>
                                        ) : outcomes.length === 0 ? (
                                            <div className="px-5 py-6 text-center">
                                                <FileText className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                                                <p className="text-sm text-gray-500">No outcomes recorded</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {outcomes?.map((outcome) => (
                                                    <div
                                                        key={outcome.id}
                                                        className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <FileText className="h-5 w-5 text-gray-300 shrink-0 mt-0.5 hidden sm:block" />
                                                        <div className="flex-1 min-w-0">
                                                            <Badge variant="indigo" size="sm" className="font-mono mb-2 inline-block">
                                                                {outcome.code}
                                                            </Badge>
                                                            <p className="text-sm text-gray-700 leading-relaxed break-words">
                                                                {outcome.description}
                                                            </p>
                                                        </div>
                                                        {outcome.evidence_count > 0 && (
                                                            <Badge variant="green" size="sm" className="shrink-0 self-start">
                                                                {outcome.evidence_count} evidence
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
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
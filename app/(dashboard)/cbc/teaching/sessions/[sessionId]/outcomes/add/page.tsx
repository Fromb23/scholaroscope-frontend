'use client';
// app/(dashboard)/cbc/teaching/sessions/[sessionId]/outcomes/add/page.tsx

import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Search, ChevronDown, ChevronRight, Target, Check,
} from 'lucide-react';
import {
    useTeachingSession, useOutcomeSessions, useBulkTagOutcomes,
    useStrandsByCurriculum, useLearningOutcomes,
} from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import {
    CBCNav, CBCBreadcrumb, CBCError, CBCLoading, extractErrorMessage,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

// ── Per-sub-strand outcome list — fetched lazily when strand is expanded ──

function SubStrandOutcomeList({
    subStrandId,
    subStrandName,
    linkedIds,
    selectedIds,
    onToggle,
}: {
    subStrandId: number;
    subStrandName: string;
    linkedIds: Set<number>;
    selectedIds: Set<number>;
    onToggle: (id: number) => void;
}) {
    const { data: outcomes = [], isLoading } = useLearningOutcomes({ sub_strand: subStrandId });

    if (isLoading) {
        return (
            <div className="py-4 text-center">
                <div className="inline-block h-4 w-4 animate-spin rounded-full
          border-2 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 px-4">{subStrandName}</h4>
            <div className="space-y-1.5 px-4 pb-3">
                {outcomes.map(outcome => {
                    const linked = linkedIds.has(outcome.id);
                    const selected = selectedIds.has(outcome.id);
                    return (
                        <button
                            key={outcome.id}
                            onClick={() => !linked && onToggle(outcome.id)}
                            disabled={linked}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${linked ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' :
                                selected ? 'border-blue-500 bg-blue-50' :
                                    'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 shrink-0">
                                    {linked ? (
                                        <div className="h-5 w-5 rounded flex items-center justify-center bg-gray-200">
                                            <Check className="h-3 w-3 text-gray-500" />
                                        </div>
                                    ) : selected ? (
                                        <div className="h-5 w-5 rounded border-2 border-blue-500 bg-blue-500
                      flex items-center justify-center">
                                            <Check className="h-3 w-3 text-white" />
                                        </div>
                                    ) : (
                                        <div className="h-5 w-5 rounded border-2 border-gray-300" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <Badge variant="purple" size="sm" className="font-mono shrink-0">
                                            {outcome.code}
                                        </Badge>
                                        {linked && <Badge variant="green" size="sm">Already Linked</Badge>}
                                    </div>
                                    <p className="text-sm text-gray-700">{outcome.description}</p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AddOutcomesPage() {
    const { sessionId: raw } = useParams<{ sessionId: string }>();
    const sessionId = Number(raw);
    const router = useRouter();

    const { data: session, isLoading: sessionLoading, error: sessionError } =
        useTeachingSession(sessionId);
    const { data: links = [] } = useOutcomeSessions(sessionId);
    const bulkTag = useBulkTagOutcomes();

    // Use session's curriculum — derived from cohort_subject
    // We need strands for this session's curriculum — stored on session as organization FK
    // The session doesn't directly expose curriculum_id, so we fetch all strands
    // filtered by the session context once loaded.
    // For now we use selectedCurriculumId from context if set, else show a prompt.
    const { selectedCurriculumId } = useCBCContext();
    const { data: strands = [], isLoading: strandsLoading } = useStrandsByCurriculum(
        selectedCurriculumId
    );

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [search, setSearch] = useState('');
    const [tagError, setTagError] = useState<string | null>(null);

    const linkedIds = useMemo(() => new Set(links.map(l => l.learning_outcome)), [links]);

    const [expandedSubStrands, setExpandedSubStrands] = useState<Set<number>>(new Set());

    const visibleBySubject = useMemo(() => {
        if (!session?.subject_id) return strands;
        return strands.filter(s => s.subject === session.subject_id);
    }, [strands, session?.subject_id]);

    const toggleSubStrand = useCallback((id: number) => {
        setExpandedSubStrands(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const toggleOutcome = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    // Filter strands by search (against strand name)
    const visibleStrands = useMemo(() => {
        if (!search.trim()) return visibleBySubject;
        const q = search.toLowerCase();
        return visibleBySubject.filter(
            s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
        );
    }, [visibleBySubject, search]);

    const handleAdd = async () => {
        if (selectedIds.size === 0) return;
        setTagError(null);
        try {
            await bulkTag.mutateAsync({
                session: sessionId,
                outcome_ids: Array.from(selectedIds),
            });
            router.push(`/cbc/teaching/sessions/${sessionId}/outcomes`);
        } catch (e) {
            setTagError(extractErrorMessage(e));
        }
    };

    if (sessionLoading) return (
        <div className="space-y-6"><CBCNav /><CBCLoading /></div>
    );

    if (sessionError || !session) return (
        <div className="space-y-6">
            <CBCNav />
            <CBCError error={sessionError ?? 'Session not found'} />
        </div>
    );

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Teaching', href: '/cbc/teaching' },
                { label: 'Sessions', href: '/cbc/teaching/sessions' },
                { label: session.subject_name ?? 'Session', href: `/cbc/teaching/sessions/${sessionId}` },
                { label: 'Outcomes', href: `/cbc/teaching/sessions/${sessionId}/outcomes` },
                { label: 'Add' },
            ]} />

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Add Learning Outcomes</h1>
                    <p className="text-gray-500 mt-1">Select outcomes to link to this session</p>
                </div>
                <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes`}>
                    <Button variant="ghost" size="md">
                        <ArrowLeft className="mr-2 h-4 w-4" />Cancel
                    </Button>
                </Link>
            </div>

            {/* Selection summary + action */}
            <Card className="bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <p className="text-sm text-gray-600 mb-0.5">Selected</p>
                        <p className="text-3xl font-bold text-blue-600">{selectedIds.size}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {selectedIds.size > 0 && (
                            <Button variant="ghost" size="sm"
                                onClick={() => setSelectedIds(new Set())}>
                                Clear
                            </Button>
                        )}
                        <Button variant="primary" size="md"
                            onClick={handleAdd}
                            disabled={selectedIds.size === 0 || bulkTag.isPending}>
                            {bulkTag.isPending
                                ? 'Adding…'
                                : `Add ${selectedIds.size} Outcome${selectedIds.size !== 1 ? 's' : ''}`}
                        </Button>
                    </div>
                </div>
                {tagError && (
                    <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200
            rounded-lg p-3">
                        {tagError}
                    </p>
                )}
            </Card>

            {/* Search */}
            <Card>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by strand name or code…"
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </Card>

            {/* Outcome tree */}
            <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Curriculum Outcomes
                </h2>

                {strandsLoading ? (
                    <CBCLoading />
                ) : visibleStrands.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 text-sm">
                        No strands found — select a curriculum first
                    </div>
                ) : (
                    <div className="space-y-2">
                        {visibleStrands.map(strand => (
                            <div key={strand.id}
                                className="border border-gray-200 rounded-xl overflow-hidden">
                                {/* Strand header — toggle all sub-strands */}
                                <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="blue" size="md" className="font-mono">{strand.code}</Badge>
                                        <span className="font-semibold text-gray-900">{strand.name}</span>
                                    </div>
                                    <Badge variant="default" size="sm">
                                        {strand.sub_strands_count} sub-strand{strand.sub_strands_count !== 1 ? 's' : ''}
                                    </Badge>
                                </div>

                                {/* Sub-strands */}
                                <div className="divide-y divide-gray-100 bg-white">
                                    {strand.sub_strands.map(ss => {
                                        const isExpanded = expandedSubStrands.has(ss.id);
                                        return (
                                            <div key={ss.id}>
                                                <button
                                                    onClick={() => toggleSubStrand(ss.id)}
                                                    className="w-full flex items-center justify-between px-4 py-3
                            hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {isExpanded
                                                            ? <ChevronDown className="h-4 w-4 text-blue-600" />
                                                            : <ChevronRight className="h-4 w-4 text-gray-400" />
                                                        }
                                                        <Badge variant="purple" size="sm" className="font-mono">
                                                            {ss.code}
                                                        </Badge>
                                                        <span className="text-sm font-medium text-gray-800">{ss.name}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-400">{ss.outcomes_count} outcomes</span>
                                                </button>

                                                {isExpanded && (
                                                    <div className="bg-gray-50/50 border-t border-gray-100 py-2">
                                                        <SubStrandOutcomeList
                                                            subStrandId={ss.id}
                                                            subStrandName={ss.name}
                                                            linkedIds={linkedIds}
                                                            selectedIds={selectedIds}
                                                            onToggle={toggleOutcome}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}
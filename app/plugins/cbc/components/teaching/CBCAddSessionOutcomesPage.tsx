'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    ArrowLeft,
    Check,
    ChevronDown,
    ChevronRight,
    Search,
    Target,
} from 'lucide-react';
import { useLearningOutcomes } from '@/app/plugins/cbc/hooks/useCBC';
import { useCBCAddSessionOutcomesPage } from '@/app/plugins/cbc/hooks/useCBCAddSessionOutcomesPage';
import {
    CBCNav,
    CBCBreadcrumb,
    CBCError,
    CBCLoading,
    CBCTeachingSessionNav,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';

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
                <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
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
                            className={`w-full text-left p-3 rounded-lg border transition-all ${linked
                                ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                                : selected
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 shrink-0">
                                    {linked ? (
                                        <div className="h-5 w-5 rounded flex items-center justify-center bg-gray-200">
                                            <Check className="h-3 w-3 text-gray-500" />
                                        </div>
                                    ) : selected ? (
                                        <div className="h-5 w-5 rounded border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
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

export function CBCAddSessionOutcomesPage() {
    const { sessionId: raw } = useParams<{ sessionId: string }>();
    const sessionId = Number(raw);
    const page = useCBCAddSessionOutcomesPage(sessionId);

    if (page.sessionLoading) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCLoading />
            </div>
        );
    }

    if (page.sessionError || !page.session) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCError error={page.sessionError ?? 'Session not found'} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Teaching', href: '/cbc/teaching' },
                { label: 'Sessions', href: '/cbc/teaching/sessions' },
                { label: page.session.subject_name ?? 'Session', href: `/cbc/teaching/sessions/${sessionId}/outcomes` },
                { label: 'Outcomes', href: `/cbc/teaching/sessions/${sessionId}/outcomes` },
                { label: 'Add' },
            ]} />
            <CBCTeachingSessionNav sessionId={sessionId} active="outcomes" />

            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Add Learning Outcomes</h1>
                    <p className="text-gray-500 mt-1">Select outcomes to link to this session</p>
                </div>
                <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes`} className="w-full sm:w-auto">
                    <Button variant="ghost" size="md" className="w-full sm:w-auto">
                        <ArrowLeft className="mr-2 h-4 w-4" />Cancel
                    </Button>
                </Link>
            </div>

            <Card className="bg-blue-50 border-blue-200">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <p className="text-sm text-gray-600 mb-0.5">Selected</p>
                        <p className="text-3xl font-bold text-blue-600">{page.selectedIds.size}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {page.selectedIds.size > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => page.setSelectedIds(new Set())}>
                                Clear
                            </Button>
                        )}
                        <Button
                            variant="primary"
                            size="md"
                            onClick={page.handleAdd}
                            disabled={page.selectedIds.size === 0 || page.bulkTag.isPending}
                        >
                            {page.bulkTag.isPending
                                ? 'Adding…'
                                : `Add ${page.selectedIds.size} Outcome${page.selectedIds.size !== 1 ? 's' : ''}`}
                        </Button>
                    </div>
                </div>
                {page.tagError && (
                    <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                        {page.tagError}
                    </p>
                )}
            </Card>

            <Card>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={page.search}
                        onChange={event => page.setSearch(event.target.value)}
                        placeholder="Search by strand name or code…"
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </Card>

            <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Curriculum Outcomes
                </h2>

                {page.strandsLoading ? (
                    <CBCLoading />
                ) : page.visibleStrands.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 text-sm">
                        No strands found — select a curriculum first
                    </div>
                ) : (
                    <div className="space-y-2">
                        {page.visibleStrands.map(strand => (
                            <div key={strand.id} className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="blue" size="md" className="font-mono">{strand.code}</Badge>
                                        <span className="font-semibold text-gray-900">{strand.name}</span>
                                    </div>
                                    <Badge variant="default" size="sm">
                                        {strand.sub_strands_count} sub-strand{strand.sub_strands_count !== 1 ? 's' : ''}
                                    </Badge>
                                </div>

                                <div className="divide-y divide-gray-100 bg-white">
                                    {strand.sub_strands.map(subStrand => {
                                        const isExpanded = page.expandedSubStrands.has(subStrand.id);

                                        return (
                                            <div key={subStrand.id}>
                                                <button
                                                    onClick={() => page.toggleSubStrand(subStrand.id)}
                                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        {isExpanded
                                                            ? <ChevronDown className="h-4 w-4 text-blue-600" />
                                                            : <ChevronRight className="h-4 w-4 text-gray-400" />
                                                        }
                                                        <Badge variant="purple" size="sm" className="font-mono">
                                                            {subStrand.code}
                                                        </Badge>
                                                        <span className="text-sm font-medium text-gray-800">{subStrand.name}</span>
                                                    </div>
                                                    <span className="text-xs text-gray-400">{subStrand.outcomes_count} outcomes</span>
                                                </button>

                                                {isExpanded && (
                                                    <div className="bg-gray-50/50 border-t border-gray-100 py-2">
                                                        <SubStrandOutcomeList
                                                            subStrandId={subStrand.id}
                                                            subStrandName={subStrand.name}
                                                            linkedIds={page.linkedIds}
                                                            selectedIds={page.selectedIds}
                                                            onToggle={page.toggleOutcome}
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

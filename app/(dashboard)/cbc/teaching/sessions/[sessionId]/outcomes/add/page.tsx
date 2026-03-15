// ============================================================================
// app/(dashboard)/cbc/teaching/sessions/[sessionId]/outcomes/add/page.tsx
// Curriculum Outcome Selector - Add to Session
// ============================================================================

'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Plus,
    Search,
    ChevronDown,
    ChevronRight,
    Target,
    Check
} from 'lucide-react';
import { useTeachingSession, useOutcomeSessions, useLearningOutcomes } from '@/app/plugins/cbc/hooks/useCBC';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { groupBy } from '@/app/utils/groupBy';

export default function AddOutcomesPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = Number(params.sessionId);

    const { session, loading: sessionLoading } = useTeachingSession(sessionId);
    const { links, bulkTag } = useOutcomeSessions(sessionId);
    const { outcomes, loading: outcomesLoading } = useLearningOutcomes();

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedStrands, setExpandedStrands] = useState<Set<string>>(new Set());
    const [adding, setAdding] = useState(false);

    // Already linked outcome IDs
    const linkedIds = useMemo(() => new Set(links.map(l => l.learning_outcome)), [links]);

    // Filter and group outcomes
    const filteredOutcomes = useMemo(() => {
        let filtered = outcomes;

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(o =>
                o.code.toLowerCase().includes(query) ||
                o.description.toLowerCase().includes(query) ||
                o.strand_name.toLowerCase().includes(query) ||
                o.sub_strand_name.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [outcomes, searchQuery]);

    // Group by strand → sub-strand
    const groupedByStrand = useMemo(() => {
        const groups = new Map<string, Map<string, typeof outcomes>>();

        filteredOutcomes.forEach(outcome => {
            const strandKey = `${outcome.strand_name}`;
            const subStrandKey = `${outcome.sub_strand_name}`;

            if (!groups.has(strandKey)) {
                groups.set(strandKey, new Map());
            }

            const strandGroup = groups.get(strandKey)!;
            if (!strandGroup.has(subStrandKey)) {
                strandGroup.set(subStrandKey, []);
            }

            strandGroup.get(subStrandKey)!.push(outcome);
        });

        return groups;
    }, [filteredOutcomes]);

    const toggleStrand = (strandName: string) => {
        setExpandedStrands(prev => {
            const next = new Set(prev);
            next.has(strandName) ? next.delete(strandName) : next.add(strandName);
            return next;
        });
    };

    const toggleOutcome = (outcomeId: number) => {
        if (linkedIds.has(outcomeId)) return; // Can't select already linked

        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(outcomeId) ? next.delete(outcomeId) : next.add(outcomeId);
            return next;
        });
    };

    const selectAll = () => {
        const availableIds = filteredOutcomes
            .filter(o => !linkedIds.has(o.id))
            .map(o => o.id);
        setSelectedIds(new Set(availableIds));
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    const handleAddOutcomes = async () => {
        if (selectedIds.size === 0) return;

        setAdding(true);
        try {
            await bulkTag(Array.from(selectedIds));
            router.push(`/cbc/teaching/sessions/${sessionId}/outcomes`);
        } catch (err) {
            console.error('Failed to add outcomes:', err);
            alert('Failed to add outcomes. Please try again.');
        } finally {
            setAdding(false);
        }
    };

    if (sessionLoading || outcomesLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="text-sm text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="py-20 text-center">
                <p className="text-gray-500">Session not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* CBC nav */}
            <nav className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
                <Link href="/cbc/authoring" className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors">
                    Authoring
                </Link>
                <Link href="/cbc/browser" className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors">
                    Browser
                </Link>
                <Link href="/cbc/progress" className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors">
                    Progress
                </Link>
                <Link href="/cbc/teaching" className="flex-1 text-center text-sm font-semibold text-white bg-blue-600 rounded-lg py-2.5 shadow-sm">
                    Teaching
                </Link>
            </nav>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Add Curriculum Outcomes</h1>
                    <p className="text-gray-500 mt-1">
                        Select learning outcomes to link to this session
                    </p>
                </div>
                <Link href={`/cbc/teaching/sessions/${sessionId}/outcomes`}>
                    <Button variant="ghost" size="md">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Cancel
                    </Button>
                </Link>
            </div>

            {/* Selection Summary */}
            <Card className="shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Selected Outcomes</p>
                        <p className="text-3xl font-bold text-blue-600">
                            {selectedIds.size}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {selectedIds.size > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearSelection}>
                                Clear
                            </Button>
                        )}
                        {filteredOutcomes.length > linkedIds.size && (
                            <Button variant="ghost" size="sm" onClick={selectAll}>
                                Select All Available
                            </Button>
                        )}
                        <Button
                            variant="primary"
                            size="md"
                            onClick={handleAddOutcomes}
                            disabled={selectedIds.size === 0 || adding}
                        >
                            {adding ? 'Adding...' : `Add ${selectedIds.size} Outcome${selectedIds.size !== 1 ? 's' : ''}`}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Search */}
            <Card className="shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by code, description, strand, or sub-strand..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </Card>

            {/* Outcomes Tree */}
            <Card className="shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Curriculum Outcomes
                    <Badge variant="default" size="sm" className="ml-2">
                        {filteredOutcomes.length - linkedIds.size} available
                    </Badge>
                </h2>

                {groupedByStrand.size === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                        No outcomes found
                    </div>
                ) : (
                    <div className="space-y-2">
                        {Array.from(groupedByStrand.entries()).map(([strandName, subStrands]) => {
                            const isExpanded = expandedStrands.has(strandName);
                            const strandOutcomes = Array.from(subStrands.values()).flat();
                            const availableCount = strandOutcomes.filter(o => !linkedIds.has(o.id)).length;

                            return (
                                <div key={strandName} className="border border-gray-200 rounded-lg overflow-hidden">
                                    {/* Strand Header */}
                                    <button
                                        onClick={() => toggleStrand(strandName)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            {isExpanded ? (
                                                <ChevronDown className="h-5 w-5 text-gray-500" />
                                            ) : (
                                                <ChevronRight className="h-5 w-5 text-gray-500" />
                                            )}
                                            <span className="font-semibold text-gray-900">{strandName}</span>
                                            <Badge variant="blue" size="sm">
                                                {availableCount} available
                                            </Badge>
                                        </div>
                                    </button>

                                    {/* Sub-strands & Outcomes */}
                                    {isExpanded && (
                                        <div className="p-4 space-y-4 bg-white">
                                            {Array.from(subStrands.entries()).map(([subStrandName, outcomes]) => (
                                                <div key={subStrandName}>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                                        {subStrandName}
                                                    </h4>
                                                    <div className="space-y-2 pl-4">
                                                        {outcomes.map(outcome => {
                                                            const isLinked = linkedIds.has(outcome.id);
                                                            const isSelected = selectedIds.has(outcome.id);

                                                            return (
                                                                <button
                                                                    key={outcome.id}
                                                                    onClick={() => toggleOutcome(outcome.id)}
                                                                    disabled={isLinked}
                                                                    className={`w-full text-left p-3 rounded-lg border transition-all ${isLinked
                                                                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                                                        : isSelected
                                                                            ? 'border-blue-500 bg-blue-50'
                                                                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-start gap-3">
                                                                        <div className="mt-0.5">
                                                                            {isLinked ? (
                                                                                <Check className="h-5 w-5 text-gray-400" />
                                                                            ) : isSelected ? (
                                                                                <Check className="h-5 w-5 text-blue-600" />
                                                                            ) : (
                                                                                <div className="h-5 w-5 border-2 border-gray-300 rounded" />
                                                                            )}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                <Badge variant="purple" size="sm" className="font-mono">
                                                                                    {outcome.code}
                                                                                </Badge>
                                                                                {isLinked && (
                                                                                    <Badge variant="green" size="sm">
                                                                                        Already Linked
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-sm text-gray-700">
                                                                                {outcome.description}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
}
'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Target, Users, AlertCircle, CheckCircle,
    ChevronDown, ChevronRight, X, FileText,
} from 'lucide-react';
import {
    useStrandDetail, useStrandOutcomeDistribution, useOutcomeLearners,
} from '@/app/plugins/cbc/hooks/useCBC';
import { useCohorts } from '@/app/core/hooks/useAcademic';
import { useCBCContext } from '@/app/plugins/cbc/context/CBCContext';
import {
    CBCNav, CBCBreadcrumb, CBCError, CBCLoading,
    MasteryBadge, MASTERY_CONFIG,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Select } from '@/app/components/ui/Select';
import type {
    MasteryLevel, StrandOutcomeDistribution,
    CompetencyDistribution, OutcomeLearner,
} from '@/app/plugins/cbc/types/cbc';
import type { Cohort } from '@/app/core/types/academic';

const MASTERY_LEVELS: MasteryLevel[] = [
    'NOT_STARTED', 'BELOW', 'APPROACHING', 'MEETING', 'EXCEEDING',
];

const LEVEL_VALUES: Record<MasteryLevel, number> = {
    NOT_STARTED: 0, BELOW: 1, APPROACHING: 2, MEETING: 3, EXCEEDING: 4,
};

function totalLearners(dist: CompetencyDistribution): number {
    return Object.values(dist).reduce((a, b) => a + b, 0);
}

function outcomeStatus(dist: CompetencyDistribution): MasteryLevel {
    const total = totalLearners(dist);
    if (total === 0) return 'NOT_STARTED';
    const weightedSum = MASTERY_LEVELS.reduce(
        (sum, level) => sum + dist[level] * LEVEL_VALUES[level], 0
    );
    const avg = weightedSum / total;
    if (avg < 0.5) return 'NOT_STARTED';
    if (avg < 1.5) return 'BELOW';
    if (avg < 2.5) return 'APPROACHING';
    if (avg < 3.5) return 'MEETING';
    return 'EXCEEDING';
}

function criticalCount(dist: CompetencyDistribution): number {
    return dist.BELOW;
}

function watchCount(dist: CompetencyDistribution): number {
    return dist.APPROACHING;
}

function DistributionBar({ dist }: { dist: CompetencyDistribution }) {
    const total = totalLearners(dist);
    if (total === 0) return <div className="h-2 bg-gray-100 rounded-full w-full" />;
    return (
        <div className="flex h-2 rounded-full overflow-hidden w-full">
            {MASTERY_LEVELS.map(level => {
                const pct = dist[level] / total * 100;
                if (pct === 0) return null;
                return (
                    <div
                        key={level}
                        className={`${MASTERY_CONFIG[level].segment} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                        title={`${MASTERY_CONFIG[level].label}: ${dist[level]}`}
                    />
                );
            })}
        </div>
    );
}

// ─── Learner Drill-Down Modal ────────────────────────────────────────────────

interface LearnerDrillDownProps {
    outcome: StrandOutcomeDistribution;
    cohortId: number;
    levels: string;
    label: string;
    onClose: () => void;
}

function LearnerDrillDown({
    outcome, cohortId, levels, label, onClose,
}: LearnerDrillDownProps) {
    const router = useRouter();
    const { data: learners = [], isLoading } = useOutcomeLearners({
        learning_outcome_id: outcome.outcome_id,
        cohort_id: cohortId,
        levels,
    });

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center
            justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh]
                overflow-hidden flex flex-col shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="indigo" size="sm" className="font-mono">
                                {outcome.outcome_code}
                            </Badge>
                            <span className="text-sm font-semibold text-gray-700">{label}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate max-w-xs">
                            {outcome.description}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                {/* Learner list */}
                <div className="overflow-y-auto flex-1 p-4">
                    {isLoading ? (
                        <CBCLoading message="Loading learners…" />
                    ) : learners.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No learners found</p>
                    ) : (
                        <div className="space-y-2">
                            {learners.map((l: OutcomeLearner) => (
                                <div key={l.student_id}
                                    className="flex items-center justify-between p-3
                                        border border-gray-200 rounded-lg hover:border-gray-300
                                        transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                                            <Users className="h-4 w-4 text-gray-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 truncate">
                                                {l.student_name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {l.admission_number}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                        <MasteryBadge level={l.mastery_level} size="sm" />
                                        <Badge variant="default" size="sm">
                                            {l.evidence_count} evidence
                                        </Badge>
                                        <button
                                            onClick={() => {
                                                onClose();
                                                router.push(
                                                    `/cbc/progress/learner/${l.student_id}`
                                                );
                                            }}
                                            className="p-1.5 hover:bg-blue-50 rounded-lg
                                                transition-colors"
                                            title="View learner progress"
                                        >
                                            <ChevronRight className="h-4 w-4 text-blue-500" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <Button variant="ghost" size="md" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

interface DrillDown {
    outcome: StrandOutcomeDistribution;
    levels: string;
    label: string;
}

export default function StrandCompetencyOverviewPage() {
    const { strandId: raw } = useParams<{ strandId: string }>();
    const strandId = Number(raw);
    const searchParams = useSearchParams();
    const cohortFromUrl = searchParams.get('cohort');

    const { selectedCohortId, setSelectedCohort } = useCBCContext();
    const [expandedOutcome, setExpandedOutcome] = useState<number | null>(null);
    const [drillDown, setDrillDown] = useState<DrillDown | null>(null);

    const { data: strand, isLoading: strandLoading } = useStrandDetail(strandId);
    const { cohorts = [] } = useCohorts();

    useEffect(() => {
        if (selectedCohortId === null) {
            if (cohortFromUrl) {
                setSelectedCohort(Number(cohortFromUrl));
            } else if (cohorts.length > 0) {
                setSelectedCohort(cohorts[0].id);
            }
        }
    }, [cohorts, cohortFromUrl, selectedCohortId, setSelectedCohort]);

    const { data: outcomes = [], isLoading, error, refetch } =
        useStrandOutcomeDistribution({
            strand_id: strandId,
            cohort_id: selectedCohortId,
        });

    const bySubStrand = outcomes.reduce<Record<number, {
        name: string;
        outcomes: StrandOutcomeDistribution[];
    }>>((acc, o) => {
        if (!acc[o.sub_strand_id]) {
            acc[o.sub_strand_id] = { name: o.sub_strand_name, outcomes: [] };
        }
        acc[o.sub_strand_id].outcomes.push(o);
        return acc;
    }, {});

    const needsAttention = outcomes.filter(
        o => o.distribution.BELOW > 0 || o.distribution.APPROACHING > 0
    );

    if (strandLoading) return (
        <div className="space-y-6"><CBCNav /><CBCLoading message="Loading strand…" /></div>
    );

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Progress', href: '/cbc/progress' },
                { label: strand?.name ?? `Strand ${strandId}` },
            ]} />

            <Link href="/cbc/progress">
                <Button variant="ghost" size="md">
                    <ArrowLeft className="mr-2 h-4 w-4" />Progress Overview
                </Button>
            </Link>

            {/* Strand header */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm shrink-0">
                        <Target className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="blue" size="lg" className="font-mono font-semibold">
                                {strand?.code}
                            </Badge>
                            {strand?.subject_name && (
                                <span className="text-sm text-gray-500">{strand.subject_name}</span>
                            )}
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">{strand?.name}</h1>
                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wide">
                            Strand Competency Overview
                        </p>
                    </div>
                </div>
            </Card>

            {/* Cohort selector */}
            <Card>
                <Select
                    label="Cohort"
                    value={selectedCohortId?.toString() ?? ''}
                    onChange={e => setSelectedCohort(
                        e.target.value ? Number(e.target.value) : null
                    )}
                    options={[
                        { value: '', label: 'Select a cohort' },
                        ...cohorts.map((c: Cohort) => ({
                            value: String(c.id), label: c.name,
                        })),
                    ]}
                />
            </Card>

            {!selectedCohortId ? (
                <Card className="py-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500">Select a cohort to view competency data</p>
                </Card>
            ) : isLoading ? (
                <CBCLoading message="Computing competency overview…" />
            ) : error ? (
                <CBCError error={error} onRetry={refetch} />
            ) : (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            {
                                label: 'Total Outcomes',
                                value: outcomes.length,
                                color: 'text-blue-600',
                            },
                            {
                                label: 'Need Attention',
                                value: needsAttention.length,
                                color: needsAttention.length > 0
                                    ? 'text-amber-500' : 'text-emerald-600',
                            },
                            {
                                label: 'On Track',
                                value: outcomes.length - needsAttention.length,
                                color: 'text-emerald-600',
                            },
                        ].map(s => (
                            <Card key={s.label} className="text-center">
                                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                            </Card>
                        ))}
                    </div>

                    {/* Outcomes by sub-strand */}
                    {Object.entries(bySubStrand).map(([subStrandId, group]) => (
                        <Card key={subStrandId}>
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center
                                gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                {group.name}
                                <Badge variant="blue" size="sm">{group.outcomes.length}</Badge>
                            </h3>

                            <div className="space-y-2">
                                {group.outcomes.map(outcome => {
                                    const total = totalLearners(outcome.distribution);
                                    const isOpen = expandedOutcome === outcome.outcome_id;
                                    const status = outcomeStatus(outcome.distribution);
                                    const critical = criticalCount(outcome.distribution);
                                    const watch = watchCount(outcome.distribution);

                                    return (
                                        <div key={outcome.outcome_id}
                                            className={`border rounded-xl overflow-hidden
                                                transition-all ${critical > 0
                                                    ? 'border-red-200'
                                                    : watch > 0
                                                        ? 'border-amber-200'
                                                        : 'border-gray-200'
                                                }`}>

                                            <button
                                                type="button"
                                                onClick={() => setExpandedOutcome(
                                                    isOpen ? null : outcome.outcome_id
                                                )}
                                                className="w-full text-left p-4 hover:bg-gray-50
                                                    transition-colors"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="shrink-0 mt-0.5">
                                                        {isOpen
                                                            ? <ChevronDown className="h-4 w-4 text-gray-400" />
                                                            : <ChevronRight className="h-4 w-4 text-gray-400" />
                                                        }
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2
                                                            mb-1 flex-wrap">
                                                            <Badge variant="indigo" size="sm"
                                                                className="font-mono shrink-0">
                                                                {outcome.outcome_code}
                                                            </Badge>
                                                            <MasteryBadge level={status} size="sm" />
                                                            {/* Clickable critical/watch badges */}
                                                            {critical > 0 && (
                                                                <button
                                                                    onClick={e => {
                                                                        e.stopPropagation();
                                                                        setDrillDown({
                                                                            outcome,
                                                                            levels: 'BELOW',
                                                                            label: `${critical} Critical`,
                                                                        });
                                                                    }}
                                                                    className="text-xs text-red-600
                                                                        font-medium hover:underline
                                                                        cursor-pointer"
                                                                >
                                                                    🔴 {critical} critical
                                                                </button>
                                                            )}
                                                            {watch > 0 && (
                                                                <button
                                                                    onClick={e => {
                                                                        e.stopPropagation();
                                                                        setDrillDown({
                                                                            outcome,
                                                                            levels: 'APPROACHING',
                                                                            label: `${watch} Watch`,
                                                                        });
                                                                    }}
                                                                    className="text-xs text-amber-600
                                                                        font-medium hover:underline
                                                                        cursor-pointer"
                                                                >
                                                                    🟡 {watch} watch
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-700 mb-2">
                                                            {outcome.description}
                                                        </p>
                                                        <DistributionBar dist={outcome.distribution} />
                                                    </div>
                                                    {/* Evidence link */}
                                                    <Link
                                                        href={`/cbc/teaching/sessions`}
                                                        onClick={e => e.stopPropagation()}
                                                        className="shrink-0 p-1.5 hover:bg-blue-50
                                                            rounded-lg transition-colors"
                                                        title="View evidence for this outcome"
                                                    >
                                                        <FileText className="h-4 w-4 text-blue-400" />
                                                    </Link>
                                                </div>
                                            </button>

                                            {isOpen && (
                                                <div className="border-t border-gray-100
                                                    bg-gray-50 p-4 space-y-2">
                                                    {MASTERY_LEVELS.map(level => {
                                                        const count = outcome.distribution[level];
                                                        const pct = total > 0
                                                            ? Math.round(count / total * 100)
                                                            : 0;
                                                        return (
                                                            <div key={level}
                                                                className="flex items-center gap-3">
                                                                <div className="w-36 shrink-0">
                                                                    <MasteryBadge
                                                                        level={level} size="sm"
                                                                    />
                                                                </div>
                                                                <div className="flex-1 bg-gray-200
                                                                    rounded-full h-2 overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full
                                                                            ${MASTERY_CONFIG[level].segment}`}
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                                <div className="w-20 text-right
                                                                    shrink-0 text-sm">
                                                                    <span className="font-semibold
                                                                        text-gray-900">{count}</span>
                                                                    <span className="text-gray-400
                                                                        ml-1">({pct}%)</span>
                                                                </div>
                                                                {/* Drill into learners at this level */}
                                                                {count > 0 && (
                                                                    <button
                                                                        onClick={() => setDrillDown({
                                                                            outcome,
                                                                            levels: level,
                                                                            label: MASTERY_CONFIG[level].label,
                                                                        })}
                                                                        className="text-xs text-blue-500
                                                                            hover:underline shrink-0"
                                                                    >
                                                                        view
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    ))}

                    {/* Attention callout */}
                    {needsAttention.length === 0 ? (
                        <Card className="border-emerald-200 bg-emerald-50">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-emerald-100 rounded-xl shrink-0">
                                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                        All outcomes on track
                                    </h3>
                                    <p className="text-sm text-gray-700">
                                        No learners are Below or Approaching Expectation.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Card className="border-amber-200 bg-amber-50">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                                    <AlertCircle className="h-6 w-6 text-amber-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                        {needsAttention.length} outcome
                                        {needsAttention.length !== 1 ? 's' : ''} need attention
                                    </h3>
                                    <div className="space-y-1 mt-2">
                                        {needsAttention.map(o => (
                                            <div key={o.outcome_id}
                                                className="flex items-center gap-2 text-sm">
                                                <Badge variant="indigo" size="sm"
                                                    className="font-mono shrink-0">
                                                    {o.outcome_code}
                                                </Badge>
                                                <span className="text-gray-700 truncate">
                                                    {o.description}
                                                </span>
                                                <div className="flex gap-2 shrink-0">
                                                    {criticalCount(o.distribution) > 0 && (
                                                        <button
                                                            onClick={() => setDrillDown({
                                                                outcome: o,
                                                                levels: 'BELOW',
                                                                label: `${criticalCount(o.distribution)} Critical`,
                                                            })}
                                                            className="text-xs text-red-600
                                                                font-medium hover:underline"
                                                        >
                                                            🔴 {criticalCount(o.distribution)}
                                                        </button>
                                                    )}
                                                    {watchCount(o.distribution) > 0 && (
                                                        <button
                                                            onClick={() => setDrillDown({
                                                                outcome: o,
                                                                levels: 'APPROACHING',
                                                                label: `${watchCount(o.distribution)} Watch`,
                                                            })}
                                                            className="text-xs text-amber-600
                                                                font-medium hover:underline"
                                                        >
                                                            🟡 {watchCount(o.distribution)}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </>
            )}

            {/* Drill-down modal */}
            {drillDown && selectedCohortId && (
                <LearnerDrillDown
                    outcome={drillDown.outcome}
                    cohortId={selectedCohortId}
                    levels={drillDown.levels}
                    label={drillDown.label}
                    onClose={() => setDrillDown(null)}
                />
            )}
        </div>
    );
}
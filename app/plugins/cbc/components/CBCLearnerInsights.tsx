'use client';

import Link from 'next/link';
import { GraduationCap, ChevronRight, ShieldCheck, AlertTriangle, HelpCircle } from 'lucide-react';
import { useStudentConfidence } from '@/app/plugins/cbc/hooks/useCBC';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { MasteryBadge } from '@/app/plugins/cbc/components/CBCComponents';
import type { OutcomeConfidence, ConfidenceLevel } from '@/app/plugins/cbc/types/cbc';


// ─── Confidence thresholds ────────────────────────────────────────────────────
function confidenceColor(c: ConfidenceLevel): string {
    if (c === 'HIGH') return 'text-emerald-600';
    if (c === 'MEDIUM') return 'text-blue-500';
    if (c === 'LOW') return 'text-amber-500';
    return 'text-gray-400';
}


// ─── Source label ─────────────────────────────────────────────────────────────

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { label: string; icon: typeof ShieldCheck; className: string; tip: string }> = {
    HIGH: {
        label: 'Verified',
        icon: ShieldCheck,
        className: 'text-emerald-600',
        tip: 'Confirmed by assessment or manual override',
    },
    MEDIUM: {
        label: 'Direct (Teacher)',
        icon: ShieldCheck,
        className: 'text-blue-500',
        tip: 'Based on direct per-learner observation',
    },
    LOW: {
        label: 'Class-based',
        icon: AlertTriangle,
        className: 'text-amber-500',
        tip: 'Projected from class-level bulk evidence',
    },
    NONE: {
        label: 'No data',
        icon: HelpCircle,
        className: 'text-gray-400',
        tip: 'No evidence recorded yet',
    },
};

function SourcePip({ level }: { level: ConfidenceLevel }) {
    const cfg = CONFIDENCE_CONFIG[level];
    const Icon = cfg.icon;
    return (
        <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.className}`}
            title={cfg.tip}
        >
            <Icon className="h-3 w-3" />
            {cfg.label}
        </span>
    );
}

// ─── Overall confidence summary ───────────────────────────────────────────────

function overallConfidence(records: OutcomeConfidence[]): ConfidenceLevel {
    if (records.length === 0) return 'NONE';
    const scores: Record<ConfidenceLevel, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
    const avg = records.reduce((sum, r) => sum + scores[r.confidence], 0) / records.length;
    if (avg >= 2.5) return 'HIGH';
    if (avg >= 1.5) return 'MEDIUM';
    if (avg >= 0.5) return 'LOW';
    return 'NONE';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CBCLearnerInsights({ studentId }: { studentId: number }) {
    const { data: rawRecords = [], isLoading } = useStudentConfidence(studentId);

    // Deduplicate by outcome_id — keep highest confidence per outcome
    const records: OutcomeConfidence[] = Object.values(
        rawRecords.reduce<Record<number, OutcomeConfidence>>((acc, r) => {
            const existing = acc[r.outcome_id];
            if (!existing) {
                acc[r.outcome_id] = r;
            } else {
                // prefer higher evidence count
                if (r.evidence_count > existing.evidence_count) {
                    acc[r.outcome_id] = r;
                }
            }
            return acc;
        }, {})
    );

    const total = records.length;
    const onTrack = records.filter(
        r => r.mastery_level === 'MEETING' || r.mastery_level === 'EXCEEDING'
    ).length;
    const attention = records.filter(
        r => r.mastery_level === 'BELOW' || r.mastery_level === 'APPROACHING'
    ).length;
    const verified = records.filter(r => r.has_assessment || r.has_override).length;
    const classBased = records.filter(r => r.confidence === 'LOW').length;
    const overall = overallConfidence(records);

    return (
        <Card className="border-purple-100 bg-purple-50/30">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                        <GraduationCap className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            CBC Competency Progress
                        </h3>
                        <p className="text-xs text-gray-500">
                            Learning outcome mastery · evidence provenance
                        </p>
                    </div>
                </div>
                <Link href={`/cbc/progress/learner/${studentId}`}>
                    <Button variant="ghost" size="sm">
                        Full Report
                        <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </Link>
            </div>

            {isLoading ? (
                <p className="text-sm text-gray-400 py-2">Loading…</p>
            ) : total === 0 ? (
                <p className="text-sm text-gray-500 py-2">
                    No competency records yet for this learner.
                </p>
            ) : (
                <>
                    {/* Summary stats */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                        {[
                            { label: 'Outcomes', value: total, color: 'text-blue-600' },
                            { label: 'On Track', value: onTrack, color: 'text-emerald-600' },
                            {
                                label: 'Attention', value: attention,
                                color: attention > 0 ? 'text-red-500' : 'text-gray-400'
                            },
                            {
                                label: 'Verified', value: verified,
                                color: verified > 0 ? 'text-emerald-600' : 'text-gray-400'
                            },
                        ].map(s => (
                            <div key={s.label} className="text-center p-2 bg-white
                                rounded-lg border border-gray-100">
                                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                                <div className="text-xs text-gray-500">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Overall evidence quality */}
                    <div className="flex items-center gap-3 mb-3 px-1 py-1.5 bg-white
                        rounded-lg border border-gray-100">
                        <span className="text-xs text-gray-400 shrink-0">
                            Overall confidence:
                        </span>
                        <span className={`text-xs font-semibold ${confidenceColor(overall)}`}>
                            {overall}
                        </span>
                        <span className="text-gray-200">·</span>
                        <span className="text-xs text-gray-400">
                            {verified > 0
                                ? `${verified} verified by assessment`
                                : classBased > 0
                                    ? `${classBased} class-based — individual observation recommended`
                                    : 'teacher-observed'
                            }
                        </span>
                    </div>

                    {/* Outcome rows */}
                    <div className="space-y-1.5">
                        {records.slice(0, 5).map((r: OutcomeConfidence) => (
                            <div
                                key={r.outcome_id}
                                className="flex items-center justify-between py-1.5 px-3 bg-white rounded-lg border border-gray-100"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs font-mono text-gray-600 shrink-0">
                                        {r.outcome_code}
                                    </span>
                                    <MasteryBadge level={r.mastery_level} size="sm" />
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <SourcePip level={r.confidence} />
                                    <span className={`text-xs font-medium ${confidenceColor(r.confidence)}`}>
                                        {CONFIDENCE_CONFIG[r.confidence].label}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        {r.evidence_count}{' '}
                                        {r.evidence_count === 1 ? 'record' : 'records'}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {records.length > 5 && (
                            <Link
                                href={`/cbc/progress/learner/${studentId}`}
                                className="block text-xs text-center text-blue-500
                                    hover:text-blue-700 py-1.5 transition-colors"
                            >
                                +{records.length - 5} more outcomes → view full report
                            </Link>
                        )}
                    </div>

                    {/* Class-based warning */}
                    {classBased > 0 && (
                        <div className="mt-3 flex items-start gap-2 p-2.5 bg-amber-50
                            border border-amber-200 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700">
                                {classBased}{' '}
                                {classBased === 1 ? 'outcome is' : 'outcomes are'} class-based —
                                projected from group evidence, not individual observation.
                                Record direct evidence or an assessment to increase confidence.
                            </p>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}
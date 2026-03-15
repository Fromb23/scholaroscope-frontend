// ============================================================================
// app/components/cbc/CBCComponents.tsx - Shared CBC UI primitives
// ============================================================================

'use client';

import { MasteryLevel, MasteryDistribution } from '@/app/plugins/cbc/types/cbc';

// ============================================================================
// Shared colour / label tables — single source of truth
// ============================================================================

const MASTERY_STYLES: Record<MasteryLevel, { bg: string; text: string; border: string }> = {
    NOT_STARTED: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
    EMERGING: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
    MEETING: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    EXCEEDING: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
};

const MASTERY_LABELS: Record<MasteryLevel, string> = {
    NOT_STARTED: 'Not Started',
    EMERGING: 'Emerging',
    MEETING: 'Meeting',
    EXCEEDING: 'Exceeding',
};

const MASTERY_ORDER: MasteryLevel[] = ['NOT_STARTED', 'EMERGING', 'MEETING', 'EXCEEDING'];

const SEGMENT_BG: Record<MasteryLevel, string> = {
    NOT_STARTED: 'bg-gray-300',
    EMERGING: 'bg-amber-400',
    MEETING: 'bg-blue-500',
    EXCEEDING: 'bg-emerald-500',
};

// ============================================================================
// Helpers used by multiple components
// ============================================================================

function barColor(pct: number): string {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 60) return 'bg-blue-500';
    if (pct >= 40) return 'bg-amber-500';
    return 'bg-gray-400';
}

function labelColor(pct: number): string {
    if (pct >= 80) return 'text-emerald-600';
    if (pct >= 60) return 'text-blue-600';
    if (pct >= 40) return 'text-amber-600';
    return 'text-gray-500';
}

// ============================================================================
// MasteryBadge
// ============================================================================

interface MasteryBadgeProps {
    level: MasteryLevel;
    size?: 'sm' | 'md';
}

export function MasteryBadge({ level, size = 'md' }: MasteryBadgeProps) {
    const { bg, text, border } = MASTERY_STYLES[level];
    const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

    return (
        <span className={`inline-flex items-center font-medium rounded-full border ${bg} ${text} ${border} ${pad}`}>
            {MASTERY_LABELS[level]}
        </span>
    );
}

// ============================================================================
// ProgressBar
// ============================================================================

interface ProgressBarProps {
    percentage: number;
    showLabel?: boolean;
    height?: 'thin' | 'default';
}

export function ProgressBar({ percentage, showLabel = false, height = 'default' }: ProgressBarProps) {
    const h = height === 'thin' ? 'h-2' : 'h-3';
    const val = Math.min(100, Math.max(0, percentage));

    return (
        <div className="flex items-center gap-3">
            <div className={`flex-1 w-full bg-gray-200 rounded-full ${h} overflow-hidden`}>
                <div
                    className={`${h} rounded-full ${barColor(val)} transition-all duration-500`}
                    style={{ width: `${val}%` }}
                />
            </div>
            {showLabel && (
                <span className={`text-sm font-semibold ${labelColor(val)} w-12 text-right shrink-0`}>
                    {val}%
                </span>
            )}
        </div>
    );
}

// ============================================================================
// MasteryDistributionBar (internal — used inside StrandProgressRow)
// Segmented bar: each segment = one mastery level, width proportional to count.
// ============================================================================

interface MasteryDistributionBarProps {
    distribution: MasteryDistribution;
    total: number;
}

function MasteryDistributionBar({ distribution, total }: MasteryDistributionBarProps) {
    if (total === 0) return <div className="w-full h-3 bg-gray-200 rounded-full" />;

    return (
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
            {MASTERY_ORDER.map(level => {
                const count = distribution[level];
                const pct = (count / total) * 100;
                if (pct === 0) return null;
                return (
                    <div
                        key={level}
                        className={`h-full ${SEGMENT_BG[level]} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                        title={`${MASTERY_LABELS[level]}: ${count}`}
                    />
                );
            })}
        </div>
    );
}

// ============================================================================
// MasteryDistributionLegend
// ============================================================================

export function MasteryDistributionLegend() {
    return (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
            {MASTERY_ORDER.map(level => (
                <div key={level} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${SEGMENT_BG[level]}`} />
                    <span className="text-xs text-gray-500">{MASTERY_LABELS[level]}</span>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// StrandProgressRow
// Complete row: code · name · bar · counts.
// When masteryDistribution is supplied → segmented bar.
// Otherwise → plain percentage bar.
// ============================================================================

interface StrandProgressRowProps {
    strandCode: string;
    strandName: string;
    totalOutcomes: number;
    completedOutcomes: number;
    percentage: number;
    masteryDistribution?: MasteryDistribution;
}

export function StrandProgressRow({
    strandCode,
    strandName,
    totalOutcomes,
    completedOutcomes,
    percentage,
    masteryDistribution,
}: StrandProgressRowProps) {
    return (
        <div className="py-4 border-b last:border-0 last:pb-0">
            {/* Top line */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono font-semibold text-gray-400 shrink-0">{strandCode}</span>
                    <span className="font-medium text-gray-900 truncate">{strandName}</span>
                </div>
                <span className={`text-sm font-bold shrink-0 ml-4 ${labelColor(percentage)}`}>
                    {percentage}%
                </span>
            </div>

            {/* Bar */}
            {masteryDistribution ? (
                <MasteryDistributionBar distribution={masteryDistribution} total={totalOutcomes} />
            ) : (
                <ProgressBar percentage={percentage} />
            )}

            {/* Bottom line */}
            <p className="text-xs text-gray-500 mt-1.5">
                {completedOutcomes} of {totalOutcomes} outcome{totalOutcomes !== 1 ? 's' : ''} completed
            </p>
        </div>
    );
}
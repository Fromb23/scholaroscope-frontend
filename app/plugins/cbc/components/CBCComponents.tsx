'use client';
// app/plugins/cbc/components/CBCComponents.tsx

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { MasteryLevel, MasteryDistribution } from '@/app/plugins/cbc/types/cbc';

// ============================================================================
// CBC Nav — single source, never duplicated across pages
// ============================================================================

const NAV_ITEMS = [
    { href: '/cbc/authoring', label: 'Authoring' },
    { href: '/cbc/browser', label: 'Browser' },
    { href: '/cbc/progress', label: 'Progress' },
    { href: '/cbc/teaching', label: 'Teaching' },
] as const;

export function CBCNav() {
    const pathname = usePathname();

    return (
        <nav className="flex gap-1.5 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
            {NAV_ITEMS.map(({ href, label }) => {
                const active = pathname.startsWith(href);
                return (
                    <Link
                        key={href}
                        href={href}
                        className={`
              flex-1 text-center text-sm font-medium rounded-lg py-2.5 transition-colors
              ${active
                                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
            `}
                    >
                        {label}
                    </Link>
                );
            })}
        </nav>
    );
}

// ============================================================================
// CBC Breadcrumb — renders from an array of segments
// ============================================================================

export interface BreadcrumbSegment {
    label: string;
    href?: string;
}

export function CBCBreadcrumb({ segments }: { segments: BreadcrumbSegment[] }) {
    return (
        <nav className="flex items-center flex-wrap gap-1.5 text-sm text-gray-500">
            {segments.map((seg, i) => (
                <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-gray-300">→</span>}
                    {seg.href ? (
                        <Link href={seg.href} className="hover:text-blue-600 transition-colors">
                            {seg.label}
                        </Link>
                    ) : (
                        <span className="text-gray-900 font-medium">{seg.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}

// ============================================================================
// Mastery — single source of truth for colours / labels
// ============================================================================

export const MASTERY_CONFIG: Record<
    MasteryLevel,
    { bg: string; text: string; border: string; segment: string; label: string }
> = {
    NOT_STARTED: {
        bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300',
        segment: 'bg-gray-300', label: 'Not Started',
    },
    BELOW: {
        bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300',
        segment: 'bg-red-400', label: 'Below Expectation',
    },
    APPROACHING: {
        bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300',
        segment: 'bg-amber-400', label: 'Approaching Expectation',
    },
    MEETING: {
        bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300',
        segment: 'bg-blue-500', label: 'Meeting Expectation',
    },
    EXCEEDING: {
        bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300',
        segment: 'bg-emerald-500', label: 'Exceeding Expectation',
    },
};

const MASTERY_ORDER: MasteryLevel[] = [
    'NOT_STARTED', 'BELOW', 'APPROACHING', 'MEETING', 'EXCEEDING',
];

export function MasteryBadge({
    level,
    size = 'md',
}: {
    level: MasteryLevel;
    size?: 'sm' | 'md';
}) {
    const { bg, text, border, label } = MASTERY_CONFIG[level];
    const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
    return (
        <span
            className={`inline-flex items-center font-medium rounded-full border
        ${bg} ${text} ${border} ${pad}`}
        >
            {label}
        </span>
    );
}

export function MasteryDistributionLegend() {
    return (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
            {MASTERY_ORDER.map(level => (
                <div key={level} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${MASTERY_CONFIG[level].segment}`} />
                    <span className="text-xs text-gray-500">{MASTERY_CONFIG[level].label}</span>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// ProgressBar
// ============================================================================

function barColor(pct: number) {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 60) return 'bg-blue-500';
    if (pct >= 40) return 'bg-amber-500';
    return 'bg-gray-400';
}

function labelColor(pct: number) {
    if (pct >= 80) return 'text-emerald-600';
    if (pct >= 60) return 'text-blue-600';
    if (pct >= 40) return 'text-amber-600';
    return 'text-gray-500';
}

export function ProgressBar({
    percentage,
    showLabel = false,
    height = 'default',
}: {
    percentage: number;
    showLabel?: boolean;
    height?: 'thin' | 'default';
}) {
    const h = height === 'thin' ? 'h-2' : 'h-3';
    const val = Math.min(100, Math.max(0, percentage));
    return (
        <div className="flex items-center gap-3">
            <div className={`flex-1 bg-gray-200 rounded-full ${h} overflow-hidden`}>
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
// MasteryDistributionBar — segmented bar per mastery level
// ============================================================================

function MasteryDistributionBar({
    distribution,
    total,
}: {
    distribution: MasteryDistribution;
    total: number;
}) {
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
                        className={`h-full ${MASTERY_CONFIG[level].segment} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                        title={`${MASTERY_CONFIG[level].label}: ${count}`}
                    />
                );
            })}
        </div>
    );
}

// ============================================================================
// StrandProgressRow — used on student + cohort progress pages
// ============================================================================

export function StrandProgressRow({
    strandCode,
    strandName,
    totalOutcomes,
    completedOutcomes,
    percentage,
    masteryDistribution,
}: {
    strandCode: string;
    strandName: string;
    totalOutcomes: number;
    completedOutcomes: number;
    percentage: number;
    masteryDistribution?: MasteryDistribution;
}) {
    return (
        <div className="py-4 border-b last:border-0 last:pb-0">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono font-semibold text-gray-400 shrink-0">
                        {strandCode}
                    </span>
                    <span className="font-medium text-gray-900 truncate">{strandName}</span>
                </div>
                <span className={`text-sm font-bold shrink-0 ml-4 ${labelColor(percentage)}`}>
                    {percentage}%
                </span>
            </div>

            {masteryDistribution ? (
                <MasteryDistributionBar distribution={masteryDistribution} total={totalOutcomes} />
            ) : (
                <ProgressBar percentage={percentage} />
            )}

            <p className="text-xs text-gray-500 mt-1.5">
                {completedOutcomes} of {totalOutcomes} outcome{totalOutcomes !== 1 ? 's' : ''}
            </p>
        </div>
    );
}

// ============================================================================
// CBCError — global error display for CBC pages
// Handles the standard server error shape: { detail, type, code, message }
// ============================================================================

interface ServerError {
    detail?: string;
    message?: string;
    type?: string;
}

export function CBCError({
    error,
    onRetry,
    title = 'Something went wrong',
}: {
    error: unknown;
    onRetry?: () => void;
    title?: string;
}) {
    const msg = extractErrorMessage(error);
    return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 flex items-start gap-4">
            <div className="p-2 bg-red-100 rounded-lg shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-red-900">{title}</p>
                <p className="text-sm text-red-700 mt-1">{msg}</p>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-red-700
            hover:text-red-900 transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                </button>
            )}
        </div>
    );
}

export function extractErrorMessage(error: unknown): string {
    if (!error) return 'An unknown error occurred';
    if (typeof error === 'string') return error;

    const e = error as { response?: { data?: ServerError }; message?: string };

    if (e.response?.data) {
        const d = e.response.data;
        return d.detail ?? d.message ?? 'Server error';
    }
    return e.message ?? 'An unexpected error occurred';
}

// ============================================================================
// CBCLoading — consistent spinner
// ============================================================================

export function CBCLoading({ message = 'Loading…' }: { message?: string }) {
    return (
        <div className="py-20 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4
        border-blue-600 border-t-transparent mb-3" />
            <p className="text-sm text-gray-500">{message}</p>
        </div>
    );
}

// ============================================================================
// CBCEmpty — consistent empty state
// ============================================================================

export function CBCEmpty({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="py-16 text-center">
            <div className="p-4 bg-gray-50 rounded-full inline-flex mb-4">
                <Icon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">{description}</p>
            )}
            {action}
        </div>
    );
}

// ============================================================================
// SubjectGroupPicker — grouped subject selector (subject → grades)
// ============================================================================

import { useState } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import type { Subject } from '@/app/core/types/academic';

export function SubjectGroupPicker({
    subjects,
    selectedSubjectId,
    onSelect,
}: {
    subjects: Subject[];
    selectedSubjectId: number | null;
    onSelect: (id: number | null) => void;
}) {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const groups = useMemo(() => {
        const map: Record<string, Subject[]> = {};
        subjects.forEach(s => {
            const base = s.name
                .replace(/\s+Grade\s+\d+/i, '')
                .replace(/\s+grade\d+/i, '')
                .trim();
            if (!map[base]) map[base] = [];
            map[base].push(s);
        });
        return map;
    }, [subjects]);

    const toggleGroup = (name: string) => {
        setExpandedGroups(prev => {
            const n = new Set(prev);
            n.has(name) ? n.delete(name) : n.add(name);
            return n;
        });
    };

    return (
        <div className="space-y-1">
            <button
                onClick={() => onSelect(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedSubjectId === null
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
            >
                All Subjects
            </button>
            {Object.entries(groups).map(([groupName, groupSubjects]) => {
                const expanded = expandedGroups.has(groupName);
                const hasSelected = groupSubjects.some(s => s.id === selectedSubjectId);
                return (
                    <div key={groupName}>
                        <button
                            onClick={() => toggleGroup(groupName)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${hasSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-gray-400 shrink-0" />
                                <span className={`font-medium ${hasSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                                    {groupName}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {groupSubjects.length} level{groupSubjects.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </button>
                        {expanded && (
                            <div className="ml-4 mt-1 space-y-0.5">
                                {groupSubjects.map(s => {
                                    const levelLabel = s.level
                                        .replace('grade', 'Grade ')
                                        .replace(/(\d+)/, ' $1')
                                        .replace(/\s+/, ' ')
                                        .trim();
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => onSelect(s.id)}
                                            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedSubjectId === s.id
                                                ? 'bg-blue-100 text-blue-700 font-medium'
                                                : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {levelLabel}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================================
// SessionStatusBadge
// ============================================================================

const STATUS_STYLES = {
    SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
    IN_PROGRESS: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'In Progress' },
    COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Completed' },
    MISSED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Missed' },
} as const;

export function SessionStatusBadge({ status }: { status: keyof typeof STATUS_STYLES }) {
    const { bg, text, label } = STATUS_STYLES[status] ?? STATUS_STYLES.SCHEDULED;
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full
      text-xs font-medium ${bg} ${text}`}>
            {label}
        </span>
    );
}
'use client';

// ============================================================================
// app/core/components/academic/AcademicProgressComponents.tsx
//
// Components for academic progress page.
// Typed props. No any. No API calls.
// ============================================================================

import { useState } from 'react';
import Link from 'next/link';
import {
    CheckCircle, Circle, ChevronDown, ChevronRight, History,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useCoverageProgress } from '@/app/core/hooks/useTopics';
import { Badge } from '@/app/components/ui/Badge';

// ── Coverage utilities ─────────────────────────────────────────────────────

export function coverageColor(pct: number): string {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 60) return 'bg-blue-500';
    if (pct >= 40) return 'bg-yellow-500';
    if (pct > 0) return 'bg-red-400';
    return 'bg-gray-200';
}

export function coverageVariant(pct: number): 'green' | 'blue' | 'yellow' | 'red' | 'default' {
    if (pct >= 80) return 'green';
    if (pct >= 60) return 'blue';
    if (pct >= 40) return 'yellow';
    if (pct > 0) return 'red';
    return 'default';
}

// ── AcademicNav ────────────────────────────────────────────────────────────

type NavTab = 'browser' | 'progress' | 'authoring';

interface AcademicNavProps {
    active: NavTab;
}

export function AcademicNav({ active }: AcademicNavProps) {
    const { user, activeRole } = useAuth();
    const isAdmin = activeRole === 'ADMIN' || user?.is_superadmin;

    const tab = (href: string, label: string, key: NavTab) => (
        <Link
            href={href}
            className={`flex-1 text-center text-sm font-medium rounded-lg py-2.5 transition-colors ${active === key
                ? 'font-semibold text-white bg-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
        >
            {label}
        </Link>
    );

    return (
        <nav className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
            {isAdmin && tab('/academic/topics', 'Authoring', 'authoring')}
            {tab('/academic/topics/browser', isAdmin ? 'Browser' : 'My Topics', 'browser')}
            {tab('/academic/progress', 'Progress', 'progress')}
        </nav>
    );
}

// ── CoverageBar ────────────────────────────────────────────────────────────

interface CoverageBarProps {
    percentage: number;
}

export function CoverageBar({ percentage }: CoverageBarProps) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${coverageColor(percentage)}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                {percentage}%
            </span>
        </div>
    );
}

// ── CoverageLegend ─────────────────────────────────────────────────────────

const LEGEND_ITEMS: { label: string; variant: 'green' | 'blue' | 'yellow' | 'red' | 'default' }[] = [
    { label: 'Excellent ≥80%', variant: 'green' },
    { label: 'Good 60–79%', variant: 'blue' },
    { label: 'Progressing 40–59%', variant: 'yellow' },
    { label: 'Behind 1–39%', variant: 'red' },
    { label: 'Not started', variant: 'default' },
];

export function CoverageLegend() {
    return (
        <div className="flex flex-wrap gap-3">
            {LEGEND_ITEMS.map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                    <Badge variant={item.variant} size="sm">•</Badge>
                    <span className="text-xs text-gray-600">{item.label}</span>
                </div>
            ))}
        </div>
    );
}

// ── CohortSubjectCard ──────────────────────────────────────────────────────

interface CohortSubjectCardProps {
    cohortSubjectId: number;
    isHistorical: boolean;
}

export function CohortSubjectCard({ cohortSubjectId, isHistorical }: CohortSubjectCardProps) {
    const [open, setOpen] = useState(false);
    const { progress, loading } = useCoverageProgress(cohortSubjectId);

    if (loading || !progress) {
        return (
            <div className="border border-gray-200 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
                <div className="h-2 bg-gray-100 rounded" />
            </div>
        );
    }

    return (
        <div className={`border rounded-xl overflow-hidden ${isHistorical ? 'border-gray-100 opacity-80' : 'border-gray-200'
            }`}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
            >
                <div className="shrink-0">
                    {open
                        ? <ChevronDown className="h-5 w-5 text-blue-600" />
                        : <ChevronRight className="h-5 w-5 text-gray-400" />
                    }
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{progress.subject_name}</p>
                        {isHistorical && (
                            <Badge variant="default" size="sm">
                                <History className="h-3 w-3 mr-1" />
                                {progress.academic_year}
                            </Badge>
                        )}
                    </div>
                    <div className="mt-2">
                        <CoverageBar percentage={progress.percentage} />
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <Badge variant={coverageVariant(progress.percentage)} size="md">
                        {progress.covered}/{progress.total}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">subtopics covered</p>
                </div>
            </button>

            {open && (
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                    {progress.uncovered_subtopics.length === 0 ? (
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-sm font-medium">All subtopics covered — well done!</span>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                Remaining subtopics
                            </p>
                            <div className="space-y-2">
                                {progress.uncovered_subtopics.map(s => (
                                    <div key={s.id} className="flex items-center gap-3">
                                        <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                                        <span className="font-mono text-xs text-gray-400">{s.code}</span>
                                        <span className="text-sm text-gray-700">{s.name}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
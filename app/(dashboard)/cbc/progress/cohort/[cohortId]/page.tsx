'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Target, BookOpen, AlertCircle } from 'lucide-react';
import { useCBCProgressSummary } from '@/app/plugins/cbc/hooks/useCBC';
import { useCohort, useSubjects } from '@/app/core/hooks/useAcademic';
import {
    CBCNav, CBCBreadcrumb, CBCError, CBCLoading,
    MasteryBadge, MASTERY_CONFIG,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Select } from '@/app/components/ui/Select';
import type { MasteryLevel } from '@/app/plugins/cbc/types/cbc';
import type { Subject } from '@/app/core/types/academic';

const MASTERY_LEVELS: MasteryLevel[] = [
    'NOT_STARTED', 'BELOW', 'APPROACHING', 'MEETING', 'EXCEEDING',
];

export default function CohortProgressPage() {
    const { cohortId: raw } = useParams<{ cohortId: string }>();
    const cohortId = Number(raw);

    const { cohort, loading: cohortLoading } = useCohort(cohortId);
    const { subjects = [] } = useSubjects(cohort?.curriculum ?? undefined);

    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const raw = localStorage.getItem(`cbc_cohort_subject_${cohortId}`);
            return raw ? Number(raw) : null;
        } catch { return null; }
    });
    useEffect(() => {
        if (selectedSubjectId === null) return;
        try {
            localStorage.setItem(`cbc_cohort_subject_${cohortId}`, String(selectedSubjectId));
        } catch { }
    }, [selectedSubjectId, cohortId]);

    // Auto-select if only one subject
    useEffect(() => {
        if (subjects.length === 1 && selectedSubjectId === null) {
            setSelectedSubjectId(subjects[0].id);
        }
    }, [subjects, selectedSubjectId]);

    const { data: summary, isLoading, error, refetch } = useCBCProgressSummary({
        cohort_id: cohortId,
        subject_id: selectedSubjectId,
    });

    const totalLearners = useMemo(() => {
        if (!summary) return 0;
        return Object.values(summary.competency).reduce((a, b) => a + b, 0);
    }, [summary]);

    if (cohortLoading) return (
        <div className="space-y-6"><CBCNav /><CBCLoading message="Loading cohort…" /></div>
    );

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Progress', href: '/cbc/progress' },
                { label: 'Cohort Progress' },
            ]} />

            <Link href="/cbc/progress">
                <Button variant="ghost" size="md">
                    <ArrowLeft className="mr-2 h-4 w-4" />Progress Overview
                </Button>
            </Link>

            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                    <Users className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Cohort Competency Progress
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {cohort?.name ?? `Cohort ${cohortId}`}
                    </p>
                </div>
            </div>

            {/* Subject filter — only show if multiple subjects */}
            {subjects.length > 1 && (
                <Card>
                    <Select
                        label="Subject"
                        value={selectedSubjectId?.toString() ?? ''}
                        onChange={e => setSelectedSubjectId(
                            e.target.value ? Number(e.target.value) : null
                        )}
                        options={[
                            { value: '', label: 'Select a subject' },
                            ...subjects.map((s: Subject) => ({
                                value: String(s.id), label: s.name,
                            })),
                        ]}
                    />
                </Card>
            )}

            {!selectedSubjectId ? (
                <Card className="py-12 text-center">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500">Select a subject to view progress</p>
                </Card>
            ) : isLoading ? (
                <CBCLoading message="Computing competency data…" />
            ) : error ? (
                <CBCError error={error} onRetry={refetch} />
            ) : summary ? (
                <>
                    {/* Coverage stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            {
                                label: 'Outcomes Covered',
                                value: `${summary.coverage.covered}/${summary.coverage.total}`,
                                color: 'text-blue-600',
                            },
                            {
                                label: 'Coverage',
                                value: `${summary.coverage.percent}%`,
                                color: 'text-purple-600',
                            },
                            {
                                label: 'Avg Score',
                                value: `${summary.avg_score}/4`,
                                color: 'text-emerald-600',
                            },
                            {
                                label: 'Need Attention',
                                value: summary.attention_needed,
                                color: 'text-red-500',
                            },
                        ].map(s => (
                            <Card key={s.label} className="text-center">
                                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                            </Card>
                        ))}
                    </div>

                    {/* Competency distribution bar chart */}
                    <Card>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center
                            gap-2 mb-5">
                            <Target className="h-5 w-5 text-purple-600" />
                            Competency Distribution
                            <Badge variant="blue" size="sm">{totalLearners} learners</Badge>
                        </h2>

                        {/* Stacked bar */}
                        <div className="flex h-8 rounded-lg overflow-hidden mb-4">
                            {MASTERY_LEVELS.map(level => {
                                const count = summary.competency[level];
                                const pct = totalLearners > 0
                                    ? count / totalLearners * 100
                                    : 0;
                                if (pct === 0) return null;
                                return (
                                    <div
                                        key={level}
                                        className={`${MASTERY_CONFIG[level].segment}
                                            transition-all duration-500`}
                                        style={{ width: `${pct}%` }}
                                        title={`${MASTERY_CONFIG[level].label}: ${count}`}
                                    />
                                );
                            })}
                        </div>

                        {/* Per-level rows */}
                        <div className="space-y-3">
                            {MASTERY_LEVELS.map(level => {
                                const count = summary.competency[level];
                                const pct = totalLearners > 0
                                    ? Math.round(count / totalLearners * 100)
                                    : 0;
                                const cfg = MASTERY_CONFIG[level];
                                return (
                                    <div key={level} className="flex items-center gap-4">
                                        <div className="w-44 shrink-0">
                                            <MasteryBadge level={level} size="sm" />
                                        </div>
                                        <div className="flex-1 bg-gray-100 rounded-full h-3
                                            overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all
                                                    duration-500 ${cfg.segment}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <div className="w-24 text-right shrink-0">
                                            <span className="font-semibold text-gray-900">
                                                {count}
                                            </span>
                                            <span className="text-gray-400 text-sm ml-1">
                                                ({pct}%)
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Attention callout */}
                    {summary.attention_needed > 0 && (
                        <Card className="border-amber-200 bg-amber-50">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                                    <AlertCircle className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                        {summary.attention_needed} learner
                                        {summary.attention_needed !== 1 ? 's' : ''} need support
                                    </h3>
                                    <p className="text-sm text-gray-700">
                                        Below Expectation or Not Started —
                                        consider targeted intervention.
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )}
                </>
            ) : null}
        </div>
    );
}
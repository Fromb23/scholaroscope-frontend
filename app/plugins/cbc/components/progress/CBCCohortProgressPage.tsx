'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    AlertCircle,
    ArrowLeft,
    BookOpen,
    Target,
    Users,
} from 'lucide-react';
import { useCBCCohortProgressPage } from '@/app/plugins/cbc/hooks/useCBCCohortProgressPage';
import {
    CBCNav,
    CBCBreadcrumb,
    CBCError,
    CBCLoading,
    MasteryBadge,
    MASTERY_CONFIG,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { Select } from '@/app/components/ui/Select';
import { getCbcBackLabel } from '@/app/plugins/cbc/lib/navigation';
import { CBCProgressSkeleton } from './CBCProgressSkeleton';
import type { MasteryLevel } from '@/app/plugins/cbc/types/cbc';
import type { Subject } from '@/app/core/types/academic';

const MASTERY_LEVELS: MasteryLevel[] = [
    'NOT_STARTED',
    'BELOW',
    'APPROACHING',
    'MEETING',
    'EXCEEDING',
];

export function CBCCohortProgressPage() {
    const { cohortId: raw } = useParams<{ cohortId: string }>();
    const cohortId = Number(raw);
    const page = useCBCCohortProgressPage(cohortId);
    const summary = page.summary;
    const backLabel = getCbcBackLabel(page.returnTo, 'Progress Overview');

    if (page.cohortLoading) {
        return (
            <div className="space-y-6">
                <CBCNav />
                <CBCLoading message={`Loading CBC progress for cohort ${cohortId}...`} />
                <CBCProgressSkeleton />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CBCNav />
            <CBCBreadcrumb segments={[
                { label: 'Progress', href: '/cbc/progress' },
                { label: 'Cohort Progress' },
            ]} />

            <Link href={page.returnTo ?? '/cbc/progress'}>
                <Button variant="ghost" size="md">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {backLabel}
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
                        {page.cohort?.name ?? `Cohort ${cohortId}`}
                    </p>
                </div>
            </div>

            {page.subjects.length > 1 && (
                <Card>
                    <Select
                        label="Subject"
                        value={page.selectedSubjectId?.toString() ?? ''}
                        onChange={event => page.setSelectedSubjectId(
                            event.target.value ? Number(event.target.value) : null
                        )}
                        options={[
                            { value: '', label: 'Select a subject' },
                            ...page.subjects.map((subject: Subject) => ({
                                value: String(subject.id),
                                label: subject.name,
                            })),
                        ]}
                    />
                </Card>
            )}

            {page.instructorScopeLoading ? (
                <CBCLoading message="Checking your CBC subject scope..." />
            ) : !page.selectedSubjectId ? (
                <Card className="py-12 text-center">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500">Select a subject to view progress</p>
                </Card>
            ) : page.isLoading ? (
                <CBCLoading message="Loading CBC competency progress..." />
            ) : page.error ? (
                <CBCError error={page.error} onRetry={page.refetch} />
            ) : summary ? (
                <>
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
                                label: 'Learners Needing Support',
                                value: summary.learners_needing_support,
                                color: 'text-red-500',
                            },
                        ].map(stat => (
                            <Card key={stat.label} className="text-center">
                                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                            </Card>
                        ))}
                    </div>

                    <Card>
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-5">
                            <Target className="h-5 w-5 text-purple-600" />
                            Competency Distribution
                            <Badge variant="blue" size="sm">
                                {page.totalOutcomeRecords} outcome record
                                {page.totalOutcomeRecords !== 1 ? 's' : ''}
                            </Badge>
                        </h2>

                        <div className="flex h-8 rounded-lg overflow-hidden mb-4">
                            {MASTERY_LEVELS.map(level => {
                                const count = summary.competency[level];
                                const percentage = page.totalOutcomeRecords > 0
                                    ? (count / page.totalOutcomeRecords) * 100
                                    : 0;
                                if (percentage === 0) return null;

                                return (
                                    <div
                                        key={level}
                                        className={`${MASTERY_CONFIG[level].segment} transition-all duration-500`}
                                        style={{ width: `${percentage}%` }}
                                        title={`${MASTERY_CONFIG[level].label}: ${count}`}
                                    />
                                );
                            })}
                        </div>

                        <div className="space-y-3">
                            {MASTERY_LEVELS.map(level => {
                                const count = summary.competency[level];
                                const percentage = page.totalOutcomeRecords > 0
                                    ? Math.round((count / page.totalOutcomeRecords) * 100)
                                    : 0;
                                const config = MASTERY_CONFIG[level];
                                const recordLabel = count === 1 ? 'record' : 'records';

                                return (
                                    <div key={level} className="flex items-center gap-4">
                                        <div className="w-44 shrink-0">
                                            <MasteryBadge level={level} size="sm" />
                                        </div>
                                        <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${config.segment}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="w-40 text-right shrink-0">
                                            <span className="font-semibold text-gray-900">
                                                {count} {recordLabel}
                                            </span>
                                            <span className="text-gray-400 text-sm ml-1">({percentage}%)</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {summary.learners_needing_support > 0 && (
                        <Card className="border-amber-200 bg-amber-50">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                                    <AlertCircle className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                        {summary.learners_needing_support} learner
                                        {summary.learners_needing_support !== 1 ? 's' : ''} need support
                                    </h3>
                                    <p className="text-sm text-gray-700">
                                        {summary.records_needing_evidence} outcome record
                                        {summary.records_needing_evidence !== 1 ? 's are' : ' is'} Not Started
                                        {' '}or Below Expectation. Consider targeted intervention.
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

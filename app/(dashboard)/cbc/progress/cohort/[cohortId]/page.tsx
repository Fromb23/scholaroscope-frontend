'use client';
// app/(dashboard)/cbc/progress/cohort/[cohortId]/page.tsx

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Target, TrendingUp, Award, AlertCircle } from 'lucide-react';
import { useCohortSummary } from '@/app/plugins/cbc/hooks/useCBC';
import {
    CBCNav, CBCBreadcrumb, CBCError, CBCLoading,
} from '@/app/plugins/cbc/components/CBCComponents';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { DataTable, Column } from '@/app/components/ui/Table';
import type { CohortSummaryEntry } from '@/app/plugins/cbc/types/cbc';

function masteryVariant(pct: number) {
    if (pct >= 80) return 'green';
    if (pct >= 60) return 'blue';
    if (pct >= 40) return 'yellow';
    if (pct > 0) return 'red';
    return 'default';
}

export default function CohortProgressPage() {
    const { cohortId: raw } = useParams<{ cohortId: string }>();
    const cohortId = Number(raw);
    const router = useRouter();

    const { data: entries = [], isLoading, error, refetch } =
        useCohortSummary(cohortId);

    const stats = useMemo(() => {
        if (entries.length === 0) return { avg: 0, highest: 0, atRisk: 0 };
        const avg = entries.reduce((s, e) => s + e.mastery_percentage, 0) / entries.length;
        return {
            avg: Math.round(avg * 10) / 10,
            highest: Math.max(...entries.map(e => e.mastery_percentage)),
            atRisk: entries.filter(e => e.mastery_percentage < 40).length,
        };
    }, [entries]);

    const atRiskStudents = useMemo(
        () => entries.filter(e => e.mastery_percentage < 40),
        [entries]
    );

    const columns: Column<CohortSummaryEntry>[] = [
        {
            key: 'student_name', header: 'Learner', sortable: true,
            render: r => (
                <div>
                    <div className="font-medium text-gray-900">{r.student_name}</div>
                    <div className="text-xs text-gray-500">{r.admission_number}</div>
                </div>
            ),
        },
        {
            key: 'mastery_percentage', header: 'Mastery', sortable: true,
            render: r => (
                <Badge variant={masteryVariant(r.mastery_percentage) as any} size="md" className="font-semibold">
                    {r.mastery_percentage}%
                </Badge>
            ),
            headerClassName: 'text-center', className: 'text-center',
        },
        {
            key: 'mastered_outcomes', header: 'Progress', sortable: true,
            render: r => (
                <span className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{r.mastered_outcomes}</span>
                    {' / '}{r.total_outcomes}
                </span>
            ),
            headerClassName: 'text-right', className: 'text-right',
        },
    ];

    if (isLoading) return (
        <div className="space-y-6"><CBCNav /><CBCLoading message="Loading cohort progress…" /></div>
    );

    if (error) return (
        <div className="space-y-6">
            <CBCNav />
            <CBCError error={error} onRetry={refetch} />
        </div>
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

            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                    <Users className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cohort Competency Progress</h1>
                    <p className="text-gray-500 mt-1">Mastery overview for all learners in this cohort</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { title: 'Learners', value: entries.length, color: 'text-blue-600' },
                    { title: 'Avg Mastery', value: `${stats.avg}%`, color: 'text-purple-600' },
                    { title: 'Highest', value: `${stats.highest}%`, color: 'text-emerald-600' },
                    { title: 'At Risk (<40%)', value: stats.atRisk, color: 'text-red-600' },
                ].map(s => (
                    <Card key={s.title} className="text-center">
                        <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-sm text-gray-500 mt-1">{s.title}</div>
                    </Card>
                ))}
            </div>

            {/* Legend */}
            <Card className="bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-3">Mastery Level Guide</p>
                <div className="flex flex-wrap gap-4">
                    {[
                        { label: 'Exceeding (≥80%)', variant: 'green' },
                        { label: 'Meeting (60–79%)', variant: 'blue' },
                        { label: 'Emerging (40–59%)', variant: 'yellow' },
                        { label: 'At Risk (1–39%)', variant: 'red' },
                        { label: 'Not Started (0%)', variant: 'default' },
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                            <Badge variant={item.variant as any} size="sm">Sample</Badge>
                            <span className="text-xs text-gray-600">{item.label}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* Table */}
            <Card>
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        Learner Performance
                        <Badge variant="blue" size="sm">{entries.length}</Badge>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Click a learner to view their detailed progress
                    </p>
                </div>
                <DataTable<CohortSummaryEntry & Record<string, unknown>>
                    data={entries as (CohortSummaryEntry & Record<string, unknown>)[]}
                    columns={columns}
                    loading={isLoading}
                    enableSearch
                    enableSort
                    searchPlaceholder="Search learners…"
                    emptyMessage="No learners found in this cohort"
                    onRowClick={r => router.push(`/cbc/progress/learner/${r.student_id}`)}
                    pagination={{
                        currentPage: 1, pageSize: 25,
                        totalItems: entries.length,
                        totalPages: Math.ceil(entries.length / 25),
                    }}
                />
            </Card>

            {/* At-risk callout */}
            {stats.atRisk > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                            <AlertCircle className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                {stats.atRisk} Learner{stats.atRisk !== 1 ? 's' : ''} Need Support
                            </h3>
                            <p className="text-sm text-gray-700 mb-3">
                                Below 40% mastery — may benefit from targeted support.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {atRiskStudents.map(e => (
                                    <Link key={e.student_id}
                                        href={`/cbc/progress/learner/${e.student_id}`}>
                                        <Badge variant="orange" size="md"
                                            className="cursor-pointer hover:bg-orange-200 transition-colors">
                                            {e.student_name}
                                            <span className="ml-1.5 text-xs opacity-75">({e.mastery_percentage}%)</span>
                                        </Badge>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
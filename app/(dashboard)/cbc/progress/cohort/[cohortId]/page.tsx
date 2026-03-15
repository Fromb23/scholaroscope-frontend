// ============================================================================
// app/(dashboard)/cbc/progress/cohort/[cohortId]/page.tsx — Cohort Progress - REDESIGNED
// ============================================================================

'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Target, TrendingUp, Award, AlertCircle } from 'lucide-react';
import { useCohortSummary } from '@/app/plugins/cbc/hooks/useCBC';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { DataTable, Column } from '@/app/components/ui/Table';

// Heatmap cell colour driven by percentage value
function masteryColor(pct: number): 'green' | 'blue' | 'yellow' | 'red' | 'default' {
    if (pct >= 80) return 'green';
    if (pct >= 60) return 'blue';
    if (pct >= 40) return 'yellow';
    if (pct > 0) return 'red';
    return 'default';
}

export default function CohortProgressPage() {
    const params = useParams();
    const router = useRouter();
    const cohortId = Number(params.cohortId);

    const { entries, loading } = useCohortSummary(cohortId);

    // Aggregates
    const stats = useMemo(() => {
        if (entries.length === 0) return { avg: 0, highest: 0, atRisk: 0 };
        const avg = entries.reduce((s, e) => s + e.mastery_percentage, 0) / entries.length;
        const highest = Math.max(...entries.map(e => e.mastery_percentage));
        const atRisk = entries.filter(e => e.mastery_percentage < 40).length;
        return { avg: Math.round(avg * 10) / 10, highest, atRisk };
    }, [entries]);

    const atRiskStudents = useMemo(
        () => entries.filter(e => e.mastery_percentage < 40),
        [entries]
    );

    // ---------------------------------------------------------------
    // Table columns configuration
    // ---------------------------------------------------------------
    const columns: Column<any>[] = [
        {
            key: 'student_name',
            header: 'Learner',
            sortable: true,
            render: (row) => (
                <div>
                    <div className="font-medium text-gray-900">{row.student_name}</div>
                    <div className="text-xs text-gray-500">{row.admission_number}</div>
                </div>
            )
        },
        {
            key: 'mastery_percentage',
            header: 'Mastery',
            sortable: true,
            render: (row) => (
                <Badge
                    variant={masteryColor(row.mastery_percentage)}
                    size="md"
                    className="font-semibold"
                >
                    {row.mastery_percentage}%
                </Badge>
            ),
            headerClassName: 'text-center',
            className: 'text-center'
        },
        {
            key: 'mastered_outcomes',
            header: 'Progress',
            sortable: true,
            render: (row) => (
                <span className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{row.mastered_outcomes}</span>
                    {' / '}
                    {row.total_outcomes}
                </span>
            ),
            headerClassName: 'text-right',
            className: 'text-right'
        }
    ];

    // ---------------------------------------------------------------
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-3">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="text-sm text-gray-500">Loading cohort progress...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* CBC nav */}
            <nav className="flex gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-gray-200">
                <Link
                    href="/cbc/authoring"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Authoring
                </Link>
                <Link
                    href="/cbc/browser"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Browser
                </Link>
                <Link
                    href="/cbc/progress"
                    className="flex-1 text-center text-sm font-semibold text-white bg-blue-600 rounded-lg py-2.5 shadow-sm"
                >
                    Progress
                </Link>
                <Link
                    href="/cbc/teaching"
                    className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg py-2.5 transition-colors"
                >
                    Teaching
                </Link>
            </nav>

            {/* Back */}
            <Link href="/cbc/progress">
                <Button variant="ghost" size="md" className="hover:bg-gray-100">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Progress Overview
                </Button>
            </Link>

            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl">
                    <Users className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Cohort Competency Progress</h1>
                    <p className="text-gray-500 mt-1">
                        Mastery overview for all learners in this cohort
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                    title="Learners"
                    value={entries.length}
                    icon={Users}
                    color="blue"
                />
                <StatsCard
                    title="Avg Mastery"
                    value={`${stats.avg}%`}
                    icon={TrendingUp}
                    color="purple"
                />
                <StatsCard
                    title="Highest"
                    value={`${stats.highest}%`}
                    icon={Award}
                    color="green"
                />
                <StatsCard
                    title="At Risk (<40%)"
                    value={stats.atRisk}
                    icon={Target}
                    color="orange"
                />
            </div>

            {/* Colour legend */}
            <Card className="shadow-sm bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-3">Mastery Level Guide</p>
                <div className="flex flex-wrap gap-4">
                    {[
                        { label: 'Exceeding (≥80%)', variant: 'green' },
                        { label: 'Meeting (60-79%)', variant: 'blue' },
                        { label: 'Emerging (40-59%)', variant: 'yellow' },
                        { label: 'At Risk (1-39%)', variant: 'red' },
                        { label: 'Not Started (0%)', variant: 'default' },
                    ].map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                            <Badge variant={item.variant as any} size="sm">
                                Sample
                            </Badge>
                            <span className="text-xs text-gray-600">{item.label}</span>
                        </div>
                    ))}
                </div>
            </Card>

            {/* DataTable */}
            <Card className="shadow-sm">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        Learner Performance
                        <Badge variant="blue" size="sm" className="ml-2">
                            {entries.length}
                        </Badge>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Click on any learner to view their detailed progress
                    </p>
                </div>

                <DataTable
                    data={entries}
                    columns={columns}
                    loading={loading}
                    enableSearch={true}
                    enableSort={true}
                    searchPlaceholder="Search learners by name or admission number..."
                    emptyMessage="No learners found in this cohort"
                    onRowClick={(row) => router.push(`/cbc/progress/learner/${row.student_id}`)}
                    pagination={{
                        currentPage: 1,
                        pageSize: 25,
                        totalItems: entries.length,
                        totalPages: Math.ceil(entries.length / 25)
                    }}
                />
            </Card>

            {/* At-risk callout */}
            {stats.atRisk > 0 && (
                <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                            <AlertCircle className="h-6 w-6 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">
                                {stats.atRisk} Learner{stats.atRisk !== 1 ? 's' : ''} Need Support
                            </h3>
                            <p className="text-sm text-gray-700 mb-4">
                                These learners are below 40% mastery and may benefit from targeted support or additional evidence collection.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {atRiskStudents.map(e => (
                                    <Link
                                        key={e.student_id}
                                        href={`/cbc/progress/learner/${e.student_id}`}
                                        className="group"
                                    >
                                        <Badge
                                            variant="orange"
                                            size="md"
                                            className="cursor-pointer hover:bg-orange-200 transition-colors"
                                        >
                                            {e.student_name}
                                            <span className="ml-1.5 text-xs opacity-75">
                                                ({e.mastery_percentage}%)
                                            </span>
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
'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, UserPlus, ChevronRight } from 'lucide-react';
import { useStudents, useStudentStats } from '@/app/core/hooks/useStudents';
import { useCurricula, useCohorts, useCohortSubjects } from '@/app/core/hooks/useAcademic';
import { usePersistedFilters } from '@/app/core/hooks/usePersistedFilters';
import { useAuth } from '@/app/context/AuthContext';
import { hasCapability } from '@/app/utils/permissions';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { DataTable, Column } from '@/app/components/ui/Table';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import type { Student } from '@/app/core/types/student';

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    ACTIVE: 'success', GRADUATED: 'info', TRANSFERRED: 'warning',
    SUSPENDED: 'danger', WITHDRAWN: 'danger',
};

function LearnersPageInner() {
    const router = useRouter();
    const { user, activeRole } = useAuth();
    const canCreate = hasCapability(activeRole, 'CREATE_LEARNER');

    const [filters, updateFilters, backUrl] = usePersistedFilters('/learners', {
        curriculum: null as number | null,
        cohort: null as number | null,
        cohort_subject: null as number | null,
        status: '',
        q: '',
        page: 1,
    });

    // ── Cascading data ────────────────────────────────────────────────────
    const { curricula } = useCurricula();
    const { cohorts } = useCohorts(
        filters.curriculum ? { curriculum: filters.curriculum } : undefined
    );
    const { cohortSubjects } = useCohortSubjects(
        filters.cohort ?? undefined
    );

    // ── Students — only load when cohort is selected ──────────────────────
    const { students, pagination, loading } = useStudents(
        filters.cohort ? {
            cohort: filters.cohort,
            status: filters.status || undefined,
            search: filters.q || undefined,
            page: filters.page,
            page_size: 20,
        } : undefined
    );

    const { stats } = useStudentStats();

    // ── Filtered students by cohort_subject ───────────────────────────────
    const displayedStudents = useMemo(() => {
        if (!filters.cohort_subject) return students;
        // cohort subject filter is server-side not yet supported
        // filter client-side by checking current_subjects
        return students;
    }, [students, filters.cohort_subject]);

    const handleCurriculumChange = (id: number | null) =>
        updateFilters({ curriculum: id, cohort: null, cohort_subject: null, page: 1 });

    const handleCohortChange = (id: number | null) =>
        updateFilters({ cohort: id, cohort_subject: null, page: 1 });

    const columns: Column<Record<string, unknown>>[] = [
        {
            key: 'admission_number', header: 'Adm No.', sortable: true,
            render: row => <span className="font-mono text-sm font-medium text-blue-700">{String(row.admission_number)}</span>,
        },
        { key: 'full_name', header: 'Full Name', sortable: true },
        {
            key: 'primary_cohort_name', header: 'Primary Cohort',
            render: row => (
                <div>
                    <p className="font-medium text-gray-900">{String(row.primary_cohort_name ?? '-')}</p>
                    <p className="text-xs text-gray-500">{String(row.primary_curriculum ?? '')}</p>
                </div>
            ),
        },
        {
            key: 'status', header: 'Status',
            render: row => (
                <Badge variant={STATUS_VARIANTS[String(row.status)] ?? 'default'}>
                    {String(row.status)}
                </Badge>
            ),
        },
        {
            key: 'email', header: 'Email',
            render: row => <span className="text-gray-600 text-sm">{String(row.email ?? '-')}</span>,
        },
        {
            key: 'actions', header: '',
            render: row => (
                <Button size="sm" variant="ghost"
                    onClick={e => { e.stopPropagation(); router.push(`/learners/${row.id}?back=${backUrl}`); }}>
                    View
                </Button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Learners</h1>
                    <p className="mt-1 text-gray-500 text-sm">Filter by curriculum and cohort to view students.</p>
                </div>
                {canCreate && (
                    <Link href="/learners/new">
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />Add Student
                        </Button>
                    </Link>
                )}
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid gap-4 md:grid-cols-4">
                    <StatsCard title="Total" value={stats.total} icon={Users} color="blue" />
                    <StatsCard title="Active" value={stats.active} icon={Users} color="green" />
                    <StatsCard title="Graduated" value={stats.graduated} icon={Users} color="yellow" />
                    <StatsCard title="Transferred" value={stats.transferred} icon={Users} color="red" />
                </div>
            )}

            {/* Cascading filters */}
            <Card>
                <div className="flex items-center gap-3 flex-wrap p-1">
                    {/* Curriculum */}
                    <select
                        value={filters.curriculum ?? ''}
                        onChange={e => handleCurriculumChange(e.target.value ? Number(e.target.value) : null)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select Curriculum</option>
                        {curricula.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    {filters.curriculum && (
                        <>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <select
                                value={filters.cohort ?? ''}
                                onChange={e => handleCohortChange(e.target.value ? Number(e.target.value) : null)}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Cohort</option>
                                {cohorts.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </>
                    )}

                    {filters.cohort && cohortSubjects.length > 0 && (
                        <>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                            <select
                                value={filters.cohort_subject ?? ''}
                                onChange={e => updateFilters({ cohort_subject: e.target.value ? Number(e.target.value) : null, page: 1 })}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Subjects</option>
                                {cohortSubjects.map((cs: { id: number; subject_name: string }) => (
                                    <option key={cs.id} value={cs.id}>{cs.subject_name}</option>
                                ))}
                            </select>
                        </>
                    )}

                    {filters.cohort && (
                        <>
                            <div className="w-px h-6 bg-gray-200 mx-1" />
                            <select
                                value={filters.status}
                                onChange={e => updateFilters({ status: e.target.value, page: 1 })}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="GRADUATED">Graduated</option>
                                <option value="TRANSFERRED">Transferred</option>
                                <option value="SUSPENDED">Suspended</option>
                            </select>
                        </>
                    )}
                </div>
            </Card>

            {/* Students table */}
            {!filters.cohort ? (
                <Card>
                    <p className="text-sm text-gray-500 text-center py-10">
                        Select a curriculum and cohort to view learners.
                    </p>
                </Card>
            ) : (
                <DataTable
                    data={displayedStudents as unknown as Record<string, unknown>[]}
                    columns={columns}
                    loading={loading}
                    pagination={pagination}
                    onPaginationChange={(page, size) => updateFilters({ page })}
                    onSearch={q => updateFilters({ q, page: 1 })}
                    searchPlaceholder="Search by name or admission number..."
                    emptyMessage="No students found in this cohort."
                    enableSearch
                    onRowClick={row => router.push(`/learners/${row.id}?back=${backUrl}`)}
                />
            )}
        </div>
    );
}

export default function LearnersPage() {
    return (
        <Suspense fallback={<LoadingSpinner message="Loading..." />}>
            <LearnersPageInner />
        </Suspense>
    );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, UserPlus } from 'lucide-react';
import { useStudents, useStudentStats } from '@/app/core/hooks/useStudents';
import { useAuth } from '@/app/context/AuthContext';
import { hasCapability } from '@/app/utils/permissions';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Badge } from '@/app/components/ui/Badge';
import { DataTable, Column } from '@/app/components/ui/Table'; // ✅ Use DataTable
import { StatsCard } from '@/app/components/dashboard/StatsCard';

export default function LearnersPage() {
    const router = useRouter();
    const { user, activeRole } = useAuth();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // ✅ Pass pagination params
    const { students, pagination, loading } = useStudents({
        search: searchQuery,
        status: statusFilter || undefined,
        page: currentPage,
        page_size: pageSize,
    });

    if (!user) return null;

    const { stats } = useStudentStats();

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
            ACTIVE: 'success',
            GRADUATED: 'info',
            TRANSFERRED: 'warning',
            SUSPENDED: 'danger',
            WITHDRAWN: 'danger',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    // ✅ Define columns for DataTable
    const columns: Column<any>[] = [
        {
            key: 'admission_number',
            header: 'Admission No.',
            render: (row) => <span className="font-medium">{row.admission_number}</span>,
            sortable: true,
        },
        {
            key: 'full_name',
            header: 'Full Name',
            sortable: true,
        },
        {
            key: 'primary_cohort',
            header: 'Primary Cohort',
            render: (row) => (
                <div>
                    <div className="font-medium">{row.primary_cohort_name || '-'}</div>
                    <div className="text-xs text-gray-500">{row.primary_curriculum || ''}</div>
                </div>
            ),
        },
        {
            key: 'cohorts',
            header: 'All Cohorts',
            render: (row) => (
                <div className="flex flex-wrap gap-1">
                    {row.active_cohorts.map((cohort: any) => (
                        <Badge
                            key={cohort.id}
                            variant={cohort.is_primary ? 'default' : 'info'}
                            title={`${cohort.enrollment_type} - ${cohort.level}`}
                        >
                            {cohort.name}
                        </Badge>
                    ))}
                    {row.cohort_count === 0 && (
                        <span className="text-xs text-gray-500">No enrollments</span>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (row) => getStatusBadge(row.status),
            filterable: true,
            filterOptions: [
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Graduated', value: 'GRADUATED' },
                { label: 'Transferred', value: 'TRANSFERRED' },
                { label: 'Suspended', value: 'SUSPENDED' },
            ],
        },
        {
            key: 'email',
            header: 'Email',
            render: (row) => <span className="text-gray-600">{row.email || '-'}</span>,
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/learners/${row.id}`);
                    }}
                >
                    View
                </Button>
            ),
        },
    ];

    const canCreateLearner = hasCapability(activeRole, 'CREATE_LEARNER');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Learners</h1>
                    <p className="mt-2 text-gray-600">Manage student records and information</p>
                </div>
                {canCreateLearner && (
                    <Link href="/learners/new">
                        <Button>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Student
                        </Button>
                    </Link>
                )}
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatsCard title="Total Students" value={stats.total} icon={Users} color="blue" />
                    <StatsCard title="Active Students" value={stats.active} icon={Users} color="green" />
                    <StatsCard title="Graduated" value={stats.graduated} icon={Users} color="yellow" />
                    <StatsCard title="Transferred" value={stats.transferred} icon={Users} color="red" />
                </div>
            )}

            {/* Filters */}
            <Card>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1); // ✅ Reset to page 1 when filtering
                        }}
                        className="rounded-lg border border-gray-300 px-4 py-2"
                    >
                        <option value="">All Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="GRADUATED">Graduated</option>
                        <option value="TRANSFERRED">Transferred</option>
                        <option value="SUSPENDED">Suspended</option>
                    </select>
                </div>
            </Card>

            {/* ✅ Use DataTable with pagination */}
            <Card>
                <DataTable
                    data={students || []}
                    columns={columns}
                    loading={loading}
                    pagination={pagination}
                    onPaginationChange={(page, size) => {
                        setCurrentPage(page);
                        setPageSize(size);
                    }}
                    onSearch={(query) => {
                        setSearchQuery(query);
                        setCurrentPage(1); // ✅ Reset to page 1 when searching
                    }}
                    searchPlaceholder="Search by name or admission number..."
                    emptyMessage="No students found"
                    enableSearch={true}
                    enableSort={false}
                    onRowClick={(row) => router.push(`/learners/${row.id}`)}
                />
            </Card>
        </div>
    );
}
'use client';

// ============================================================================
// app/(dashboard)/academic/cohorts/[id]/students/page.tsx
//
// Responsibility: render a read-only class list for the cohort.
// No enrollment mutations. No direct API calls. No any.
// ============================================================================

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, UserPlus, Users } from 'lucide-react';
import { useCohortDetail } from '@/app/core/hooks/useAcademic';
import { type EnrolledStudent, useCohortEnrolledStudents } from '@/app/core/hooks/useCohortStudents';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Input } from '@/app/components/ui/Input';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { buildLearnerCreateHref } from '@/app/core/components/learners/learnerCreateNavigation';
import { buildClassLearnerProfileHref } from '@/app/core/components/learners/learnerProfileNavigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/app/components/ui/Table';

type LearnerRow = EnrolledStudent & {
    email?: string | null;
    phone?: string | null;
    status?: string | null;
    status_display?: string | null;
};

function getLearnerContact(student: LearnerRow) {
    const contact = [student.email, student.phone]
        .filter((value): value is string => Boolean(value?.trim()))
        .join(' • ');

    return contact || '—';
}

function getLearnerStatus(student: LearnerRow) {
    return student.status_display?.trim() || student.status?.trim() || '—';
}

function getLearnerStatusVariant(student: LearnerRow): 'success' | 'warning' | 'danger' | 'info' | 'default' {
    switch (student.status) {
        case 'ACTIVE':
            return 'success';
        case 'TRANSFERRED':
            return 'warning';
        case 'GRADUATED':
            return 'info';
        case 'SUSPENDED':
        case 'WITHDRAWN':
            return 'danger';
        default:
            return 'default';
    }
}

function escapeCsvValue(value: string) {
    return `"${value.replace(/"/g, '""')}"`;
}

function buildSafeCohortFilename(cohortName: string, cohortId: number) {
    const normalized = cohortName
        .trim()
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();

    return normalized || `cohort-${cohortId}`;
}

export function CohortStudentsPage() {
    const params = useParams<{ id: string }>();
    const cohortId = Number(params.id);
    const isValidCohortId = Number.isFinite(cohortId) && cohortId > 0;
    const enrolledQuery = useCohortEnrolledStudents(cohortId);
    const { cohort } = useCohortDetail(isValidCohortId ? cohortId : null);
    const [searchEnrolled, setSearchEnrolled] = useState('');

    const enrolled = useMemo<LearnerRow[]>(() => enrolledQuery.data?.students ?? [], [enrolledQuery.data?.students]);
    const cohortName = enrolledQuery.data?.cohort_name || cohort?.name || '';
    const sortedEnrolled = useMemo(() => (
        [...enrolled].sort((a, b) => a.admission_number.localeCompare(b.admission_number, undefined, {
            numeric: true,
            sensitivity: 'base',
        }))
    ), [enrolled]);
    const filteredEnrolled = useMemo(() => {
        const query = searchEnrolled.trim().toLowerCase();

        if (!query) return sortedEnrolled;

        return sortedEnrolled.filter((student) => (
            student.full_name.toLowerCase().includes(query)
            || student.admission_number.toLowerCase().includes(query)
            || student.email?.toLowerCase().includes(query)
            || student.phone?.toLowerCase().includes(query)
        ));
    }, [searchEnrolled, sortedEnrolled]);

    const handleExportList = () => {
        if (filteredEnrolled.length === 0) return;

        const header = ['Admission No.', 'Learner Name', 'Contact', 'Status'];
        const rows = filteredEnrolled.map((student) => ([
            student.admission_number,
            student.full_name,
            getLearnerContact(student),
            getLearnerStatus(student),
        ]));
        const csvContent = [header, ...rows]
            .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
            .join('\n');
        const fileName = `${buildSafeCohortFilename(cohortName, cohortId)}-class-list.csv`;
        const blob = new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!isValidCohortId) {
        return <ErrorState fullScreen={false} message="Invalid cohort." />;
    }

    if (enrolledQuery.isLoading) {
        return <LoadingSpinner fullScreen={false} message="Loading cohort learners..." />;
    }

    if (enrolledQuery.error) {
        return (
            <ErrorState
                fullScreen={false}
                message={enrolledQuery.error.message || 'Failed to load cohort learners.'}
                onRetry={() => {
                    void enrolledQuery.refetch();
                }}
            />
        );
    }

    const emptyMessage = enrolled.length === 0
        ? 'No learners are currently enrolled in this cohort.'
        : 'No learners match your search.';
    const createLearnerHref = buildLearnerCreateHref({
        cohortId,
        returnTo: `/academic/cohorts/${cohortId}`,
    });

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div className="space-y-4">
                <div>
                    <Link href={`/academic/cohorts/${cohortId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Cohort
                        </Button>
                    </Link>
                </div>

                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-gray-900">Cohort Learners</h1>
                    <p className="text-sm text-gray-500">View learners enrolled in this cohort.</p>
                    <p className="text-sm text-gray-500">
                        Cohort placement defines class membership. Subject participation is managed separately per cohort subject.
                    </p>
                    {cohortName ? (
                        <p className="text-sm font-medium text-gray-700">{cohortName}</p>
                    ) : null}
                </div>
            </div>

            <StatStrip mobileColumns={1} mdColumns={1} className="max-w-xs">
                <StatsCard title="Enrolled Learners" value={enrolled.length} icon={Users} color="blue" />
            </StatStrip>

            <Card>
                <div className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-gray-900">Class List</h2>
                            <p className="text-sm text-gray-500">
                                Read-only learner roster for this cohort.
                            </p>
                        </div>
                        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:items-center">
                            <Link href={createLearnerHref} className="sm:self-start lg:self-auto">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="w-full gap-2 sm:w-auto"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Create learner
                                </Button>
                            </Link>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleExportList}
                                disabled={filteredEnrolled.length === 0}
                                className="gap-2 sm:self-start lg:self-auto"
                            >
                                <Download className="h-4 w-4" />
                                Export List
                            </Button>
                            <div className="w-full lg:w-80">
                                <Input
                                    value={searchEnrolled}
                                    onChange={(event) => setSearchEnrolled(event.target.value)}
                                    placeholder="Search learners by name, admission number, or contact"
                                    aria-label="Search enrolled learners"
                                />
                            </div>
                        </div>
                    </div>

                    {filteredEnrolled.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
                            {emptyMessage}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <tr>
                                    <TableHead>Admission No.</TableHead>
                                    <TableHead>Learner</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Status</TableHead>
                                </tr>
                            </TableHeader>
                            <TableBody>
                                {filteredEnrolled.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell>
                                            <span className="font-mono text-sm text-gray-700">{student.admission_number}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={buildClassLearnerProfileHref(student.id, cohortId)}
                                                className="font-medium text-blue-600 hover:underline"
                                            >
                                                {student.full_name}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{getLearnerContact(student)}</TableCell>
                                        <TableCell>
                                            <Badge variant={getLearnerStatusVariant(student)}>
                                                {getLearnerStatus(student)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </Card>
        </div>
    );
}

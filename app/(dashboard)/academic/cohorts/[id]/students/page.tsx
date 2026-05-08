'use client';

// ============================================================================
// app/(dashboard)/academic/cohorts/[id]/students/page.tsx
//
// Responsibility: render a read-only class list for the cohort.
// No enrollment mutations. No direct API calls. No any.
// ============================================================================

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users } from 'lucide-react';
import { useCohortDetail } from '@/app/core/hooks/useAcademic';
import { type EnrolledStudent, useCohortEnrolledStudents } from '@/app/core/hooks/useCohortStudents';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Badge } from '@/app/components/ui/Badge';
import { Input } from '@/app/components/ui/Input';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
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

export default function CohortStudentsPage() {
    const params = useParams<{ id: string }>();
    const cohortId = Number(params.id);
    const isValidCohortId = Number.isFinite(cohortId) && cohortId > 0;
    const enrolledQuery = useCohortEnrolledStudents(cohortId);
    const { cohort } = useCohortDetail(isValidCohortId ? cohortId : null);
    const [searchEnrolled, setSearchEnrolled] = useState('');

    const enrolled: LearnerRow[] = enrolledQuery.data?.students ?? [];
    const cohortName = enrolledQuery.data?.cohort_name || cohort?.name || '';
    const filteredEnrolled = enrolled.filter((student) => {
        const query = searchEnrolled.toLowerCase();
        return (
            student.full_name.toLowerCase().includes(query)
            || student.admission_number.toLowerCase().includes(query)
            || student.email?.toLowerCase().includes(query)
            || student.phone?.toLowerCase().includes(query)
        );
    });

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

            <div className="max-w-xs">
                <StatsCard title="Enrolled Learners" value={enrolled.length} icon={Users} color="blue" />
            </div>

            <Card>
                <div className="space-y-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-1">
                            <h2 className="text-lg font-semibold text-gray-900">Class List</h2>
                            <p className="text-sm text-gray-500">
                                Read-only learner roster for this cohort.
                            </p>
                        </div>
                        <div className="w-full lg:max-w-sm">
                            <Input
                                value={searchEnrolled}
                                onChange={(event) => setSearchEnrolled(event.target.value)}
                                placeholder="Search learners by name, admission number, or contact"
                                aria-label="Search enrolled learners"
                            />
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
                                                href={`/learners/${student.id}`}
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

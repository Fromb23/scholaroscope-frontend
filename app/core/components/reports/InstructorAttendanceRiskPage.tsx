'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { AlertCircle, ArrowLeft, BookOpen, Target, UserX, Users } from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { useCurrentTerm } from '@/app/core/hooks/useAcademic';
import { useInstructorAttendanceRisk } from '@/app/core/hooks/useInstructorAttendanceRisk';
import type { AttendanceRiskLevel, InstructorAttendanceRiskItem } from '@/app/core/types/reporting';

interface AttendanceRiskGroup {
    id: number;
    cohortName: string;
    subjectName: string;
    items: InstructorAttendanceRiskItem[];
}

function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
}

function getRiskLevelVariant(level: AttendanceRiskLevel): 'yellow' | 'orange' | 'red' {
    if (level === 'CRITICAL') return 'red';
    if (level === 'RISK') return 'orange';
    return 'yellow';
}

function sortRiskItems(items: InstructorAttendanceRiskItem[]): InstructorAttendanceRiskItem[] {
    return [...items].sort((left, right) => {
        if (left.attendance_percentage !== right.attendance_percentage) {
            return left.attendance_percentage - right.attendance_percentage;
        }
        if (left.absent_count !== right.absent_count) {
            return right.absent_count - left.absent_count;
        }
        return left.student_name.localeCompare(right.student_name);
    });
}

function buildAttendanceRiskGroups(items: InstructorAttendanceRiskItem[]): AttendanceRiskGroup[] {
    const groups = new Map<number, AttendanceRiskGroup>();

    sortRiskItems(items).forEach((item) => {
        const existing = groups.get(item.cohort_subject_id);
        if (existing) {
            existing.items.push(item);
            return;
        }

        groups.set(item.cohort_subject_id, {
            id: item.cohort_subject_id,
            cohortName: item.cohort_name,
            subjectName: item.subject_name,
            items: [item],
        });
    });

    return Array.from(groups.values()).sort((left, right) => {
        const cohortComparison = left.cohortName.localeCompare(right.cohortName);
        if (cohortComparison !== 0) {
            return cohortComparison;
        }
        return left.subjectName.localeCompare(right.subjectName);
    });
}

export function InstructorAttendanceRiskPage() {
    const { currentTerm, loading: termLoading } = useCurrentTerm();
    const {
        data,
        items,
        count,
        uniqueLearnerCount,
        loading,
        error,
        refetch,
    } = useInstructorAttendanceRisk({
        termId: currentTerm?.id,
    });

    const groupedItems = useMemo(
        () => buildAttendanceRiskGroups(items),
        [items]
    );

    if (termLoading || loading) {
        return <LoadingSpinner message="Loading attendance risk..." />;
    }

    if (error) {
        return (
            <ErrorState
                fullScreen={false}
                message={error}
                onRetry={refetch}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Link href="/reports/instructor">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                </Link>

                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Attendance Risk</h1>
                        <p className="text-gray-500 mt-1">
                            Learners frequently missing your lessons
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {currentTerm?.name && (
                            <Badge variant="blue">{currentTerm.name}</Badge>
                        )}
                        <Badge variant="default">{data?.scope ?? 'instructor'}</Badge>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatsCard
                    title="Learners at Risk"
                    value={uniqueLearnerCount}
                    icon={Users}
                    color="red"
                />
                <StatsCard
                    title="Risk Records"
                    value={count}
                    icon={BookOpen}
                    color="orange"
                />
                <StatsCard
                    title="Threshold"
                    value={formatPercent(data?.threshold ?? 0)}
                    icon={Target}
                    color="yellow"
                />
            </div>

            {groupedItems.length === 0 ? (
                <Card>
                    <div className="py-16 text-center">
                        <UserX className="mx-auto h-12 w-12 text-gray-300" />
                        <p className="mt-3 text-sm font-medium text-gray-900">No current attendance risk</p>
                        <p className="mt-1 text-xs text-gray-500">
                            Based on completed lessons in your assigned subject groups.
                        </p>
                    </div>
                </Card>
            ) : (
                groupedItems.map((group) => (
                    <Card key={group.id} className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">{group.cohortName}</h2>
                                <p className="text-sm text-gray-500">{group.subjectName}</p>
                            </div>
                            <Badge variant="orange">{group.items.length} risk record{group.items.length !== 1 ? 's' : ''}</Badge>
                        </div>

                        <div className="space-y-3 xl:hidden">
                            {group.items.map((item) => (
                                <div
                                    key={`${item.student_id}-${item.cohort_subject_id}-${item.term_id ?? 'none'}`}
                                    className="rounded-lg border border-gray-200 p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <Link
                                                href={`/learners/${item.student_id}`}
                                                className="font-medium text-gray-900 hover:text-blue-600"
                                            >
                                                {item.student_name}
                                            </Link>
                                            <p className="text-xs text-gray-500">{item.admission_number}</p>
                                        </div>
                                        <Badge variant={getRiskLevelVariant(item.risk_level)}>
                                            {item.risk_level}
                                        </Badge>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-gray-500">Attendance</p>
                                            <p className="font-semibold text-gray-900">{formatPercent(item.attendance_percentage)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Total Sessions</p>
                                            <p className="font-semibold text-gray-900">{item.total_sessions}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Absent</p>
                                            <p className="font-semibold text-gray-900">{item.absent_count}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Late</p>
                                            <p className="font-semibold text-gray-900">{item.late_count}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Unmarked</p>
                                            <p className="font-semibold text-gray-900">{item.unmarked_count}</p>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Reasons</p>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {item.reasons.length > 0 ? (
                                                item.reasons.map((reason, index) => (
                                                    <Badge
                                                        key={`${reason}-${index}`}
                                                        variant="default"
                                                        className="max-w-full whitespace-normal break-words"
                                                    >
                                                        {reason}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-sm text-gray-500">No reasons provided.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden xl:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Learner</TableHead>
                                        <TableHead>Admission No.</TableHead>
                                        <TableHead>Attendance</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead>Absent</TableHead>
                                        <TableHead>Late</TableHead>
                                        <TableHead>Unmarked</TableHead>
                                        <TableHead>Risk Level</TableHead>
                                        <TableHead>Reasons</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {group.items.map((item) => (
                                        <TableRow key={`${item.student_id}-${item.cohort_subject_id}-${item.term_id ?? 'none'}`}>
                                            <TableCell>
                                                <Link
                                                    href={`/learners/${item.student_id}`}
                                                    className="font-medium text-gray-900 hover:text-blue-600"
                                                >
                                                    {item.student_name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{item.admission_number}</TableCell>
                                            <TableCell>{formatPercent(item.attendance_percentage)}</TableCell>
                                            <TableCell>{item.total_sessions}</TableCell>
                                            <TableCell>{item.absent_count}</TableCell>
                                            <TableCell>{item.late_count}</TableCell>
                                            <TableCell>{item.unmarked_count}</TableCell>
                                            <TableCell>
                                                <Badge variant={getRiskLevelVariant(item.risk_level)}>
                                                    {item.risk_level}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-2">
                                                    {item.reasons.length > 0 ? (
                                                        item.reasons.map((reason, index) => (
                                                            <Badge
                                                                key={`${reason}-${index}`}
                                                                variant="default"
                                                                className="max-w-full whitespace-normal break-words"
                                                            >
                                                                {reason}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <span className="text-sm text-gray-500">No reasons provided.</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                ))
            )}

            <Card>
                <div className="flex items-start gap-3">
                    <div className="rounded-full bg-orange-100 p-2 text-orange-600">
                        <AlertCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">Reporting scope</p>
                        <p className="mt-1 text-sm text-gray-500">
                            This page only renders server-computed attendance risk for your assigned subject groups.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
}

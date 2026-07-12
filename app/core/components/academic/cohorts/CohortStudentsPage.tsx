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
import { ArrowLeft, UserCheck, UserMinus, UserPlus, Users, ArrowRightLeft } from 'lucide-react';
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
import { ContextualApprovalRequestButton } from '@/app/core/components/approvals/ApprovalIntentComponents';
import { buildContextualRequestKey } from '@/app/core/lib/approvalIntents';
import { useAuth } from '@/app/context/AuthContext';
import { supportsInternalRequests } from '@/app/core/lib/workspaceGovernance';
import { learnersAPI } from '@/app/core/api/learners';
import { downloadBlob } from '@/app/core/api/downloads';
import { AppErrorBanner } from '@/app/components/ui/errors';
import { ReportExportButtons } from '@/app/core/components/reports/ReportExportButtons';
import { resolveReportError, type AppError } from '@/app/core/errors';

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

export function CohortStudentsPage() {
    const params = useParams<{ id: string }>();
    const { capabilities } = useAuth();
    const cohortId = Number(params.id);
    const isValidCohortId = Number.isFinite(cohortId) && cohortId > 0;
    const enrolledQuery = useCohortEnrolledStudents(cohortId);
    const { cohort } = useCohortDetail(isValidCohortId ? cohortId : null);
    const [searchEnrolled, setSearchEnrolled] = useState('');
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<AppError | null>(null);

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

    const handleExportList = async () => {
        if (filteredEnrolled.length === 0 || exporting) return;

        try {
            setExporting(true);
            setExportError(null);
            const file = await learnersAPI.exportStudents({
                cohort: cohortId,
                q: searchEnrolled.trim() || undefined,
                format: 'xlsx',
            });
            downloadBlob(file.blob, file.fileName);
        } catch (error) {
            setExportError(resolveReportError(error, {
                action: 'export',
                entityLabel: 'learner roster',
                channel: 'inline',
            }));
        } finally {
            setExporting(false);
        }
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
    const showInternalRequestActions = supportsInternalRequests(capabilities);

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
                            {showInternalRequestActions ? (
                                <ContextualApprovalRequestButton
                                    intent={{
                                        actionKey: 'ENROLLMENT_CHANGE',
                                        title: `Request add learner to ${cohortName || 'cohort'}`,
                                        targetType: 'cohort',
                                        targetId: cohortId,
                                        returnTo: `/academic/cohorts/${cohortId}/students`,
                                        requestKey: buildContextualRequestKey(['cohort', cohortId, 'add-learner']),
                                        referenceData: {
                                            contextual_action: 'add_to_cohort',
                                            cohort_id: cohortId,
                                            cohort_name: cohortName,
                                        },
                                    }}
                                >
                                    <UserCheck className="h-4 w-4" />
                                    Request add learner
                                </ContextualApprovalRequestButton>
                            ) : null}
                            <ReportExportButtons
                                reportType="learner_roster"
                                exporting={exporting}
                                disabled={filteredEnrolled.length === 0}
                                onExport={(format) => {
                                    if (format === 'xlsx') {
                                        void handleExportList();
                                    }
                                }}
                                className="sm:self-start lg:self-auto"
                                labels={{ xlsx: 'Export XLSX' }}
                            />
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

                    {exportError ? (
                        <AppErrorBanner
                            error={exportError}
                            onDismiss={() => setExportError(null)}
                        />
                    ) : null}

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
                                    {showInternalRequestActions ? <TableHead>Requests</TableHead> : null}
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
                                        {showInternalRequestActions ? (
                                            <TableCell>
                                                <div className="flex flex-wrap gap-2">
                                                    <ContextualApprovalRequestButton
                                                        variant="ghost"
                                                        intent={{
                                                            actionKey: 'ENROLLMENT_CHANGE',
                                                            title: `Request unenroll ${student.full_name}`,
                                                            targetType: 'learner',
                                                            targetId: student.id,
                                                            returnTo: `/academic/cohorts/${cohortId}/students`,
                                                            requestKey: buildContextualRequestKey(['cohort', cohortId, 'learner', student.id, 'unenroll']),
                                                            referenceData: {
                                                                contextual_action: 'unenroll',
                                                                student_id: student.id,
                                                                cohort_id: cohortId,
                                                                cohort_name: cohortName,
                                                            },
                                                        }}
                                                    >
                                                        <UserMinus className="h-4 w-4" />
                                                        Unenroll
                                                    </ContextualApprovalRequestButton>
                                                    <ContextualApprovalRequestButton
                                                        variant="ghost"
                                                        intent={{
                                                            actionKey: 'ENROLLMENT_CHANGE',
                                                            title: `Request transfer ${student.full_name}`,
                                                            targetType: 'learner',
                                                            targetId: student.id,
                                                            returnTo: `/academic/cohorts/${cohortId}/students`,
                                                            requestKey: buildContextualRequestKey(['cohort', cohortId, 'learner', student.id, 'transfer']),
                                                            referenceData: {
                                                                contextual_action: 'transfer',
                                                                student_id: student.id,
                                                                cohort_id: cohortId,
                                                                cohort_name: cohortName,
                                                            },
                                                        }}
                                                    >
                                                        <ArrowRightLeft className="h-4 w-4" />
                                                        Transfer
                                                    </ContextualApprovalRequestButton>
                                                    <ContextualApprovalRequestButton
                                                        variant="ghost"
                                                        intent={{
                                                            actionKey: 'ENROLLMENT_CHANGE',
                                                            title: `Request cohort placement correction for ${student.full_name}`,
                                                            targetType: 'learner',
                                                            targetId: student.id,
                                                            returnTo: `/academic/cohorts/${cohortId}/students`,
                                                            requestKey: buildContextualRequestKey(['cohort', cohortId, 'learner', student.id, 'fix-placement']),
                                                            referenceData: {
                                                                contextual_action: 'fix_wrong_cohort_placement',
                                                                student_id: student.id,
                                                                cohort_id: cohortId,
                                                                cohort_name: cohortName,
                                                            },
                                                        }}
                                                    >
                                                        Fix placement
                                                    </ContextualApprovalRequestButton>
                                                </div>
                                            </TableCell>
                                        ) : null}
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

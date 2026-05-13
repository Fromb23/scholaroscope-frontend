'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    BookOpen,
    CheckCircle2,
    ClipboardList,
    Clock,
    Filter,
    Plus,
    Search,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Select } from '@/app/components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { AssignmentCreateModal } from '@/app/core/components/assignments/AssignmentCreateModal';
import {
    formatDate,
    getAssignmentEvaluationBadgeVariant,
    getAssignmentStatusBadgeVariant,
    isAssignmentDueSoon,
    isAssignmentOverdue,
} from '@/app/core/components/assignments/assignmentUtils';
import { useCohortDetail, useCohortSubjects } from '@/app/core/hooks/useAcademic';
import { useAssignments } from '@/app/core/hooks/useAssignments';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useAuth } from '@/app/context/AuthContext';
import type { Assignment, AssignmentEvaluationType, AssignmentStatus } from '@/app/core/types/assignments';
import { roleHomeRoute } from '@/app/utils/routeAccess';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
    { value: '', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'ARCHIVED', label: 'Archived' },
];

const EVALUATION_OPTIONS: Array<{ value: string; label: string }> = [
    { value: '', label: 'All Evaluation Types' },
    { value: 'NUMERIC', label: 'Numeric' },
    { value: 'RUBRIC', label: 'Rubric' },
    { value: 'DESCRIPTIVE', label: 'Descriptive' },
    { value: 'COMPETENCY', label: 'Competency' },
];

function AssignmentSummary({
    assignment,
    cohortId,
    onEdit,
}: {
    assignment: Assignment;
    cohortId: number;
    onEdit: (assignment: Assignment) => void;
}) {
    return (
        <Card className="p-4 md:hidden">
            <div className="space-y-3">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-semibold text-gray-900">{assignment.title}</h2>
                        <Badge variant={getAssignmentStatusBadgeVariant(assignment.status)} size="sm">
                            {assignment.status}
                        </Badge>
                        <Badge variant={getAssignmentEvaluationBadgeVariant(assignment.evaluation_type)} size="sm">
                            {assignment.evaluation_type}
                        </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                        {assignment.subject_name} · Due {formatDate(assignment.due_at)}
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                    <div>
                        <span className="font-medium text-gray-900">{assignment.recipients_count}</span>
                        <span className="ml-1">recipients</span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-900">{assignment.submissions_count}</span>
                        <span className="ml-1">submissions</span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-900">{assignment.reviewed_count}</span>
                        <span className="ml-1">reviewed</span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-900">{assignment.missing_count}</span>
                        <span className="ml-1">missing</span>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Link
                        href={`/academic/cohorts/${cohortId}/assignments/${assignment.id}`}
                        className="w-full sm:w-auto"
                    >
                        <Button size="sm" className="w-full sm:w-auto">
                            View Assignment
                        </Button>
                    </Link>
                    {assignment.status === 'DRAFT' ? (
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => onEdit(assignment)}
                        >
                            Edit Draft
                        </Button>
                    ) : null}
                </div>
            </div>
        </Card>
    );
}

export default function CohortAssignmentsPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, activeRole, loading: authLoading } = useAuth();
    const instructorAccess = useInstructorCohortAccess();
    const cohortId = Number(params.id);
    const isInstructor = activeRole === 'INSTRUCTOR';
    const isValidCohortId = Number.isFinite(cohortId) && cohortId > 0;
    const [statusFilter, setStatusFilter] = useState<AssignmentStatus | ''>('');
    const [evaluationTypeFilter, setEvaluationTypeFilter] = useState<AssignmentEvaluationType | ''>('');
    const [cohortSubjectFilter, setCohortSubjectFilter] = useState<string>(
        searchParams.get('cohort_subject') ?? ''
    );
    const [search, setSearch] = useState(searchParams.get('search') ?? '');
    const [createOpen, setCreateOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [resultMessage, setResultMessage] = useState<string | null>(null);
    const deferredSearch = useDeferredValue(search);

    const {
        cohort,
        loading: cohortLoading,
        error: cohortError,
    } = useCohortDetail(isValidCohortId ? cohortId : null);
    const {
        cohortSubjects,
        loading: cohortSubjectsLoading,
        error: cohortSubjectsError,
    } = useCohortSubjects(isValidCohortId ? cohortId : undefined);

    const accessLoading = authLoading || (isInstructor && instructorAccess.isLoading);
    const allowed = !user
        ? false
        : user.is_superadmin
            || activeRole === 'ADMIN'
            || (isInstructor && instructorAccess.cohortIds.includes(cohortId));

    const visibleCohortSubjects = useMemo(() => (
        isInstructor
            ? cohortSubjects.filter((subject) => instructorAccess.cohortSubjectIds.includes(subject.id))
            : cohortSubjects
    ), [cohortSubjects, instructorAccess.cohortSubjectIds, isInstructor]);

    const {
        assignments,
        loading: assignmentsLoading,
        error: assignmentsError,
        refetch,
    } = useAssignments({
        cohort: cohortId,
        cohort_subject: cohortSubjectFilter ? Number(cohortSubjectFilter) : undefined,
        status: statusFilter || undefined,
        evaluation_type: evaluationTypeFilter || undefined,
        search: deferredSearch.trim() || undefined,
    }, {
        enabled: isValidCohortId,
    });

    useEffect(() => {
        if (accessLoading || allowed || !activeRole) return;
        router.replace(roleHomeRoute[activeRole]);
    }, [accessLoading, activeRole, allowed, router]);

    const canManageAssignments = Boolean(user) && (
        Boolean(user?.is_superadmin)
        || activeRole === 'ADMIN'
        || activeRole === 'INSTRUCTOR'
    );

    const dueSoonCount = useMemo(
        () => assignments.filter((assignment) => isAssignmentDueSoon(assignment)).length,
        [assignments]
    );
    const overdueCount = useMemo(
        () => assignments.filter((assignment) => isAssignmentOverdue(assignment)).length,
        [assignments]
    );
    const publishedCount = useMemo(
        () => assignments.filter((assignment) => assignment.status === 'PUBLISHED').length,
        [assignments]
    );
    const reviewedTotal = useMemo(
        () => assignments.reduce((count, assignment) => count + assignment.reviewed_count, 0),
        [assignments]
    );
    const submissionTotal = useMemo(
        () => assignments.reduce((count, assignment) => count + assignment.submissions_count, 0),
        [assignments]
    );

    if (!isValidCohortId) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Invalid cohort.
            </div>
        );
    }

    if (accessLoading || cohortLoading || cohortSubjectsLoading) {
        return <LoadingSpinner fullScreen={false} message="Loading cohort assignments..." />;
    }

    if (!allowed) {
        return null;
    }

    const pageError = cohortError ?? cohortSubjectsError ?? assignmentsError;

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="space-y-3">
                <div>
                    <Link href={`/academic/cohorts/${cohortId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Cohort
                        </Button>
                    </Link>
                </div>

                <div className="space-y-2">
                    <nav className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        <Link href="/academic/cohorts" className="hover:text-blue-600">
                            Cohorts
                        </Link>
                        <span>/</span>
                        <Link href={`/academic/cohorts/${cohortId}`} className="hover:text-blue-600">
                            {cohort?.name ?? `Cohort ${cohortId}`}
                        </Link>
                        <span>/</span>
                        <span className="text-gray-900">Assignments</span>
                    </nav>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Cohort is the navigation context, but assignment creation and instructor authority stay bound to cohort subjects.
                            </p>
                        </div>

                        {canManageAssignments ? (
                            <Button
                                type="button"
                                onClick={() => {
                                    setEditingAssignment(null);
                                    setCreateOpen(true);
                                }}
                                disabled={visibleCohortSubjects.length === 0}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Create Assignment
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>

            {pageError ? (
                <ErrorBanner message={pageError} onDismiss={() => void refetch()} />
            ) : null}

            {resultMessage ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {resultMessage}
                </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatsCard
                    title="Total Assignments"
                    value={assignments.length}
                    icon={ClipboardList}
                    color="blue"
                />
                <StatsCard
                    title="Published"
                    value={publishedCount}
                    icon={BookOpen}
                    color="green"
                />
                <StatsCard
                    title="Due Soon"
                    value={dueSoonCount}
                    subtitle={`${overdueCount} overdue`}
                    icon={Clock}
                    color={overdueCount > 0 ? 'red' : 'yellow'}
                />
                <StatsCard
                    title="Review Progress"
                    value={`${reviewedTotal}/${submissionTotal}`}
                    subtitle="Reviewed submissions"
                    icon={CheckCircle2}
                    color="purple"
                />
            </div>

            <Card>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Filter className="h-4 w-4" />
                        Filters
                    </div>

                    <div className="grid gap-4 lg:grid-cols-4">
                        <div className="lg:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search assignment title or subject"
                                    className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <Select
                            label="Subject"
                            value={cohortSubjectFilter}
                            onChange={(event) => setCohortSubjectFilter(event.target.value)}
                            options={[
                                { value: '', label: 'All cohort subjects' },
                                ...visibleCohortSubjects.map((subject) => ({
                                    value: String(subject.id),
                                    label: subject.subject_name,
                                })),
                            ]}
                        />

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                            <Select
                                label="Status"
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value as AssignmentStatus | '')}
                                options={STATUS_OPTIONS}
                            />
                            <Select
                                label="Evaluation"
                                value={evaluationTypeFilter}
                                onChange={(event) => setEvaluationTypeFilter(event.target.value as AssignmentEvaluationType | '')}
                                options={EVALUATION_OPTIONS}
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {isInstructor && visibleCohortSubjects.length === 0 ? (
                <Card>
                    <p className="text-sm text-gray-600">
                        No cohort subjects from your teaching load are available for assignment management in this cohort.
                    </p>
                </Card>
            ) : null}

            <Card>
                {assignmentsLoading ? (
                    <LoadingSpinner fullScreen={false} message="Loading assignments..." />
                ) : assignments.length === 0 ? (
                    <div className="py-12 text-center">
                        <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
                        <h2 className="mt-3 text-lg font-semibold text-gray-900">No assignments found</h2>
                        <p className="mt-2 text-sm text-gray-500">
                            {search || statusFilter || evaluationTypeFilter || cohortSubjectFilter
                                ? 'Adjust the current filters to widen the results.'
                                : 'Create the first cohort-subject assignment from this cohort workspace.'}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3 md:hidden">
                            {assignments.map((assignment) => (
                                <AssignmentSummary
                                    key={assignment.id}
                                    assignment={assignment}
                                    cohortId={cohortId}
                                    onEdit={(nextAssignment) => {
                                        setEditingAssignment(nextAssignment);
                                        setCreateOpen(true);
                                    }}
                                />
                            ))}
                        </div>

                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Assignment</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Evaluation</TableHead>
                                        <TableHead>Due</TableHead>
                                        <TableHead>Progress</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assignments.map((assignment) => (
                                        <TableRow key={assignment.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium text-gray-900">{assignment.title}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {assignment.instructions || 'No instructions provided.'}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-gray-900">{assignment.subject_name}</div>
                                                <div className="text-xs text-gray-500">
                                                    Cohort subject {assignment.cohort_subject}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getAssignmentStatusBadgeVariant(assignment.status)}>
                                                    {assignment.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getAssignmentEvaluationBadgeVariant(assignment.evaluation_type)}>
                                                    {assignment.evaluation_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-gray-900">{formatDate(assignment.due_at)}</div>
                                                <div className="text-xs text-gray-500">
                                                    {isAssignmentOverdue(assignment)
                                                        ? 'Overdue'
                                                        : isAssignmentDueSoon(assignment)
                                                            ? 'Due soon'
                                                            : 'On schedule'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-gray-900">
                                                    {assignment.reviewed_count}/{assignment.submissions_count} reviewed
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {assignment.recipients_count} recipients · {assignment.missing_count} missing
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-2">
                                                    <Link href={`/academic/cohorts/${cohortId}/assignments/${assignment.id}`}>
                                                        <Button size="sm">View</Button>
                                                    </Link>
                                                    {assignment.status === 'DRAFT' ? (
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingAssignment(assignment);
                                                                setCreateOpen(true);
                                                            }}
                                                        >
                                                            Edit
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </Card>

            <AssignmentCreateModal
                isOpen={createOpen}
                onClose={() => {
                    setCreateOpen(false);
                    setEditingAssignment(null);
                }}
                cohortId={cohortId}
                cohortCurriculumId={cohort?.curriculum ?? null}
                cohortSubjects={visibleCohortSubjects}
                assignment={editingAssignment}
                onSaved={(savedAssignment) => {
                    setResultMessage(
                        editingAssignment
                            ? 'Assignment updated.'
                            : savedAssignment.status === 'PUBLISHED'
                                ? 'Assignment created and published.'
                                : 'Assignment saved as draft.'
                    );

                    if (!editingAssignment) {
                        router.push(`/academic/cohorts/${cohortId}/assignments/${savedAssignment.id}`);
                    }
                }}
            />
        </div>
    );
}

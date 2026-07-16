'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowRight,
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
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { StatStrip } from '@/app/components/dashboard/StatStrip';
import { AssignmentCard } from '@/app/core/components/assignments/AssignmentCard';
import { AssignmentCreateModal } from '@/app/core/components/assignments/AssignmentCreateModal';
import {
    isAssignmentDueSoon,
    isAssignmentOverdue,
} from '@/app/core/components/assignments/assignmentUtils';
import { useCohortDetail, useCohortSubjects } from '@/app/core/hooks/useAcademic';
import { useAcademicTodayMode } from '@/app/core/hooks/useAcademicTodayMode';
import { useAssignments } from '@/app/core/hooks/useAssignments';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useAuth } from '@/app/context/AuthContext';
import type {
    Assignment,
    AssignmentDeliveryMode,
    AssignmentEvaluationType,
    AssignmentStatus,
} from '@/app/core/types/assignments';
import { roleHomeRoute } from '@/app/utils/routeAccess';
import { parseAppDestination } from '@/app/core/auth/navigation';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
    { value: '', label: 'All stages' },
    { value: 'DRAFT', label: 'Preparing' },
    { value: 'PUBLISHED', label: 'Issued' },
    { value: 'CLOSED', label: 'Reviewing' },
    { value: 'ARCHIVED', label: 'Stored' },
];

const EVALUATION_OPTIONS: Array<{ value: string; label: string }> = [
    { value: '', label: 'All evaluation styles' },
    { value: 'NUMERIC', label: 'Marks' },
    { value: 'RUBRIC', label: 'Rubric' },
    { value: 'DESCRIPTIVE', label: 'Written feedback' },
    { value: 'COMPETENCY', label: 'Competency check' },
];

const DELIVERY_MODE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: '', label: 'All delivery modes' },
    { value: 'INDIVIDUAL', label: 'Individual work' },
    { value: 'GROUP', label: 'Group work' },
];

function normalizeQueryParam(
    value: string | null,
    options: Array<{ value: string }>,
): string {
    return value && options.some((option) => option.value === value) ? value : '';
}

function isAssignmentNeedingReview(assignment: Assignment): boolean {
    if (assignment.delivery_mode === 'GROUP') {
        return assignment.group_submission_count > assignment.group_evaluation_count;
    }

    return assignment.submissions_count > assignment.reviewed_count;
}

function CohortSubjectWorkspaceCard({
    cohortSubjectId,
    subjectName,
    cohortName,
    curriculumName,
    curriculumType,
    totalCount,
    draftCount,
    publishedCount,
    dueSoonCount,
    overdueCount,
    href,
    highlighted = false,
}: {
    cohortSubjectId: number;
    subjectName: string;
    cohortName: string;
    curriculumName?: string | null;
    curriculumType?: string | null;
    totalCount: number;
    draftCount: number;
    publishedCount: number;
    dueSoonCount: number;
    overdueCount: number;
    href: string;
    highlighted?: boolean;
}) {
    return (
        <Card className={highlighted ? 'theme-info-surface p-5' : 'p-5'}>
            <div className="space-y-4">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold theme-text">{subjectName}</h2>
                        {highlighted ? (
                            <Badge variant="blue" size="sm">
                                Your class subject
                            </Badge>
                        ) : null}
                    </div>

                    <div className="space-y-1 text-sm theme-muted">
                        <p>{cohortName}</p>
                        {curriculumName || curriculumType ? (
                            <p>
                                {[curriculumName, curriculumType].filter(Boolean).join(' · ')}
                            </p>
                        ) : null}
                        <p className="text-xs theme-subtle">Cohort subject {cohortSubjectId}</p>
                    </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        { label: 'Total', value: totalCount, tone: 'theme-text' },
                        { label: 'Preparing', value: draftCount, tone: 'theme-text' },
                        { label: 'Issued', value: publishedCount, tone: 'theme-text' },
                        { label: 'Due soon', value: dueSoonCount, tone: dueSoonCount > 0 ? 'text-[color:var(--color-warning)]' : 'theme-text' },
                        { label: 'Overdue', value: overdueCount, tone: overdueCount > 0 ? 'text-[color:var(--color-danger)]' : 'theme-text' },
                    ].map((metric) => (
                        <div key={metric.label} className="rounded-lg border theme-border theme-surface-elevated px-3 py-3">
                            <div className={`text-base font-semibold ${metric.tone}`}>{metric.value}</div>
                            <div className="text-xs theme-subtle">{metric.label}</div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end">
                    <Link href={href} className="w-full sm:w-auto">
                        <Button size="sm" className="w-full sm:w-auto">
                            Open assignments
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
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
    const { data: todayMode } = useAcademicTodayMode({ enabled: Boolean(user) });
    const instructorAccess = useInstructorCohortAccess();
    const cohortId = Number(params.id);
    const isTeachingActor = instructorAccess.isTeachingActor;
    const isInstitutionAdminView = activeRole === 'ADMIN' && !isTeachingActor;
    const isValidCohortId = Number.isFinite(cohortId) && cohortId > 0;
    const [statusFilter, setStatusFilter] = useState<AssignmentStatus | ''>(
        normalizeQueryParam(searchParams.get('status'), STATUS_OPTIONS) as AssignmentStatus | ''
    );
    const [evaluationTypeFilter, setEvaluationTypeFilter] = useState<AssignmentEvaluationType | ''>(
        normalizeQueryParam(searchParams.get('evaluation_type'), EVALUATION_OPTIONS) as AssignmentEvaluationType | ''
    );
    const [deliveryModeFilter, setDeliveryModeFilter] = useState<AssignmentDeliveryMode | ''>(
        normalizeQueryParam(searchParams.get('delivery_mode'), DELIVERY_MODE_OPTIONS) as AssignmentDeliveryMode | ''
    );
    const [reviewFilter, setReviewFilter] = useState(searchParams.get('review') === 'needs_review' ? 'needs_review' : '');
    const [cohortSubjectFilter, setCohortSubjectFilter] = useState<string>(searchParams.get('cohort_subject') ?? '');
    const [search, setSearch] = useState(searchParams.get('search') ?? '');
    const [createOpen, setCreateOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
    const [resultMessage, setResultMessage] = useState<string | null>(null);
    const deferredSearch = useDeferredValue(search);
    const highlightAssignmentId = useMemo(() => {
        const value = Number(searchParams.get('highlightAssignment') ?? '');
        return Number.isFinite(value) && value > 0 ? value : null;
    }, [searchParams]);

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

    const accessLoading = authLoading || (isTeachingActor && instructorAccess.isLoading);
    const allowed = !user
        ? false
        : isInstitutionAdminView
            || (isTeachingActor && instructorAccess.cohortIds.includes(cohortId));

    const visibleCohortSubjects = useMemo(() => (
        isTeachingActor
            ? cohortSubjects.filter((subject) => instructorAccess.cohortSubjectIds.includes(subject.id))
            : cohortSubjects
    ), [cohortSubjects, instructorAccess.cohortSubjectIds, isTeachingActor]);

    const {
        assignments,
        loading: assignmentsLoading,
        error: assignmentsError,
        refetch,
    } = useAssignments({
        cohort: cohortId,
        cohort_subject: cohortSubjectFilter ? Number(cohortSubjectFilter) : undefined,
        status: statusFilter || undefined,
        delivery_mode: deliveryModeFilter || undefined,
        evaluation_type: evaluationTypeFilter || undefined,
        search: deferredSearch.trim() || undefined,
    }, {
        enabled: isValidCohortId,
    });

    useEffect(() => {
        if (accessLoading || allowed || !activeRole) return;
        router.replace(roleHomeRoute[activeRole]);
    }, [accessLoading, activeRole, allowed, router]);

    useEffect(() => {
        setStatusFilter(
            normalizeQueryParam(searchParams.get('status'), STATUS_OPTIONS) as AssignmentStatus | ''
        );
        setEvaluationTypeFilter(
            normalizeQueryParam(searchParams.get('evaluation_type'), EVALUATION_OPTIONS) as AssignmentEvaluationType | ''
        );
        setDeliveryModeFilter(
            normalizeQueryParam(searchParams.get('delivery_mode'), DELIVERY_MODE_OPTIONS) as AssignmentDeliveryMode | ''
        );
        setReviewFilter(searchParams.get('review') === 'needs_review' ? 'needs_review' : '');
        setCohortSubjectFilter(searchParams.get('cohort_subject') ?? '');
        setSearch(searchParams.get('search') ?? '');
    }, [searchParams]);

    useEffect(() => {
        if (!highlightAssignmentId || assignmentsLoading) {
            return;
        }

        const timer = window.setTimeout(() => {
            document.getElementById(`assignment-${highlightAssignmentId}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }, 100);

        return () => window.clearTimeout(timer);
    }, [assignmentsLoading, highlightAssignmentId]);

    const canCreateAssignments = Boolean(user) && isTeachingActor;
    const canManageAssignments = Boolean(user) && (isTeachingActor || isInstitutionAdminView);
    const midtermBreakPausesCreation = todayMode?.mode === 'MIDTERM_BREAK' && todayMode.allows_new_teaching === false;

    const visibleAssignments = useMemo(
        () => {
            return reviewFilter === 'needs_review'
                ? assignments.filter(isAssignmentNeedingReview)
                : assignments;
        },
        [assignments, reviewFilter]
    );

    const dueSoonCount = useMemo(
        () => visibleAssignments.filter((assignment) => isAssignmentDueSoon(assignment)).length,
        [visibleAssignments]
    );

    const buildAssignmentsHref = useCallback((
        nextCohortSubjectId?: string | null,
        options?: { includeHighlightAssignment?: boolean },
    ) => {
        const nextSearchParams = new URLSearchParams();
        const trimmedSearch = search.trim();

        if (nextCohortSubjectId) {
            nextSearchParams.set('cohort_subject', nextCohortSubjectId);
        }
        if (statusFilter) {
            nextSearchParams.set('status', statusFilter);
        }
        if (deliveryModeFilter) {
            nextSearchParams.set('delivery_mode', deliveryModeFilter);
        }
        if (evaluationTypeFilter) {
            nextSearchParams.set('evaluation_type', evaluationTypeFilter);
        }
        if (reviewFilter) {
            nextSearchParams.set('review', reviewFilter);
        }
        if (trimmedSearch) {
            nextSearchParams.set('search', trimmedSearch);
        }
        if (searchParams.get('source')) {
            nextSearchParams.set('source', searchParams.get('source') ?? '');
        }
        const safeReturnTo = parseAppDestination(searchParams.get('returnTo'));
        if (safeReturnTo) {
            nextSearchParams.set('returnTo', safeReturnTo);
        }
        if (options?.includeHighlightAssignment !== false && highlightAssignmentId) {
            nextSearchParams.set('highlightAssignment', String(highlightAssignmentId));
        }

        const query = nextSearchParams.toString();
        return query
            ? `/academic/cohorts/${cohortId}/assignments?${query}`
            : `/academic/cohorts/${cohortId}/assignments`;
    }, [cohortId, deliveryModeFilter, evaluationTypeFilter, highlightAssignmentId, reviewFilter, search, searchParams, statusFilter]);
    const assignmentsHref = useMemo(
        () => buildAssignmentsHref(cohortSubjectFilter || null),
        [buildAssignmentsHref, cohortSubjectFilter]
    );
    const assignmentPickerHref = useMemo(
        () => buildAssignmentsHref(null, { includeHighlightAssignment: false }),
        [buildAssignmentsHref]
    );
    const buildAssignmentDetailHref = (nextAssignmentId: number) =>
        `/academic/cohorts/${cohortId}/assignments/${nextAssignmentId}?${new URLSearchParams({
            returnTo: assignmentsHref,
        }).toString()}`;
    const overdueCount = useMemo(
        () => visibleAssignments.filter((assignment) => isAssignmentOverdue(assignment)).length,
        [visibleAssignments]
    );
    const publishedCount = useMemo(
        () => visibleAssignments.filter((assignment) => assignment.status === 'PUBLISHED').length,
        [visibleAssignments]
    );
    const reviewedTotal = useMemo(
        () => visibleAssignments.reduce((count, assignment) => (
            count + (
                assignment.delivery_mode === 'GROUP'
                    ? assignment.group_evaluation_count
                    : assignment.reviewed_count
            )
        ), 0),
        [visibleAssignments]
    );
    const submissionTotal = useMemo(
        () => visibleAssignments.reduce((count, assignment) => (
            count + (
                assignment.delivery_mode === 'GROUP'
                    ? assignment.group_submission_count
                    : assignment.submissions_count
            )
        ), 0),
        [visibleAssignments]
    );
    const selectedCohortSubject = useMemo(() => (
        visibleCohortSubjects.find((subject) => String(subject.id) === cohortSubjectFilter) ?? null
    ), [cohortSubjectFilter, visibleCohortSubjects]);
    const showingWorkspaceSelection = !cohortSubjectFilter || (isTeachingActor && !selectedCohortSubject);
    const requestedReturnTo = parseAppDestination(searchParams.get('returnTo'));
    const contextualBackHref = cohortSubjectFilter
        ? assignmentPickerHref
        : searchParams.get('source') === 'midterm' && requestedReturnTo
            ? requestedReturnTo
            : `/academic/cohorts/${cohortId}`;
    const contextualBackLabel = cohortSubjectFilter ? 'Back to Assignments' : 'Back to Cohort';
    const assignmentFiltersActive = Boolean(
        search.trim() || statusFilter || deliveryModeFilter || evaluationTypeFilter || reviewFilter
    );
    const groupedWorkspaces = useMemo(() => (
        [...visibleCohortSubjects]
            .sort((left, right) => left.subject_name.localeCompare(right.subject_name))
            .map((subject) => {
                const subjectAssignments = visibleAssignments.filter(
                    (assignment) => assignment.cohort_subject === subject.id
                );

                return {
                    subject,
                    totalCount: subjectAssignments.length,
                    draftCount: subjectAssignments.filter((assignment) => assignment.status === 'DRAFT').length,
                    publishedCount: subjectAssignments.filter((assignment) => assignment.status === 'PUBLISHED').length,
                    dueSoonCount: subjectAssignments.filter((assignment) => isAssignmentDueSoon(assignment)).length,
                    overdueCount: subjectAssignments.filter((assignment) => isAssignmentOverdue(assignment)).length,
                };
            })
    ), [visibleAssignments, visibleCohortSubjects]);

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
                    <Link href={contextualBackHref}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {contextualBackLabel}
                        </Button>
                    </Link>
                </div>

                <div className="space-y-2">
                    <nav className="flex flex-wrap items-center gap-2 text-sm theme-muted">
                        <Link href="/academic/cohorts" className="theme-link">
                            Cohorts
                        </Link>
                        <span>/</span>
                        <Link href={`/academic/cohorts/${cohortId}`} className="theme-link">
                            {cohort?.name ?? `Cohort ${cohortId}`}
                        </Link>
                        <span>/</span>
                        <span className="theme-text">Assignments</span>
                    </nav>

                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold theme-text">Assignments</h1>
                            <p className="mt-1 text-sm theme-muted">
                                Cohort is the navigation context, and assignment work stays scoped to subject groups taught in this cohort.
                            </p>
                        </div>

                        {canCreateAssignments && !midtermBreakPausesCreation ? (
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
                        ) : midtermBreakPausesCreation ? (
                            <Button type="button" disabled>
                                New normal teaching work resumes after the break.
                            </Button>
                        ) : null}
                    </div>
                </div>
            </div>

            {pageError ? (
                <ErrorBanner message={pageError} onDismiss={() => void refetch()} />
            ) : null}

            {resultMessage ? (
                <div className="theme-success-surface rounded-lg px-4 py-3 text-sm">
                    {resultMessage}
                </div>
            ) : null}

            {isTeachingActor && visibleCohortSubjects.length === 0 ? (
                <Card>
                    <p className="text-sm theme-muted">
                        No class subjects are assigned to you yet.
                    </p>
                </Card>
            ) : null}

            {showingWorkspaceSelection ? (
                <div className="space-y-6">
                    <Card className="theme-surface-muted">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium theme-text">
                                <BookOpen className="h-4 w-4 theme-subtle" />
                                Choose a class subject
                            </div>
                            <p className="text-sm theme-muted">
                                Open the assignment workspace for a specific class subject before working through drafts, publishing, or review.
                            </p>
                            <p className="text-sm theme-subtle">
                                Assignment counts reflect the current filters and search.
                            </p>
                        </div>
                    </Card>

                    {assignmentsLoading ? (
                        <LoadingSpinner fullScreen={false} message="Loading assignments..." />
                    ) : (
                        <div className="grid gap-4 xl:grid-cols-2">
                            {groupedWorkspaces.map((workspace) => (
                                <CohortSubjectWorkspaceCard
                                    key={workspace.subject.id}
                                    cohortSubjectId={workspace.subject.id}
                                    subjectName={workspace.subject.subject_name}
                                    cohortName={workspace.subject.cohort_name}
                                    curriculumName={workspace.subject.curriculum_name}
                                    curriculumType={workspace.subject.curriculum_type}
                                    totalCount={workspace.totalCount}
                                    draftCount={workspace.draftCount}
                                    publishedCount={workspace.publishedCount}
                                    dueSoonCount={workspace.dueSoonCount}
                                    overdueCount={workspace.overdueCount}
                                    href={buildAssignmentsHref(String(workspace.subject.id))}
                                    highlighted={isTeachingActor && visibleCohortSubjects.length === 1}
                                />
                            ))}
                        </div>
                    )}

                    <Card>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium theme-muted">
                                <Filter className="h-4 w-4" />
                                Assignment filters
                            </div>

                            <div className="grid gap-4 lg:grid-cols-4">
                                <div className="lg:col-span-2">
                                    <label className="mb-1 block text-sm font-medium theme-text">Search</label>
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 theme-subtle" />
                                        <input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search assignments across visible class subjects"
                                            className="theme-focus-ring theme-input w-full rounded-lg py-2 pl-10 pr-4"
                                        />
                                    </div>
                                </div>

                                <Select
                                    label="Status"
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value as AssignmentStatus | '')}
                                    options={STATUS_OPTIONS}
                                />
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                                    <Select
                                        label="Delivery Mode"
                                        value={deliveryModeFilter}
                                        onChange={(event) => setDeliveryModeFilter(event.target.value as AssignmentDeliveryMode | '')}
                                        options={DELIVERY_MODE_OPTIONS}
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
                </div>
            ) : selectedCohortSubject ? (
                <div className="space-y-6">
                    <Card className="theme-border theme-surface-muted">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl font-semibold theme-text">
                                        {selectedCohortSubject.subject_name}
                                    </h2>
                                    <Badge variant="info" size="sm">
                                        {selectedCohortSubject.cohort_name}
                                    </Badge>
                                </div>
                                <p className="text-sm theme-muted">
                                    This workspace stays scoped to one class subject. Search and filters apply inside this class only.
                                </p>
                                <p className="text-sm theme-muted">
                                    {[selectedCohortSubject.curriculum_name, selectedCohortSubject.curriculum_type]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                            </div>

                            <Link href={buildAssignmentsHref(null)} className="w-full lg:w-auto">
                                <Button variant="secondary" className="w-full lg:w-auto">
                                    Change class/subject
                                </Button>
                            </Link>
                        </div>
                    </Card>

                    <StatStrip mdColumns={2} xlColumns={4}>
                        <StatsCard
                            title="Total Assignments"
                            value={visibleAssignments.length}
                            icon={ClipboardList}
                            color="blue"
                        />
                        <StatsCard
                            title="Issued"
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
                    </StatStrip>

                    <Card>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium theme-muted">
                                <Filter className="h-4 w-4" />
                                Filters
                            </div>

                            <div className="grid gap-4 lg:grid-cols-4">
                                <div className="lg:col-span-2">
                                    <label className="mb-1 block text-sm font-medium theme-muted">Search</label>
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 theme-subtle" />
                                        <input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search assignment title or instructions"
                                            className="theme-focus-ring theme-input w-full rounded-lg py-2 pl-10 pr-4"
                                        />
                                    </div>
                                </div>

                                <Select
                                    label="Status"
                                    value={statusFilter}
                                    onChange={(event) => setStatusFilter(event.target.value as AssignmentStatus | '')}
                                    options={STATUS_OPTIONS}
                                />
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                                    <Select
                                        label="Delivery Mode"
                                        value={deliveryModeFilter}
                                        onChange={(event) => setDeliveryModeFilter(event.target.value as AssignmentDeliveryMode | '')}
                                        options={DELIVERY_MODE_OPTIONS}
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

                    {assignmentsLoading ? (
                        <LoadingSpinner fullScreen={false} message="Loading assignments..." />
                    ) : visibleAssignments.length === 0 ? (
                        <Card>
                            <div className="py-12 text-center">
                                <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
                                <h2 className="mt-3 text-lg font-semibold theme-text">No assignments found</h2>
                                <p className="mt-2 text-sm theme-muted">
                                    {assignmentFiltersActive
                                        ? 'Adjust the current filters to widen the results.'
                                        : 'Create the first assignment for this class subject.'}
                                </p>
                            </div>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {visibleAssignments.map((assignment) => (
                                <AssignmentCard
                                    key={assignment.id}
                                    assignment={assignment}
                                    detailHref={buildAssignmentDetailHref(assignment.id)}
                                    highlighted={assignment.id === highlightAssignmentId}
                                    onEdit={canManageAssignments
                                        ? (nextAssignment) => {
                                            setEditingAssignment(nextAssignment);
                                            setCreateOpen(true);
                                        }
                                        : undefined}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <Card>
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold theme-text">Class subject not available</h2>
                        <p className="text-sm theme-muted">
                            This class subject is not visible in the current cohort workspace.
                        </p>
                        <div>
                            <Link href={buildAssignmentsHref(null)}>
                                <Button variant="secondary">Back to subject groups</Button>
                            </Link>
                        </div>
                    </div>
                </Card>
            )}

            <AssignmentCreateModal
                isOpen={createOpen && (
                    editingAssignment ? canManageAssignments : canCreateAssignments
                )}
                onClose={() => {
                    setCreateOpen(false);
                    setEditingAssignment(null);
                }}
                cohortId={cohortId}
                cohortCurriculumId={cohort?.curriculum ?? null}
                cohortSubjects={visibleCohortSubjects}
                defaultCohortSubjectId={selectedCohortSubject?.id ?? (visibleCohortSubjects.length === 1 ? visibleCohortSubjects[0].id : null)}
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
                        router.push(buildAssignmentDetailHref(savedAssignment.id));
                    }
                }}
            />
        </div>
    );
}

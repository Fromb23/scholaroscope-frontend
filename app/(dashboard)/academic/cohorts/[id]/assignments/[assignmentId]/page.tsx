'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    Archive,
    ArrowLeft,
    BookOpen,
    ClipboardList,
    Clock,
    Eye,
    FileCheck2,
    Send,
    Trash2,
    Users,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import { StatsCard } from '@/app/components/dashboard/StatsCard';
import { AssignmentCreateModal } from '@/app/core/components/assignments/AssignmentCreateModal';
import { AssignmentPublishModal } from '@/app/core/components/assignments/AssignmentPublishModal';
import { AssignmentReviewForm } from '@/app/core/components/assignments/AssignmentReviewForm';
import {
    formatDateTime,
    getAssignmentEvaluationBadgeVariant,
    getAssignmentStatusBadgeVariant,
    getRecipientStatusBadgeVariant,
    getSubmissionStatusBadgeVariant,
    hasCBCOutcome,
} from '@/app/core/components/assignments/assignmentUtils';
import { useCohortDetail, useCohortSubjects } from '@/app/core/hooks/useAcademic';
import {
    useArchiveAssignment,
    useAssignmentDetail,
    useAssignmentEvaluations,
    useAssignmentRecipients,
    useAssignmentSubmissions,
    useBridgeAssignmentEvaluation,
    useCloseAssignment,
    useDeleteAssignment,
} from '@/app/core/hooks/useAssignments';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useRubricScaleDetail } from '@/app/core/hooks/useAssessments';
import { useAuth } from '@/app/context/AuthContext';
import type { AssignmentEvaluation } from '@/app/core/types/assignments';
import { roleHomeRoute } from '@/app/utils/routeAccess';

type DetailTab = 'overview' | 'recipients' | 'submissions' | 'evaluations';

function summarizeEvaluation(
    evaluation: AssignmentEvaluation,
    totalMarks: number | null
): string {
    if (evaluation.numeric_score != null) {
        return totalMarks != null
            ? `${evaluation.numeric_score}/${totalMarks}`
            : String(evaluation.numeric_score);
    }

    if (evaluation.rubric_level_label) {
        return evaluation.rubric_level_label;
    }

    if (evaluation.competency_state) {
        return evaluation.competency_state;
    }

    return evaluation.narrative || 'Review saved';
}

function getAssignmentsReturnHref(cohortId: number, returnTo: string | null): string {
    const defaultHref = `/academic/cohorts/${cohortId}/assignments`;
    if (!returnTo) {
        return defaultHref;
    }

    return returnTo.startsWith(defaultHref) ? returnTo : defaultHref;
}

export default function CohortAssignmentDetailPage() {
    const params = useParams<{ id: string; assignmentId: string }>();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, activeRole, loading: authLoading } = useAuth();
    const instructorAccess = useInstructorCohortAccess();
    const cohortId = Number(params.id);
    const assignmentId = Number(params.assignmentId);
    const isInstructor = activeRole === 'INSTRUCTOR';
    const isValidRoute = Number.isFinite(cohortId) && cohortId > 0 && Number.isFinite(assignmentId) && assignmentId > 0;
    const [activeTab, setActiveTab] = useState<DetailTab>('overview');
    const [editOpen, setEditOpen] = useState(false);
    const [publishOpen, setPublishOpen] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const accessLoading = authLoading || (isInstructor && instructorAccess.isLoading);
    const allowed = !user
        ? false
        : user.is_superadmin
            || activeRole === 'ADMIN'
            || (isInstructor && instructorAccess.cohortIds.includes(cohortId));

    const {
        cohort,
        loading: cohortLoading,
    } = useCohortDetail(isValidRoute ? cohortId : null);
    const {
        cohortSubjects,
        loading: cohortSubjectsLoading,
    } = useCohortSubjects(isValidRoute ? cohortId : undefined);
    const {
        assignment,
        loading: assignmentLoading,
        error: assignmentError,
    } = useAssignmentDetail(isValidRoute ? assignmentId : null, {
        enabled: isValidRoute,
    });
    const recipientsQuery = useAssignmentRecipients(assignment?.id ?? null, {
        enabled: Boolean(assignment?.id),
    });
    const submissionsQuery = useAssignmentSubmissions(assignment?.id ?? null, {
        enabled: Boolean(assignment?.id),
    });
    const evaluationsQuery = useAssignmentEvaluations({
        assignment: assignment?.id,
    }, {
        enabled: Boolean(assignment?.id),
    });
    const rubricScaleQuery = useRubricScaleDetail(assignment?.rubric_scale ?? null);
    const closeMutation = useCloseAssignment();
    const archiveMutation = useArchiveAssignment();
    const deleteMutation = useDeleteAssignment();
    const bridgeMutation = useBridgeAssignmentEvaluation();
    const assignmentsHref = useMemo(
        () => getAssignmentsReturnHref(cohortId, searchParams.get('returnTo')),
        [cohortId, searchParams]
    );

    const visibleCohortSubjects = useMemo(() => (
        isInstructor
            ? cohortSubjects.filter((subject) => instructorAccess.cohortSubjectIds.includes(subject.id))
            : cohortSubjects
    ), [cohortSubjects, instructorAccess.cohortSubjectIds, isInstructor]);

    const recipientByStudentId = useMemo(() => (
        new Map(recipientsQuery.recipients.map((recipient) => [recipient.student, recipient]))
    ), [recipientsQuery.recipients]);
    const submissionById = useMemo(() => (
        new Map(submissionsQuery.submissions.map((submission) => [submission.id, submission]))
    ), [submissionsQuery.submissions]);
    const evaluationBySubmissionId = useMemo(() => (
        new Map(evaluationsQuery.evaluations.map((evaluation) => [evaluation.submission, evaluation]))
    ), [evaluationsQuery.evaluations]);
    const canManageAssignments = Boolean(user) && (
        Boolean(user?.is_superadmin)
        || activeRole === 'ADMIN'
        || activeRole === 'INSTRUCTOR'
    );

    useEffect(() => {
        if (accessLoading || allowed || !activeRole) return;
        router.replace(roleHomeRoute[activeRole]);
    }, [accessLoading, activeRole, allowed, router]);

    if (!isValidRoute) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Invalid assignment route.
            </div>
        );
    }

    if (accessLoading || cohortLoading || cohortSubjectsLoading || assignmentLoading) {
        return <LoadingSpinner fullScreen={false} message="Loading assignment..." />;
    }

    if (!allowed) {
        return null;
    }

    if (assignmentError) {
        return <ErrorBanner message={assignmentError} onDismiss={() => router.push(assignmentsHref)} />;
    }

    if (!assignment) {
        return (
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
                Assignment not found.
            </div>
        );
    }

    if (assignment.cohort_id !== cohortId) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                This assignment does not belong to cohort {cohortId}.
            </div>
        );
    }

    const handleDelete = async () => {
        if (!confirm(`Delete draft assignment "${assignment.title}"?`)) {
            return;
        }

        setActionError(null);
        try {
            await deleteMutation.mutateAsync(assignment.id);
            router.push(assignmentsHref);
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to delete assignment.');
        }
    };

    const handleClose = async () => {
        setActionError(null);
        try {
            await closeMutation.mutateAsync(assignment.id);
            setSuccessMessage('Assignment closed.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to close assignment.');
        }
    };

    const handleArchive = async () => {
        setActionError(null);
        try {
            await archiveMutation.mutateAsync(assignment.id);
            setSuccessMessage('Assignment archived.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to archive assignment.');
        }
    };

    const handleBridge = async (evaluation: AssignmentEvaluation) => {
        setActionError(null);
        setSuccessMessage(null);
        try {
            const result = await bridgeMutation.mutateAsync({
                assignmentId: assignment.id,
                evaluationId: evaluation.id,
            });

            if (result.status === 'skipped') {
                setActionError(result.detail || 'The evaluation could not be bridged to evidence.');
                return;
            }

            setSuccessMessage(result.detail || 'Evaluation bridged to evidence.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to bridge evaluation.');
        }
    };

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="space-y-3">
                <div>
                    <Link href={assignmentsHref}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Assignments
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
                            {cohort?.name ?? assignment.cohort_name}
                        </Link>
                        <span>/</span>
                        <Link href={assignmentsHref} className="hover:text-blue-600">
                            Assignments
                        </Link>
                        <span>/</span>
                        <span className="text-gray-900">{assignment.title}</span>
                    </nav>

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={getAssignmentStatusBadgeVariant(assignment.status)}>
                                    {assignment.status}
                                </Badge>
                                <Badge variant={getAssignmentEvaluationBadgeVariant(assignment.evaluation_type)}>
                                    {assignment.evaluation_type}
                                </Badge>
                                {hasCBCOutcome(assignment) ? (
                                    <Badge variant="green">CBC-linked outcomes</Badge>
                                ) : null}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{assignment.title}</h1>
                                <p className="mt-1 text-sm text-gray-500">
                                    {assignment.subject_name} · {assignment.cohort_name}
                                </p>
                            </div>
                        </div>

                        {canManageAssignments ? (
                            <div className="flex flex-wrap gap-2">
                                {assignment.status === 'DRAFT' ? (
                                    <>
                                        <Button type="button" onClick={() => setPublishOpen(true)}>
                                            <Send className="mr-2 h-4 w-4" />
                                            Publish
                                        </Button>
                                        <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
                                            Edit Draft
                                        </Button>
                                        <Button type="button" variant="danger" onClick={handleDelete}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </Button>
                                    </>
                                ) : null}

                                {assignment.status === 'PUBLISHED' ? (
                                    <Button type="button" variant="secondary" onClick={handleClose} disabled={closeMutation.isPending}>
                                        <Clock className="mr-2 h-4 w-4" />
                                        {closeMutation.isPending ? 'Closing...' : 'Close'}
                                    </Button>
                                ) : null}

                                {assignment.status === 'CLOSED' ? (
                                    <Button type="button" variant="secondary" onClick={handleArchive} disabled={archiveMutation.isPending}>
                                        <Archive className="mr-2 h-4 w-4" />
                                        {archiveMutation.isPending ? 'Archiving...' : 'Archive'}
                                    </Button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {actionError ? (
                <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
            ) : null}

            {successMessage ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {successMessage}
                </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatsCard
                    title="Recipients"
                    value={assignment.recipients_count}
                    icon={Users}
                    color="blue"
                />
                <StatsCard
                    title="Submissions"
                    value={assignment.submissions_count}
                    icon={ClipboardList}
                    color="green"
                />
                <StatsCard
                    title="Reviewed"
                    value={assignment.reviewed_count}
                    icon={FileCheck2}
                    color="purple"
                />
                <StatsCard
                    title="Missing"
                    value={assignment.missing_count}
                    icon={Clock}
                    color={assignment.missing_count > 0 ? 'red' : 'yellow'}
                />
            </div>

            <Card>
                <div className="flex flex-wrap gap-2">
                    {(['overview', 'recipients', 'submissions', 'evaluations'] as DetailTab[]).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === tab
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </Card>

            {activeTab === 'overview' ? (
                <div className="space-y-4">
                    <Card>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Cohort</div>
                                <div className="text-sm font-medium text-gray-900">{assignment.cohort_name}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Subject</div>
                                <div className="text-sm font-medium text-gray-900">{assignment.subject_name}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Instructor</div>
                                <div className="text-sm font-medium text-gray-900">{assignment.instructor_name}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Starts At</div>
                                <div className="text-sm font-medium text-gray-900">{formatDateTime(assignment.starts_at)}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Due At</div>
                                <div className="text-sm font-medium text-gray-900">{formatDateTime(assignment.due_at)}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Curriculum</div>
                                <div className="text-sm font-medium text-gray-900">{assignment.curriculum_name}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Evaluation</div>
                                <div className="text-sm font-medium text-gray-900">{assignment.evaluation_type}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Marks</div>
                                <div className="text-sm font-medium text-gray-900">
                                    {assignment.total_marks != null ? assignment.total_marks : 'Not used'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Rubric Scale</div>
                                <div className="text-sm font-medium text-gray-900">
                                    {assignment.rubric_scale_name ?? 'Not used'}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold text-gray-900">Instructions</h2>
                            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">
                                {assignment.instructions || 'No instructions provided.'}
                            </p>
                        </div>
                    </Card>

                    <Card>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-gray-500" />
                                <h2 className="text-lg font-semibold text-gray-900">Outcomes</h2>
                            </div>

                            {assignment.outcomes.length === 0 ? (
                                <p className="text-sm text-gray-500">No outcome metadata is attached to this assignment.</p>
                            ) : (
                                <div className="grid gap-3 md:grid-cols-2">
                                    {assignment.outcomes.map((outcome) => (
                                        <div key={outcome.id} className="rounded-lg border border-gray-200 p-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="text-sm font-semibold text-gray-900">{outcome.outcome_label}</div>
                                                {outcome.plugin ? (
                                                    <Badge variant={outcome.plugin === 'cbc' ? 'green' : 'default'} size="sm">
                                                        {outcome.plugin}
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500">
                                                {outcome.outcome_key} · Weight {outcome.weight}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>

                    {assignment.status === 'DRAFT' && canManageAssignments ? (
                        <Card>
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-lg font-semibold text-gray-900">Publish Draft</h2>
                                    <p className="text-sm text-gray-500">
                                        Publish this assignment to active cohort learners or an explicit learner list without leaving cohort context.
                                    </p>
                                </div>
                                <Button type="button" onClick={() => setPublishOpen(true)}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Publish Draft
                                </Button>
                            </div>
                        </Card>
                    ) : null}
                </div>
            ) : null}

            {activeTab === 'recipients' ? (
                <Card>
                    {recipientsQuery.loading ? (
                        <LoadingSpinner fullScreen={false} message="Loading recipients..." />
                    ) : recipientsQuery.recipients.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-500">
                            No recipients have been assigned yet.
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3 md:hidden">
                                {recipientsQuery.recipients.map((recipient) => (
                                    <div key={recipient.id} className="rounded-lg border border-gray-200 p-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-sm font-semibold text-gray-900">{recipient.student_name}</h2>
                                            <Badge variant={getRecipientStatusBadgeVariant(recipient.status)} size="sm">
                                                {recipient.status}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">{recipient.admission_number}</p>
                                        <div className="mt-3 space-y-1 text-sm text-gray-600">
                                            <div>Assigned: {formatDateTime(recipient.assigned_at)}</div>
                                            <div>Submitted: {formatDateTime(recipient.submitted_at)}</div>
                                            <div>Reviewed: {formatDateTime(recipient.reviewed_at)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Learner</TableHead>
                                            <TableHead>Admission</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Assigned</TableHead>
                                            <TableHead>Submitted</TableHead>
                                            <TableHead>Reviewed</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recipientsQuery.recipients.map((recipient) => (
                                            <TableRow key={recipient.id}>
                                                <TableCell>{recipient.student_name}</TableCell>
                                                <TableCell>{recipient.admission_number}</TableCell>
                                                <TableCell>
                                                    <Badge variant={getRecipientStatusBadgeVariant(recipient.status)}>
                                                        {recipient.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{formatDateTime(recipient.assigned_at)}</TableCell>
                                                <TableCell>{formatDateTime(recipient.submitted_at)}</TableCell>
                                                <TableCell>{formatDateTime(recipient.reviewed_at)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </Card>
            ) : null}

            {activeTab === 'submissions' ? (
                <div className="space-y-4">
                    {submissionsQuery.loading ? (
                        <Card>
                            <LoadingSpinner fullScreen={false} message="Loading submissions..." />
                        </Card>
                    ) : submissionsQuery.submissions.length === 0 ? (
                        <Card>
                            <div className="py-10 text-center text-sm text-gray-500">
                                No learner submissions have been recorded yet.
                            </div>
                        </Card>
                    ) : (
                        submissionsQuery.submissions.map((submission) => {
                            const recipient = recipientByStudentId.get(submission.student) ?? null;
                            const evaluation = evaluationBySubmissionId.get(submission.id) ?? null;

                            return (
                                <Card key={submission.id}>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h2 className="text-lg font-semibold text-gray-900">
                                                        {submission.student_name}
                                                    </h2>
                                                    {recipient ? (
                                                        <Badge variant="default" size="sm">
                                                            {recipient.admission_number}
                                                        </Badge>
                                                    ) : null}
                                                    <Badge variant={getSubmissionStatusBadgeVariant(submission.status)} size="sm">
                                                        {submission.status}
                                                    </Badge>
                                                    {submission.is_late ? (
                                                        <Badge variant="red" size="sm">Late</Badge>
                                                    ) : null}
                                                    {evaluation ? (
                                                        <Badge variant="green" size="sm">Reviewed</Badge>
                                                    ) : null}
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    Submitted {formatDateTime(submission.submitted_at)}
                                                </p>
                                            </div>

                                            {evaluation ? (
                                                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                                                    {summarizeEvaluation(evaluation, assignment.total_marks)}
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                                            <div className="text-sm font-medium text-gray-900">Response</div>
                                            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">
                                                {submission.text_response || 'No text response submitted.'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                Attachments: {submission.attachment_metadata.length}
                                            </p>
                                        </div>

                                        {canManageAssignments ? (
                                            <AssignmentReviewForm
                                                assignment={assignment}
                                                submission={submission}
                                                evaluation={evaluation}
                                                rubricLevels={rubricScaleQuery.scale?.levels ?? []}
                                            />
                                        ) : null}
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </div>
            ) : null}

            {activeTab === 'evaluations' ? (
                <div className="space-y-4">
                    {evaluationsQuery.loading ? (
                        <Card>
                            <LoadingSpinner fullScreen={false} message="Loading evaluations..." />
                        </Card>
                    ) : evaluationsQuery.evaluations.length === 0 ? (
                        <Card>
                            <div className="py-10 text-center text-sm text-gray-500">
                                No evaluations have been recorded yet.
                            </div>
                        </Card>
                    ) : (
                        evaluationsQuery.evaluations.map((evaluation) => {
                            const recipient = recipientByStudentId.get(evaluation.student) ?? null;
                            const submission = submissionById.get(evaluation.submission) ?? null;

                            return (
                                <Card key={evaluation.id}>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h2 className="text-lg font-semibold text-gray-900">
                                                        {submission?.student_name ?? recipient?.student_name ?? `Learner ${evaluation.student}`}
                                                    </h2>
                                                    {recipient ? (
                                                        <Badge variant="default" size="sm">
                                                            {recipient.admission_number}
                                                        </Badge>
                                                    ) : null}
                                                    <Badge variant={getAssignmentEvaluationBadgeVariant(evaluation.evaluation_type)} size="sm">
                                                        {evaluation.evaluation_type}
                                                    </Badge>
                                                    {evaluation.evidence_created ? (
                                                        <Badge variant="green" size="sm">Evidence created</Badge>
                                                    ) : (
                                                        <Badge variant="yellow" size="sm">Evidence pending</Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    Reviewed {formatDateTime(evaluation.evaluated_at)}
                                                </p>
                                            </div>

                                            <div className="text-sm font-medium text-gray-900">
                                                {summarizeEvaluation(evaluation, assignment.total_marks)}
                                            </div>
                                        </div>

                                        {evaluation.narrative ? (
                                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                                                {evaluation.narrative}
                                            </div>
                                        ) : null}

                                        {hasCBCOutcome(assignment) && !evaluation.evidence_created && canManageAssignments ? (
                                            <div className="flex justify-end">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={() => handleBridge(evaluation)}
                                                    disabled={bridgeMutation.isPending}
                                                >
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    {bridgeMutation.isPending ? 'Bridging...' : 'Bridge to CBC Evidence'}
                                                </Button>
                                            </div>
                                        ) : null}
                                    </div>
                                </Card>
                            );
                        })
                    )}
                </div>
            ) : null}

            <AssignmentCreateModal
                isOpen={editOpen}
                onClose={() => setEditOpen(false)}
                cohortId={cohortId}
                cohortCurriculumId={cohort?.curriculum ?? null}
                cohortSubjects={visibleCohortSubjects}
                assignment={assignment}
                onSaved={() => {
                    setSuccessMessage('Assignment updated.');
                    setEditOpen(false);
                }}
            />

            <AssignmentPublishModal
                assignment={assignment}
                cohortId={cohortId}
                isOpen={publishOpen}
                onClose={() => setPublishOpen(false)}
                onPublished={() => {
                    setSuccessMessage('Assignment published.');
                    setPublishOpen(false);
                }}
            />
        </div>
    );
}

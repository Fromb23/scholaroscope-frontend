'use client';

import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    BookOpen,
    ClipboardList,
    Clock,
    Eye,
    FileCheck2,
    Users,
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
import { AssignmentLifecycleActionCard } from '@/app/core/components/assignments/AssignmentLifecycleActionCard';
import { AssignmentLifecycleConfirmModal } from '@/app/core/components/assignments/AssignmentLifecycleConfirmModal';
import { AssignmentGroupEvaluationsPanel } from '@/app/core/components/assignments/AssignmentGroupEvaluationsPanel';
import { AssignmentGroupsPanel } from '@/app/core/components/assignments/AssignmentGroupsPanel';
import { AssignmentPublishModal } from '@/app/core/components/assignments/AssignmentPublishModal';
import { AssignmentReviewForm } from '@/app/core/components/assignments/AssignmentReviewForm';
import { AssignmentGroupSubmissionsPanel } from '@/app/core/components/assignments/AssignmentGroupSubmissionsPanel';
import { AssignmentRecordResponsePanel } from '@/app/core/components/assignments/AssignmentRecordResponsePanel';
import {
    getAssignmentDeliveryBadgeVariant,
    getAssignmentDeliveryLabel,
    getAssignmentParticipatingCohortCount,
    formatDateTime,
    getAssignmentEvaluationBadgeVariant,
    getAssignmentEvaluationLabel,
    getAssignmentStatusBadgeVariant,
    getAssignmentStatusLabel,
    getRecipientStatusBadgeVariant,
    getSubmissionStatusBadgeVariant,
    hasCBCOutcome,
    usesExpandedSessionScope,
} from '@/app/core/components/assignments/assignmentUtils';
import { useCohortDetail, useCohortSubjects } from '@/app/core/hooks/useAcademic';
import {
    useArchiveAssignment,
    useAssignmentDetail,
    useAssignmentEvaluations,
    useAssignmentGroups,
    useAssignmentLifecycleState,
    useAssignmentRecipients,
    useAssignmentSubmissions,
    useBridgeAssignmentEvaluation,
    useCloseAssignment,
    useDeleteAssignment,
    useReopenLearnerWork,
    useRestoreAssignmentToReview,
} from '@/app/core/hooks/useAssignments';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { useRubricScaleDetail } from '@/app/core/hooks/useAssessments';
import { useAuth } from '@/app/context/AuthContext';
import type {
    AssignmentEvaluation,
    AssignmentLifecycleAction,
} from '@/app/core/types/assignments';
import { roleHomeRoute } from '@/app/utils/routeAccess';

type DetailTab =
    | 'overview'
    | 'recipients'
    | 'submissions'
    | 'evaluations'
    | 'groups'
    | 'group-submissions'
    | 'group-evaluations';

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

function getSafeReturnHref(cohortId: number, returnTo: string | null): string {
    const defaultHref = `/academic/cohorts/${cohortId}/assignments`;
    if (!returnTo) {
        return defaultHref;
    }

    if (
        returnTo.startsWith(defaultHref)
        || returnTo.startsWith('/lesson-plans/')
        || returnTo.startsWith('/sessions/')
    ) {
        return returnTo;
    }

    return defaultHref;
}

function getReturnLabel(returnHref: string): string {
    if (returnHref.startsWith('/lesson-plans/')) {
        return 'Back to Lesson Preparation';
    }
    if (returnHref.startsWith('/sessions/')) {
        return 'Back to Lesson';
    }
    return 'Back to Assignments';
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
    const [publishMode, setPublishMode] = useState<'issue' | 'add_learners'>('issue');
    const [confirmAction, setConfirmAction] = useState<AssignmentLifecycleAction | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [recordResponsePanelOpen, setRecordResponsePanelOpen] = useState(false);
    const [selectedReviewSubmissionId, setSelectedReviewSubmissionId] = useState<number | null>(null);
    const [reviewPanelManuallyHidden, setReviewPanelManuallyHidden] = useState(false);
    const responseWorkflowRef = useRef<HTMLDivElement | null>(null);
    const reviewWorkflowRef = useRef<HTMLDivElement | null>(null);

    const accessLoading = authLoading || (isInstructor && instructorAccess.isLoading);
    const allowed = !user
        ? false
        : user.is_superadmin
            || activeRole === 'ADMIN'
            || (isInstructor && instructorAccess.cohortIds.includes(cohortId));
    const canManageAssignments = Boolean(user) && (
        Boolean(user?.is_superadmin)
        || activeRole === 'ADMIN'
        || activeRole === 'INSTRUCTOR'
    );

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
        refetch: refetchAssignment,
    } = useAssignmentDetail(isValidRoute ? assignmentId : null, {
        enabled: isValidRoute,
    });
    const lifecycleQuery = useAssignmentLifecycleState(isValidRoute ? assignmentId : null, {
        enabled: isValidRoute && allowed && canManageAssignments,
    });
    const recipientsQuery = useAssignmentRecipients(assignment?.id ?? null, {
        enabled: Boolean(assignment?.id) && assignment?.delivery_mode === 'INDIVIDUAL',
    });
    const submissionsQuery = useAssignmentSubmissions(assignment?.id ?? null, {
        enabled: Boolean(assignment?.id) && assignment?.delivery_mode === 'INDIVIDUAL',
    });
    const evaluationsQuery = useAssignmentEvaluations({
        assignment: assignment?.id,
    }, {
        enabled: Boolean(assignment?.id) && assignment?.delivery_mode === 'INDIVIDUAL',
    });
    const groupsQuery = useAssignmentGroups(assignment?.id ?? null, {
        enabled: Boolean(assignment?.id) && assignment?.delivery_mode === 'GROUP',
    });
    const rubricScaleQuery = useRubricScaleDetail(assignment?.rubric_scale ?? null);
    const closeMutation = useCloseAssignment();
    const archiveMutation = useArchiveAssignment();
    const reopenLearnerWorkMutation = useReopenLearnerWork();
    const restoreToReviewMutation = useRestoreAssignmentToReview();
    const deleteMutation = useDeleteAssignment();
    const bridgeMutation = useBridgeAssignmentEvaluation();
    const assignmentsHref = useMemo(
        () => getSafeReturnHref(cohortId, searchParams.get('returnTo')),
        [cohortId, searchParams]
    );
    const returnLabel = useMemo(
        () => getReturnLabel(assignmentsHref),
        [assignmentsHref]
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
    const reviewableSubmissions = useMemo(() => (
        [...submissionsQuery.submissions].sort((left, right) => (
            new Date(right.submitted_at).getTime() - new Date(left.submitted_at).getTime()
        ))
    ), [submissionsQuery.submissions]);
    const pendingReviewSubmissions = useMemo(() => (
        reviewableSubmissions.filter((submission) => !evaluationBySubmissionId.has(submission.id))
    ), [evaluationBySubmissionId, reviewableSubmissions]);
    const selectedReviewSubmission = useMemo(() => (
        reviewableSubmissions.find((submission) => submission.id === selectedReviewSubmissionId)
        ?? pendingReviewSubmissions[0]
        ?? reviewableSubmissions[0]
        ?? null
    ), [pendingReviewSubmissions, reviewableSubmissions, selectedReviewSubmissionId]);
    const selectedReviewEvaluation = selectedReviewSubmission
        ? evaluationBySubmissionId.get(selectedReviewSubmission.id) ?? null
        : null;
    const isGroupAssignment = assignment?.delivery_mode === 'GROUP';
    const participatingCohortCount = useMemo(
        () => getAssignmentParticipatingCohortCount(assignment?.curriculum_context),
        [assignment?.curriculum_context]
    );
    const showSessionScopeNote = Boolean(assignment && usesExpandedSessionScope(assignment));
    const lessonPlanReturnHref = !assignment?.lesson_plan
        ? null
        : assignmentsHref.startsWith('/lesson-plans/')
            ? assignmentsHref
            : `/lesson-plans/${assignment.lesson_plan}?${new URLSearchParams({
                section: 'learner-task',
                highlightAssignment: String(assignment.id),
            }).toString()}`;
    const lifecycleSupplementaryActions = lessonPlanReturnHref && assignment?.status === 'DRAFT'
        ? [{
            key: 'back-to-lesson-preparation',
            label: 'Back to lesson preparation',
            href: lessonPlanReturnHref,
        }]
        : [];
    const detailTabs = useMemo<Array<{ value: DetailTab; label: string }>>(() => (
        isGroupAssignment
            ? [
                { value: 'overview', label: 'Overview' },
                { value: 'groups', label: 'Groups' },
                { value: 'group-submissions', label: 'Group Submissions' },
                { value: 'group-evaluations', label: 'Group Evaluations' },
            ]
            : [
                { value: 'overview', label: 'Overview' },
                { value: 'recipients', label: 'Recipients' },
                { value: 'submissions', label: 'Submissions' },
                { value: 'evaluations', label: 'Evaluations' },
            ]
    ), [isGroupAssignment]);

    useEffect(() => {
        if (accessLoading || allowed || !activeRole) return;
        router.replace(roleHomeRoute[activeRole]);
    }, [accessLoading, activeRole, allowed, router]);

    useEffect(() => {
        if (detailTabs.some((tab) => tab.value === activeTab)) {
            return;
        }

        setActiveTab('overview');
    }, [activeTab, detailTabs]);

    useEffect(() => {
        if (isGroupAssignment) {
            setSelectedReviewSubmissionId(null);
            setRecordResponsePanelOpen(false);
            setReviewPanelManuallyHidden(false);
            return;
        }

        if (selectedReviewSubmissionId == null) {
            if (!reviewPanelManuallyHidden && pendingReviewSubmissions.length > 0) {
                setSelectedReviewSubmissionId(pendingReviewSubmissions[0].id);
            }
            return;
        }

        const submissionStillExists = reviewableSubmissions.some(
            (submission) => submission.id === selectedReviewSubmissionId
        );
        if (!submissionStillExists) {
            setSelectedReviewSubmissionId(pendingReviewSubmissions[0]?.id ?? null);
        }
    }, [
        isGroupAssignment,
        pendingReviewSubmissions,
        reviewPanelManuallyHidden,
        reviewableSubmissions,
        selectedReviewSubmissionId,
    ]);

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
            <div className="rounded-lg border theme-border theme-surface-elevated px-4 py-6 text-sm theme-muted">
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
            setConfirmAction(null);
            setSuccessMessage('Learner work closed.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to close learner work.');
        }
    };

    const handleArchive = async () => {
        setActionError(null);
        try {
            await archiveMutation.mutateAsync(assignment.id);
            setConfirmAction(null);
            setSuccessMessage('Assignment record stored.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to store assignment record.');
        }
    };

    const handleRestoreToReview = async () => {
        setActionError(null);
        try {
            await restoreToReviewMutation.mutateAsync(assignment.id);
            setConfirmAction(null);
            setSuccessMessage('Assignment restored to review.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to restore assignment to review.');
        }
    };

    const handleReopenLearnerWork = async () => {
        setActionError(null);
        try {
            await reopenLearnerWorkMutation.mutateAsync(assignment.id);
            setConfirmAction(null);
            setSuccessMessage('Learner work reopened.');
        } catch (err) {
            setActionError(err instanceof Error ? err.message : 'Failed to reopen learner work.');
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

    const scrollWorkflowPanel = (panelRef: RefObject<HTMLDivElement | null>) => {
        window.setTimeout(() => {
            panelRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 80);
    };

    const openRecordResponsePanel = () => {
        if (isGroupAssignment) {
            setActiveTab('group-submissions');
            return;
        }

        setActionError(null);
        setSuccessMessage(null);
        setActiveTab('submissions');
        setRecordResponsePanelOpen(true);
        setReviewPanelManuallyHidden(false);
        scrollWorkflowPanel(responseWorkflowRef);
    };

    const openReviewWorkflow = (submissionId?: number | null) => {
        if (isGroupAssignment) {
            setActiveTab('group-evaluations');
            return;
        }

        const nextSubmissionId = submissionId
            ?? pendingReviewSubmissions[0]?.id
            ?? reviewableSubmissions[0]?.id
            ?? null;

        setActionError(null);
        setSuccessMessage(null);
        setRecordResponsePanelOpen(false);
        setReviewPanelManuallyHidden(false);
        setSelectedReviewSubmissionId(nextSubmissionId);
        setActiveTab('submissions');
        scrollWorkflowPanel(reviewWorkflowRef);
    };

    const handleResponseSaved = async (submissionId: number) => {
        await Promise.all([
            refetchAssignment(),
            lifecycleQuery.refetch(),
            recipientsQuery.refetch(),
            submissionsQuery.refetch(),
            evaluationsQuery.refetch(),
        ]);
        setRecordResponsePanelOpen(false);
        setReviewPanelManuallyHidden(false);
        setSelectedReviewSubmissionId(submissionId);
        setSuccessMessage('Learner response recorded. Review it below.');
        setActiveTab('submissions');
        scrollWorkflowPanel(reviewWorkflowRef);
    };

    const handleReviewSaved = async () => {
        const [
            ,
            ,
            ,
            submissionsResult,
            evaluationsResult,
        ] = await Promise.all([
            refetchAssignment(),
            lifecycleQuery.refetch(),
            recipientsQuery.refetch(),
            submissionsQuery.refetch(),
            evaluationsQuery.refetch(),
        ]);

        const refreshedSubmissions = submissionsResult.data ?? [];
        const refreshedEvaluations = new Set(
            (evaluationsResult.data ?? []).map((evaluation) => evaluation.submission)
        );
        const nextPendingSubmission = refreshedSubmissions.find(
            (submission) => !refreshedEvaluations.has(submission.id)
        ) ?? refreshedSubmissions.find((submission) => submission.id === selectedReviewSubmission?.id)
            ?? refreshedSubmissions[0]
            ?? null;

        setSelectedReviewSubmissionId(nextPendingSubmission?.id ?? null);
        setSuccessMessage('Learner response reviewed.');
    };

    const lifecycleState = lifecycleQuery.lifecycleState;
    const pendingLifecycleAction: AssignmentLifecycleAction | null = deleteMutation.isPending
        ? 'DELETE_DRAFT'
        : closeMutation.isPending
            ? 'FINISH_LEARNER_WORK'
            : archiveMutation.isPending
                ? 'STORE_RECORD'
                : reopenLearnerWorkMutation.isPending
                    ? 'REOPEN_LEARNER_WORK'
                    : restoreToReviewMutation.isPending
                        ? 'RESTORE_TO_REVIEW'
                        : null;

    const openPublishModal = (mode: 'issue' | 'add_learners') => {
        setPublishMode(mode);
        setPublishOpen(true);
    };

    const handleLifecycleAction = (action: AssignmentLifecycleAction) => {
        setActionError(null);
        setSuccessMessage(null);

        switch (action) {
            case 'ISSUE_ASSIGNMENT':
                openPublishModal('issue');
                break;
            case 'EDIT_ASSIGNMENT':
                setEditOpen(true);
                break;
            case 'DELETE_DRAFT':
                void handleDelete();
                break;
            case 'MANAGE_GROUPS':
            case 'MARK_PARTICIPATION':
                setActiveTab('groups');
                break;
            case 'ADD_LEARNERS':
                openPublishModal('add_learners');
                break;
            case 'RECORD_SUBMISSION':
                openRecordResponsePanel();
                break;
            case 'REVIEW_WORK':
                openReviewWorkflow();
                break;
            case 'RECORD_EVIDENCE':
                setActiveTab(isGroupAssignment ? 'group-evaluations' : 'evaluations');
                break;
            case 'VIEW_RECORD':
                setActiveTab('overview');
                break;
            case 'FINISH_LEARNER_WORK':
            case 'STORE_RECORD':
            case 'REOPEN_LEARNER_WORK':
            case 'RESTORE_TO_REVIEW':
                setConfirmAction(action);
                break;
            default:
                break;
        }
    };

    const confirmTitle = confirmAction === 'FINISH_LEARNER_WORK'
        ? 'Close learner work?'
        : confirmAction === 'STORE_RECORD'
            ? 'Store assignment record?'
            : confirmAction === 'RESTORE_TO_REVIEW'
                ? 'Restore to review?'
                : confirmAction === 'REOPEN_LEARNER_WORK'
                    ? 'Reopen learner work?'
                    : '';
    const confirmMessage = confirmAction === 'FINISH_LEARNER_WORK'
        ? 'Learners will no longer submit normally. You can still review work, mark participation, and record evidence.'
        : confirmAction === 'STORE_RECORD'
            ? 'This assignment will leave the active workflow and be stored for records. You can restore it to review later.'
            : confirmAction === 'RESTORE_TO_REVIEW'
                ? 'This brings the assignment back to the review list. Learner submissions remain closed.'
                : confirmAction === 'REOPEN_LEARNER_WORK'
                    ? 'Learners may continue submitting or participating. Use this only if the work period was closed too early.'
                    : '';
    const confirmLabel = confirmAction === 'FINISH_LEARNER_WORK'
        ? 'Close learner work'
        : confirmAction === 'STORE_RECORD'
            ? 'Store assignment record'
            : confirmAction === 'RESTORE_TO_REVIEW'
                ? 'Restore to review'
                : confirmAction === 'REOPEN_LEARNER_WORK'
                    ? 'Reopen learner work'
                    : '';
    const confirmPendingLabel = confirmAction === 'FINISH_LEARNER_WORK'
        ? 'Closing learner work...'
        : confirmAction === 'STORE_RECORD'
            ? 'Storing record...'
            : confirmAction === 'RESTORE_TO_REVIEW'
                ? 'Restoring to review...'
                : confirmAction === 'REOPEN_LEARNER_WORK'
                    ? 'Reopening learner work...'
                    : '';
    const confirmWarnings = lifecycleState
        ? (
            confirmAction === 'FINISH_LEARNER_WORK'
                ? lifecycleState.warnings
                : confirmAction === 'STORE_RECORD'
                    ? lifecycleState.warnings
                    : []
        )
        : [];
    const confirmBlockingItems = lifecycleState
        ? (confirmAction === 'STORE_RECORD' ? lifecycleState.blocking_items : [])
        : [];

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="space-y-3">
                <div>
                    <Link href={assignmentsHref}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {returnLabel}
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
                            {cohort?.name ?? assignment.cohort_name}
                        </Link>
                        <span>/</span>
                        <Link href={assignmentsHref} className="theme-link">
                            Assignments
                        </Link>
                        <span>/</span>
                        <span className="theme-text">{assignment.title}</span>
                    </nav>

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant={getAssignmentStatusBadgeVariant(assignment.status)}>
                                    {lifecycleState?.teacher_stage_label ?? getAssignmentStatusLabel(assignment.status)}
                                </Badge>
                                <Badge variant={getAssignmentDeliveryBadgeVariant(assignment.delivery_mode)}>
                                    {getAssignmentDeliveryLabel(assignment.delivery_mode)}
                                </Badge>
                                <Badge variant={getAssignmentEvaluationBadgeVariant(assignment.evaluation_type)}>
                                    {getAssignmentEvaluationLabel(assignment.evaluation_type)}
                                </Badge>
                                {hasCBCOutcome(assignment) ? (
                                    <Badge variant="green">CBC-linked outcomes</Badge>
                                ) : null}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold theme-text">{assignment.title}</h1>
                                <p className="mt-1 text-sm theme-muted">
                                    {assignment.subject_name} · {assignment.cohort_name}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {actionError ? (
                <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />
            ) : null}

            {successMessage ? (
                <div className="theme-success-surface rounded-lg px-4 py-3 text-sm">
                    {successMessage}
                </div>
            ) : null}

            {canManageAssignments ? (
                lifecycleQuery.loading ? (
                    <Card>
                        <LoadingSpinner fullScreen={false} message="Loading assignment workflow..." />
                    </Card>
                ) : lifecycleQuery.error ? (
                    <ErrorBanner
                        message={lifecycleQuery.error}
                        onDismiss={() => void lifecycleQuery.refetch()}
                    />
                ) : lifecycleState ? (
                    <AssignmentLifecycleActionCard
                        lifecycleState={lifecycleState}
                        deliveryMode={assignment.delivery_mode}
                        onAction={handleLifecycleAction}
                        pendingAction={pendingLifecycleAction}
                        disabled={Boolean(pendingLifecycleAction)}
                        supplementaryActions={lifecycleSupplementaryActions}
                    />
                ) : null
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {isGroupAssignment ? (
                    <>
                        <StatsCard
                            title="Groups"
                            value={assignment.group_count}
                            icon={Users}
                            color="blue"
                        />
                        <StatsCard
                            title="Submissions"
                            value={assignment.group_submission_count}
                            icon={ClipboardList}
                            color="green"
                        />
                        <StatsCard
                            title="Evaluations"
                            value={assignment.group_evaluation_count}
                            icon={FileCheck2}
                            color="purple"
                        />
                        <StatsCard
                            title="Pending Review"
                            value={Math.max(assignment.group_submission_count - assignment.group_evaluation_count, 0)}
                            icon={Clock}
                            color={assignment.group_submission_count > assignment.group_evaluation_count ? 'yellow' : 'green'}
                        />
                    </>
                ) : (
                    <>
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
                    </>
                )}
            </div>

            {showSessionScopeNote ? (
                <Card className="theme-info-surface">
                    <div className="space-y-1">
                        <h2 className="text-base font-semibold theme-text">Session-based learner scope</h2>
                        <p className="text-sm theme-muted">
                            This assignment can include learners from all active classes linked to the source session.
                            {participatingCohortCount > 1 ? ` (${participatingCohortCount} active classes)` : ''}
                        </p>
                    </div>
                </Card>
            ) : null}

            <Card>
                <div className="flex flex-wrap gap-2">
                    {detailTabs.map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setActiveTab(tab.value)}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                activeTab === tab.value
                                    ? 'theme-info-surface'
                                    : 'theme-surface-muted theme-muted'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </Card>

            {activeTab === 'overview' ? (
                <div className="space-y-4">
                    <Card>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-subtle">Cohort</div>
                                <div className="text-sm font-medium theme-text">{assignment.cohort_name}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-subtle">Subject</div>
                                <div className="text-sm font-medium theme-text">{assignment.subject_name}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-subtle">Instructor</div>
                                <div className="text-sm font-medium theme-text">{assignment.instructor_name}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-muted">Delivery</div>
                                <div className="text-sm font-medium theme-text">{getAssignmentDeliveryLabel(assignment.delivery_mode)}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-muted">Starts At</div>
                                <div className="text-sm font-medium theme-text">{formatDateTime(assignment.starts_at)}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-muted">Due At</div>
                                <div className="text-sm font-medium theme-text">{formatDateTime(assignment.due_at)}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-muted">Curriculum</div>
                                <div className="text-sm font-medium theme-text">{assignment.curriculum_name}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-muted">Curriculum Type</div>
                                <div className="text-sm font-medium theme-text">{assignment.curriculum_type}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-muted">Subject Group</div>
                                <div className="text-sm font-medium theme-text">{assignment.subject_name}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-muted">Evaluation</div>
                                <div className="text-sm font-medium theme-text">{getAssignmentEvaluationLabel(assignment.evaluation_type)}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-muted">Total Marks</div>
                                <div className="text-sm font-medium theme-text">
                                    {assignment.total_marks != null ? assignment.total_marks : 'Not used'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-muted">Rubric Scale</div>
                                <div className="text-sm font-medium theme-text">
                                    {assignment.rubric_scale_name ?? 'Not used'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-muted">Created</div>
                                <div className="text-sm font-medium theme-text">{formatDateTime(assignment.created_at)}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-muted">Issued</div>
                                <div className="text-sm font-medium theme-text">{formatDateTime(assignment.published_at)}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-medium uppercase tracking-wide theme-muted">Learner Work Finished</div>
                                <div className="text-sm font-medium theme-text">{formatDateTime(assignment.closed_at)}</div>
                            </div>
                            {assignment.created_from_session_title ? (
                                <div className="space-y-1">
                                    <div className="text-xs font-medium uppercase tracking-wide theme-muted">Linked Lesson</div>
                                    <div className="text-sm font-medium theme-text">
                                        {assignment.created_from_session_title}
                                    </div>
                                </div>
                            ) : null}
                            {showSessionScopeNote ? (
                                <div className="space-y-1">
                                    <div className="text-xs font-medium uppercase tracking-wide theme-muted">Participation Scope</div>
                                    <div className="text-sm font-medium theme-text">
                                        {participatingCohortCount > 0
                                            ? `${participatingCohortCount} active class${participatingCohortCount === 1 ? '' : 'es'}`
                                            : 'Source session scope'}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </Card>

                    <Card>
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold theme-text">Delivery Workflow</h2>
                            <p className="text-sm leading-6 theme-muted">
                                {assignment.delivery_mode === 'GROUP'
                                    ? 'Group assignments record submissions and evaluations at group level. CBC evidence can be projected to group members when the evaluation projection mode allows it.'
                                    : 'Individual assignments track learner recipients, learner submissions, and learner-level evaluations inside the selected subject group.'}
                            </p>
                        </div>
                    </Card>

                    <Card>
                        <div className="space-y-2">
                            <h2 className="text-lg font-semibold theme-text">Instructions</h2>
                            <p className="whitespace-pre-wrap text-sm leading-6 theme-muted">
                                {assignment.instructions || 'No instructions provided.'}
                            </p>
                        </div>
                    </Card>

                    <Card>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 theme-subtle" />
                                <h2 className="text-lg font-semibold theme-text">Outcomes</h2>
                            </div>

                            {assignment.outcomes.length === 0 ? (
                                <p className="text-sm theme-muted">No outcome metadata is attached to this assignment.</p>
                            ) : (
                                <div className="grid gap-3 md:grid-cols-2">
                                    {assignment.outcomes.map((outcome) => (
                                        <div key={outcome.id} className="rounded-lg border theme-border p-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="text-sm font-semibold theme-text">{outcome.outcome_label}</div>
                                                {outcome.plugin ? (
                                                    <Badge variant={outcome.plugin === 'cbc' ? 'green' : 'default'} size="sm">
                                                        {outcome.plugin}
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <div className="mt-1 text-xs theme-subtle">
                                                {outcome.outcome_key} · Weight {outcome.weight}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>

                </div>
            ) : null}

            {activeTab === 'recipients' && !isGroupAssignment ? (
                <Card>
                    {recipientsQuery.loading ? (
                        <LoadingSpinner fullScreen={false} message="Loading recipients..." />
                    ) : recipientsQuery.recipients.length === 0 ? (
                        <div className="py-10 text-center text-sm theme-muted">
                            No recipients have been assigned yet.
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3 md:hidden">
                                {recipientsQuery.recipients.map((recipient) => (
                                    <div key={recipient.id} className="rounded-lg border theme-border p-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-sm font-semibold theme-text">{recipient.student_name}</h2>
                                            <Badge variant={getRecipientStatusBadgeVariant(recipient.status)} size="sm">
                                                {recipient.status}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-xs theme-muted">{recipient.admission_number}</p>
                                        <div className="mt-3 space-y-1 text-sm theme-muted">
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

            {activeTab === 'submissions' && !isGroupAssignment ? (
                <div className="space-y-4">
                    {canManageAssignments && recordResponsePanelOpen ? (
                        <div ref={responseWorkflowRef}>
                            <AssignmentRecordResponsePanel
                                assignment={assignment}
                                recipients={recipientsQuery.recipients}
                                submissions={submissionsQuery.submissions}
                                onClose={() => setRecordResponsePanelOpen(false)}
                                onSaved={async (submission) => {
                                    await handleResponseSaved(submission.id);
                                }}
                            />
                        </div>
                    ) : null}

                    {canManageAssignments && !recordResponsePanelOpen && selectedReviewSubmission ? (
                        <div ref={reviewWorkflowRef}>
                            <Card className="theme-info-surface space-y-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                        <h2 className="text-lg font-semibold theme-text">Review / mark response</h2>
                                        <p className="text-sm theme-muted">
                                            {selectedReviewEvaluation
                                                ? 'Update the saved review or feedback for this learner response.'
                                                : 'This is the next safe step after recording learner work.'}
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-full sm:w-auto"
                                        onClick={() => {
                                            setReviewPanelManuallyHidden(true);
                                            setSelectedReviewSubmissionId(null);
                                        }}
                                    >
                                        Hide review panel
                                    </Button>
                                </div>

                                <div className="grid gap-4 lg:grid-cols-2">
                                    <Select
                                        label="Learner response"
                                        value={selectedReviewSubmission ? String(selectedReviewSubmission.id) : ''}
                                        onChange={(event) => {
                                            setReviewPanelManuallyHidden(false);
                                            setSelectedReviewSubmissionId(Number(event.target.value));
                                        }}
                                        options={reviewableSubmissions.map((submission) => ({
                                            value: String(submission.id),
                                            label: `${submission.student_name} · ${
                                                evaluationBySubmissionId.has(submission.id) ? 'Reviewed' : 'Needs review'
                                            } · ${formatDateTime(submission.submitted_at)}`,
                                        }))}
                                    />
                                    <div className="rounded-lg border theme-border bg-white/80 px-4 py-3 text-sm">
                                        <div className="font-medium theme-text">
                                            {selectedReviewEvaluation ? 'Reviewed response' : 'Awaiting review'}
                                        </div>
                                        <div className="mt-1 theme-muted">
                                            {selectedReviewSubmission.student_name}
                                            {selectedReviewSubmission.is_late ? ' · Late response' : ''}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 rounded-lg border theme-border bg-white/80 p-4">
                                    <div className="text-sm font-medium theme-text">Recorded response</div>
                                    <p className="whitespace-pre-wrap text-sm leading-6 theme-muted">
                                        {selectedReviewSubmission.text_response || 'No text response submitted.'}
                                    </p>
                                    <p className="text-xs theme-muted">
                                        Submitted {formatDateTime(selectedReviewSubmission.submitted_at)} · Attachments {selectedReviewSubmission.attachment_metadata.length}
                                    </p>
                                </div>

                                <AssignmentReviewForm
                                    assignment={assignment}
                                    submission={selectedReviewSubmission}
                                    evaluation={selectedReviewEvaluation}
                                    rubricLevels={rubricScaleQuery.scale?.levels ?? []}
                                    onSaved={handleReviewSaved}
                                />
                            </Card>
                        </div>
                    ) : null}

                    {submissionsQuery.loading ? (
                        <Card>
                            <LoadingSpinner fullScreen={false} message="Loading submissions..." />
                        </Card>
                    ) : submissionsQuery.submissions.length === 0 ? (
                        <Card>
                            <div className="py-10 text-center text-sm theme-muted">
                                No learner responses have been recorded yet.
                            </div>
                        </Card>
                    ) : (
                        reviewableSubmissions.map((submission) => {
                            const recipient = recipientByStudentId.get(submission.student) ?? null;
                            const evaluation = evaluationBySubmissionId.get(submission.id) ?? null;

                            return (
                                <Card key={submission.id}>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h2 className="text-lg font-semibold theme-text">
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
                                                <p className="text-sm theme-muted">
                                                    Submitted {formatDateTime(submission.submitted_at)}
                                                </p>
                                            </div>

                                            {evaluation ? (
                                                <div className="theme-success-surface rounded-lg px-3 py-2 text-sm">
                                                    {summarizeEvaluation(evaluation, assignment.total_marks)}
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="space-y-2 rounded-lg border theme-border theme-surface-muted p-4">
                                            <div className="text-sm font-medium theme-text">Response</div>
                                            <p className="whitespace-pre-wrap text-sm leading-6 theme-muted">
                                                {submission.text_response || 'No text response submitted.'}
                                            </p>
                                            <p className="text-xs theme-muted">
                                                Attachments: {submission.attachment_metadata.length}
                                            </p>
                                        </div>

                                        {canManageAssignments ? (
                                            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                                <Button
                                                    type="button"
                                                    variant={evaluation ? 'secondary' : 'primary'}
                                                    className="w-full sm:w-auto"
                                                    onClick={() => openReviewWorkflow(submission.id)}
                                                >
                                                    {evaluation ? 'Update review' : 'Review / mark response'}
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

            {activeTab === 'evaluations' && !isGroupAssignment ? (
                <div className="space-y-4">
                    {evaluationsQuery.loading ? (
                        <Card>
                            <LoadingSpinner fullScreen={false} message="Loading evaluations..." />
                        </Card>
                    ) : evaluationsQuery.evaluations.length === 0 ? (
                        <Card>
                            <div className="py-10 text-center text-sm theme-muted">
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
                                                    <h2 className="text-lg font-semibold theme-text">
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
                                                <p className="text-sm theme-muted">
                                                    Reviewed {formatDateTime(evaluation.evaluated_at)}
                                                </p>
                                            </div>

                                            <div className="text-sm font-medium theme-text">
                                                {summarizeEvaluation(evaluation, assignment.total_marks)}
                                            </div>
                                        </div>

                                        {evaluation.narrative ? (
                                            <div className="rounded-lg border theme-border theme-surface-muted p-4 text-sm theme-muted">
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

            {activeTab === 'groups' && isGroupAssignment ? (
                <AssignmentGroupsPanel
                    assignment={assignment}
                    groups={groupsQuery.groups}
                    loading={groupsQuery.loading}
                    error={groupsQuery.error}
                    refetch={() => void groupsQuery.refetch()}
                />
            ) : null}

            {activeTab === 'group-submissions' && isGroupAssignment ? (
                <AssignmentGroupSubmissionsPanel
                    assignment={assignment}
                    groups={groupsQuery.groups}
                    groupsLoading={groupsQuery.loading}
                />
            ) : null}

            {activeTab === 'group-evaluations' && isGroupAssignment ? (
                <AssignmentGroupEvaluationsPanel
                    assignment={assignment}
                    groups={groupsQuery.groups}
                    groupsLoading={groupsQuery.loading}
                    rubricLevels={rubricScaleQuery.scale?.levels ?? []}
                />
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
                isOpen={publishOpen}
                onClose={() => setPublishOpen(false)}
                onPublished={() => {
                    setSuccessMessage(
                        publishMode === 'issue'
                            ? 'Assignment issued.'
                            : 'Learners added to assignment.'
                    );
                    setPublishOpen(false);
                }}
            />

            <AssignmentLifecycleConfirmModal
                isOpen={confirmAction != null}
                onClose={() => setConfirmAction(null)}
                onConfirm={
                    confirmAction === 'FINISH_LEARNER_WORK'
                        ? handleClose
                        : confirmAction === 'STORE_RECORD'
                            ? handleArchive
                            : confirmAction === 'RESTORE_TO_REVIEW'
                                ? handleRestoreToReview
                                : handleReopenLearnerWork
                }
                title={confirmTitle}
                message={confirmMessage}
                confirmLabel={confirmLabel}
                confirmPendingLabel={confirmPendingLabel}
                blockingItems={confirmBlockingItems}
                warnings={confirmWarnings}
                pending={Boolean(pendingLifecycleAction)}
            />
        </div>
    );
}

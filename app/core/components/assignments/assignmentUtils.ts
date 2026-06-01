import type {
    Assignment,
    AssignmentCurriculumContext,
    AssignmentDeliveryMode,
    AssignmentEvaluationType,
    AssignmentRecipientStatus,
    AssignmentStatus,
    AssignmentSubmissionStatus,
} from '@/app/core/types/assignments';

type BadgeVariant =
    | 'success'
    | 'warning'
    | 'danger'
    | 'info'
    | 'default'
    | 'blue'
    | 'green'
    | 'yellow'
    | 'red'
    | 'purple'
    | 'indigo'
    | 'orange';

export function getAssignmentStatusBadgeVariant(status: AssignmentStatus): BadgeVariant {
    switch (status) {
        case 'DRAFT':
            return 'default';
        case 'PUBLISHED':
            return 'blue';
        case 'CLOSED':
            return 'yellow';
        case 'ARCHIVED':
            return 'purple';
        default:
            return 'default';
    }
}

export function getAssignmentStatusLabel(status: AssignmentStatus): string {
    switch (status) {
        case 'DRAFT':
            return 'Preparing';
        case 'PUBLISHED':
            return 'Issued';
        case 'CLOSED':
            return 'Reviewing';
        case 'ARCHIVED':
            return 'Stored';
        default:
            return status;
    }
}

export function getAssignmentEvaluationBadgeVariant(
    evaluationType: AssignmentEvaluationType
): BadgeVariant {
    switch (evaluationType) {
        case 'NUMERIC':
            return 'blue';
        case 'RUBRIC':
            return 'purple';
        case 'DESCRIPTIVE':
            return 'green';
        case 'COMPETENCY':
            return 'orange';
        default:
            return 'default';
    }
}

export function getAssignmentEvaluationLabel(
    evaluationType: AssignmentEvaluationType
): string {
    switch (evaluationType) {
        case 'NUMERIC':
            return 'Marks';
        case 'RUBRIC':
            return 'Rubric';
        case 'DESCRIPTIVE':
            return 'Written feedback';
        case 'COMPETENCY':
            return 'Competency check';
        default:
            return evaluationType;
    }
}

export function getAssignmentDeliveryBadgeVariant(
    deliveryMode: AssignmentDeliveryMode
): BadgeVariant {
    switch (deliveryMode) {
        case 'GROUP':
            return 'indigo';
        case 'INDIVIDUAL':
            return 'blue';
        default:
            return 'default';
    }
}

export function getAssignmentDeliveryLabel(
    deliveryMode: AssignmentDeliveryMode
): string {
    switch (deliveryMode) {
        case 'GROUP':
            return 'Group work';
        case 'INDIVIDUAL':
            return 'Individual work';
        default:
            return deliveryMode;
    }
}

export function getRecipientStatusBadgeVariant(status: AssignmentRecipientStatus): BadgeVariant {
    switch (status) {
        case 'ASSIGNED':
            return 'blue';
        case 'SUBMITTED':
            return 'yellow';
        case 'REVIEWED':
            return 'green';
        case 'MISSING':
            return 'red';
        case 'EXCUSED':
            return 'default';
        default:
            return 'default';
    }
}

export function getSubmissionStatusBadgeVariant(status: AssignmentSubmissionStatus): BadgeVariant {
    switch (status) {
        case 'SUBMITTED':
            return 'blue';
        case 'LATE':
            return 'red';
        case 'RETURNED':
            return 'yellow';
        case 'RESUBMITTED':
            return 'orange';
        case 'REVIEWED':
            return 'green';
        default:
            return 'default';
    }
}

export function formatDateTime(value: string | null | undefined): string {
    if (!value) return 'Not set';

    return new Date(value).toLocaleString();
}

export function formatDate(value: string | null | undefined): string {
    if (!value) return 'Not set';

    return new Date(value).toLocaleDateString();
}

export function isAssignmentOverdue(assignment: Assignment, now = new Date()): boolean {
    if (!assignment.due_at) return false;
    if (assignment.status === 'CLOSED' || assignment.status === 'ARCHIVED') return false;

    return new Date(assignment.due_at).getTime() < now.getTime();
}

export function isAssignmentDueSoon(assignment: Assignment, now = new Date()): boolean {
    if (!assignment.due_at) return false;
    if (isAssignmentOverdue(assignment, now)) return false;
    if (assignment.status === 'CLOSED' || assignment.status === 'ARCHIVED') return false;

    const diffMs = new Date(assignment.due_at).getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return diffDays >= 0 && diffDays <= 7;
}

export function hasCBCOutcome(assignment: Assignment): boolean {
    return assignment.outcomes.some((outcome) => outcome.plugin === 'cbc');
}

export function getAssignmentParticipatingCohortCount(
    context: AssignmentCurriculumContext | null | undefined
): number {
    if (typeof context?.participating_cohort_count === 'number' && context.participating_cohort_count > 0) {
        return context.participating_cohort_count;
    }

    if (Array.isArray(context?.participating_cohort_ids) && context.participating_cohort_ids.length > 0) {
        return context.participating_cohort_ids.length;
    }

    if (
        Array.isArray(context?.participating_cohort_subject_ids)
        && context.participating_cohort_subject_ids.length > 0
    ) {
        return context.participating_cohort_subject_ids.length;
    }

    return 0;
}

export function hasSessionParticipationMetadata(
    context: AssignmentCurriculumContext | null | undefined
): boolean {
    return (
        typeof context?.source_session_id === 'number'
        || getAssignmentParticipatingCohortCount(context) > 0
    );
}

export function usesExpandedSessionScope(assignment: Pick<Assignment, 'created_from_session' | 'curriculum_context'>): boolean {
    return (
        assignment.created_from_session != null
        && getAssignmentParticipatingCohortCount(assignment.curriculum_context) > 1
    );
}

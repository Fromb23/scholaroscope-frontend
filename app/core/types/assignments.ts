import type { PaginatedResponse } from '@/app/core/types/api';

export type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type AssignmentEvaluationType = 'NUMERIC' | 'RUBRIC' | 'DESCRIPTIVE' | 'COMPETENCY';
export type AssignmentRecipientMode = 'ALL_ACTIVE_COHORT_LEARNERS' | 'EXPLICIT_STUDENTS' | 'none';

export interface AssignmentRecipientCreationResult {
    created: number;
    existing: number;
    created_count: number;
    existing_count: number;
    recipient_ids: number[];
}

export interface AssignmentOutcome {
    id: number;
    assignment: number;
    outcome_key: string;
    outcome_label: string;
    plugin: string | null;
    weight: number;
    curriculum_context: Record<string, unknown>;
    created_at: string;
}

export interface AssignmentOutcomeCreatePayload {
    outcome_key: string;
    outcome_label: string;
    plugin?: string | null;
    weight?: number;
    curriculum_context?: Record<string, unknown>;
}

export interface Assignment {
    id: number;
    organization: number;
    cohort_subject: number;
    cohort_id: number;
    cohort_name: string;
    subject_id: number;
    subject_name: string;
    curriculum_name: string;
    curriculum_type: string;
    instructor: number;
    instructor_name: string;
    instructor_email: string;
    title: string;
    instructions: string;
    starts_at: string | null;
    due_at: string | null;
    status: AssignmentStatus;
    evaluation_type: AssignmentEvaluationType;
    rubric_scale: number | null;
    rubric_scale_name: string | null;
    total_marks: number | null;
    created_from_session: number | null;
    created_from_session_title: string | null;
    created_from_session_date: string | null;
    curriculum_context: Record<string, unknown>;
    created_by: number | null;
    published_at: string | null;
    closed_at: string | null;
    created_at: string;
    updated_at: string;
    outcomes: AssignmentOutcome[];
    recipient_count: number;
    submission_count: number;
    reviewed_count: number;
    missing_count: number;
    recipients_count: number;
    submissions_count: number;
    evaluations_count: number;
}

export interface AssignmentCreatePayload {
    cohort_subject: number;
    instructor?: number;
    title: string;
    instructions?: string;
    starts_at?: string | null;
    due_at?: string | null;
    evaluation_type: AssignmentEvaluationType;
    rubric_scale?: number | null;
    total_marks?: number | null;
    created_from_session?: number | null;
    curriculum_context?: Record<string, unknown>;
    outcomes?: AssignmentOutcomeCreatePayload[];
    recipient_mode?: AssignmentRecipientMode;
    student_ids?: number[];
    publish_now?: boolean;
}

export interface AssignmentUpdatePayload {
    cohort_subject?: number;
    instructor?: number;
    title?: string;
    instructions?: string;
    starts_at?: string | null;
    due_at?: string | null;
    evaluation_type?: AssignmentEvaluationType;
    rubric_scale?: number | null;
    total_marks?: number | null;
    created_from_session?: number | null;
    curriculum_context?: Record<string, unknown>;
    outcomes?: AssignmentOutcomeCreatePayload[];
}

export interface AssignmentFilters {
    cohort?: number;
    subject?: number;
    cohort_subject?: number;
    instructor?: number;
    status?: AssignmentStatus;
    evaluation_type?: AssignmentEvaluationType;
    starts_at_after?: string;
    starts_at_before?: string;
    due_at_after?: string;
    due_at_before?: string;
    search?: string;
    ordering?: string;
    page?: number;
    page_size?: number;
}

export type AssignmentRecipientStatus =
    | 'ASSIGNED'
    | 'SUBMITTED'
    | 'REVIEWED'
    | 'MISSING'
    | 'EXCUSED';

export interface AssignmentRecipient {
    id: number;
    assignment: number;
    student: number;
    student_name: string;
    admission_number: string;
    status: AssignmentRecipientStatus;
    assigned_at: string;
    submitted_at: string | null;
    reviewed_at: string | null;
}

export interface AssignmentRecipientCreatePayload {
    assignment: number;
    student: number;
}

export interface AssignmentRecipientSelectionPayload {
    recipient_mode: Exclude<AssignmentRecipientMode, 'none'>;
    student_ids?: number[];
}

export interface AssignmentPublishPayload {
    recipient_mode?: Exclude<AssignmentRecipientMode, 'none'>;
    student_ids?: number[];
}

export interface AssignmentPublishResponse {
    assignment: Assignment;
    recipients: AssignmentRecipientCreationResult;
}

export type AssignmentSubmissionStatus =
    | 'SUBMITTED'
    | 'LATE'
    | 'RETURNED'
    | 'RESUBMITTED'
    | 'REVIEWED';

export interface AssignmentSubmission {
    id: number;
    assignment: number;
    student: number;
    student_name: string;
    recipient: number | null;
    submitted_at: string;
    text_response: string;
    attachment_metadata: unknown[];
    status: AssignmentSubmissionStatus;
    is_late: boolean;
    created_at: string;
    updated_at: string;
}

export interface AssignmentSubmissionCreatePayload {
    assignment: number;
    student: number;
    text_response?: string;
    attachment_metadata?: unknown[];
}

export interface AssignmentEvaluation {
    id: number;
    submission: number;
    assignment: number;
    student: number;
    evaluated_by: number;
    evaluated_at: string;
    evaluation_type: AssignmentEvaluationType;
    numeric_score: number | null;
    rubric_level: number | null;
    rubric_level_code: string | null;
    rubric_level_label: string | null;
    narrative: string;
    competency_state: string | null;
    evidence_created: boolean;
    evidence_record_id: number | null;
    created_at: string;
    updated_at: string;
}

export interface AssignmentEvaluationCreatePayload {
    submission: number;
    evaluation_type: AssignmentEvaluationType;
    numeric_score?: number | null;
    rubric_level?: number | null;
    narrative?: string;
    competency_state?: string | null;
}

export interface AssignmentEvaluationUpdatePayload {
    numeric_score?: number | null;
    rubric_level?: number | null;
    narrative?: string;
    competency_state?: string | null;
}

export type AssignmentEvidenceBridgeStatus = 'created' | 'existing' | 'skipped';

export interface AssignmentEvidenceBridgeResponse {
    status: AssignmentEvidenceBridgeStatus;
    evidence_record_id: number | null;
    detail: string;
}

export interface AssignmentEvaluationFilters {
    assignment?: number;
    student?: number;
    submission?: number;
    evaluation_type?: AssignmentEvaluationType;
    evidence_created?: boolean;
    page?: number;
    page_size?: number;
}

export type AssignmentListResponse = Assignment[] | PaginatedResponse<Assignment>;
export type AssignmentRecipientListResponse =
    | AssignmentRecipient[]
    | PaginatedResponse<AssignmentRecipient>;
export type AssignmentSubmissionListResponse =
    | AssignmentSubmission[]
    | PaginatedResponse<AssignmentSubmission>;
export type AssignmentEvaluationListResponse =
    | AssignmentEvaluation[]
    | PaginatedResponse<AssignmentEvaluation>;

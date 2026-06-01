import type { PaginatedResponse } from '@/app/core/types/api';

export type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type AssignmentDeliveryMode = 'INDIVIDUAL' | 'GROUP';
export type AssignmentEvaluationType = 'NUMERIC' | 'RUBRIC' | 'DESCRIPTIVE' | 'COMPETENCY';
export type AssignmentRecipientMode =
    | 'ALL_ACTIVE_COHORT_LEARNERS'
    | 'PRESENT_IN_SOURCE_SESSION'
    | 'EXPLICIT_STUDENTS'
    | 'none';
export type AssignmentEvidenceProjectionMode =
    | 'APPLY_TO_ALL_MEMBERS'
    | 'APPLY_WITH_OVERRIDES'
    | 'RECORD_ONLY';
export type AssignmentAutoGenerateMode =
    | 'BY_GROUP_COUNT'
    | 'BY_MEMBERS_PER_GROUP';
export type AssignmentGroupStudentSource =
    | 'ALL_ACTIVE_COHORT_SUBJECT_LEARNERS'
    | 'PRESENT_IN_SOURCE_SESSION'
    | 'EXPLICIT_STUDENTS';
export type AssignmentEligibleLearnersSource =
    | 'all'
    | 'all_subject_learners'
    | 'present_in_lesson';

export interface AssignmentCurriculumContext {
    source_session_id?: number | null;
    participating_cohort_subject_ids?: number[];
    participating_cohort_ids?: number[];
    participating_cohort_count?: number | null;
    [key: string]: unknown;
}

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
    delivery_mode: AssignmentDeliveryMode;
    evaluation_type: AssignmentEvaluationType;
    rubric_scale: number | null;
    rubric_scale_name: string | null;
    total_marks: number | null;
    created_from_session: number | null;
    created_from_session_title: string | null;
    created_from_session_date: string | null;
    lesson_plan: number | null;
    lesson_plan_title: string | null;
    curriculum_context: AssignmentCurriculumContext;
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
    group_count: number;
    group_submission_count: number;
    group_evaluation_count: number;
}

export interface AssignmentCreatePayload {
    cohort_subject: number;
    instructor?: number;
    title: string;
    instructions?: string;
    starts_at?: string | null;
    due_at?: string | null;
    delivery_mode?: AssignmentDeliveryMode;
    evaluation_type: AssignmentEvaluationType;
    rubric_scale?: number | null;
    total_marks?: number | null;
    created_from_session?: number | null;
    curriculum_context?: AssignmentCurriculumContext;
    outcomes?: AssignmentOutcomeCreatePayload[];
    recipient_mode?: AssignmentRecipientMode;
    student_ids?: number[];
    publish_now?: boolean;
}

export interface PrepareAssignmentFromLessonPlanPayload {
    title?: string;
    instructions?: string;
    delivery_mode?: AssignmentDeliveryMode;
    due_at?: string | null;
    evaluation_type?: AssignmentEvaluationType;
    total_marks?: number | null;
    rubric_scale?: number | null;
}

export interface PrepareAssignmentFromLessonPlanResponse {
    detail: string;
    created: boolean;
    assignment: Assignment;
}

export interface PreparedAssignmentsForLessonPlanResponse {
    assignments: Assignment[];
    draft: Assignment | null;
    issued: Assignment[];
}

export interface AssignmentUpdatePayload {
    cohort_subject?: number;
    instructor?: number;
    title?: string;
    instructions?: string;
    starts_at?: string | null;
    due_at?: string | null;
    delivery_mode?: AssignmentDeliveryMode;
    evaluation_type?: AssignmentEvaluationType;
    rubric_scale?: number | null;
    total_marks?: number | null;
    created_from_session?: number | null;
    curriculum_context?: AssignmentCurriculumContext;
    outcomes?: AssignmentOutcomeCreatePayload[];
}

export interface AssignmentFilters {
    cohort?: number;
    subject?: number;
    cohort_subject?: number;
    instructor?: number;
    status?: AssignmentStatus;
    delivery_mode?: AssignmentDeliveryMode;
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

export interface IssuePreparedAssignmentPayload {
    assignment_id: number;
    recipient_mode?: Exclude<AssignmentRecipientMode, 'none'>;
    student_ids?: number[];
}

export interface IssuePreparedAssignmentResponse {
    detail: string;
    assignment: Assignment;
    recipients: AssignmentRecipientCreationResult;
}

export interface AssignmentEligibleLearner {
    id: number;
    admission_number: string;
    full_name: string;
    email?: string;
    phone?: string;
    gender?: string;
}

export interface AssignmentEligibleLearnersParams {
    source?: AssignmentEligibleLearnersSource;
    exclude_grouped?: boolean;
}

export interface AssignmentEligibleLearnersResponse {
    assignment: number;
    cohort_subject: number;
    cohort: number;
    subject: number;
    source: string;
    created_from_session: number | null;
    attendance_required: boolean;
    students: AssignmentEligibleLearner[];
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

export interface AssignmentGroup {
    id: number;
    assignment: number;
    name: string;
    notes?: string;
    member_count?: number;
    submission_count?: number;
    evaluation_count?: number;
    latest_submission_at?: string | null;
    latest_submission_status?: AssignmentGroupSubmissionStatus | null;
    latest_evaluated_at?: string | null;
    members?: AssignmentGroupMember[];
    created_at: string;
    updated_at: string;
}

export type AssignmentGroupMemberParticipationStatus =
    | 'PARTICIPATED'
    | 'ABSENT'
    | 'DID_NOT_PARTICIPATE'
    | 'EXCUSED'
    | 'LATE_ADDED'
    | 'REMOVED';

export interface AssignmentGroupMember {
    id: number;
    assignment: number;
    group: number;
    student: number;
    student_name: string;
    admission_number: string;
    joined_at: string;
    participation_status: AssignmentGroupMemberParticipationStatus;
    participation_status_display: string;
    participation_note?: string;
    left_at?: string | null;
}

export interface AssignmentGroupCreatePayload {
    name: string;
    notes?: string;
    student_ids?: number[];
}

export interface AssignmentGroupUpdatePayload {
    name?: string;
    notes?: string;
}

export interface AssignmentGroupCreateResponse {
    created_count: number;
    existing_count: number;
    member_created_count: number;
    member_existing_count: number;
    groups: AssignmentGroup[];
}

export interface AssignmentGroupMemberCreatePayload {
    student_id: number;
}

export interface AssignmentGroupBulkMemberCreatePayload {
    student_ids: number[];
}

export interface AssignmentGroupBulkMemberCreateResponse {
    created_count: number;
    existing_count: number;
    group: AssignmentGroup;
}

export interface AssignmentGroupMemberParticipationPayload {
    participation_status: AssignmentGroupMemberParticipationStatus;
    participation_note?: string;
}

export interface AssignmentGroupMemberMovePayload {
    target_group_id: number;
}

export interface AssignmentAutoGenerateGroupsPayload {
    mode: AssignmentAutoGenerateMode;
    group_count?: number;
    members_per_group?: number;
    name_prefix?: string;
    student_ids?: number[];
    student_source?: AssignmentGroupStudentSource;
    balance_gender?: boolean;
    shuffle?: boolean;
    seed?: number | null;
    replace_existing?: boolean;
}

export interface AssignmentAutoGenerateGroupsResponse {
    created_count: number;
    member_created_count: number;
    groups: AssignmentGroup[];
}

export interface AssignmentGroupReuseSource {
    id: number;
    title: string;
    starts_at: string | null;
    due_at: string | null;
    created_at: string;
    group_count: number;
    group_submission_count: number;
    group_evaluation_count: number;
    created_from_session: number | null;
    created_from_session_title: string | null;
    created_from_session_date: string | null;
}

export interface AssignmentGroupCopyFromPayload {
    source_assignment_id: number;
    replace_existing?: boolean;
}

export interface AssignmentGroupCopyFromResponse {
    created_count: number;
    member_created_count: number;
    skipped_count: number;
    groups: AssignmentGroup[];
}

export type AssignmentGroupSubmissionStatus = AssignmentSubmissionStatus;

export interface AssignmentGroupSubmission {
    id: number;
    group: number;
    assignment: number;
    group_name: string;
    submitted_at: string;
    text_response: string;
    attachment_metadata: unknown[];
    status: AssignmentGroupSubmissionStatus;
    created_at: string;
    updated_at: string;
    is_late?: boolean;
}

export interface AssignmentGroupSubmissionCreatePayload {
    submitted_at?: string;
    text_response?: string;
    attachment_metadata?: unknown[];
    status?: AssignmentGroupSubmissionStatus;
}

export interface AssignmentGroupMemberEvaluationOverride {
    id: number;
    group_member?: number | null;
    student: number;
    student_id?: number;
    student_name: string;
    admission_number: string;
    evaluation_type?: AssignmentEvaluationType | null;
    numeric_score?: number | null;
    rubric_level?: number | null;
    rubric_level_code?: string | null;
    rubric_level_label?: string | null;
    narrative?: string;
    competency_state?: string | null;
    exclude_from_evidence?: boolean;
    created_at: string;
    updated_at: string;
}

export interface AssignmentGroupMemberEvaluationOverridePayload {
    group_member?: number;
    student_id?: number;
    numeric_score?: number | null;
    rubric_level?: number | null;
    narrative?: string;
    competency_state?: string | null;
    exclude_from_evidence?: boolean;
}

export interface AssignmentGroupEvaluation {
    id: number;
    group_submission: number;
    assignment: number;
    group: number;
    group_name: string;
    evaluated_by: number;
    evaluated_at: string;
    evaluation_type: AssignmentEvaluationType;
    numeric_score: number | null;
    rubric_level: number | null;
    rubric_level_code: string | null;
    rubric_level_label: string | null;
    narrative: string;
    competency_state: string | null;
    projection_mode: AssignmentEvidenceProjectionMode;
    member_overrides?: AssignmentGroupMemberEvaluationOverride[];
    evidence_created?: boolean;
    evidence_record_ids?: number[];
    created_at: string;
    updated_at: string;
}

export interface AssignmentGroupEvaluationCreatePayload {
    group_submission: number;
    evaluation_type?: AssignmentEvaluationType;
    numeric_score?: number | null;
    rubric_level?: number | null;
    narrative?: string;
    competency_state?: string | null;
    projection_mode?: AssignmentEvidenceProjectionMode;
    member_overrides?: AssignmentGroupMemberEvaluationOverridePayload[];
}

export interface AssignmentGroupEvaluationUpdatePayload {
    evaluation_type?: AssignmentEvaluationType;
    numeric_score?: number | null;
    rubric_level?: number | null;
    narrative?: string;
    competency_state?: string | null;
    projection_mode?: AssignmentEvidenceProjectionMode;
    member_overrides?: AssignmentGroupMemberEvaluationOverridePayload[];
}

export interface AssignmentGroupEvaluationFilters {
    assignment?: number;
    group?: number;
    group_submission?: number;
    evaluation_type?: AssignmentEvaluationType;
    projection_mode?: AssignmentEvidenceProjectionMode;
    page?: number;
    page_size?: number;
}

export type AssignmentGroupEvidenceBridgeStatus = 'created' | 'existing' | 'skipped';

export interface AssignmentGroupEvidenceBridgeResponse {
    status: AssignmentGroupEvidenceBridgeStatus;
    created_count: number;
    existing_count: number;
    skipped_count: number;
    evidence_record_ids: number[];
    skipped_member_ids: number[];
    detail: string;
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
export type AssignmentGroupListResponse =
    | AssignmentGroup[]
    | PaginatedResponse<AssignmentGroup>;
export type AssignmentGroupReuseSourceListResponse =
    | AssignmentGroupReuseSource[]
    | PaginatedResponse<AssignmentGroupReuseSource>;
export type AssignmentGroupSubmissionListResponse =
    | AssignmentGroupSubmission[]
    | PaginatedResponse<AssignmentGroupSubmission>;
export type AssignmentGroupEvaluationListResponse =
    | AssignmentGroupEvaluation[]
    | PaginatedResponse<AssignmentGroupEvaluation>;

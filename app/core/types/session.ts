import type { PlannedOutcome } from '@/app/core/types/lessonPlans';
import type {
  Assignment,
  IssuePreparedAssignmentPayload,
  IssuePreparedAssignmentResponse,
} from '@/app/core/types/assignments';

export enum SessionType {
  LESSON = 'LESSON',
  PRACTICAL = 'PRACTICAL',
  PROJECT = 'PROJECT',
  EXAM = 'EXAM',
  FIELD_TRIP = 'FIELD_TRIP',
  ASSEMBLY = 'ASSEMBLY',
  OTHER = 'OTHER',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
  SICK = 'SICK',
}

export type SessionScheduleState =
  | 'SCHEDULED_LOCKED'
  | 'SCHEDULED_READY'
  | 'SCHEDULED_OVERDUE'
  | 'SCHEDULED_PAUSED'
  | 'IN_PROGRESS'
  | 'IN_PROGRESS_OVERDUE'
  | 'COMPLETED'
  | 'UNKNOWN';

export type SessionWorkflowStage =
  | 'SCHEDULED'
  | 'ATTENDANCE'
  | 'TAUGHT_OUTCOMES'
  | 'EVIDENCE'
  | 'REFLECTION'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REQUIRES_REVIEW';

export type SessionWorkflowLifecycleStatus =
  | 'SCHEDULED'
  | 'READY_TO_START'
  | 'IN_PROGRESS'
  | 'NEEDS_COMPLETION'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REQUIRES_REVIEW';

export type SessionWorkflowActionOwner = 'INSTRUCTOR' | 'NONE';

export interface SessionWorkflowSummary {
  stage: SessionWorkflowStage;
  stage_label: string;
  message: string;
  missing: string[];
  missing_labels: string[];
  ready_to_close: boolean;
  needs_teacher_action: boolean;
  action_owner: SessionWorkflowActionOwner;
  viewer_can_advance: boolean;
  lifecycle_status: SessionWorkflowLifecycleStatus;
  lifecycle_label: string;
}

export interface SessionViewerActions {
  can_advance_teaching_record: boolean;
  can_submit_admin_request: boolean;
  can_request_reschedule: boolean;
  can_request_cancellation: boolean;
  can_request_attendance_help: boolean;
  can_request_reopen: boolean;
  can_view_supervision: boolean;
}

export interface Session {
  linked_cohorts: SessionCohort[];
  id: number;
  subject_source: 'kernel' | 'cbc' | 'cambridge';
  session_subject_id: number | null;
  cambridge_cohort_subject_id: number | null;
  offering_id: number | null;
  cohort_subject: number | null;
  cohort_id: number;
  cohort_name: string;
  cohort_level: string;
  subject_id: number | null;
  subject_name: string;
  subject_code: string;
  curriculum_type: string;
  curriculum_name: string;
  is_current_year: boolean;
  academic_year_id: number;
  term: number | null;
  term_name: string | null;
  session_type: string;
  session_type_display: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  status: string;
  description: string;
  venue: string;
  created_by: string;
  created_by_id?: number | null;
  created_by_name?: string | null;
  created_by_email?: string | null;
  lesson_plan_id: number | null;
  lesson_plan_title: string | null;
  lesson_plan_status: string | null;
  planned_outcomes: PlannedOutcome[];
  taught_outcomes: PlannedOutcome[];
  is_unplanned: boolean;
  schedule_state: SessionScheduleState;
  is_overdue: boolean;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  can_start_now: boolean;
  can_reschedule?: boolean;
  needs_completion?: boolean;
  start_available_at: string | null;
  start_available_date?: string | null;
  start_available_time?: string | null;
  workflow_summary?: SessionWorkflowSummary | null;
  viewer_actions?: SessionViewerActions | null;
  attendance_count: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    sick: number;
    unmarked: number;
  };
  created_at: string;
}

export type SessionLifecycleReminderType =
  | 'OPEN_LESSON'
  | 'NEEDS_CLOSING'
  | 'UNFINISHED_LESSON';

export interface SessionLifecycleReminder {
  session: Session;
  type: SessionLifecycleReminderType;
  label: string;
  severity: 'info' | 'warning' | 'danger';
}

export type SessionClosureNextStep =
  | 'SCHEDULED'
  | 'ATTENDANCE'
  | 'TAUGHT_OUTCOMES'
  | 'INTERRUPTED'
  | 'EVIDENCE'
  | 'REFLECTION'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REQUIRES_REVIEW';

export interface SessionClosureState {
  ready: boolean;
  next_step: SessionClosureNextStep;
  message: string;
  missing: string[];
  requires_evidence: boolean;
  has_attendance: boolean;
  has_taught_outcomes: boolean;
  has_delivered_outcomes: boolean;
  has_required_evidence: boolean;
  has_reflection: boolean;
  is_interrupted: boolean;
  missing_keys?: string[];
  missing_labels?: string[];
  session_proof_complete?: boolean;
  learner_evidence_ready?: boolean;
  learner_evidence_summary?: FineArtsLearnerEvidenceSummary;
  workflow_summary?: SessionWorkflowSummary;
  viewer_actions?: SessionViewerActions;
}

export interface SessionDetail extends Session {
  attendance_records: AttendanceRecord[];
}

export interface AttendanceRecord {
  id: number;
  session: number;
  session_date: string;
  subject_name: string;
  subject_code: string;
  cohort_name: string;
  student: number;
  student_name: string;
  student_admission: string;
  status: string | null;
  status_display: string;
  notes: string;
  marked_at: string;
  marked_by: string | null;
}

export interface LearnerAttendanceRecord {
  id: number;
  session: number;
  session_date: string;
  student: number;
  status: string | null;
  status_display: string;
  notes: string;
  marked_at: string | null;
}

/** Minimized session detail returned to the authenticated learner. */
export interface LearnerSessionDetail {
  id: number;
  subject_source: string;
  session_subject_id: number | null;
  curriculum_type: string | null;
  cohort_subject: number | null;
  cohort_id: number | null;
  cohort_name: string | null;
  cohort_level: string | null;
  subject_id: number | null;
  subject_name: string | null;
  subject_code: string | null;
  curriculum_name: string | null;
  term: number | null;
  term_name: string | null;
  session_type: string;
  session_type_display: string;
  session_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  description: string;
  venue: string;
  is_unplanned: boolean;
  status: string;
  attendance_records: LearnerAttendanceRecord[];
  created_at: string;
}

export type SessionDetailResponse = SessionDetail | LearnerSessionDetail;

export interface AttendanceRecordUpdatePayload {
  status?: string | null;
  notes?: string;
}

export interface AttendanceSummary {
  present_count: number;
  total_students: number;
  session: Session;
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    sick: number;
    unmarked: number;
    attendance_percentage: number;
  };
}

export interface BulkAttendanceData {
  attendance_records: {
    student_id: number;
    status: string;
    notes?: string;
  }[];
}

export interface BulkAttendanceResponse {
  detail: string;
  session: Session;
  closure_state: SessionClosureState;
}

export interface RescheduleSessionPayload {
  session_date: string;
  start_time: string;
  end_time: string;
  reason?: string;
  venue?: string;
  description?: string;
}

export interface ConfirmTaughtOutcomesPayload {
  outcomes: Array<{
    outcome_id: number;
    status: 'TAUGHT' | 'PARTIALLY_TAUGHT' | 'NOT_TAUGHT';
  }>;
}

export type LessonReflectionSource =
  | 'TAUGHT_OUTCOMES'
  | 'PERFORMANCE_RECORDING'
  | 'SESSION_COMPLETION'
  | 'MANUAL';

export interface RecordLessonReflectionPayload {
  reflection: string;
  source?: LessonReflectionSource;
  evidence_summary?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface RecordLessonReflectionResponse {
  detail: string;
  reflection_id: number;
  lesson_plan_id: number | null;
  reflection: string;
  source: LessonReflectionSource;
}

export interface SessionAssignmentDraftResponse {
  detail: string;
  created: boolean;
  assignment: Assignment;
}

export type SessionIssuePreparedAssignmentPayload = IssuePreparedAssignmentPayload;
export type SessionIssuePreparedAssignmentResponse = IssuePreparedAssignmentResponse;

export type FineArtsEvidenceType =
  | 'PROCESS_JOURNAL'
  | 'RESEARCH_WRITEUP'
  | 'FINISHED_ARTWORK'
  | 'ORAL_PRESENTATION'
  | 'PORTFOLIO_ENTRY'
  | 'EXHIBITION_RECORD'
  | 'TEACHER_FEEDBACK'
  | 'PEER_CRITIQUE'
  | 'SELF_ASSESSMENT'
  | 'SKETCH'
  | 'MATERIAL_EXPERIMENTATION';

export type FineArtsLearnerEvidenceStatus =
  | 'NOT_STARTED'
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'NEEDS_IMPROVEMENT'
  | 'ACCEPTED'
  | 'MISSING';

export interface FineArtsPracticalAssessmentCriterion {
  key: string;
  label: string;
  max_marks: number;
}

export interface FineArtsCourseworkTask {
  id: number;
  task_code: string;
  name: string;
  term_number: number;
  annual_theme: string;
  term_sub_theme: string;
  strand: string;
  sub_strand: string;
  max_score: number;
  assessment_criteria: FineArtsPracticalAssessmentCriterion[];
  required_evidence: string[];
  exhibition_type: 'MINI_EXHIBITION' | 'END_YEAR_EXHIBITION';
  is_active: boolean;
}

export interface FineArtsPracticalRequirement {
  key: string;
  label: string;
  required: boolean;
  recorded: boolean;
  evidence_type: FineArtsEvidenceType;
}

export interface FineArtsPracticalContract {
  id?: number;
  session_id: number;
  resolved: boolean;
  message: string | null;
  coursework_task: FineArtsCourseworkTask | null;
  assessment_criteria: FineArtsPracticalAssessmentCriterion[];
  requirements: FineArtsPracticalRequirement[];
  additional_requirements: FineArtsPracticalRequirement[];
  teacher_feedback: string;
  session_proof_complete?: boolean;
  session_proof_message?: string | null;
  learner_evidence_ready?: boolean;
  learner_evidence_summary?: FineArtsLearnerEvidenceSummary;
  missing_keys: string[];
  missing_labels: string[];
  has_required_evidence: boolean;
  allowed_evidence_types: FineArtsEvidenceType[];
}

export interface FineArtsPracticalEvidencePayload {
  evidence_type: FineArtsEvidenceType;
  recorded?: boolean;
  notes?: string;
  artifact_metadata?: Record<string, unknown>;
}

export interface FineArtsLearnerEvidencePayload extends FineArtsPracticalEvidencePayload {
  learner_id: number;
  status?: FineArtsLearnerEvidenceStatus;
  outcome_ids?: number[];
}

export interface FineArtsLearnerEvidenceAttachment {
  id: number;
  original_name: string;
  original_size: number;
  optimized_size: number;
  mime_type: string;
  stored_format: string;
  width: number | null;
  height: number | null;
  file_hash: string;
  processing_status: 'PROCESSING' | 'READY' | 'FAILED';
  caption: string;
  file_url: string | null;
  thumbnail_url: string | null;
  uploaded_at: string | null;
}

export interface FineArtsLearnerEvidenceOutcomeLink {
  id: number;
  code: string;
  description: string;
}

export interface FineArtsLearnerEvidenceCell {
  id: number | null;
  evidence_type: FineArtsEvidenceType;
  recorded: boolean;
  status: FineArtsLearnerEvidenceStatus;
  notes: string;
  outcome_ids: number[];
  outcomes: FineArtsLearnerEvidenceOutcomeLink[];
  attachments: FineArtsLearnerEvidenceAttachment[];
  attachment_count: number;
  artifact_metadata: Record<string, unknown>;
  recorded_at: string | null;
  updated_at: string | null;
}

export interface FineArtsLearnerProgress {
  recorded: number;
  required: number;
  label: string;
}

export interface FineArtsLearnerEvidenceLearner {
  learner_id: number;
  name: string;
  admission_number: string;
  attendance_status: string | null;
  evidence: Record<string, FineArtsLearnerEvidenceCell>;
  progress: FineArtsLearnerProgress;
}

export interface FineArtsTaughtOutcomeLink {
  outcome_id: number;
  code: string;
  text: string;
  strand: string;
  sub_strand: string;
  status: string;
}

export interface FineArtsLearnerEvidenceGap {
  learner_id: number;
  name: string;
  admission_number: string;
  evidence_type?: FineArtsEvidenceType;
}

export interface FineArtsLearnerEvidenceSummary {
  learners_total?: number;
  learners_with_required_evidence?: number;
  required_cells_total?: number;
  required_cells_recorded?: number;
  present_learners_total: number;
  present_learners_with_evidence: number;
  missing_required_evidence_types: FineArtsEvidenceType[];
  missing_learners: FineArtsLearnerEvidenceGap[];
  entries_missing_outcome_links: FineArtsLearnerEvidenceGap[];
  missing_attendance?: FineArtsLearnerEvidenceGap[];
  policy?: string;
  ready?: boolean;
  message?: string | null;
  missing_keys?: string[];
  missing_labels?: string[];
}

export type FineArtsWorksheetScope = 'present' | 'all';

export type FineArtsWorksheetNextAction =
  | 'mark_attendance'
  | 'resolve_practical'
  | 'retry';

export interface FineArtsWorksheetError {
  code:
    | 'attendance_required'
    | 'no_present_learners'
    | 'workflow_not_resolved'
    | 'permission_denied';
  message: string;
  next_action: FineArtsWorksheetNextAction;
}

export interface FineArtsLearnerEvidenceMatrix {
  session_id: number;
  resolved: boolean;
  requires_attendance?: boolean;
  scope?: FineArtsWorksheetScope;
  message: string | null;
  coursework_task: FineArtsCourseworkTask | null;
  taught_outcomes: FineArtsTaughtOutcomeLink[];
  evidence_types: FineArtsEvidenceType[];
  required_evidence_types?: FineArtsEvidenceType[];
  learners: FineArtsLearnerEvidenceLearner[];
  summary: FineArtsLearnerEvidenceSummary;
  error?: FineArtsWorksheetError | null;
}

export interface SessionPracticalContext {
  family: 'FINE_ARTS' | 'MUSIC';
  coursework_task_id?: number;
  task_code?: string;
  task_title?: string;
  task_context?: string;
}

export type PracticalProfileKey = 'FINE_ARTS' | 'MUSIC';
export type PracticalProfileFamily = 'FINE_ARTS' | 'MUSIC';

export interface PracticalProfileSummary {
  key: PracticalProfileKey;
  family: PracticalProfileFamily;
  label: string;
  workflow_href: string;
  contract_href: string;
  resolve_href: string;
  learner_evidence_href: string;
  attachment_href_template: string;
  actor_can_record: boolean;
  read_only_message: string | null;
}

export interface PracticalProfileResponse {
  session_id: number;
  is_cbc_practical: boolean;
  profile: PracticalProfileSummary | null;
  contract: FineArtsPracticalContract | MusicPracticalContract | null;
}

export type MusicEvidenceType =
  | 'REHEARSAL_LOG'
  | 'PERFORMANCE_RECORDING'
  | 'VOCAL_TECHNIQUE'
  | 'INSTRUMENTAL_TECHNIQUE'
  | 'RHYTHM_ACCURACY'
  | 'PITCH_ACCURACY'
  | 'EXPRESSION_INTERPRETATION'
  | 'ENSEMBLE_PARTICIPATION'
  | 'COMPOSITION_OR_ARRANGEMENT'
  | 'NOTATION_OR_SCORE'
  | 'LISTENING_RESPONSE'
  | 'SELF_ASSESSMENT'
  | 'PEER_FEEDBACK'
  | 'TEACHER_OBSERVATION'
  | 'PORTFOLIO_ENTRY';

export type MusicEvidenceCategory =
  | 'performance'
  | 'technique'
  | 'rhythm_pitch'
  | 'expression'
  | 'notation'
  | 'reflection';

export type MusicPracticalEvidenceStatus =
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'NEEDS_IMPROVEMENT'
  | 'ACCEPTED'
  | 'MISSING';

export interface MusicMatrixColumn {
  key: MusicEvidenceCategory;
  label: string;
}

export interface MusicPracticalAttachmentSupport {
  accepted_extensions: string[];
  accepted_labels: string[];
}

export interface MusicPracticalEvidenceOutcomeLink {
  id: number;
  code: string;
  description: string;
}

export interface MusicPracticalEvidenceAttachment {
  id: number;
  original_name: string;
  original_size: number;
  mime_type: string;
  stored_format: string;
  file_hash: string;
  processing_status: 'PROCESSING' | 'READY' | 'FAILED';
  caption: string;
  file_url: string | null;
  uploaded_at: string | null;
}

export interface MusicTaughtOutcomeLink {
  outcome_id: number;
  code: string;
  text: string;
  strand: string;
  sub_strand: string;
  status: string;
}

export interface MusicPracticalEvidenceEntry {
  id: number;
  learner_id: number;
  evidence_type: MusicEvidenceType;
  category: MusicEvidenceCategory;
  recorded: boolean;
  status: MusicPracticalEvidenceStatus;
  notes: string;
  outcome_ids: number[];
  outcomes: MusicPracticalEvidenceOutcomeLink[];
  attachments: MusicPracticalEvidenceAttachment[];
  attachment_count: number;
  artifact_metadata: Record<string, unknown>;
  recorded_at: string | null;
  updated_at: string | null;
}

export interface MusicPracticalLearnerCoverage {
  performance: boolean;
  technique: boolean;
  rhythm_pitch: boolean;
  expression: boolean;
  notation: boolean;
  reflection: boolean;
}

export interface MusicPracticalLearnerRow {
  learner_id: number;
  name: string;
  admission_number: string;
  attendance_status: string | null;
  total_recorded_entries: number;
  has_linked_evidence: boolean;
  coverage: MusicPracticalLearnerCoverage;
  evidence_entries: MusicPracticalEvidenceEntry[];
}

export interface MusicPracticalGap {
  learner_id: number;
  name: string;
  admission_number: string;
  evidence_type?: MusicEvidenceType;
}

export interface MusicPracticalLearnerSummary {
  policy?: string;
  ready?: boolean;
  message?: string | null;
  present_learners_total: number;
  present_learners_with_evidence: number;
  missing_required_evidence_types: MusicEvidenceType[];
  missing_learners: MusicPracticalGap[];
  entries_missing_outcome_links: MusicPracticalGap[];
  missing_attendance?: MusicPracticalGap[];
  missing_keys?: string[];
  missing_labels?: string[];
}

export interface MusicPracticalContract {
  id: number | null;
  session_id: number;
  profile_key: 'MUSIC';
  family: 'MUSIC';
  resolved: boolean;
  message: string | null;
  practical_task_title: string;
  practical_task_context: string;
  session_proof_complete: boolean;
  session_proof_message: string | null;
  learner_evidence_ready: boolean;
  learner_evidence_summary: MusicPracticalLearnerSummary;
  has_required_evidence: boolean;
  missing_keys: string[];
  missing_labels: string[];
  allowed_evidence_types: MusicEvidenceType[];
  matrix_columns: MusicMatrixColumn[];
  attachment_support: MusicPracticalAttachmentSupport;
}

export type MusicWorksheetNextAction =
  | 'mark_attendance'
  | 'resolve_practical'
  | 'retry';

export interface MusicWorksheetError {
  code:
    | 'attendance_required'
    | 'no_present_learners'
    | 'workflow_not_resolved'
    | 'permission_denied';
  message: string;
  next_action: MusicWorksheetNextAction;
}

export interface MusicPracticalLearnerEvidenceMatrix {
  session_id: number;
  resolved: boolean;
  requires_attendance: boolean;
  scope: FineArtsWorksheetScope;
  message: string | null;
  practical_task_title: string;
  practical_task_context: string;
  taught_outcomes: MusicTaughtOutcomeLink[];
  evidence_types: MusicEvidenceType[];
  matrix_columns: MusicMatrixColumn[];
  learners: MusicPracticalLearnerRow[];
  summary: MusicPracticalLearnerSummary;
  error: MusicWorksheetError | null;
}

export interface MusicPracticalResolvePayload {
  task_title?: string;
  task_context?: string;
}

export interface MusicPracticalLearnerEvidencePayload {
  learner_id: number;
  evidence_type: MusicEvidenceType;
  recorded?: boolean;
  status?: MusicPracticalEvidenceStatus;
  notes?: string;
  outcome_ids?: number[];
  artifact_metadata?: Record<string, unknown>;
}

export interface SessionFormData {
  cohort_subject: number | null;
  subject_source?: 'kernel' | 'cbc' | 'cambridge';
  subject_id?: number | null;
  term: number | null;
  session_type: string;
  session_date: string;
  start_time: string;
  end_time: string;
  title: string;
  description: string;
  venue: string;
  auto_create_attendance: boolean;
  is_unplanned?: boolean;
  practical_context?: SessionPracticalContext;
}

export interface CohortSubjectOption {
  source: 'kernel' | 'cbc' | 'cambridge';
  id: string;
  label: string;
  subject_name?: string | null;
  subject_id?: number | null;
  teaching_link_id?: number | null;
  cbc_cohort_subject_id?: number | null;
  cambridge_cohort_subject_id?: number | null;
  subject_code: string | null;
  programme: string | null;
  curriculum_version: string | null;
  plugin: string | null;
  cohort_subject_id?: number | null;
  offering_id?: number | null;
  session_supported: boolean;
  disabled_reason?: string | null;
}

export interface AttendanceFormData {
  session: number;
  student: number;
  status: string;
  notes: string;
}

export interface SessionCohort {
  is_active: boolean;
  id: number;
  session: number;
  cohort: number;
  cohort_subject_id?: number | null;
  cohort_name: string;
  cohort_level: string;
  learner_count?: number | null;
  is_primary?: boolean;
  linked_at?: string | null;
  unlinked_at?: string | null;
  created_at: string;
}

export interface LinkCohortRequest {
  cohort_id?: number;
  cohort_subject_id?: number;
}

export interface AvailableSessionCohortSubject {
  cohort_subject_id: number;
  cohort_id: number;
  cohort_name: string;
  cohort_level: string;
  academic_year: string | null;
  subject_id: number;
  subject_name: string;
  learner_count: number;
}

export interface AvailableSessionCohortSubjectsResponse {
  session_id: number;
  source_cohort_subject: number | null;
  subject: number | null;
  subject_name: string | null;
  results: AvailableSessionCohortSubject[];
}

export interface SessionCohortsResponse {
  session_id: number;
  cohorts: SessionCohort[];
  active_cohorts?: SessionCohort[];
  historical_cohorts?: SessionCohort[];
  total_learners: number;
  total_participating_learners?: number;
}

export interface SessionWithCohorts {
  id: number;
  cohort_subject: number | null;
  session_type: string;
  session_date: string;
  start_time: string;
  end_time: string;
  title: string;
  description: string;
  venue: string;
  linked_cohorts: SessionCohort[];
  total_learners: number;
  total_participating_learners?: number;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  sick: number;
  unmarked: number;
  attendancePercentage: number;
}

export interface StudentAttendanceHistory {
  statistics?: {
    total: number;
    present: number;
    absent: number;
    late: number;
    attendance_percentage: number;
  };
  [key: string]: unknown;
}

export interface CohortAttendanceSummary {
  [key: string]: unknown;
}

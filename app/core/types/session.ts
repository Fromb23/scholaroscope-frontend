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
  | 'IN_PROGRESS'
  | 'IN_PROGRESS_OVERDUE'
  | 'COMPLETED'
  | 'UNKNOWN';

export interface Session {
  linked_cohorts: SessionCohort[];
  id: number;
  subject_source: 'kernel' | 'cambridge';
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
  | 'ATTENDANCE'
  | 'TAUGHT_OUTCOMES'
  | 'EVIDENCE'
  | 'REFLECTION'
  | 'READY';

export interface SessionClosureState {
  ready: boolean;
  next_step: SessionClosureNextStep;
  message: string;
  missing: string[];
  requires_evidence: boolean;
  has_attendance: boolean;
  has_taught_outcomes: boolean;
  has_required_evidence: boolean;
  has_reflection: boolean;
  missing_keys?: string[];
  missing_labels?: string[];
  session_proof_complete?: boolean;
  learner_evidence_ready?: boolean;
  learner_evidence_summary?: FineArtsLearnerEvidenceSummary;
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
  marked_by?: string;
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
  family: 'FINE_ARTS';
  coursework_task_id?: number;
  task_code?: string;
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

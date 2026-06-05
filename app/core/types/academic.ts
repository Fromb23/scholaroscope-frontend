// ============================================================================
// app/types/academic.ts - Updated Academic Types
// ============================================================================

import type { StudentSummary } from './student';
import type {
  CbcCohortProfileSummary,
  CbcSubjectCategory,
} from '../../plugins/cbc/types/pathways';

export interface ListQueryParams {
  organization?: number;
  is_active?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

// Academic Year
export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  terms_count: number;
  cohorts_count: number;
  created_at: string;
  updated_at: string;
}

// Term
export interface Term {
  id: number;
  academic_year: number;
  academic_year_name: string;
  name: string;
  sequence: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export const CURRICULUM_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Select curriculum type' },
  { value: '8-4-4', label: '8-4-4' },
  { value: 'CBE', label: 'CBE' },
  { value: 'CAMBRIDGE', label: 'Cambridge' },
];

export type CurriculumType = typeof CURRICULUM_TYPE_OPTIONS[number]['value'];

export type CurriculumOfferingStatus =
  | 'ACTIVE'
  | 'DISABLE_REQUESTED'
  | 'DRAINING'
  | 'FINALIZING'
  | 'DISABLED'
  | 'REACTIVATING'
  | 'FAILED';

export type CurriculumDisableRequestStatus =
  | 'PENDING'
  | 'DRAINING'
  | 'WAITING_DUE_DATES'
  | 'FINALIZING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type CurriculumDisableMode = 'GRACEFUL' | 'FORCE';

export interface Curriculum {
  id: number;
  name: string;
  curriculum_type: CurriculumType;
  curriculum_type_display: string;
  description: string;
  is_active: boolean;
  offering_status: CurriculumOfferingStatus;
  offering_status_display: string;
  subjects_count: number;
  cohorts_count: number;
  created_at: string;
}

export interface CurriculumDisableAcademicSetupImpact {
  cohort_count?: number;
  cohort_ids?: number[];
  subject_count?: number;
  subject_ids?: number[];
  cohort_subject_count?: number;
  cohort_subject_ids?: number[];
  active_cohort_instructor_count?: number;
  active_cohort_subject_instructor_count?: number;
}

export interface CurriculumDisableSessionImpact {
  in_progress_count?: number;
  in_progress_ids?: number[];
  scheduled_future_count?: number;
  scheduled_future_ids?: number[];
  scheduled_total_count?: number;
  scheduled_total_ids?: number[];
  requiring_completion_count?: number;
  requiring_completion_ids?: number[];
  incomplete_attendance_count?: number;
  incomplete_attendance_ids?: number[];
  taught_outcomes_pending_count?: number;
  taught_outcomes_pending_ids?: number[];
  completed_count?: number;
  completed_ids?: number[];
}

export interface CurriculumDisableLessonPlanImpact {
  draft_count?: number;
  draft_ids?: number[];
  reviewed_ready_count?: number;
  reviewed_ready_ids?: number[];
  scheduled_unused_count?: number;
  scheduled_unused_ids?: number[];
  used_count?: number;
  used_ids?: number[];
}

export interface CurriculumDisableAssessmentImpact {
  draft_count?: number;
  draft_ids?: number[];
  active_open_count?: number;
  active_open_ids?: number[];
  future_due_count?: number;
  future_due_ids?: number[];
  past_due_not_finalized_count?: number;
  past_due_not_finalized_ids?: number[];
  partial_scores_count?: number;
  partial_score_assessment_ids?: number[];
  finalized_count?: number;
  finalized_ids?: number[];
}

export interface CurriculumDisableReportingImpact {
  active_policy_count?: number;
  active_policy_ids?: number[];
  grade_summaries_stale_count?: number;
  attendance_summaries_stale_count?: number;
  computed_grade_count?: number;
}

export interface CurriculumDisableAffectedUser {
  user_id: number;
  email: string;
  full_name: string;
}

export interface CurriculumDisableAffectedInstructor extends CurriculumDisableAffectedUser {
  cohort_ids?: number[];
  cohort_names?: string[];
  cohort_subject_ids?: number[];
  subject_ids?: number[];
  subject_codes?: string[];
  subject_names?: string[];
  session_count?: number;
  assessment_count?: number;
}

export interface CurriculumDisableUserImpact {
  affected_admins?: CurriculumDisableAffectedUser[];
  affected_instructors?: CurriculumDisableAffectedInstructor[];
}

export interface CurriculumDisableBlockingImpact {
  session_ids?: number[];
  assessment_ids?: number[];
  safe_to_finalize_gracefully?: boolean;
}

export interface CurriculumDisableImpactSnapshot {
  curriculum_id: number;
  curriculum_name: string;
  curriculum_type: string;
  offering_status: CurriculumOfferingStatus;
  is_active: boolean;
  snapshot_taken_at: string;
  recommended_finalize_after?: string | null;
  academic_setup?: CurriculumDisableAcademicSetupImpact;
  sessions?: CurriculumDisableSessionImpact;
  lesson_plans?: CurriculumDisableLessonPlanImpact;
  assessments?: CurriculumDisableAssessmentImpact;
  reporting?: CurriculumDisableReportingImpact;
  users?: CurriculumDisableUserImpact;
  blocking?: CurriculumDisableBlockingImpact;
}

export interface CurriculumDisableFinalizationClosureSummary {
  curriculum_id?: number;
  curriculum_name?: string;
  mode?: CurriculumDisableMode;
  finalized_at?: string;
  historical_read_only?: boolean;
}

export interface CurriculumDisableFinalizationCohortSnapshot {
  id: number;
  name: string;
  subject_count: number;
  learner_count: number;
}

export interface CurriculumDisableFinalizationSubjectSnapshot {
  id: number;
  code: string;
  name: string;
  cohort_count: number;
}

export interface CurriculumDisableFinalizationSessionsSnapshot {
  completed_in_progress_count?: number;
  completed_in_progress_ids?: number[];
  cancelled_scheduled_count?: number;
  cancelled_scheduled_ids?: number[];
}

export interface CurriculumDisableFinalizationLessonPlansSnapshot {
  archived_lesson_plan_count?: number;
  archived_lesson_plan_ids?: number[];
}

export interface CurriculumDisableFinalizationAssessmentsSnapshot {
  finalized_open_assessment_count?: number;
  finalized_open_assessment_ids?: number[];
  partial_score_assessment_ids?: number[];
  partial_score_assessment_count?: number;
}

export interface CurriculumDisableFinalizationReportingSnapshot {
  attendance_summary_count?: number;
  grade_summary_count?: number;
  cohort_summary_count?: number;
  subject_summary_count?: number;
  assessment_type_summary_count?: number;
  computed_grade_count?: number;
  stale_grade_summary_count?: number;
  stale_attendance_summary_count?: number;
  policy_count?: number;
}

export interface CurriculumDisableFinalizationLearnerSnapshot {
  active_cohort_enrollment_count?: number;
  active_subject_enrollment_count?: number;
}

export interface CurriculumDisableFinalizationNotificationSnapshot {
  admins_sent?: string[];
  instructors_sent?: string[];
}

export interface CurriculumDisableFinalizationSnapshot {
  impact_snapshot?: CurriculumDisableImpactSnapshot;
  closure_summary?: CurriculumDisableFinalizationClosureSummary;
  cohorts?: CurriculumDisableFinalizationCohortSnapshot[];
  subjects?: CurriculumDisableFinalizationSubjectSnapshot[];
  sessions?: CurriculumDisableFinalizationSessionsSnapshot;
  lesson_plans?: CurriculumDisableFinalizationLessonPlansSnapshot;
  assessments?: CurriculumDisableFinalizationAssessmentsSnapshot;
  reporting?: CurriculumDisableFinalizationReportingSnapshot;
  learners?: CurriculumDisableFinalizationLearnerSnapshot;
  instructors?: CurriculumDisableAffectedInstructor[];
  notifications?: CurriculumDisableFinalizationNotificationSnapshot;
}

export interface CurriculumDisableRequest {
  id: number;
  organization: number;
  curriculum: number;
  curriculum_name: string;
  curriculum_type: string;
  curriculum_offering_status: CurriculumOfferingStatus;
  installed_plugin_id: number | null;
  requested_by: number | null;
  requested_by_email: string | null;
  mode: CurriculumDisableMode;
  status: CurriculumDisableRequestStatus;
  requested_at: string;
  confirmed_at: string | null;
  drain_started_at: string | null;
  finalize_after: string | null;
  finalized_at: string | null;
  cancelled_at: string | null;
  failed_at: string | null;
  failure_reason: string;
  impact_snapshot: CurriculumDisableImpactSnapshot;
  finalization_snapshot: CurriculumDisableFinalizationSnapshot;
  admin_notification_sent_at: string | null;
  instructor_notifications_sent_at: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface CurriculumDisableImpactResponse {
  curriculum_id: number;
  offering_status: CurriculumOfferingStatus;
  active_disable_request_id: number | null;
  impact_snapshot: CurriculumDisableImpactSnapshot;
}

export interface RequestCurriculumDisablePayload {
  mode: CurriculumDisableMode;
  confirm?: boolean;
  finalize_after?: string | null;
}

export interface RequestCurriculumDisableResponse {
  created: boolean;
  request: CurriculumDisableRequest;
  impact_snapshot: CurriculumDisableImpactSnapshot;
}

export interface CurriculumDisableRequestTransitionPayload {
  finalize_after?: string | null;
}

// Subject
export interface Subject {
  id: number;
  curriculum: number;
  curriculum_name: string;
  curriculum_type: CurriculumType;
  code: string;
  name: string;
  level: string;
  description: string;
  created_at: string;
}

export interface SubjectDetail extends Subject {
  teachers: Array<Record<string, unknown>>;
  cohorts_offering: {
    cohort_id: number;
    cohort_name: string;
    is_compulsory: boolean;
    cohort_subject_id?: number | null;
    academic_year_name?: string | null;
    learner_count?: number | null;
    available_count?: number | null;
  }[];
}

// Cohort
export interface Cohort {
  id: number;
  name: string;
  curriculum: number;
  curriculum_name: string;
  curriculum_type: CurriculumType;
  academic_year: number;
  academic_year_name: string;
  level: string;
  stream?: string;
  students_count: number;
  subjects_count: number;
  is_current_year: boolean;
  cbc_profile?: CbcCohortProfileSummary | null;
  created_at: string;
}

export interface CohortSubject {
  id: number;
  cohort: number;
  cohort_id?: number;
  cohort_name: string;
  cohort_level: string;
  subject: number;
  subject_id?: number;
  subject_name: string;
  subject_code: string;
  curriculum_name: string;
  curriculum_type: CurriculumType;
  is_compulsory: boolean;
  subject_source?: string | null;
  teaching_link_id?: number | null;
  cbc_cohort_subject_id?: number | null;
  subject_profile_id?: number | null;
  subject_category?: CbcSubjectCategory;
  locked?: boolean;
  blocked_reason?: string | null;

  has_active_instructor?: boolean;
  active_instructor?: {
    user_id: number;
    full_name: string;
    email: string;
    assigned_at: string;
  } | null;
  current_instructor_id?: number | null;
  current_instructor_name?: string | null;
}

export interface CohortSubjectLearnerCounts {
  enrolled: number;
  available: number;
  cohort_total: number;
}

export interface CohortSubjectLearnerListResponse {
  cohort_subject_id: number;
  cohort_id: number;
  subject_id: number;
  subject_name: string;
  counts: CohortSubjectLearnerCounts;
  enrolled: StudentSummary[];
  available: StudentSummary[];
}

export interface BulkSubjectEnrollResponse {
  cohort_subject_id: number;
  created: number;
  reactivated: number;
  already_active: number;
  rejected: number;
  processed: number;
}

export interface BulkSubjectUnenrollResponse {
  cohort_subject_id: number;
  deactivated: number;
  already_inactive: number;
  missing: number;
  processed: number;
}

export interface CohortDetail extends Cohort {
  subjects: CohortSubject[];
}

// Form Data Types
export interface AcademicYearFormData {
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface TermFormData {
  academic_year: number;
  name: string;
  sequence: number;
  start_date: string;
  end_date: string;
}

export interface CurriculumFormData {
  name: string;
  curriculum_type: CurriculumType;
  description: string;
  is_active: boolean;
}

export interface SubjectFormData {
  curriculum: number;
  code: string;
  name: string;
  level: string;
  description: string;
}

export interface CohortFormData {
  name: string;
  curriculum: number;
  academic_year: number;
  level: string;
  stream?: string;
  subjects?: Array<{
    subject_id: number;
    is_compulsory: boolean;
  }>;
}

export interface CohortSubjectFormData {
  subject_id: number;
  is_compulsory: boolean;
}

export interface TermQueryParams {
  academic_year?: number
  organization?: number
}

export interface InstructorCohortAccessAssignment {
  cohort_id: number;
  cohort_name: string;
  curriculum_id?: number | null;
  curriculum_name: string;
  curriculum_type: string;
  academic_year?: string | null;
  academic_year_id?: number | null;
  academic_year_name?: string | null;
  level?: string | null;
  stream?: string | null;
  students_count?: number | null;
  subjects_count?: number | null;
  is_current_year: boolean;
}

export interface TeachingAssignment {
  source?: string | null;
  subject_source?: string | null;
  teaching_link_id?: number | null;
  cohort_subject_id?: number | null;
  cbc_cohort_subject_id?: number | null;
  cambridge_cohort_subject_id?: number | null;
  cohort_id: number;
  cohort_name: string;
  subject_id: number;
  assigned?: boolean;
  subject_name: string;
  subject_code?: string | null;
  curriculum_id?: number | null;
  curriculum_name?: string | null;
  level: string;
  stream?: string | null;
  academic_year: string;
  academic_year_id?: number | null;
  academic_year_name?: string | null;
  is_current_year: boolean;
  curriculum_type: string;
  covered: number;
  total: number;
  start_date: string;
  percentage: number;
  offering_id?: number | null;
}

export interface TeachingCohortSubjectSummary {
  teaching_key: string;
  subject_id: number;
  subject_name: string;
  subject_code?: string | null;
}

export interface TeachingCohortSummary {
  cohort_id: number;
  cohort_name: string;
  level?: string | null;
  curriculum_type?: string | null;
  subject_count: number;
  subjects: TeachingCohortSubjectSummary[];
}

export interface SyllabusProgress {
  cohort_id: number;
  cohort_name: string;
  academic_year: string;
  subjects: SubjectProgress[];
  overall: { covered: number; total: number; percentage: number };
}

export interface SubjectProgress {
  cohort_subject_id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  level: string;
  covered: number;
  total: number;
  percentage: number;
}

export interface HistoryEntry {
  log_id: number;
  cohort_subject_id: number;
  cohort_name: string;
  subject_name: string;
  subject_code: string;
  academic_year: string;
  organization_id: number;
  organization_name: string;
  assigned_at: string;
  unassigned_at: string | null;
  is_active: boolean;
  duration_days: number;
  end_reason: string | null;
  assigned_by: string | null;
  unassigned_by: string | null;
}

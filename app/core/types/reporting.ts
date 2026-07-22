import { ComputedGradeDTO } from './gradePolicy';

export type ReportingSource =
  | 'generic'
  | 'cbc'
  | 'cambridge_pending'
  | 'unsupported';

export type PerformanceSource =
  | 'generic'
  | 'cbc'
  | 'unsupported';

export type CbcCode =
  | 'EE1'
  | 'EE2'
  | 'ME1'
  | 'ME2'
  | 'AE1'
  | 'AE2'
  | 'BE1'
  | 'BE2';

export interface CbcDistributionByCode {
  EE1: number;
  EE2: number;
  ME1: number;
  ME2: number;
  AE1: number;
  AE2: number;
  BE1: number;
  BE2: number;
}

export interface CbcResultCounts {
  FINAL: number;
  NOT_IN_SCOPE?: number;
  NO_EVIDENCE?: number;
  LATE_ENTRY_BASELINE_PENDING?: number;
  PROVISIONAL_EVIDENCE?: number;
  PROVISIONAL: number;
  INCOMPLETE: number;
  stale_count: number;
  FINAL_percentage?: number;
  PROVISIONAL_percentage?: number;
  NO_EVIDENCE_percentage?: number;
}

export interface CbcCompetencyDistributionBucket {
  count: number;
  percentage: number;
}

export interface CbcCompetencyDistribution {
  EE: CbcCompetencyDistributionBucket;
  ME: CbcCompetencyDistributionBucket;
  AE: CbcCompetencyDistributionBucket;
  BE: CbcCompetencyDistributionBucket;
  [key: string]: CbcCompetencyDistributionBucket;
}

export interface CbcWeightedAssessmentDetail {
  label: string;
  total_results: number;
  final_count: number;
  stale_count: number;
  average_weighted_score: number | null;
  average_points: number | null;
  distribution_by_code: CbcDistributionByCode;
}

export interface TermParticipation {
  status: string;
  effective_from: string | null;
  effective_to: string | null;
  in_scope: boolean;
  reason: string | null;
  message: string;
  overlap_start?: string | null;
  overlap_end?: string | null;
}

export interface AttendanceSummary {
  id: number;
  student: number;
  student_name: string;
  student_admission: string;
  term: number;
  term_name: string;
  cohort_id?: number | null;
  cohort_subject: number;
  subject_id?: number | null;
  cohort_name: string;
  subject_name: string;
  subject_code: string;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_percentage: number;
  last_updated: string;
}

// Legacy generic numeric summary. Keep for compatibility with generic-only
// endpoints and longitudinal views.
export interface GradeSummary {
  id: number;
  student: number;
  student_name: string;
  student_admission: string;
  term: number;
  term_name: string;
  cohort_subject: number;
  cohort_name: string;
  subject_name: string;
  subject_code: string;
  total_assessments: number;
  average_score: number | null;
  weighted_average: number | null;
  final_grade: string;
  cat_average: number | null;
  exam_average: number | null;
  project_average: number | null;
  is_stale: boolean;
  last_updated: string;
}

// Legacy generic cohort snapshot.
export interface CohortSummary {
  id: number;
  cohort: number;
  cohort_name: string;
  cohort_level: string;
  term: number;
  term_name: string;
  academic_year: string;
  total_students: number;
  average_grade: number | null;
  average_attendance: number | null;
  grade_a_count: number;
  grade_b_count: number;
  grade_c_count: number;
  grade_d_count: number;
  grade_e_count: number;
  last_updated: string;
}

export interface ReportOrganization {
  id: number;
  name: string;
}

export interface AcademicYearInfo {
  id: number;
  name: string;
}

export interface StudentInfo {
  id: number;
  name: string;
  admission_number: string;
  cohort: string | null;
  cohort_id?: number | null;
  level: string | null;
}

export interface TermInfo {
  id: number;
  name: string;
  academic_year: string;
  academic_year_id?: number | null;
}

export interface ReportAssignedInstructor {
  id: number;
  name: string;
  email: string;
}

export interface ReportCohortInfo {
  id: number;
  name: string;
  level: string;
  academic_year: string;
  academic_year_id: number;
  curriculum: string;
  curriculum_id: number;
}

export interface ReportSubjectInfo {
  id: number;
  name: string;
  code: string;
  curriculum_id: number;
}

export interface ReportCohortSubjectRef {
  id: number;
  cohort_id: number;
  cohort_name?: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
}

export interface ReportAssessmentTypeBreakdown {
  assessment_type: string;
  cohort_subjects?: number;
  average_score: number | null;
  total_assessments: number;
}

export interface GenericPerformanceSummary {
  average_score: number | null;
  computed_count: number;
  distribution_by_letter: Record<string, number>;
  grade_status_counts: Record<string, number>;
}

export interface GenericPerformance extends GenericPerformanceSummary {
  highest_score: number | null;
  lowest_score: number | null;
  assessment_type_breakdown?: ReportAssessmentTypeBreakdown[];
}

export interface CbcPerformanceSummary {
  learner_count: number;
  result_counts: CbcResultCounts;
  distribution_by_code: CbcDistributionByCode;
  competency_distribution?: CbcCompetencyDistribution;
  distribution_by_level?: CbcCompetencyDistribution;
  evidence_coverage?: Record<string, unknown>;
  learning_outcome_coverage?: Record<string, number>;
  learners_needing_support?: number;
  learners_exceeding_expectations?: number;
  evidence_source_distribution?: Record<string, number>;
  review_state?: Record<string, number>;
  weighted_assessment_detail?: CbcWeightedAssessmentDetail | null;
  average_weighted_score?: number | null;
  average_points?: number | null;
  missing_result_count: number;
  note?: string | null;
}

export type CbcPerformance = CbcPerformanceSummary;

export interface AssessmentCompletion {
  total_assessments: number;
  finalized_assessments: number;
  draft_assessments: number;
  active_assessments: number;
  missing_scores_count: number;
  completed_scores?: number;
}

export type ReportAssessmentCompletion = AssessmentCompletion;

export interface ReportAssessmentItem {
  id: number;
  name: string;
  assessment_type: string;
  status: string;
  assessment_date: string | null;
}

export interface ReportSessionItem {
  id: number;
  title: string;
  session_date: string | null;
  status: string;
}

export interface ReportSessionSummary {
  total_sessions: number;
  completed_sessions?: number;
  scheduled_sessions?: number;
  in_progress_sessions?: number;
  pending_sessions?: number;
  cancelled_sessions?: number;
  attendance_marked?: number;
  attendance_expected?: number;
  attendance_completeness?: number | null;
  taught_outcomes_confirmed_sessions?: number;
  sessions_attended?: number;
  present_count?: number;
  absent_count?: number;
  late_count?: number;
  excused_count?: number;
}

export interface ReportAssignmentSummary {
  total_assignments: number;
  draft_assignments: number;
  published_assignments: number;
  closed_assignments: number;
  archived_assignments: number;
  assigned_recipients: number;
  submitted_recipients: number;
  reviewed_recipients: number;
  missing_recipients: number;
  excused_recipients: number;
}

export interface LearnerAssignmentReportQueryParams {
  cohortSubjectId?: number | null;
}

export interface LearnerAssignmentReportRow {
  assignment_id: number;
  assignment_title: string;
  instructions?: string;
  delivery_mode: 'INDIVIDUAL' | 'GROUP';
  evaluation_type: string;
  total_marks: number | null;
  due_at: string | null;
  starts_at: string | null;
  assignment_status: string;
  term_id: number | null;
  term_name: string | null;
  cohort_subject_id: number;
  cohort_id: number;
  cohort_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  recipient_status: string | null;
  submission_id: number | null;
  submitted_at: string | null;
  response_note: string;
  attachment_metadata: unknown[];
  submission_status: string | null;
  evaluation_id: number | null;
  evaluation_value: string | null;
  numeric_score: number | null;
  rubric_level_id: number | null;
  rubric_level_code: string | null;
  rubric_level_label: string | null;
  narrative: string;
  feedback: string;
  competency_state: string | null;
  evidence_created: boolean | null;
  evidence_status: string | null;
  evidence_warning: string;
  evaluated_at: string | null;
  projection_mode: string | null;
  group_id: number | null;
  group_name: string | null;
  group_member_id: number | null;
  group_member_participation_status: string | null;
  group_member_participation_note: string;
  group_member_override: Record<string, unknown> | null;
  group_members: Array<Record<string, unknown>>;
}

export interface LearnerAssignmentReportPayload {
  report_type: 'learner_assignment';
  generated_at: string;
  learner: StudentInfo;
  context: {
    cohort_subject_id: number | null;
    cohort_id: number | null;
    cohort_name: string | null;
    subject_id: number | null;
    subject_name: string | null;
    subject_code: string | null;
  };
  summary: {
    assignment_count: number;
    submitted_count: number;
    reviewed_count: number;
    status_counts: Record<string, number>;
  };
  assignment_rows: LearnerAssignmentReportRow[];
  available_filters: {
    cohort_subjects: Array<{
      cohort_subject_id: number;
      cohort_id: number;
      cohort_name: string;
      subject_id: number;
      subject_name: string;
      subject_code: string;
    }>;
  };
  visibility: {
    scope: 'admin' | 'instructor';
    can_compare_subjects: boolean;
  };
}

export interface ReportAverageSummary {
  average: number | null;
  records: number;
}

export interface ReportCoverage {
  [key: string]: unknown;
}

export interface ReportPluginSectionSummary {
  [key: string]: unknown;
}

export interface ReportPluginSectionMeta {
  key: string;
  label: string;
  scope: string;
  reporting_source: ReportingSource;
  curriculum_type: string | null;
  available: boolean;
  summary?: ReportPluginSectionSummary | null;
}

export interface ReportCompositionMeta {
  hierarchy_level: string;
  reporting_source: string;
  available_sections: string[];
  plugin_sections: ReportPluginSectionMeta[];
  curriculum_types?: string[];
}

export interface GenericStudentSection {
  final_score?: number | null;
  average_score?: number | null;
  weighted_average?: number | null;
  letter_grade?: string | null;
  letter_label?: string | null;
  grade_status?: string | null;
  position?: number | null;
  total_in_class?: number | null;
  policy_name?: string | null;
  component_scores?: Record<string, number | string | null> | null;
  computed_at?: string | null;
  note?: string | null;
  computed_grade?: (ComputedGradeDTO & {
    position?: number | null;
    total_in_class?: number | null;
  }) | null;
  grade_summary?: ReportGradeSummaryPreview | null;
}

export interface CbcStudentResult {
  weighted_score: number | null;
  cbc_level: string | null;
  cbc_code: string | null;
  cbc_label: string | null;
  cbc_points: number | null;
  result_status: string | null;
  missing_components: string[];
  component_scores: Record<string, number | string | null>;
  diagnostic_scores: Record<string, number | string | null>;
  is_stale: boolean;
  computed_at: string | null;
}

export type CbcPerformanceLevel = 'BE' | 'AE' | 'ME' | 'EE' | '';

export interface CbcCompetencyPerformance {
  level: CbcPerformanceLevel | string;
  label: string;
  status: 'NO_EVIDENCE' | 'PROVISIONAL' | 'FINAL' | string;
}

export interface CbcCompetencyCoverage {
  outcomes_selected: number;
  outcomes_taught: number;
  outcomes_observed: number;
  outcomes_taught_not_observed: number;
}

export interface CbcOutcomeDistribution {
  EE: number;
  ME: number;
  AE: number;
  BE: number;
  PROVISIONAL: number;
  NO_EVIDENCE: number;
  [key: string]: number;
}

export interface CbcOutcomeReference {
  outcome_id: number;
  code: string;
  description: string;
  level?: string | null;
  label?: string | null;
  result_status?: string | null;
}

export interface CbcEvidenceSummary {
  total: number;
  observations: number;
  assignments: number;
  group_assignments: number;
  projects: number;
  practicals: number;
  assessments: number;
  descriptive: number;
  rubric: number;
  numeric: number;
  competency: number;
  other?: number;
  [key: string]: number | undefined;
}

export interface CbcTeacherReview {
  id?: number | null;
  teacher_remark: string;
  recommended_next_steps: string[];
  contextual_note?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  approved_by?: number | null;
  approved_at?: string | null;
  requires_re_review?: boolean;
  updated_at?: string | null;
}

export interface CbcPortfolioEntry {
  evidence_id: number;
  source_type: string | null;
  title?: string | null;
  evidence_date?: string | null;
  source_id: number | null;
  learning_outcome: {
    id: number;
    code: string;
    description: string;
  } | null;
  observed_at: string | null;
  performance_level?: string | null;
  evaluation_type: string | null;
  teacher_narrative?: string | null;
  teacher?: { id: number | null; name: string };
  learner?: { id: number | null; name: string };
  subject?: { id: number | null; name: string };
  cohort?: { id: number | null; name: string };
  artifact_reference?: Record<string, unknown> | null;
  attachments?: Array<Record<string, unknown>>;
  submission_status?: string | null;
  feedback?: string | null;
  reflection?: string | null;
  evidence_narrative?: string | null;
  provenance?: Record<string, unknown> | null;
  linked_artifact?: Record<string, unknown> | null;
  source_reference?: string | number | null;
  artifact?: unknown;
}

export interface CbcObservationRecord {
  evidence_id?: number;
  learner?: number | null;
  learning_outcome: CbcPortfolioEntry['learning_outcome'];
  date: string | null;
  session?: number | null;
  evaluation_type: string | null;
  performance_level?: string | null;
  teacher_narrative?: string | null;
  observation_context?: string | null;
  observed_behavior?: string | null;
  interpretation?: string | null;
  strength?: string | null;
  support_need?: string | null;
  intervention_or_follow_up?: string | null;
  responsible_teacher?: { id: number | null; name: string } | null;
  follow_up_date?: string | null;
  review_date?: string | null;
  review_status?: string | null;
  linked_artifact?: Record<string, unknown> | null;
  provenance?: Record<string, unknown> | null;
  follow_up?: {
    action?: string | null;
    date?: string | null;
    review_date?: string | null;
    status?: string | null;
  } | string | null;
}

export interface CbcAssessmentIndicator {
  weighted_score: number | null;
  component_scores: Record<string, number | string | null>;
  diagnostic_scores?: Record<string, number | string | null>;
  missing_components?: string[];
  result_status: string | null;
  is_stale?: boolean;
  computed_at?: string | null;
}

export interface CbcCompetencyResult {
  id: number;
  performance: CbcCompetencyPerformance;
  coverage: CbcCompetencyCoverage;
  distribution: CbcOutcomeDistribution;
  strengths: CbcOutcomeReference[];
  support_needed: CbcOutcomeReference[];
  evidence_summary: CbcEvidenceSummary;
  assessment_indicator_id?: number | null;
  readiness?: {
    has_result: boolean;
    is_stale: boolean;
    is_final: boolean;
    missing_components?: string[];
    missing_requirements?: string[];
  } | null;
  computation_details?: Record<string, unknown> | null;
  computed_at?: string | null;
}

export interface CbcReadiness {
  has_result: boolean;
  is_stale: boolean;
  is_final: boolean;
  missing_components?: string[];
  missing_requirements?: string[];
}

export interface CbcStudentSection {
  reporting_source: 'cbc';
  curriculum_type: 'CBE';
  performance?: CbcCompetencyPerformance | null;
  coverage?: CbcCompetencyCoverage | null;
  distribution?: CbcOutcomeDistribution | null;
  strengths?: CbcOutcomeReference[];
  support_needed?: CbcOutcomeReference[];
  evidence_summary?: CbcEvidenceSummary | null;
  teacher_review?: CbcTeacherReview | null;
  portfolio?: { entries: CbcPortfolioEntry[] } | null;
  observation_records?: CbcObservationRecord[];
  weighted_assessment_detail_visible?: boolean;
  assessment_indicator?: CbcAssessmentIndicator | null;
  cbc_result: CbcStudentResult | null;
  administrative_weighted_detail?: CbcStudentResult | null;
  competency_result?: CbcCompetencyResult | null;
  progress_summary: Record<string, unknown> | null;
  readiness: CbcReadiness | null;
  note: string | null;
}

export interface CurriculumAwareSubjectSection {
  cohort_subject: ReportCohortSubjectRef;
  curriculum_type: string | null;
  reporting_source: ReportingSource;
  performance_source: PerformanceSource;
  status: string | null;
  note: string | null;
  term_participation?: TermParticipation | null;
  assessment_completion: AssessmentCompletion | null;
  attendance: AttendanceSummary | ReportAverageSummary | null;
  session_summary?: ReportSessionSummary | null;
  assignment_summary?: ReportAssignmentSummary | null;
  generic: GenericStudentSection | null;
  cbc: CbcStudentSection | null;
  available_sections?: string[];
  plugin_sections?: ReportPluginSectionMeta[];
}

export interface AdminOverviewGenericSummary {
  average_score: number | null;
  computed_count: number;
}

export interface AdminOverviewCbcSummary {
  reporting_source: 'cbc';
  curriculum_type: string | null;
  total_cbc_cohort_subjects: number;
  total_results: number;
  final_count: number;
  provisional_count: number;
  incomplete_count: number;
  stale_count: number;
  competency_distribution?: CbcCompetencyDistribution;
  weighted_assessment_detail?: CbcWeightedAssessmentDetail | null;
  average_weighted_score?: number | null;
  average_points?: number | null;
  distribution_by_code: CbcDistributionByCode;
}

export interface AdminOverviewCambridgeSummary {
  reporting_source: 'cambridge_pending';
  status: string;
  cohort_subject_count: number;
}

export interface DashboardOverview {
  organization: ReportOrganization;
  academic_year: AcademicYearInfo | null;
  current_term: TermInfo | null;
  total_learners: number;
  total_cohorts: number;
  total_cohort_subjects: number;
  total_instructors: number;
  total_sessions: number;
  total_assessments: number;
  average_grade: number | null;
  average_grade_note?: string | null;
  average_attendance: number | null;
  performance_summary: {
    generic: AdminOverviewGenericSummary | null;
    cbc: AdminOverviewCbcSummary | null;
    cambridge: AdminOverviewCambridgeSummary | null;
  };
  composition?: ReportCompositionMeta | null;
}

export interface OverallStats {
  generic_average_score: number | null;
  cbc_average_weighted_score: number | null;
  average_score: number | null;
  average_score_note: string | null;
  average_attendance: number | null;
  total_subjects: number;
}

export interface StudentReportCard {
  student: StudentInfo;
  term: TermInfo | null;
  overall: OverallStats;
  subjects: CurriculumAwareSubjectSection[];
  // Compatibility payloads for generic numeric reporting only.
  grades: (ComputedGradeDTO & { position: number; total_in_class: number })[];
  legacy_grades?: GradeSummary[];
  attendance: AttendanceSummary[];
  composition?: ReportCompositionMeta | null;
}

export interface CohortSummarySnapshot {
  id: number;
  cohort: number;
  term: number;
  total_students: number;
  average_grade: number | null;
  average_attendance: number | null;
  grade_a_count: number;
  grade_b_count: number;
  grade_c_count: number;
  grade_d_count: number;
  grade_e_count: number;
  last_updated: string;
}

export interface SubjectSummarySnapshot {
  id: number;
  cohort_subject: number;
  term: number;
  total_students: number;
  average_score: number | null;
  highest_score: number | null;
  lowest_score: number | null;
  total_assessments: number;
  cat_count: number;
  exam_count: number;
  project_count: number;
  last_updated: string;
}

export interface SubjectSummary {
  id: number;
  cohort_subject: number;
  cohort_name: string;
  subject_name: string;
  subject_code: string;
  term: number;
  term_name: string;
  total_students: number;
  average_score: number | null;
  highest_score: number | null;
  lowest_score: number | null;
  total_assessments: number;
  cat_count: number;
  exam_count: number;
  project_count: number;
  last_updated: string;
  curriculum_type?: string | null;
  reporting_source?: ReportingSource | null;
  performance_source?: PerformanceSource | null;
  status?: string | null;
  note?: string | null;
  assessment_completion?: AssessmentCompletion | null;
  generic_performance?: GenericPerformance | null;
  cbc_performance?: CbcPerformance | null;
  average_grade?: number | null;
  average_grade_note?: string | null;
  average_attendance?: number | null;
  coverage?: ReportCoverage | null;
}

export interface CurriculumAwareCohortSubjectSummary {
  cohort_subject: ReportCohortSubjectRef;
  assigned_instructor: ReportAssignedInstructor | null;
  assigned_instructors?: ReportAssignedInstructor[];
  active_learner_count: number;
  curriculum_type: string | null;
  reporting_source: ReportingSource;
  performance_source: PerformanceSource;
  status: string | null;
  note: string | null;
  assessment_completion: AssessmentCompletion | null;
  generic_performance: GenericPerformance | null;
  cbc_performance: CbcPerformance | null;
  subject_summary: SubjectSummarySnapshot | null;
  average_grade: number | null;
  average_grade_note?: string | null;
  average_attendance: number | null;
  coverage: ReportCoverage | null;
  session_summary?: ReportSessionSummary | null;
  assignment_summary?: ReportAssignmentSummary | null;
  assessment_items?: ReportAssessmentItem[];
  session_items?: ReportSessionItem[];
  available_sections?: string[];
  plugin_sections?: ReportPluginSectionMeta[];
}

export interface ClassSummary {
  cohort: ReportCohortInfo;
  term: TermInfo | null;
  learner_count: number;
  average_grade: number | null;
  average_grade_note?: string | null;
  average_attendance: number | null;
  cohort_summary: CohortSummarySnapshot | null;
  // Compatibility snapshot for generic-only subject aggregates.
  subject_summaries: SubjectSummary[];
  cohort_subjects: CurriculumAwareCohortSubjectSummary[];
  composition?: ReportCompositionMeta | null;
}

export interface SubjectCohortOverview {
  cohort_subject: ReportCohortSubjectRef;
  cohort: ReportCohortInfo;
  active_learner_count: number;
  assigned_instructor: ReportAssignedInstructor | null;
  assigned_instructors?: ReportAssignedInstructor[];
  curriculum_type: string | null;
  reporting_source: ReportingSource;
  performance_source: PerformanceSource;
  status: string | null;
  note: string | null;
  assessment_completion: AssessmentCompletion | null;
  average_score: number | null;
  average_score_note?: string | null;
  average_grade: number | null;
  average_grade_note?: string | null;
  highest_score: number | null;
  lowest_score: number | null;
  generic_performance: GenericPerformance | null;
  cbc_performance: CbcPerformance | null;
  average_attendance: number | null;
  coverage: ReportCoverage | null;
  session_summary?: ReportSessionSummary | null;
  assignment_summary?: ReportAssignmentSummary | null;
  assessment_items?: ReportAssessmentItem[];
  session_items?: ReportSessionItem[];
  available_sections?: string[];
  plugin_sections?: ReportPluginSectionMeta[];
}

export interface AttendanceScopeReportPayload {
  report_type: 'attendance_scope';
  term: TermInfo | null;
  scope: {
    student: StudentInfo | null;
    cohort: ReportCohortInfo | null;
    subject: ReportSubjectInfo | null;
    cohort_subject: ReportCohortSubjectRef | null;
  };
  summary: {
    record_count: number;
    average_attendance: number | null;
    total_sessions: number;
    present_count: number;
    absent_count: number;
    late_count: number;
  };
  rows: AttendanceSummary[];
}

export interface SubjectAnalysis {
  subject: ReportSubjectInfo;
  term: TermInfo | null;
  average_score: number | null;
  average_score_note?: string | null;
  cohort_subjects: SubjectCohortOverview[];
  // Compatibility snapshot for generic-only views.
  subject_summaries: SubjectSummary[];
  assessment_type_breakdown: ReportAssessmentTypeBreakdown[];
  composition?: ReportCompositionMeta | null;
}

export interface AssessmentTypeSummary {
  id: number;
  cohort_subject: number;
  cohort_name: string;
  subject_name: string;
  term: number;
  term_name: string;
  assessment_type: string;
  total_assessments: number;
  average_score: number | null;
  total_weight: number;
  last_updated: string;
  subject_code?: string | null;
  curriculum_type?: string | null;
  reporting_source?: ReportingSource | null;
  performance_source?: PerformanceSource | null;
  status?: string | null;
  note?: string | null;
  assessment_completion?: AssessmentCompletion | null;
  generic_performance?: GenericPerformance | null;
  cbc_performance?: CbcPerformance | null;
  average_attendance?: number | null;
  coverage?: ReportCoverage | null;
}

export interface LongitudinalTermData {
  term: TermInfo;
  grades: GradeSummary[];
  attendance: AttendanceSummary[];
}

export interface LongitudinalStudentData {
  student: StudentInfo;
  terms: LongitudinalTermData[];
}

export interface InstructorCohortSubjectOverview {
  id: number;
  cohort_id: number;
  cohort_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  curriculum: string;
  curriculum_type: string;
  academic_year: string;
  active_learner_count: number;
  average_grade: number | null;
  average_grade_note?: string | null;
  average_attendance: number | null;
  session_count: number | null;
  completed_session_count: number | null;
  reporting_source: ReportingSource;
  performance_source: PerformanceSource;
  status: string | null;
  note: string | null;
  assessment_completion?: AssessmentCompletion | null;
  generic_summary?: GenericPerformanceSummary | null;
  generic_performance?: GenericPerformance | null;
  cbc_summary?: CbcPerformanceSummary | null;
  cbc_performance?: CbcPerformance | null;
  coverage?: ReportCoverage | null;
}

export interface InstructorOverview {
  instructor: {
    role: string;
  };
  assigned_cohort_subjects: InstructorCohortSubjectOverview[];
  total_assigned_cohort_subjects: number;
  total_visible_learners: number;
}

export interface ReportStudentRef {
  id: number;
  name: string;
  admission_number: string;
}

export interface ReportComputedGradePreview {
  id: number;
  term_id: number;
  final_score: number | null;
  letter_grade: string | null;
  letter_label: string | null;
  grade_status: string | null;
}

export interface ReportGradeSummaryPreview {
  id: number;
  term_id: number;
  average_score: number | null;
  weighted_average: number | null;
  final_grade: string | null;
  total_assessments: number;
}

export interface InstructorLearnerReportRow {
  student: ReportStudentRef;
  attendance_summary: ReportAverageSummary | null;
  reporting_source: ReportingSource;
  performance_source: PerformanceSource;
  status: string | null;
  note: string | null;
  generic?: GenericStudentSection | null;
  cbc?: CbcStudentSection | null;
  generic_result?: GenericStudentSection | null;
  cbc_result?: CbcStudentSection | CbcStudentResult | null;
  // Compatibility payloads for generic-only reporting.
  computed_grade: ReportComputedGradePreview | null;
  grade_summary: ReportGradeSummaryPreview | null;
  assessment_completion: ReportAssessmentCompletion;
}

export interface InstructorCohortSubjectLearnersReport {
  cohort_subject: ReportCohortSubjectRef;
  term: TermInfo | null;
  curriculum_type?: string | null;
  reporting_source?: ReportingSource;
  performance_source?: PerformanceSource;
  status?: string | null;
  note?: string | null;
  assessment_completion?: AssessmentCompletion | null;
  average_attendance?: number | null;
  coverage?: ReportCoverage | null;
  learners?: InstructorLearnerReportRow[] | null;
  total_learners: number;
}

export interface ReportGradeDistributionItem {
  letter_grade: string | null;
  count: number;
}

export interface ReportGradeStatusCountItem {
  grade_status: string | null;
  count: number;
}

export interface InstructorCohortSubjectPerformanceReport {
  cohort_subject: ReportCohortSubjectRef;
  term: TermInfo | null;
  curriculum_type?: string | null;
  reporting_source?: ReportingSource;
  performance_source?: PerformanceSource;
  status?: string | null;
  note?: string | null;
  assessment_completion?: AssessmentCompletion | null;
  average_attendance?: number | null;
  coverage?: ReportCoverage | null;
  generic_summary?: GenericPerformanceSummary | null;
  generic_performance?: GenericPerformance | null;
  cbc_summary?: CbcPerformanceSummary | null;
  cbc_performance?: CbcPerformance | null;
  total_learners: number;
  average_score: number | null;
  highest_score: number | null;
  lowest_score: number | null;
  grade_distribution?: ReportGradeDistributionItem[] | null;
  grade_status_counts?: ReportGradeStatusCountItem[] | null;
  assessment_type_breakdown?: ReportAssessmentTypeBreakdown[] | null;
}

export interface InstructorCohortSubjectTeachingActivityReport {
  cohort_subject: ReportCohortSubjectRef;
  term: TermInfo | null;
  curriculum_type?: string | null;
  reporting_source?: ReportingSource;
  performance_source?: PerformanceSource;
  status?: string | null;
  note?: string | null;
  assessment_completion?: AssessmentCompletion | null;
  average_attendance?: number | null;
  coverage?: ReportCoverage | null;
  sessions_created: number;
  sessions_completed: number;
  attendance_marked: number;
  attendance_expected: number;
  attendance_completeness: number | null;
}

export interface ComputeResponse {
  detail: string;
  term?: string;
}

export interface ReportComputeTerm {
  id: number;
  name: string;
  status: string;
  is_frozen: boolean;
  academic_year_id?: number;
  academic_year_name?: string;
}

export type ReportSetupStatus =
  | 'READY'
  | 'NEEDS_SETUP'
  | 'CONFLICTS'
  | 'COMPUTING'
  | 'ERROR'
  | 'MISSING_POLICIES'
  | 'NOT_CONFIGURED'
  | string;

export interface ReportPolicyReference {
  id: number;
  name: string;
  label?: string;
  is_default?: boolean;
  term_id?: number | null;
  cohort_id?: number | null;
  cohort_name?: string | null;
  subject_profile_id?: number | null;
  subject_name?: string | null;
  cbc_cohort_subject_id?: number | null;
  origin?: string;
  [key: string]: unknown;
}

export interface ReportReadinessRow {
  cbc_cohort_subject_id?: number;
  cohort_subject_id?: number;
  label?: string;
  cohort?: { id: number; name: string };
  subject?: { id: number; name: string; code?: string };
  effective_policy?: ReportPolicyReference | null;
  resolved_policy?: ReportPolicyReference | null;
  status?: string;
  message?: string;
  policy_scope?: string | null;
  conflicting_policies?: ReportPolicyReference[];
  [key: string]: unknown;
}

export interface ReportComputeEngineReadiness {
  key: string;
  engine: string;
  label: string;
  status: string;
  setup_status?: ReportSetupStatus;
  blocked: boolean;
  ready: boolean;
  message: string;
  covered_count?: number;
  missing_count?: number;
  conflict_count?: number;
  inactive_count?: number;
  exception_count?: number;
  official_result_estimate?: number;
  default_policy?: ReportPolicyReference | null;
  summary_message?: string;
  projection_freshness?: ReportProjectionFreshness | null;
  background_updates?: ReportProjectionFreshness | null;
  coverage?: {
    default_policy?: ReportPolicyReference | null;
    coverage_by_scope?: Record<string, Array<Record<string, unknown>>>;
    exceptions?: ReportReadinessRow[];
    missing?: ReportReadinessRow[];
    conflicts?: ReportReadinessRow[];
    active_but_not_effective?: Array<Record<string, unknown>>;
    advanced_resolution_rows?: ReportReadinessRow[];
    [key: string]: unknown;
  };
  context?: {
    missing_count?: number;
    conflict_count?: number;
    inactive_count?: number;
    coverage?: unknown;
    missing_policy_rows?: unknown[];
    [key: string]: unknown;
  };
}

export interface ReportProjectionFreshness {
  last_projection_update_at: string | null;
  pending_dirty_scope_count: number;
  claimed_dirty_scope_count: number;
  failed_dirty_scope_count: number;
  updating_in_background: boolean;
  oldest_pending_update_at: string | null;
  oldest_pending_update_age_seconds: number | null;
  stale_outcome_result_count: number;
  stale_subject_result_count: number;
  stale_assessment_indicator_count: number;
  stale_required_projection_count: number;
}

export interface TermReportSetReadiness {
  status: 'DRAFT' | 'RECONCILING' | 'READY_FOR_REVIEW' | 'READY_FOR_PUBLICATION' | 'REQUIRES_RECONCILIATION' | string;
  requires_reconciliation: boolean;
  reconciliation_required_reason: string;
  reconciliation_required_at?: string | null;
  evidence_cutoff_at: string | null;
  evidence_cutoff_dirty_version?: number | null;
  ready_for_review_at: string | null;
  ready_for_publication_at: string | null;
  last_job_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ReportComputeReadiness {
  term: ReportComputeTerm;
  engines: ReportComputeEngineReadiness[];
  blocked: boolean;
  ready: boolean;
  status: string;
  message: string;
  overall_status?: ReportSetupStatus;
  can_compute?: boolean;
  blocking_count?: number;
  recommendations?: ReportReadinessRecommendation[];
  decision_items?: Array<Record<string, unknown>>;
  exceptions?: ReportReadinessRow[];
  missing?: ReportReadinessRow[];
  conflicts?: ReportReadinessRow[];
  advanced?: { resolution_rows?: ReportReadinessRow[] };
  prepared?: boolean;
  detail?: string;
  applied?: {
    recommendation_id: string;
    policy: ReportPolicyReference;
  };
  projection_freshness?: ReportProjectionFreshness | null;
  background_updates?: ReportProjectionFreshness | null;
  report_set?: TermReportSetReadiness;
}

export interface ReportReadinessRecommendation {
  id: string;
  engine: string;
  label: string;
  summary?: string;
  scope: string;
  policy_id: number;
  source?: string;
  cohort_id?: number | null;
  cohort_name?: string | null;
  subject_profile_id?: number | null;
  cbc_cohort_subject_id?: number | null;
  affected_class_subject_count: number;
  affected_result_estimate: number;
  safe_to_apply: boolean;
}

export interface ReportComputeEngineResult {
  engine: string;
  computed_count: number;
  skipped_count?: number;
  created_count?: number;
  updated_count?: number;
  unchanged_count?: number;
  failed_count?: number;
  subject_results_recomputed_count?: number;
  assessment_indicators_computed_count?: number;
  assessment_indicator_failed_count?: number;
  mode?: ReportComputeMode;
}

export type ReportComputeMode = 'INCREMENTAL' | 'FINAL_RECONCILIATION' | 'FULL_REBUILD';

export interface ReportComputeResult {
  detail: string;
  mode?: ReportComputeMode;
  term: ReportComputeTerm;
  engines: ReportComputeEngineReadiness[];
  engine_results: ReportComputeEngineResult[];
  computed_count: number;
  summary_count: number;
  summaries?: {
    source: string;
    summary_count: number;
    subject_summary_count?: number;
    assessment_type_summary_count?: number;
    cohort_summary_count?: number;
  };
  readiness: ReportComputeReadiness;
}

export interface ReportComputeProgressEvent {
  sequence?: number;
  event?: 'progress' | 'complete' | 'error';
  stage: string;
  label?: string;
  progress_percent?: number;
  completed_count?: number | null;
  total_count?: number | null;
  official_results?: number;
  summary_rows_refreshed?: number;
  status?: string;
  mode?: ReportComputeMode;
  created_count?: number;
  updated_count?: number;
  unchanged_count?: number;
  failed_count?: number;
  data?: Record<string, unknown>;
}

export interface ReportComputeJobItemCounts {
  total_scopes: number;
  completed_scopes: number;
  created_count: number;
  updated_count: number;
  unchanged_count: number;
  failed_count: number;
}

export interface ReportComputeJob {
  job_id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'BLOCKED' | string;
  mode?: ReportComputeMode;
  stage: string;
  label?: string;
  progress_percent: number;
  completed_count?: number | null;
  total_count?: number | null;
  item_counts?: ReportComputeJobItemCounts;
  result_payload?: {
    mode?: ReportComputeMode;
    detail?: string;
    report_set?: TermReportSetReadiness;
    computed_count?: number;
    created_count?: number;
    updated_count?: number;
    unchanged_count?: number;
    failed_count?: number;
    subject_results_recomputed_count?: number;
    assessment_indicators_computed_count?: number;
    assessment_indicator_failed_count?: number;
    official_results?: number;
    summary_count?: number;
    summary_rows_refreshed?: number;
    summaries?: { summary_count?: number };
    [key: string]: unknown;
  };
  error_payload?: Record<string, unknown>;
  events_url?: string;
  latest_event?: ReportComputeProgressEvent;
  readiness?: ReportComputeReadiness;
}

export interface ReportFilters {
  student?: number;
  term?: number;
  cohort?: number;
  subject?: number;
  cohort_subject?: number;
}

export type AttendanceRiskLevel = 'WATCH' | 'RISK' | 'CRITICAL';

export interface InstructorAttendanceRiskItem {
  student_id: number;
  student_name: string;
  admission_number: string;
  cohort_subject_id: number;
  cohort_id: number;
  cohort_name: string;
  subject_id: number;
  subject_name: string;
  term_id: number | null;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  sick_count: number;
  unmarked_count: number;
  attendance_percentage: number;
  threshold: number;
  risk_level: AttendanceRiskLevel;
  reasons: string[];
}

export interface InstructorAttendanceRiskResponse {
  scope: string;
  threshold: number;
  count: number;
  unique_learner_count: number;
  items: InstructorAttendanceRiskItem[];
}

export type ReportRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type ReportExportFormat = 'pdf' | 'xlsx' | 'docx';
export type LearnerReportIndicatorTone = 'success' | 'warning' | 'danger';
export type ReportCardTone = 'success' | 'warning' | 'danger' | 'neutral';
export type SubjectSummaryStatus = 'ON_TRACK' | 'WATCH' | 'NEEDS_SUPPORT';
export type TeacherVisibilityStatus = 'STRONG' | 'WATCH' | 'NEEDS_ACTION' | 'NO_DATA';

export interface ReportPeriod {
  term_id: number | null;
  term_name: string | null;
  start_date: string | null;
  end_date: string | null;
  label: string;
}

export interface LearnerReportLearnerRef {
  id: number;
  name: string;
  admission_number: string;
  primary_cohort_id: number | null;
  primary_cohort_name: string | null;
  status: string;
}

export interface LearnerReportCohortRef {
  id: number;
  name: string;
  level: string | null;
  academic_year: string | null;
  curriculum: string | null;
}

export interface LearnerReportSubjectRef {
  id: number;
  name: string;
  code: string;
  level: string | null;
}

export interface LearnerReportInstructorContext {
  source: string;
  subject_source: string;
  teaching_link_id: number | null;
  cohort_subject_id: number;
  cohort_name: string;
  subject_name: string;
  subject_code: string;
  instructor_id?: number | null;
  instructor_name?: string | null;
  instructor_email?: string | null;
}

export interface LearnerReportAttendanceSection {
  attendance_rate: number | null;
  sessions_total: number;
  sessions_attended: number;
  sessions_missed: number;
  late_count: number;
  excused_count: number;
  sick_count: number;
  latest_session_date: string | null;
}

export interface LearnerReportAssignmentsSection {
  assignments_total: number;
  assignments_submitted: number;
  assignments_reviewed: number;
  assignments_missing: number;
  assignment_completion_rate: number | null;
  latest_due_at: string | null;
}

export interface LearnerReportLessonParticipationSection {
  lessons_total: number;
  lessons_attended: number;
  lessons_missed: number;
  lessons_with_evidence: number;
  participation_rate: number | null;
}

export interface LearnerReportComputedGrade {
  id: number;
  term_id: number;
  term_name: string | null;
  final_score: number | null;
  letter_grade: string | null;
  letter_label: string | null;
  grade_status: string | null;
  policy_name: string | null;
  computed_at: string | null;
}

export interface LearnerReportCbcResult {
  weighted_score: number | null;
  cbc_level: string | null;
  cbc_code: string | null;
  cbc_label: string | null;
  cbc_points: number | null;
  result_status: string | null;
  missing_components: string[];
  component_scores: Record<string, number | string | null>;
  diagnostic_scores: Record<string, number | string | null>;
  is_stale: boolean;
  computed_at: string | null;
  term_id: number | null;
  term_name: string | null;
}

export interface LearnerReportAssessmentsSection {
  assessment_count: number;
  finalized_assessment_count: number;
  latest_assessment_date: string | null;
  numeric_average: number | null;
  computed_grade: LearnerReportComputedGrade | null;
  cbc_result: LearnerReportCbcResult | null;
}

export interface LearnerReportLatestEvidence {
  observed_at: string;
  learning_outcome_code: string;
  learning_outcome_description: string;
  evaluation_type: string;
  source_type: string;
}

export interface LearnerReportStrandSummary {
  strand_code: string;
  strand_name: string;
  selected_outcomes: number;
  taught_outcomes: number;
  mastered_outcomes: number;
  coverage_percentage: number | null;
  mastery_percentage: number | null;
}

export interface LearnerReportProgressSection {
  outcomes_selected: number;
  outcomes_taught: number;
  outcomes_mastered: number;
  outcome_coverage_percentage: number | null;
  mastery_percentage: number | null;
  evidence_count: number;
  latest_observation_date: string | null;
  mastery_distribution: Record<string, number>;
  latest_evidence: LearnerReportLatestEvidence[];
  strand_summaries: LearnerReportStrandSummary[];
  session_evidence_count: number;
  cbc_result: LearnerReportCbcResult | null;
  competency_result?: CbcCompetencyResult | null;
}

export interface LearnerReportLearningGraphPoint {
  period: string;
  sessions_total: number;
  sessions_attended: number;
  assignments_total: number;
  assignments_submitted: number;
  evidence_count: number;
  attendance_rate: number | null;
  assignment_completion_rate: number | null;
}

export interface LearnerReportMetricItem {
  type: string;
  label: string;
  metric: string;
}

export interface LearnerAvailableReportScope {
  cohort_subject_id: number;
  subject_name: string;
  subject_code: string;
  cohort_name: string;
  can_report: boolean;
}

export interface LearnerAvailableReportScopesPayload {
  learner: {
    id: number;
    name: string;
    admission_number: string;
  };
  can_view_overview: boolean;
  subject_scopes: LearnerAvailableReportScope[];
}

export interface LearnerSubjectReportKeyIndicator {
  key: string;
  label: string;
  value: string;
  note: string;
  tone: LearnerReportIndicatorTone;
}

export interface LearnerSubjectReportAttendanceTrendPoint {
  period: string;
  attendance_rate: number | null;
  sessions_total: number;
  sessions_attended: number;
}

export interface LearnerSubjectReportAssignmentCompletionPoint {
  label: string;
  count: number;
  total: number;
}

export interface LearnerSubjectReportMasteryDistributionPoint {
  level: string;
  count: number;
}

export interface LearnerSubjectReportLearningTimelinePoint {
  period: string;
  evidence_count: number;
  assignments_submitted: number;
  assignments_total: number;
}

export interface LearnerSubjectReportCharts {
  attendance_trend: LearnerSubjectReportAttendanceTrendPoint[];
  assignment_completion: LearnerSubjectReportAssignmentCompletionPoint[];
  mastery_distribution: LearnerSubjectReportMasteryDistributionPoint[];
  learning_timeline: LearnerSubjectReportLearningTimelinePoint[];
  strand_progress: LearnerReportStrandSummary[];
}

export interface LearnerSubjectReportPayload {
  report_type: 'learner_subject';
  generated_at: string;
  period?: ReportPeriod;
  learner: LearnerReportLearnerRef;
  cohort: LearnerReportCohortRef;
  subject: LearnerReportSubjectRef;
  cohort_subject: ReportCohortSubjectRef;
  curriculum_type: string | null;
  reporting_source: ReportingSource;
  performance_source: PerformanceSource;
  status: string | null;
  note: string | null;
  term_participation?: TermParticipation | null;
  instructor_context: LearnerReportInstructorContext | null;
  attendance: LearnerReportAttendanceSection;
  assignments: LearnerReportAssignmentsSection;
  lesson_participation: LearnerReportLessonParticipationSection;
  assessments: LearnerReportAssessmentsSection;
  progress: LearnerReportProgressSection;
  learning_graph: {
    points: LearnerReportLearningGraphPoint[];
  };
  teacher_summary: string;
  key_indicators: LearnerSubjectReportKeyIndicator[];
  charts: LearnerSubjectReportCharts;
  strengths: LearnerReportMetricItem[];
  weak_areas: LearnerReportMetricItem[];
  areas_needing_support: LearnerReportMetricItem[];
  risk_level: ReportRiskLevel;
  recommended_actions: string[];
}

export interface LearnerAssessmentReportQueryParams {
  assessmentId?: number | null;
  cohortSubjectId?: number | null;
  assessmentType?: string | null;
  termId?: number | null;
  subjectId?: number | null;
  cohortId?: number | null;
  academicYearId?: number | null;
}

export interface LearnerAssessmentReportLearner {
  id: number;
  name: string;
  admission_number: string;
  primary_cohort_id: number | null;
  primary_cohort_name: string | null;
  status: string;
}

export interface LearnerAssessmentReportContext {
  assessment_id: number | null;
  assessment_name: string | null;
  assessment_type: string | null;
  assessment_type_display: string | null;
  term_id: number | null;
  term_name: string | null;
  academic_year_id: number | null;
  academic_year_name: string | null;
  cohort_subject_id: number | null;
  cohort_id: number | null;
  cohort_name: string | null;
  subject_id: number | null;
  subject_name: string | null;
  subject_code: string | null;
}

export interface LearnerAssessmentReportSummary {
  assessment_count: number;
  finalized_count: number;
  active_count: number;
  graded_count: number;
  average_percentage: number | null;
  best_percentage: number | null;
  latest_percentage: number | null;
  latest_assessment_date: string | null;
}

export interface LearnerAssessmentReportRow {
  assessment_id: number;
  assessment_name: string;
  assessment_type: string;
  assessment_type_display: string;
  assessment_status: string;
  assessment_date: string | null;
  term_id: number | null;
  term_name: string | null;
  academic_year_id: number | null;
  academic_year_name: string | null;
  cohort_subject_id: number;
  cohort_id: number;
  cohort_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  score: number | null;
  total_marks: number | null;
  percentage: number | null;
  rubric_level_id: number | null;
  rubric_level_label: string | null;
  rubric_level_code: string | null;
  score_status: string;
  score_status_display: string;
  comments: string;
}

export interface LearnerAssessmentTermTrendPoint {
  term_id: number | null;
  term_name: string | null;
  academic_year_id: number | null;
  academic_year_name: string | null;
  assessment_count: number;
  average_percentage: number | null;
  latest_assessment_date: string | null;
}

export interface LearnerAssessmentAcademicYearTrendPoint {
  academic_year_id: number | null;
  academic_year_name: string | null;
  assessment_count: number;
  average_percentage: number | null;
}

export interface LearnerAssessmentSubjectBreakdownPoint {
  cohort_subject_id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  cohort_id: number;
  cohort_name: string;
  assessment_count: number;
  average_percentage: number | null;
  latest_percentage: number | null;
}

export interface LearnerAssessmentTypeFilter {
  value: string;
  label: string;
  count: number;
}

export interface LearnerAssessmentSubjectFilter {
  cohort_subject_id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  cohort_name: string;
}

export interface LearnerAssessmentTermFilter {
  id: number;
  name: string;
  academic_year_id: number;
  academic_year_name: string;
}

export interface LearnerAssessmentAcademicYearFilter {
  id: number;
  name: string;
}

export interface LearnerAssessmentAvailableFilters {
  assessment_types: LearnerAssessmentTypeFilter[];
  subjects: LearnerAssessmentSubjectFilter[];
  terms: LearnerAssessmentTermFilter[];
  academic_years: LearnerAssessmentAcademicYearFilter[];
}

export interface LearnerAssessmentVisibility {
  scope: 'admin' | 'instructor';
  can_compare_subjects: boolean;
}

export interface LearnerAssessmentReportPayload {
  report_type: 'learner_assessment';
  generated_at: string;
  learner: LearnerAssessmentReportLearner;
  context: LearnerAssessmentReportContext;
  summary: LearnerAssessmentReportSummary;
  assessment_rows: LearnerAssessmentReportRow[];
  term_trend: LearnerAssessmentTermTrendPoint[];
  academic_year_trend: LearnerAssessmentAcademicYearTrendPoint[];
  subject_breakdown: LearnerAssessmentSubjectBreakdownPoint[];
  available_filters: LearnerAssessmentAvailableFilters;
  visibility: LearnerAssessmentVisibility;
}

export interface LearnerOverviewSubjectSummary {
  cohort_subject_id: number;
  cohort_id: number;
  cohort_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  curriculum_type: string | null;
  reporting_source: ReportingSource;
  attendance_rate: number | null;
  assignment_completion_rate: number | null;
  evidence_count: number;
  mastery_percentage: number | null;
  outcome_coverage_percentage: number | null;
  numeric_average: number | null;
  computed_grade: LearnerReportComputedGrade | null;
  cbc_result: LearnerReportCbcResult | null;
  performance?: CbcCompetencyPerformance | null;
  competency_result?: CbcCompetencyResult | null;
  risk_level: ReportRiskLevel;
  summary_status?: SubjectSummaryStatus | null;
  summary_note?: string | null;
  strengths: LearnerReportMetricItem[];
  weak_areas: LearnerReportMetricItem[];
  note: string | null;
}

export interface LearnerOverviewReportPayload {
  report_type: 'learner_overview';
  generated_at: string;
  period?: ReportPeriod;
  learner: LearnerReportLearnerRef;
  organization: ReportOrganization;
  overall_attendance_rate: number | null;
  overall_assignment_completion_rate: number | null;
  subject_count: number;
  evidence_count: number;
  subject_summaries: LearnerOverviewSubjectSummary[];
  strongest_subjects: LearnerOverviewSubjectSummary[];
  subjects_needing_support: LearnerOverviewSubjectSummary[];
  subjects_on_track: LearnerOverviewSubjectSummary[];
  participation_risk_level: ReportRiskLevel;
  learning_risk_level: ReportRiskLevel;
  overall_recommendations: string[];
}

export type LearnerTermProgressDocumentState = 'DRAFT' | 'READY_FOR_REVIEW' | 'OFFICIAL';
export type LearnerTermProgressResultStatus =
  | 'FINAL'
  | 'PROVISIONAL'
  | 'NO_EVIDENCE'
  | 'STALE'
  | 'ASSESSED'
  | 'AWAITING_EVIDENCE'
  | string;

export interface LearnerTermProgressTermRef {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

export interface LearnerTermProgressLearnerRef {
  id: number;
  name: string;
  admission_number: string;
  cohort: string | null;
  level: string | null;
}

export interface LearnerTermProgressAttendanceSummary {
  sessions_recorded: number;
  sessions_attended: number;
  attendance_percentage: number | null;
  status: string;
  evidence_reliability_note: string;
}

export interface LearnerTermProgressEvidenceSummary {
  assessments: number;
  assignments: number;
  group_assignments: number;
  observations: number;
  projects: number;
  practicals: number;
  portfolio_items: number;
  total: number;
}

export interface LearnerTermProgressPerformance {
  level: string;
  label: string;
  status: LearnerTermProgressResultStatus;
}

export interface LearnerTermProgressOutcome {
  strand: string;
  sub_strand: string;
  outcome_code: string;
  description: string;
  level: string;
  label: string;
  evidence_count: number;
  status: LearnerTermProgressResultStatus;
}

export interface LearnerTermProgressTeacherReview {
  teacher_remark: string;
  recommended_next_steps: string[];
  contextual_note: string;
  approved: boolean;
  requires_re_review: boolean;
}

export interface LearnerTermProgressLearningArea {
  cohort_subject_id: number;
  name: string;
  code: string;
  curriculum_type: string | null;
  reporting_source: string;
  attendance: {
    attended: number;
    recorded: number;
    percentage: number | null;
  };
  evidence_summary: LearnerTermProgressEvidenceSummary;
  performance: LearnerTermProgressPerformance;
  coverage: {
    selected: number;
    taught: number;
    observed: number;
    taught_not_observed: number;
  };
  outcomes: LearnerTermProgressOutcome[];
  teacher_review: LearnerTermProgressTeacherReview;
  portfolio_references: unknown[];
  observation_summaries: unknown[];
  strengths?: string[];
  support_needs?: string[];
}

export interface LearnerTermProgressReportPayload {
  report_type: 'learner_term_progress';
  document_state: LearnerTermProgressDocumentState;
  generated_at: string;
  organization: ReportOrganization;
  academic_year: { id: number; name: string };
  term: LearnerTermProgressTermRef;
  learner: LearnerTermProgressLearnerRef;
  attendance_summary: LearnerTermProgressAttendanceSummary;
  learning_areas: LearnerTermProgressLearningArea[];
  core_competencies: {
    available: boolean;
    message?: string;
    items: unknown[];
  };
  evidence_metrics: Record<string, number | string | null>;
  evidence_integrity: {
    statements: string[];
  };
  sign_off: Record<string, unknown>;
  provenance: Record<string, unknown>;
}

export interface ClassSubjectLearnerRow extends LearnerOverviewSubjectSummary {
  learner: LearnerReportLearnerRef;
}

export interface ClassSubjectReportPayload {
  report_type: 'class_subject';
  generated_at: string;
  period?: ReportPeriod;
  cohort: LearnerReportCohortRef;
  subject: LearnerReportSubjectRef;
  curriculum_type?: string | null;
  reporting_source?: ReportingSource;
  cohort_subject: {
    id: number;
    cohort_id: number;
    subject_id: number;
  };
  instructor?: ReportAssignedInstructor | null;
  learner_count: number;
  class_response_summary?: string;
  attendance_trend: {
    attendance_rate: number | null;
    sessions_total: number;
    sessions_attended: number;
  };
  assignment_summary: {
    assignments_total: number;
    assignments_submitted: number;
    assignment_completion_rate: number | null;
  };
  progress: {
    outcomes_selected: number | null;
    outcomes_taught?: number | null;
    outcomes_mastered: number;
    mastery_percentage: number | null;
    coverage_percentage?: number | null;
    evidence_count: number;
    outcomes_taught_not_evidenced?: number | null;
  };
  learner_rows: ClassSubjectLearnerRow[];
  learners_needing_support: ClassSubjectLearnerRow[];
  learners_on_track: ClassSubjectLearnerRow[];
  learners_exceeding_expectation: ClassSubjectLearnerRow[];
  recommended_teaching_interventions: string[];
  composition?: ReportCompositionMeta | null;
}

export interface TeacherPerformanceMetric {
  key: string;
  label: string;
  value: string | number;
  note: string;
  tone: ReportCardTone;
}

export interface TeacherPerformanceInsight {
  label: string;
  metric: string;
  note: string;
}

export interface TeacherPerformanceAlignmentItem {
  label: string;
  status: TeacherVisibilityStatus;
  note: string;
  tone: ReportCardTone;
}

export interface TeacherPerformanceReflectionItem {
  id?: number | null;
  session_id?: number | null;
  cohort_subject_id?: number | null;
  subject_id?: number | null;
  cohort_name: string;
  subject_name: string;
  session_title: string;
  session_date: string | null;
  created_at: string;
  excerpt: string;
  reflection_text?: string | null;
}

export interface TeacherPerformanceReflectionSummary {
  total_reflections: number;
  completed_sessions: number;
  reflected_sessions: number;
  reflection_completion_rate: number | null;
  missing_reflection_count: number;
  latest_reflections: TeacherPerformanceReflectionItem[];
  repeated_themes: string[];
  repeated_gaps: string[];
}

export interface TeacherPerformanceAssignedSubject {
  cohort_subject_id: number;
  cohort_name: string;
  subject_name: string;
  curriculum_type: string | null;
  learners_total: number;
  sessions_created: number;
  sessions_completed: number;
  session_completion_rate: number | null;
  attendance_marked: number;
  attendance_expected: number;
  attendance_completeness: number | null;
  attendance_present: number;
  attendance_recorded: number;
  average_attendance: number | null;
  assignments_total: number;
  assignments_submitted: number;
  assignment_completion_rate: number | null;
  coverage_percentage: number | null;
  outcomes_selected: number | null;
  outcomes_taught: number | null;
  outcomes_taught_not_evidenced: number | null;
  evidence_count: number;
  learners_with_evidence: number;
  learners_needing_support: number;
  assessment_visibility: number;
  mastery_percentage: number | null;
  risk_level: TeacherVisibilityStatus;
  reflection_count: number;
  reflected_sessions: number;
}

export interface TeacherPerformanceReportPayload {
  report_type: 'teacher_performance';
  generated_at: string;
  instructor: ReportAssignedInstructor;
  organization: ReportOrganization;
  period: ReportPeriod;
  headline: {
    teaching_delivery_status: TeacherVisibilityStatus;
    curriculum_coverage_status: TeacherVisibilityStatus;
    learner_evidence_status: TeacherVisibilityStatus;
    learner_response_status: TeacherVisibilityStatus;
    reflection_status: TeacherVisibilityStatus;
    overall_visibility_status: TeacherVisibilityStatus;
  };
  key_metrics: TeacherPerformanceMetric[];
  summary: string;
  assigned_subjects: TeacherPerformanceAssignedSubject[];
  strengths: TeacherPerformanceInsight[];
  gaps: TeacherPerformanceInsight[];
  evidence_alignment: TeacherPerformanceAlignmentItem[];
  reflection_summary: TeacherPerformanceReflectionSummary;
  recommended_actions: string[];
}

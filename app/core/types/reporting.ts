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
  average_weighted_score: number | null;
  average_points: number | null;
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

export interface CbcReadiness {
  has_result: boolean;
  is_stale: boolean;
  is_final: boolean;
  missing_components: string[];
}

export interface CbcStudentSection {
  reporting_source: 'cbc';
  curriculum_type: 'CBE';
  cbc_result: CbcStudentResult | null;
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
  average_weighted_score: number | null;
  average_points: number | null;
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
export type ReportExportFormat = 'pdf' | 'xlsx' | 'csv';
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

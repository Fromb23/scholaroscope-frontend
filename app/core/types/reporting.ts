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
  PROVISIONAL: number;
  INCOMPLETE: number;
  stale_count: number;
}

export interface AttendanceSummary {
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

export interface ReportAverageSummary {
  average: number | null;
  records: number;
}

export interface ReportCoverage {
  [key: string]: unknown;
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
  assessment_completion: AssessmentCompletion | null;
  attendance: AttendanceSummary | ReportAverageSummary | null;
  generic: GenericStudentSection | null;
  cbc: CbcStudentSection | null;
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
}

export interface SubjectCohortOverview {
  cohort_subject: ReportCohortSubjectRef;
  cohort: ReportCohortInfo;
  active_learner_count: number;
  assigned_instructor: ReportAssignedInstructor | null;
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
  learners: InstructorLearnerReportRow[];
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
  grade_distribution: ReportGradeDistributionItem[];
  grade_status_counts: ReportGradeStatusCountItem[];
  assessment_type_breakdown: ReportAssessmentTypeBreakdown[];
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

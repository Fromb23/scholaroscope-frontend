// app/core/types/reporting.ts

import { ComputedGradeDTO } from './gradePolicy';

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
}

export interface ReportOrganization {
  id: number;
  name: string;
}

export interface AcademicYearInfo {
  id: number;
  name: string;
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
  average_attendance: number | null;
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

export interface OverallStats {
  average_score: number | null;
  average_attendance: number | null;
  total_subjects: number;
}

export interface StudentReportCard {
  student: StudentInfo;
  term: TermInfo | null;
  overall: OverallStats;
  grades: (ComputedGradeDTO & { position: number; total_in_class: number })[];
  attendance: AttendanceSummary[];
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

export interface AdminCohortSubjectSummary {
  cohort_subject: ReportCohortSubjectRef;
  assigned_instructor: ReportAssignedInstructor | null;
  active_learner_count: number;
  average_grade: number | null;
  average_attendance: number | null;
  subject_summary: SubjectSummarySnapshot | null;
}

export interface ClassSummary {
  cohort: ReportCohortInfo;
  term: TermInfo | null;
  learner_count: number;
  average_grade: number | null;
  average_attendance: number | null;
  cohort_summary: CohortSummarySnapshot | null;
  subject_summaries: SubjectSummary[];
  cohort_subjects: AdminCohortSubjectSummary[];
}

export interface SubjectCohortOverview {
  cohort_subject: ReportCohortSubjectRef;
  cohort: ReportCohortInfo;
  active_learner_count: number;
  assigned_instructor: ReportAssignedInstructor | null;
  average_score: number | null;
  highest_score: number | null;
  lowest_score: number | null;
}

export interface ReportAssessmentTypeBreakdown {
  assessment_type: string;
  cohort_subjects?: number;
  average_score: number | null;
  total_assessments: number;
}

export interface SubjectAnalysis {
  subject: ReportSubjectInfo;
  term: TermInfo | null;
  average_score: number | null;
  cohort_subjects: SubjectCohortOverview[];
  subject_summaries: SubjectSummary[];
  assessment_type_breakdown: ReportAssessmentTypeBreakdown[];
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
  average_attendance: number | null;
  session_count: number | null;
  completed_session_count: number | null;
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

export interface ReportAverageSummary {
  average: number | null;
  records: number;
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

export interface ReportAssessmentCompletion {
  completed_scores: number;
  total_assessments: number;
}

export interface InstructorLearnerReportRow {
  student: ReportStudentRef;
  attendance_summary: ReportAverageSummary | null;
  computed_grade: ReportComputedGradePreview | null;
  grade_summary: ReportGradeSummaryPreview | null;
  assessment_completion: ReportAssessmentCompletion;
}

export interface InstructorCohortSubjectLearnersReport {
  cohort_subject: ReportCohortSubjectRef;
  term: TermInfo | null;
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

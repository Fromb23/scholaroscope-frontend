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

export interface DashboardOverview {
  academic_year: string | null;
  current_term: string | null;
  total_students: number;
  total_cohorts: number;
  total_subjects: number;
  total_assessments: number;
  average_grade: number | null;
  average_attendance: number | null;
}

export interface StudentInfo {
  id: number;
  name: string;
  admission_number: string;
  cohort: string | null;
  level: string | null;
}

export interface TermInfo {
  id: number;
  name: string;
  academic_year: string;
}

export interface OverallStats {
  average_score: number | null;
  average_attendance: number | null;
  total_subjects: number;
}

export interface StudentReportCard {
  student: StudentInfo;
  term: TermInfo;
  overall: OverallStats;
  grades: (ComputedGradeDTO & { position: number; total_in_class: number })[];
  attendance: AttendanceSummary[];
}

export interface ClassSummary {
  cohort: { id: number; name: string; level: string };
  term: TermInfo;
  summary: CohortSummary | null;
  subject_performance: SubjectSummary[];
  total_students: number;
}

export interface SubjectAnalysis {
  term: TermInfo;
  subject_summaries: SubjectSummary[];
  assessment_type_breakdown: AssessmentTypeSummary[];
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
import { ReactNode } from "react";

// Attendance Summary
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

// Grade Summary
export interface GradeSummary {
  letter_grade: ReactNode;
  highest_score: any;
  lowest_score: any;
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
  average_score: number;
  weighted_average: number;
  final_grade: string;
  cat_average: number | null;
  exam_average: number | null;
  project_average: number | null;
  last_updated: string;
}

// Cohort Summary
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

// Subject Summary
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

// Assessment Type Summary
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

// Dashboard Overview
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

// Student Report Card
export interface StudentReportCard {
  cohort: any;
  summary: any;
  student: {
    full_name: ReactNode;
    id: number;
    name: string;
    admission_number: string;
    cohort: string | null;
    level: string | null;
  };
  term: {
    id: number;
    name: string;
    academic_year: string;
  };
  overall_statistics: {
    average_grade: number | null;
    average_attendance: number | null;
    total_subjects: number;
  };
  attendance: AttendanceSummary[];
  grades: GradeSummary[];
}

// Class Summary
export interface ClassSummary {
  cohort: {
    id: number;
    name: string;
    level: string;
  };
  term: {
    id: number;
    name: string;
    academic_year: string;
  };
  summary: CohortSummary | null;
  subject_performance: SubjectSummary[];
  total_students: number;
}

// Subject Analysis
export interface SubjectAnalysis {
  term: {
    id: number;
    name: string;
    academic_year: string;
  };
  subject_summaries: SubjectSummary[];
  assessment_type_breakdown: AssessmentTypeSummary[];
}

// Longitudinal Student Data
export interface LongitudinalStudentData {
  term_summaries: any;
  student: {
    id: number;
    name: string;
    admission_number: string;
  };
  terms: {
    term: {
      id: number;
      name: string;
      academic_year: string;
    };
    grades: GradeSummary[];
    attendance: AttendanceSummary[];
  }[];
}

// Compute Response
export interface ComputeResponse {
  detail: string;
  term?: string;
}

// Filter params
export interface ReportFilters {
  student?: number;
  term?: number;
  cohort?: number;
  subject?: number;
  cohort_subject?: number;
}

// export interface GradePolicy {
//   cohort_subject_name: any;
//   cohort_name: any;
//   curriculum_name: any;
//   id: number;
//   name: string;
//   description: string;
//   aggregation_method: string;
//   default_weighting: Record<string, number>;
//   drop_lowest_cat: boolean;
//   cap_cat_score: number | null;
//   cap_exam_score: number | null;
//   is_active: boolean;
//   is_default: boolean;
//   context: {
//     cohort_subject?: number | null;
//     cohort?: number | null;
//     curriculum?: number | null;
//     term?: number | null;
//   };
//   created_at: string;
//   updated_at: string;
// }

// export interface ComputedGradeDTO {
//   id: number;
//   student: number;
//   student_name: string;
//   student_admission: string;
//   term: number;
//   term_name: string;
//   cohort_subject: number;
//   cohort_name: string;
//   subject_name: string;
//   final_score: number;
//   letter_grade: string;
//   component_scores: Record<string, number>;
//   policy_id: number | null;
//   computation_details: Record<string, any>;
//   computation_timestamp: string;
// }
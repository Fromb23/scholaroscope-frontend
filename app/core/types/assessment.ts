export enum AssessmentType {
  CAT = 'CAT',
  TEST = 'TEST',
  MAIN_EXAM = 'MAIN_EXAM',
  MOCK = 'MOCK',
  PROJECT = 'PROJECT',
  ASSIGNMENT = 'ASSIGNMENT',
  PRACTICAL = 'PRACTICAL',
  COMPETENCY = 'COMPETENCY'
}

export enum EvaluationType {
  NUMERIC = 'NUMERIC',
  RUBRIC = 'RUBRIC',
  DESCRIPTIVE = 'DESCRIPTIVE',
  COMPETENCY = 'COMPETENCY'
}

// Rubric Scale
export interface RubricLevel {
  id: number;
  rubric_scale: number;
  code: string;
  label: string;
  description: string;
  numeric_value: number;
  sequence: number;
}

export interface RubricScale {
  id: number;
  curriculum: number;
  curriculum_name: string;
  name: string;
  description: string;
  is_active: boolean;
  levels_count: number;
  created_at: string;
}

export interface RubricScaleDetail extends RubricScale {
  levels: RubricLevel[];
}

// Assessment (updated to use cohort_subject)
export interface Assessment {
  id: number;
  term: number | null;
  term_name: string | null;
  cohort_subject: number;
  cohort_id: number;
  cohort_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  name: string;
  assessment_type: string;
  assessment_type_display: string;
  evaluation_type: string;
  evaluation_type_display: string;
  total_marks: number | null;
  rubric_scale: number | null;
  rubric_scale_name: string | null;
  assessment_date: string | null;
  description: string;
  weight: number;
  scores_count: number;
  created_at: string;
  created_by: string;
}

export interface AssessmentStatistics {
  average?: number;
  highest?: number;
  lowest?: number;
  count: number;
  average_percentage?: number;
  highest_percentage?: number;
  lowest_percentage?: number;
  grade_distribution?: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
  };
  level_distribution?: {
    rubric_level__code: string;
    rubric_level__label: string;
    count: number;
  }[];
  total_scored?: number;
  distribution?: {
    rubric_level__code: string;
    rubric_level__label: string;
    rubric_level__numeric_value: number;
    count: number;
  }[];
}

export interface AssessmentDetail extends Assessment {
  statistics: AssessmentStatistics;
  rubric_scale_details: RubricScaleDetail | null;
  scores: AssessmentScore[];
  rubric_levels: RubricLevel[];
}

// Assessment Score
export interface AssessmentScore {
  id: number;
  assessment: number;
  assessment_name: string;
  subject_name: string;
  student: number;
  student_name: string;
  student_admission: string;
  score: number | null;
  total_marks: number;
  percentage: number | null;
  rubric_level: number | null;
  rubric_level_label: string | null;
  rubric_level_code: string | null;
  comments: string;
  submitted_at: string | null;
  graded_at: string;
  graded_by: string;
}

export interface BulkScoreData {
  assessment: number;
  scores: {
    student_id: number;
    score?: number;
    rubric_level_id?: number;
    comments?: string;
    narrative?: string;
  }[];
  scored_by: string;
}

// Form Data Types (updated to use cohort_subject)
export interface AssessmentFormData {
  cohort_subject: number;
  term: number | null;
  name: string;
  assessment_type: string;
  evaluation_type: string;
  total_marks: number | null;
  rubric_scale: number | null;
  assessment_date: string | null;
  description: string;
  weight: number;
}

export interface RubricScaleFormData {
  curriculum: number;
  name: string;
  description: string;
  is_active: boolean;
}

export interface RubricLevelFormData {
  rubric_scale: number;
  code: string;
  label: string;
  description: string;
  numeric_value: number;
  sequence: number;
}
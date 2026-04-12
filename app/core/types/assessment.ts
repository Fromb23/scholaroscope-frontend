// app/core/types/assessment.ts

export enum AssessmentType {
  CAT = 'CAT',
  TEST = 'TEST',
  MAIN_EXAM = 'MAIN_EXAM',
  MOCK = 'MOCK',
  PROJECT = 'PROJECT',
  ASSIGNMENT = 'ASSIGNMENT',
  PRACTICAL = 'PRACTICAL',
  COMPETENCY = 'COMPETENCY',
}

export enum EvaluationType {
  NUMERIC = 'NUMERIC',
  RUBRIC = 'RUBRIC',
  DESCRIPTIVE = 'DESCRIPTIVE',
  COMPETENCY = 'COMPETENCY',
}

export enum AssessmentStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  FINALIZED = 'FINALIZED',
}

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
  status: AssessmentStatus;
  status_display: string;
  scores_count: number;
  created_at: string;
  created_by: string;
  weight: number;
}

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
  status: AssessmentStatus;
  weight: number;
}

export interface StudentScoresResponse {
  statistics: {
    average: number;
    count: number;
  };
  scores: AssessmentScore[];
}

// ── Derived helpers (pure functions — no API calls) ───────────────────────

export interface GradeInfo {
  grade: string;
  label: string;
  percentage: string;
  color: 'success' | 'info' | 'warning' | 'danger';
}

export function calculateGrade(
  score: number | null | undefined,
  totalMarks: number
): GradeInfo | null {
  if (score == null || !totalMarks) return null;
  const pct = (score / totalMarks) * 100;
  if (pct >= 80) return { grade: 'A', label: 'Excellent', percentage: pct.toFixed(1), color: 'success' };
  if (pct >= 70) return { grade: 'B', label: 'Very Good', percentage: pct.toFixed(1), color: 'info' };
  if (pct >= 60) return { grade: 'C', label: 'Good', percentage: pct.toFixed(1), color: 'info' };
  if (pct >= 50) return { grade: 'D', label: 'Satisfactory', percentage: pct.toFixed(1), color: 'warning' };
  return { grade: 'E', label: 'Poor Performance', percentage: pct.toFixed(1), color: 'danger' };
}

export interface ScoreStats {
  average: number;
  highest: number;
  lowest: number;
  scored: number;
  total: number;
  completion: number;
}

export function calculateScoreStats(scores: AssessmentScore[]): ScoreStats {
  if (!scores.length) return { average: 0, highest: 0, lowest: 0, scored: 0, total: 0, completion: 0 };
  const valid = scores.filter(s => s.score != null).map(s => s.score as number);
  const scored = valid.length;
  const total = scores.length;
  return {
    average: scored ? valid.reduce((a, b) => a + b, 0) / scored : 0,
    highest: scored ? Math.max(...valid) : 0,
    lowest: scored ? Math.min(...valid) : 0,
    scored,
    total,
    completion: total ? Math.round((scored / total) * 100) : 0,
  };
}
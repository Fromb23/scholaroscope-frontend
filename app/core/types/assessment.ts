// app/core/types/assessment.ts

export enum AssessmentType {
  ENTRY = 'ENTRY',
  CAT = 'CAT',
  TEST = 'TEST',
  MIDTERM = 'MIDTERM',
  MAIN_EXAM = 'MAIN_EXAM',
  MOCK = 'MOCK',
  PROJECT = 'PROJECT',
  ASSIGNMENT = 'ASSIGNMENT',
  PRACTICAL = 'PRACTICAL',
  COMPETENCY = 'COMPETENCY',
}

export const ASSESSMENT_TYPE_LABELS: Record<AssessmentType, string> = {
  [AssessmentType.ENTRY]: 'Entry / Baseline',
  [AssessmentType.CAT]: 'CAT',
  [AssessmentType.TEST]: 'Test',
  [AssessmentType.MIDTERM]: 'Midterm',
  [AssessmentType.MAIN_EXAM]: 'Main Exam',
  [AssessmentType.MOCK]: 'Mock',
  [AssessmentType.PROJECT]: 'Project',
  [AssessmentType.ASSIGNMENT]: 'Assignment',
  [AssessmentType.PRACTICAL]: 'Practical',
  [AssessmentType.COMPETENCY]: 'Competency',
};

export const ASSESSMENT_TYPE_OPTIONS = Object.values(AssessmentType).map((type) => ({
  value: type,
  label: ASSESSMENT_TYPE_LABELS[type],
}));

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

export enum AssessmentParticipationMode {
  NONE = 'NONE',
  TRACKED = 'TRACKED',
}

export enum AssessmentParticipationStatus {
  EXPECTED = 'EXPECTED',
  COMPLETED = 'COMPLETED',
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  EXCUSED = 'EXCUSED',
  MAKEUP_PENDING = 'MAKEUP_PENDING',
  MAKEUP_COMPLETED = 'MAKEUP_COMPLETED',
  NOT_ADMITTED_YET = 'NOT_ADMITTED_YET',
  NOT_ENROLLED_IN_SUBJECT = 'NOT_ENROLLED_IN_SUBJECT',
  NOT_PART_OF_ASSESSMENT = 'NOT_PART_OF_ASSESSMENT',
  LATE_ENROLLED = 'LATE_ENROLLED',
}

export enum AssessmentScoreStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  GRADED = 'GRADED',
  ABSENT = 'ABSENT',
  EXCUSED = 'EXCUSED',
  NOT_ASSIGNED = 'NOT_ASSIGNED',
  NOT_ADMITTED_YET = 'NOT_ADMITTED_YET',
  LATE_ENROLLED = 'LATE_ENROLLED',
  NOT_ENROLLED_IN_SUBJECT = 'NOT_ENROLLED_IN_SUBJECT',
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
  curriculum_id: number | null;
  curriculum_name: string | null;
  curriculum_type: string | null;
  cohort_curriculum_type: string | null;
  subject_curriculum_type: string | null;
  subject_source: string | null;
  teaching_link_id: number | null;
  cbc_cohort_subject_id: number | null;
  subject_profile_id: number | null;
  name: string;
  assessment_type: string;
  report_component_key?: string | null;
  assessment_type_display: string;
  evaluation_type: string;
  evaluation_type_display: string;
  total_marks: number | null;
  rubric_scale: number | null;
  rubric_scale_name: string | null;
  assessment_date: string | null;
  description: string;
  participation_mode: AssessmentParticipationMode;
  status: AssessmentStatus;
  status_display: string;
  scores_count: number;
  entered_score_evidence_count?: number;
  can_update?: boolean;
  can_delete?: boolean;
  can_activate?: boolean;
  can_finalize?: boolean;
  can_reopen?: boolean;
  can_score?: boolean;
  created_at: string;
  created_by: number | null;
}

export interface AssessmentPolicyContext {
  cohort_name?: string | null;
  subject_id?: number | null;
  subject_name?: string | null;
  subject_code?: string | null;
  curriculum_id?: number | null;
  curriculum_name?: string | null;
  curriculum_type?: string | null;
  cohort_curriculum_type?: string | null;
  subject_curriculum_type?: string | null;
  subject_source?: string | null;
  teaching_link_id?: number | null;
  cbc_cohort_subject_id?: number | null;
  subject_profile_id?: number | null;
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
  status: AssessmentScoreStatus;
  status_display: string;
  status_note?: string;
  is_pending_review: boolean;
  comments: string;
  submitted_at: string | null;
  graded_at: string;
  graded_by: string;
}

/** Self-scoped score returned inside a learner assessment detail response. */
export interface LearnerAssessmentScore {
  id: number;
  assessment: number;
  assessment_name: string;
  subject_name: string;
  student: number;
  score: number | null;
  total_marks: number;
  percentage: number | null;
  rubric_level: number | null;
  rubric_level_label: string | null;
  rubric_level_code: string | null;
  status: AssessmentScoreStatus;
  status_display: string;
  status_note?: string;
  is_pending_review: boolean;
  comments: string;
  submitted_at: string | null;
  graded_at: string | null;
}

export interface AssessmentScoreDraft {
  score?: number | null;
  rubric_level?: number | null;
  status?: AssessmentScoreStatus | null;
  comments?: string;
  status_note?: string;
}

export interface AssessmentReviewSummary {
  pending_review_count: number;
  graded_count: number;
  absent_count: number;
  excused_count: number;
  late_enrolled_count: number;
  not_assigned_count: number;
  not_admitted_yet_count: number;
}

export interface AssessmentParticipationSummary {
  tracking_enabled: boolean;
  sat_count: number;
  missed_count: number;
  makeup_completed_count: number;
  pending_makeup_count: number;
  graded_count: number;
  sat_not_graded_count: number;
  makeup_ready_for_grading_count: number;
  late_enrolled_count: number;
  not_part_of_assessment_count: number;
  eligible_for_grading_count: number;
}

export interface AssessmentParticipationRecord {
  id: number;
  student: number;
  student_name: string;
  student_admission: string;
  expected_at_assessment_time: boolean;
  participation_status: AssessmentParticipationStatus | null;
  participation_status_display: string;
  original_participation_status: AssessmentParticipationStatus | null;
  makeup_completed_at: string | null;
  makeup_note: string;
  marked_by: number | null;
  marked_at: string | null;
  created_at: string;
  updated_at: string;
  grading_eligible: boolean;
  grading_state: string;
  score_status: AssessmentScoreStatus | null;
  has_score: boolean;
}

/** Self-scoped participation returned inside a learner assessment detail response. */
export interface LearnerAssessmentParticipation {
  id: number;
  student: number;
  expected_at_assessment_time: boolean;
  participation_status: AssessmentParticipationStatus | null;
  participation_status_display: string;
  makeup_completed_at: string | null;
}

export interface AssessmentParticipationRosterResponse {
  summary: AssessmentParticipationSummary;
  records: AssessmentParticipationRecord[];
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
  participation_summary: AssessmentParticipationSummary;
  rubric_scale_details: RubricScaleDetail | null;
  scores: AssessmentScore[];
  rubric_levels: RubricLevel[];
}

export interface LearnerAssessmentDetail extends Pick<
  Assessment,
  | 'id'
  | 'cohort_subject'
  | 'cohort_id'
  | 'cohort_name'
  | 'subject_id'
  | 'subject_name'
  | 'subject_code'
  | 'term'
  | 'term_name'
  | 'name'
  | 'assessment_type'
  | 'assessment_type_display'
  | 'evaluation_type'
  | 'evaluation_type_display'
  | 'total_marks'
  | 'rubric_scale'
  | 'rubric_scale_name'
  | 'assessment_date'
  | 'description'
  | 'participation_mode'
  | 'status'
  | 'status_display'
> {
  rubric_levels: RubricLevel[];
  own_score: LearnerAssessmentScore | null;
  own_participation: LearnerAssessmentParticipation | null;
}

export type AssessmentDetailResponse = AssessmentDetail | LearnerAssessmentDetail;

export function isLearnerAssessmentDetail(
  assessment: AssessmentDetailResponse,
): assessment is LearnerAssessmentDetail {
  return 'own_score' in assessment || 'own_participation' in assessment;
}

export interface BulkScoreData {
  assessment: number;
  scores: {
    student_id: number;
    score?: number | null;
    rubric_level_id?: number | null;
    status?: AssessmentScoreStatus;
    comments?: string;
    status_note?: string;
    narrative?: string;
  }[];
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
  participation_mode: AssessmentParticipationMode;
}

export interface AssessmentParticipationBulkUpdateData {
  records: {
    student_id: number;
    participation_status: AssessmentParticipationStatus;
  }[];
}

export interface AssessmentMakeupCompletionData {
  student_id: number;
  completed?: boolean;
  makeup_note?: string;
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

export function getAssessmentTypeLabel(type: string): string {
  return ASSESSMENT_TYPE_LABELS[type as AssessmentType]
    ?? type
      .toLowerCase()
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
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

function normalizeAssessmentSortValue(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function sortAssessmentScores(scores: AssessmentScore[]): AssessmentScore[] {
  return [...scores].sort((left, right) => {
    const admissionCompare = normalizeAssessmentSortValue(left.student_admission)
      .localeCompare(normalizeAssessmentSortValue(right.student_admission), undefined, { numeric: true });
    if (admissionCompare !== 0) {
      return admissionCompare;
    }

    const nameCompare = normalizeAssessmentSortValue(left.student_name)
      .localeCompare(normalizeAssessmentSortValue(right.student_name));
    if (nameCompare !== 0) {
      return nameCompare;
    }

    return left.student - right.student;
  });
}

export function hasAssessmentScoreDraftField(
  draft: AssessmentScoreDraft | undefined,
  field: keyof AssessmentScoreDraft
): boolean {
  return Boolean(draft) && Object.prototype.hasOwnProperty.call(draft, field);
}

export function getAssessmentScoreDraftValue<T extends keyof AssessmentScoreDraft>(
  draft: AssessmentScoreDraft | undefined,
  field: T,
  fallback: AssessmentScoreDraft[T]
): AssessmentScoreDraft[T] {
  if (hasAssessmentScoreDraftField(draft, field)) {
    return draft?.[field] as AssessmentScoreDraft[T];
  }

  return fallback;
}

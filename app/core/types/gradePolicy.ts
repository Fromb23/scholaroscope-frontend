// app/core/types/gradePolicy.ts

export type AggregationMethod =
    | 'AVERAGE_PLUS_EXAM'
    | 'WEIGHTED'
    | 'PAPERS_AVERAGE'
    | 'DROP_LOWEST'
    | 'EXAM_ONLY'
    | 'CUSTOM';

export type GradeStatus = 'FINAL' | 'PROVISIONAL' | 'INCOMPLETE';

export interface GradingBand {
    min: number;
    max?: number;
    grade: string;
    label?: string;
}

export interface AssessmentCategoryConfig {
    id?: number;
    assessment_type: string;
    weight: number;
    cap?: number | null;
    combine_method: string;
    sequence: number;
}

export interface GradePolicy {
    id: number;
    name: string;
    description?: string;
    cohort_subject?: number | null;
    cohort_subject_name?: string | null;
    cohort?: number | null;
    cohort_name?: string | null;
    curriculum?: number | null;
    curriculum_name?: string | null;
    term?: number | null;
    term_name?: string | null;
    aggregation_method: AggregationMethod;
    default_weighting: Record<string, number>;
    required_components: string[];
    grading_scale: GradingBand[];
    drop_lowest_cat: boolean;
    cap_cat_score?: number | null;
    cap_exam_score?: number | null;
    is_active: boolean;
    is_default: boolean;
    is_frozen?: boolean;
    category_configs?: AssessmentCategoryConfig[];
    created_at: string;
    updated_at: string;
    created_by?: number | null;
    created_by_name?: string | null;
}

export interface ComputedGradeDTO {
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
    policy?: number | null;
    policy_name?: string | null;
    policy_version?: number | null;
    component_scores: Record<string, number>;
    final_score: number;
    letter_grade: string;
    letter_label: string;
    grade_status: GradeStatus;
    computation_timestamp: string;
    computation_details: {
        method: AggregationMethod;
        log: string[];
    };
}

export interface GradePolicyPayload {
    name: string;
    description?: string;
    cohort_subject?: number | null;
    cohort?: number | null;
    curriculum?: number | null;
    term?: number | null;
    aggregation_method: AggregationMethod;
    default_weighting: Record<string, number>;
    required_components: string[];
    grading_scale: GradingBand[];
    drop_lowest_cat?: boolean;
    cap_cat_score?: number | null;
    cap_exam_score?: number | null;
    is_active?: boolean;
    is_default?: boolean;
    category_configs?: Omit<AssessmentCategoryConfig, 'id'>[];
}

export interface PolicyFilters {
    cohort_subject?: number;
    cohort?: number;
    curriculum?: number;
    term?: number;
    is_active?: boolean;
}

export interface PolicyContextFilters {
    cohort_subject_id?: number;
    cohort_id?: number;
    curriculum_id?: number;
    term_id?: number;
}

export interface ComputedGradeFilters {
    student?: number;
    term?: number;
    cohort_subject?: number;
    policy?: number;
}

export interface ComputeGradesPayload {
    term_id: number;
    cohort_id?: number;
    policy_id?: number;
}

export interface ComputeResponse {
    detail: string;
    term: string;
    errors?: string[] | null;
}
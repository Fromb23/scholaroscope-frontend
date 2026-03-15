/**
 * Aggregation method for computing final grades
 */
export type AggregationMethod =
    | 'AVERAGE_PLUS_EXAM'
    | 'WEIGHTED'
    | 'PAPERS_AVERAGE'
    | 'DROP_LOWEST'
    | 'EXAM_ONLY'
    | 'CUSTOM';

/**
 * Method for combining assessment scores within a category
 */
export type CombineMethod =
    | 'AVERAGE'
    | 'SUM'
    | 'WEIGHTED_AVERAGE'
    | 'BEST_OF'
    | 'DROP_LOWEST';

/**
 * Assessment category configuration
 */
export interface AssessmentCategoryConfig {
    id?: number;
    assessment_type: string;
    weight: number;
    cap?: number | null;
    combine_method: CombineMethod;
    sequence: number;
}

/**
 * Policy context - defines where the policy applies
 */
export interface PolicyContext {
    cohort_subject?: number | null;
    cohort?: number | null;
    curriculum?: number | null;
    term?: number | null;
}

/**
 * Grade computation policy
 */
export interface GradePolicy {
    id: number;
    name: string;
    description?: string;

    // Context
    cohort_subject?: number | null;
    cohort_subject_name?: string | null;
    cohort?: number | null;
    cohort_name?: string | null;
    curriculum?: number | null;
    curriculum_name?: string | null;
    term?: number | null;
    term_name?: string | null;

    // Computation rules
    aggregation_method: AggregationMethod;
    default_weighting: Record<string, number>;

    // Advanced options
    drop_lowest_cat: boolean;
    cap_cat_score?: number | null;
    cap_exam_score?: number | null;

    // Status
    is_active: boolean;
    is_default: boolean;

    // Category configurations
    category_configs?: AssessmentCategoryConfig[];

    // Metadata
    created_at: string;
    updated_at: string;
    created_by?: number;
    created_by_name?: string;
}

/**
 * Computed grade result
 */
export interface ComputedGradeDTO {
    policy_id: number;
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
    component_scores: Record<string, number>;
    final_score: number;
    letter_grade: string;
    computation_timestamp: string;
    computation_details: {
        method: AggregationMethod;
        log: string[];
        scores_by_type: Record<string, number[]>;
    };
}

/**
 * Response from compute operation
 */
export interface ComputeResponse {
    detail: string;
    term: string;
    errors?: string[] | null;
}

/**
 * Grade comparison data
 */
export interface GradeComparison {
    total_computed: number;
    total_legacy: number;
    differences: GradeDifference[];
    average_difference: number;
}

/**
 * Individual grade difference
 */
export interface GradeDifference {
    student_name: string;
    subject_name: string;
    computed_score: number;
    legacy_score: number;
    difference: number;
    policy_name?: string;
}

/**
 * Payload for creating/updating a policy
 */
export interface GradePolicyPayload {
    name: string;
    description?: string;
    cohort_subject?: number | null;
    cohort?: number | null;
    curriculum?: number | null;
    term?: number | null;
    aggregation_method: AggregationMethod;
    default_weighting?: Record<string, number>;
    drop_lowest_cat?: boolean;
    cap_cat_score?: number | null;
    cap_exam_score?: number | null;
    is_active?: boolean;
    is_default?: boolean;
    category_configs?: Omit<AssessmentCategoryConfig, 'id'>[];
}

/**
 * Filters for fetching policies
 */
export interface PolicyFilters {
    cohort_subject?: number;
    cohort?: number;
    curriculum?: number;
    term?: number;
    is_active?: boolean;
}

/**
 * Context filters for policy lookup
 */
export interface PolicyContextFilters {
    cohort_subject_id?: number;
    cohort_id?: number;
    curriculum_id?: number;
    term_id?: number;
}

/**
 * Filters for fetching computed grades
 */
export interface ComputedGradeFilters {
    student?: number;
    term?: number;
    cohort_subject?: number;
    policy?: number;
}

/**
 * Payload for computing grades with policy
 */
export interface ComputeGradesPayload {
    term_id: number;
    cohort_id?: number;
    policy_id?: number;
}
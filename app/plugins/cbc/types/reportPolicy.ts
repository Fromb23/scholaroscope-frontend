export type CbcPolicyLevel = 'EE' | 'ME' | 'AE' | 'BE';
export type CbcPolicyLevelCode =
    | 'EE1'
    | 'EE2'
    | 'ME1'
    | 'ME2'
    | 'AE1'
    | 'AE2'
    | 'BE1'
    | 'BE2';

export type CbcRoundingMode = 'ROUND_HALF_UP' | 'ROUND_DOWN' | 'ROUND_UP';
export type PolicyAuthoringMode =
    | 'CLASS_SUBJECT_SETUP'
    | 'CLASS_SETUP'
    | 'WORKSPACE_POLICY'
    | 'INSTITUTION_GOVERNANCE';
export type CbcClassReportPolicyScope =
    | 'COHORT'
    | 'COHORT_SUBJECT'
    | 'WORKSPACE_DEFAULT';
export type CbcAssessmentResultStatus =
    | 'NOT_IN_SCOPE'
    | 'NO_EVIDENCE'
    | 'LATE_ENTRY_BASELINE_PENDING'
    | 'PROVISIONAL_EVIDENCE'
    | 'FINAL'
    | 'PROVISIONAL'
    | 'INCOMPLETE';

export interface CbcLateEnrolmentPolicy {
    pre_enrolment_component_handling: 'EXEMPT' | string;
    allow_provisional_assessment_indicator: boolean;
    award_final_point_only_when_evidence_sufficient: boolean;
    minimum_mapped_outcomes_for_final_result: number | null;
    minimum_essential_outcome_coverage_percent: number | null;
    minimum_independent_evidence_events: number | null;
    allow_single_broad_evidence_event: boolean;
    allow_teacher_override: boolean;
    teacher_override_requires_reason: boolean;
}

export interface CbcLevelScaleRow {
    min: number;
    max: number;
    level: CbcPolicyLevel;
    code: CbcPolicyLevelCode;
    label: string;
    points: number;
}

export interface CbcReportPolicy {
    id: number;
    name: string;
    description?: string | null;
    organization: number;
    subject_profile: number | null;
    subject_profile_name?: string | null;
    cohort: number | null;
    cohort_name?: string | null;
    cbc_cohort_subject: number | null;
    cbc_cohort_subject_name?: string | null;
    term: number | null;
    term_name?: string | null;
    assessment_weights: Record<string, number>;
    level_scale: CbcLevelScaleRow[];
    diagnostic_assessment_types: string[];
    required_components: string[];
    flexible_config?: Record<string, unknown> | null;
    late_enrolment?: Partial<CbcLateEnrolmentPolicy>;
    include_assignments: boolean;
    include_projects: boolean;
    include_practicals: boolean;
    rounding_mode: CbcRoundingMode;
    is_default: boolean;
    is_active: boolean;
    created_by: number | null;
    created_at: string;
    updated_at: string;
}

export interface CbcReportPolicyPayload {
    name: string;
    description?: string;
    source?: 'class_configuration' | 'institution_governance';
    subject_profile?: number | null;
    cohort?: number | null;
    cbc_cohort_subject?: number | null;
    term?: number | null;
    assessment_weights: Record<string, number>;
    level_scale: CbcLevelScaleRow[];
    diagnostic_assessment_types: string[];
    required_components: string[];
    late_enrolment?: Partial<CbcLateEnrolmentPolicy>;
    include_assignments?: boolean;
    include_projects?: boolean;
    include_practicals?: boolean;
    rounding_mode: CbcRoundingMode;
    is_default?: boolean;
    is_active?: boolean;
}

export interface CbcReportPolicyFilters {
    subject_profile?: number;
    cohort?: number;
    cbc_cohort_subject?: number;
    term?: number;
    is_active?: boolean;
    is_default?: boolean;
}

export interface CbcAssessmentReportResult {
    weighted_score: number | null;
    cbc_level: CbcPolicyLevel | '';
    cbc_code: CbcPolicyLevelCode | '' | null;
    cbc_label: string;
    cbc_points: number | null;
    result_status: CbcAssessmentResultStatus;
    component_scores: Record<string, unknown>;
    diagnostic_scores: Record<string, unknown>;
    missing_components: string[];
    computation_details: Record<string, unknown>;
    is_stale: boolean;
    computed_at: string | null;
}

export interface CbcAssessmentReportResultFilters {
    student?: number;
    term?: number;
    cbc_cohort_subject?: number;
    subject_profile?: number;
    result_status?: CbcAssessmentResultStatus;
    is_stale?: boolean;
}

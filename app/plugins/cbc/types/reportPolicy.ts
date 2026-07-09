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

export type CbcPolicyOrigin =
    | 'organization_owned'
    | 'organization_approved'
    | 'platform_reference'
    | 'missing'
    | 'conflict';

export type CbcTermPolicyPlanStatus = 'DRAFT' | 'ACTIVE' | 'FROZEN';

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

export interface CbcPolicyGovernanceMetadata {
    origin: CbcPolicyOrigin | string;
    is_organization_owned: boolean;
    is_organization_approved: boolean;
    is_platform_reference: boolean;
    can_compute_official_reports: boolean;
    source_policy_id?: number | null;
    cloned_from_policy_id?: number | null;
}

export interface CbcPolicyBrief {
    policy_id: number | null;
    policy_name: string | null;
    term: { id: number; name: string } | string | null;
    scope: string | null;
    policy_origin?: CbcPolicyGovernanceMetadata | null;
    resolution_path?: string[];
    allowed_assessment_types: string[];
    required_components: string[];
    optional_components: string[];
    include_assignments: boolean;
    include_projects: boolean;
    include_practicals: boolean;
    assignment_inclusion?: 'counts' | 'practice_only' | string;
    project_inclusion?: 'counts' | 'not_counted' | string;
    practical_inclusion?: 'counts' | 'not_counted' | string;
    repeated_evidence?: string | null;
    repeated_evidence_combination?: string | null;
    is_active: boolean;
    is_frozen?: boolean;
    is_frozen_historical?: boolean;
    last_updated: string | null;
    updated_by: string | null;
    exception_available?: boolean;
    message?: string;
    suggested_actions?: string[];
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
    source_policy?: number | null;
    cloned_from_policy?: number | null;
    governance_metadata?: CbcPolicyGovernanceMetadata | null;
    policy_brief?: CbcPolicyBrief | null;
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

export interface CbcReportPolicyApplyScopePayload {
    term_id?: number | null;
    cbc_cohort_subject_id?: number | null;
    cohort_id?: number | null;
    subject_profile_id?: number | null;
    is_default?: boolean;
    name?: string;
}

export interface CbcTermPolicyPlan {
    id: number;
    organization?: number;
    organization_id?: number;
    term?: number;
    term_id?: number;
    selected_policy_ids: number[];
    use_all_active_policies: boolean;
    status: CbcTermPolicyPlanStatus;
    created_at?: string;
    updated_at?: string;
    activated_at?: string | null;
    frozen_at?: string | null;
}

export interface CbcPolicyCoverageEntry {
    cbc_cohort_subject_id?: number | null;
    cohort_subject_id?: number | null;
    label?: string;
    cohort?: { id: number; name: string } | null;
    subject?: { id: number; name: string; code?: string | null } | null;
    resolved_policy?: CbcReportPolicy | null;
    effective_policy?: CbcReportPolicy | null;
    status?: 'READY' | 'MISSING' | 'CONFLICT' | string | null;
    message?: string | null;
    resolution_path: string[];
    policy_scope: string | null;
    policy_status: string | null;
    computation_allowed: boolean;
    missing_policy_warning?: string | null;
    conflict_warning?: string | null;
    platform_reference_warning?: string | null;
    shadowed_policy_warning?: string | null;
    conflicting_policies?: CbcReportPolicy[];
}

export interface CbcPolicyCoverageWarning {
    policy_id?: number | null;
    policy_name?: string | null;
    scope?: string | null;
    message: string;
}

export interface CbcShadowedPolicyWarning {
    policy: CbcReportPolicy;
    warning: string;
    affected_class_subject_ids: number[];
}

export interface CbcTermPolicyCoverage {
    term?: {
        id: number;
        name: string;
        status: string;
        is_frozen: boolean;
    };
    term_id?: number;
    organization_id: number;
    plan?: CbcTermPolicyPlan | null;
    term_policy_plan?: CbcTermPolicyPlan | null;
    default_plan_message?: string | null;
    manual_selection_notice?: string | null;
    use_all_active_policies?: boolean;
    entries: CbcPolicyCoverageEntry[];
    active_policies: CbcReportPolicy[];
    missing?: CbcPolicyCoverageWarning[];
    conflicts?: CbcPolicyCoverageWarning[];
    shadowed?: CbcPolicyCoverageWarning[];
    missing_count?: number;
    conflict_count?: number;
    shadowed_policies?: CbcShadowedPolicyWarning[];
    readiness_status?: 'READY' | 'MISSING_POLICIES' | 'CONFLICTS' | 'NOT_CONFIGURED' | string;
    status?: 'READY' | 'NOT_READY' | 'CONFLICT' | string;
    computation_allowed: boolean;
    message?: string | null;
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

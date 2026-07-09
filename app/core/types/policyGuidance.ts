export interface AcademicPolicyOrigin {
    origin: string;
    is_organization_owned?: boolean;
    is_organization_approved?: boolean;
    is_platform_reference?: boolean;
    can_compute_official_reports?: boolean;
}

export interface AcademicPolicyBrief {
    policy_ready?: boolean;
    engine?: string | null;
    policy_id?: number | null;
    policy_name?: string | null;
    term?: { id: number; name: string } | string | null;
    scope?: string | null;
    policy_origin?: AcademicPolicyOrigin | null;
    resolution_path?: string[];
    allowed_assessment_types?: string[];
    assessment_components?: AcademicPolicyAssessmentComponent[];
    available_assessment_components?: AcademicPolicyAssessmentComponent[];
    completed_components?: string[];
    required_components?: string[];
    optional_components?: string[];
    include_assignments?: boolean;
    include_projects?: boolean;
    include_practicals?: boolean;
    assignment_inclusion?: 'counts' | 'practice_only' | string;
    project_inclusion?: 'counts' | 'not_counted' | string;
    practical_inclusion?: 'counts' | 'not_counted' | string;
    repeated_evidence_combination?: string | null;
    is_active?: boolean;
    is_frozen_historical?: boolean;
    last_updated?: string | null;
    updated_by?: string | null;
    task_type?: string;
    reporting_mode?: 'counts' | 'practice_only' | string;
    blocked_reason?: string | null;
    message?: string | null;
}

export interface AcademicPolicyAssessmentComponent {
    component_key: string;
    key?: string;
    label: string;
    assessment_type: string;
    default_name?: string;
    weight?: number;
    required?: boolean;
    max_count?: number;
    sequence?: number;
}

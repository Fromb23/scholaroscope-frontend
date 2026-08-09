export type OperatingContext = 'WORKSPACE_MANAGEMENT' | 'MY_TEACHING';

export type Role = 'ADMIN' | 'INSTRUCTOR';

export interface WorkspaceCapabilities {
    can_teach?: boolean;
    can_manage_staff?: boolean;
    can_manage_academic_setup?: boolean;
    can_manage_assessments?: boolean;
    can_manage_learners?: boolean;
    can_manage_cohorts?: boolean;
    can_manage_subjects?: boolean;
    can_view_reports?: boolean;
    can_manage_plugins?: boolean;
    can_manage_announcements?: boolean;
    is_workspace_owner?: boolean;
    workspace_mode?: string | null;
    workspace_behavior?: string | null;
    workspace_governance?: {
        supports_announcements?: boolean;
    } | null;
    authorization?: {
        enforced?: boolean;
        permission_keys?: string[];
        roles?: unknown[];
        admin_slots?: unknown;
        migration_state?: unknown;
    };
    report_configuration?: {
        report_policy_available: boolean;
        report_policy_mode: string | null;
        report_computation_available: boolean;
        report_computation_class_scoped_only: boolean;
        subject_profile_authoring_allowed: boolean;
        reporting_governance_routes_allowed: boolean;
        allowed_policy_scopes: string[];
    } | null;
}

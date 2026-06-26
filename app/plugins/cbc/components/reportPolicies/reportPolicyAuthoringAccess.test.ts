import { describe, expect, it } from 'vitest';

import { canManageCbcReportPolicyAuthoring } from './reportPolicyAuthoringAccess';
import type { User, WorkspaceCapabilities } from '@/app/core/types/auth';

const user = {
    id: 1,
    email: 'teacher@example.test',
    first_name: 'Test',
    last_name: 'Teacher',
    full_name: 'Test Teacher',
    is_superadmin: false,
    is_active: true,
    phone: '',
    date_joined: '2026-01-01T00:00:00Z',
    last_login: '2026-01-01T00:00:00Z',
} satisfies User;

const baseCapabilities = {
    can_teach: true,
    can_manage_academic_setup: true,
    can_manage_learners: true,
    can_manage_cohorts: true,
    can_manage_subjects: true,
    can_manage_assessments: true,
    can_view_reports: true,
    can_manage_staff: false,
    is_workspace_owner: true,
    workspace_mode: 'FREELANCE_TEACHER',
    workspace_behavior: 'FREELANCE_TEACHER',
} satisfies WorkspaceCapabilities;

const classConfigurationCapabilities = {
    ...baseCapabilities,
    can_manage_report_policy: true,
    report_policy_mode: 'CLASS_CONFIGURATION',
    report_computation_class_scoped_only: true,
    can_author_report_subject_profile: false,
    report_configuration: {
        report_policy_available: true,
        report_policy_mode: 'CLASS_CONFIGURATION',
        report_computation_available: true,
        report_computation_class_scoped_only: true,
        subject_profile_authoring_allowed: false,
        reporting_governance_routes_allowed: false,
        allowed_policy_scopes: [
            'WORKSPACE_DEFAULT',
            'COHORT',
            'COHORT_SUBJECT',
            'TERM',
        ],
    },
} satisfies WorkspaceCapabilities;

const institutionGovernanceCapabilities = {
    ...baseCapabilities,
    can_teach: false,
    can_manage_staff: true,
    is_workspace_owner: false,
    workspace_mode: 'INSTITUTION',
    workspace_behavior: 'INSTITUTION',
    can_manage_report_policy: true,
    report_policy_mode: 'INSTITUTION_GOVERNANCE',
    report_computation_class_scoped_only: false,
    can_author_report_subject_profile: true,
    report_configuration: {
        report_policy_available: true,
        report_policy_mode: 'INSTITUTION_GOVERNANCE',
        report_computation_available: true,
        report_computation_class_scoped_only: false,
        subject_profile_authoring_allowed: true,
        reporting_governance_routes_allowed: true,
        allowed_policy_scopes: [
            'WORKSPACE_DEFAULT',
            'SUBJECT_PROFILE',
            'COHORT',
            'COHORT_SUBJECT',
            'TERM',
        ],
    },
} satisfies WorkspaceCapabilities;

describe('CBC report policy authoring access', () => {
    it('does not allow class-configuration capability into institution governance routes', () => {
        expect(canManageCbcReportPolicyAuthoring({
            user,
            capabilities: classConfigurationCapabilities,
            authoringMode: 'INSTITUTION_GOVERNANCE',
        })).toBe(false);
    });

    it('allows class-owned report setup for class-configuration workspaces', () => {
        expect(canManageCbcReportPolicyAuthoring({
            user,
            capabilities: classConfigurationCapabilities,
            authoringMode: 'CLASS_SUBJECT_SETUP',
        })).toBe(true);
    });

    it('allows institution policy governance only with governance-route capability', () => {
        expect(canManageCbcReportPolicyAuthoring({
            user,
            capabilities: institutionGovernanceCapabilities,
            authoringMode: 'INSTITUTION_GOVERNANCE',
        })).toBe(true);
    });
});

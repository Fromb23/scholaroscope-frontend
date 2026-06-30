import { describe, expect, it } from 'vitest';

import './navigationExtension';
import { getPluginNavigationItems, type PluginNavigationContext } from '@/app/core/registry/pluginNavigation';
import type { User, WorkspaceCapabilities } from '@/app/core/types/auth';

const adminUser = {
    id: 1,
    email: 'admin@example.test',
    first_name: 'Ada',
    last_name: 'Admin',
    full_name: 'Ada Admin',
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

const governanceCapabilities = {
    ...baseCapabilities,
    can_teach: false,
    can_manage_staff: true,
    is_workspace_owner: false,
    workspace_mode: 'INSTITUTION',
    workspace_behavior: 'INSTITUTION',
    can_manage_report_policy: true,
    report_policy_mode: 'INSTITUTION_GOVERNANCE',
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

function buildContext(capabilities: WorkspaceCapabilities): PluginNavigationContext {
    return {
        role: 'ADMIN',
        user: adminUser,
        orgType: 'INSTITUTION',
        workspaceBehavior: capabilities.workspace_behavior,
        canTeach: capabilities.can_teach,
        isWorkspaceOwner: capabilities.is_workspace_owner,
        capabilities,
        hasPlugin: (pluginKey) => pluginKey === 'cbc',
        hasCurriculumType: () => false,
        badges: {},
        curricula: [],
    };
}

function cbcManagementChildren(capabilities: WorkspaceCapabilities) {
    const [item] = getPluginNavigationItems(
        'admin.primary.afterAssessments',
        buildContext(capabilities),
    );
    return item?.children ?? [];
}

describe('CBC plugin navigation capability boundaries', () => {
    it('does not leak institution report policy authoring into raw admin navigation', () => {
        const children = cbcManagementChildren(baseCapabilities);

        expect(children.map((item) => item.name)).not.toContain('Report Policies');
        expect(children.map((item) => item.href)).not.toContain('/cbc/report-policies');
    });

    it('shows CBC report policies only when the target capability allows governance authoring', () => {
        const children = cbcManagementChildren(governanceCapabilities);

        expect(children.map((item) => item.name)).toContain('Report Policies');
        expect(children.map((item) => item.href)).toContain('/cbc/report-policies');
    });
});

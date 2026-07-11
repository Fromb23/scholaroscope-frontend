import { describe, expect, it } from 'vitest';

import {
  resolveNavConfig,
  type NavItem,
} from '@/app/components/layout/navConfig';
import type {
  ActiveOrg,
  User,
  WorkspaceCapabilities,
} from '@/app/core/types/auth';
import type { PluginNavigationContext } from '@/app/core/registry/pluginNavigation';

const user: User = {
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
};

const activeOrg: ActiveOrg = {
  id: 10,
  name: 'Institution',
  slug: 'institution',
  org_type: 'INSTITUTION',
};

function capabilities(permissionKeys: string[]): WorkspaceCapabilities {
  return {
    can_teach: true,
    can_manage_academic_setup: true,
    can_manage_learners: true,
    can_manage_cohorts: true,
    can_manage_subjects: true,
    can_manage_assessments: true,
    can_view_reports: true,
    can_manage_staff: true,
    is_workspace_owner: false,
    workspace_mode: 'INSTITUTION',
    workspace_behavior: 'INSTITUTION',
    product_capabilities: {},
    effective_capabilities: {},
    workspace_governance: {
      mode: 'MANAGED_TEAM',
      supports_custom_roles: true,
      supports_staff_management: true,
      supports_announcements: true,
      supports_internal_requests: true,
      supports_internal_approvals: true,
      default_action_authority: 'ROLE_DEPENDENT',
    },
    authorization: {
      enforced: true,
      permission_keys: permissionKeys,
      roles: [],
      admin_slots: null,
      migration_state: null,
    },
  };
}

function pluginContext(
  workspaceCapabilities: WorkspaceCapabilities,
): PluginNavigationContext {
  return {
    role: 'ADMIN',
    orgType: activeOrg.org_type,
    workspaceBehavior: workspaceCapabilities.workspace_behavior,
    canTeach: workspaceCapabilities.can_teach,
    isWorkspaceOwner: workspaceCapabilities.is_workspace_owner,
    hasPlugin: () => false,
    hasCurriculumType: () => false,
    badges: {},
    curricula: [],
    user,
    capabilities: workspaceCapabilities,
    instructorAccess: {
      hasCurriculumAccess: () => true,
    },
  };
}

function flattenNav(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [
    item,
    ...flattenNav(item.children ?? []),
  ]);
}

function navNames(workspaceCapabilities: WorkspaceCapabilities): string[] {
  const resolved = resolveNavConfig({
    user,
    activeRole: 'ADMIN',
    orgType: activeOrg.org_type,
    capabilities: workspaceCapabilities,
    pluginNavigationContext: pluginContext(workspaceCapabilities),
  });

  return flattenNav([
    ...resolved.primary,
    ...(resolved.secondary ?? []),
  ]).map((item) => item.name);
}

describe('runtime authority invalidation boundaries', () => {
  it('revoked workspace role permission removes protected workspace-access navigation', () => {
    const initiallyAllowed = navNames(capabilities(['workspace.roles.view']));
    const afterRevocation = navNames(capabilities([]));

    expect(initiallyAllowed).toContain('Workspace Roles');
    expect(afterRevocation).not.toContain('Workspace Roles');
  });
});

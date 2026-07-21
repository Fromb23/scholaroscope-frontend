import { describe, expect, it } from 'vitest';

import type { WorkspaceCapabilities } from '@/app/core/types/auth';
import { getWorkspaceSettingsTabs } from '@/app/core/lib/settingsAuthority';

function withPermissions(permissionKeys: string[]): WorkspaceCapabilities {
  return {
    can_teach: false,
    can_manage_academic_setup: false,
    can_manage_learners: false,
    can_manage_cohorts: false,
    can_manage_subjects: false,
    can_manage_assessments: false,
    can_view_reports: false,
    can_manage_staff: false,
    is_workspace_owner: false,
    workspace_mode: 'SCHOOL',
    workspace_behavior: 'INSTITUTION',
    authorization: {
      enforced: true,
      permission_keys: permissionKeys,
      roles: [],
    },
  };
}

describe('workspace settings authority', () => {
  it('does not turn role-management authority into unrelated settings access', () => {
    expect(getWorkspaceSettingsTabs(
      withPermissions(['workspace.roles.manage']),
      { isFreelance: false },
    )).toEqual([]);
  });

  it('exposes only settings areas backed by their named permissions', () => {
    expect(getWorkspaceSettingsTabs(
      withPermissions(['plugins.view']),
      { isFreelance: false },
    )).toEqual(['plugins']);
    expect(getWorkspaceSettingsTabs(
      withPermissions(['themes.manage', 'workspace.members.view']),
      { isFreelance: false },
    )).toEqual(['general', 'members']);
  });
});

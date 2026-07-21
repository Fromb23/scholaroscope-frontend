import { describe, expect, it } from 'vitest';

import type { WorkspaceCapabilities } from '@/app/core/types/auth';
import { canUseAnnouncements } from '@/app/core/lib/workspaceGovernance';

function capabilities(
  enabled: boolean,
  permissionKeys: string[] = ['announcements.view'],
): WorkspaceCapabilities {
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
    product_capabilities: {
      announcements: { enabled },
    },
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
    },
  };
}

describe('announcement capability authority', () => {
  it('allows an enabled announcement product only with its view permission', () => {
    expect(canUseAnnouncements(capabilities(true))).toBe(true);
    expect(canUseAnnouncements(capabilities(true, []))).toBe(false);
  });

  it('keeps an explicit product denial authoritative', () => {
    expect(canUseAnnouncements(capabilities(false))).toBe(false);
  });
});

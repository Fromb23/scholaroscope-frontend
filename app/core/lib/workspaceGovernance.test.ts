import { describe, expect, it } from 'vitest';

import {
  isSoloOwnerWorkspace,
  supportsAnnouncements,
  supportsCustomRoles,
  supportsInternalApprovals,
  supportsInternalRequests,
} from './workspaceGovernance';
import type { WorkspaceCapabilities } from '@/app/core/types/auth';

const soloGovernance: WorkspaceCapabilities['workspace_governance'] = {
  mode: 'SOLO_OWNER',
  supports_custom_roles: false,
  supports_staff_management: false,
  supports_announcements: false,
  supports_internal_requests: false,
  supports_internal_approvals: false,
  default_action_authority: 'DIRECT',
};

describe('workspace governance helpers', () => {
  it('uses backend governance to identify solo-owner workspaces', () => {
    expect(isSoloOwnerWorkspace({ workspace_governance: soloGovernance } as WorkspaceCapabilities)).toBe(true);
    expect(supportsCustomRoles({ workspace_governance: soloGovernance } as WorkspaceCapabilities)).toBe(false);
    expect(supportsAnnouncements({ workspace_governance: soloGovernance } as WorkspaceCapabilities)).toBe(false);
    expect(supportsInternalRequests({ workspace_governance: soloGovernance } as WorkspaceCapabilities)).toBe(false);
    expect(supportsInternalApprovals({ workspace_governance: soloGovernance } as WorkspaceCapabilities)).toBe(false);
  });
});

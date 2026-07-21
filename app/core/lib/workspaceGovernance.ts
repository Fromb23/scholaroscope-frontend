import type { WorkspaceCapabilities } from '@/app/core/types/auth';
import { hasFeatureAccess } from '@/app/core/lib/productCapabilities';

export function getWorkspaceGovernance(capabilities?: WorkspaceCapabilities | null) {
  return capabilities?.workspace_governance ?? null;
}

export function isSoloOwnerWorkspace(capabilities?: WorkspaceCapabilities | null): boolean {
  return getWorkspaceGovernance(capabilities)?.mode === 'SOLO_OWNER';
}

export function supportsCustomRoles(capabilities?: WorkspaceCapabilities | null): boolean {
  const governance = getWorkspaceGovernance(capabilities);
  return governance ? governance.supports_custom_roles : true;
}

export function supportsAnnouncements(capabilities?: WorkspaceCapabilities | null): boolean {
  const governance = getWorkspaceGovernance(capabilities);
  return governance ? governance.supports_announcements : true;
}

export function canUseAnnouncements(capabilities?: WorkspaceCapabilities | null): boolean {
  return supportsAnnouncements(capabilities) && hasFeatureAccess(capabilities, {
    permissionKey: 'announcements.view',
    productCapabilityKey: 'announcements',
  });
}

export function supportsInternalRequests(capabilities?: WorkspaceCapabilities | null): boolean {
  const governance = getWorkspaceGovernance(capabilities);
  return governance ? governance.supports_internal_requests : true;
}

export function supportsInternalApprovals(capabilities?: WorkspaceCapabilities | null): boolean {
  const governance = getWorkspaceGovernance(capabilities);
  return governance ? governance.supports_internal_approvals : true;
}

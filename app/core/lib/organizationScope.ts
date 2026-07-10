import type { ActiveOrg, OrgMembership, Role, User } from '@/app/core/types/auth';

export function resolveScopedOrganizationId(
  explicitOrganizationId?: number | null,
  activeOrganizationId?: number | null,
): number | null {
  return explicitOrganizationId ?? activeOrganizationId ?? null;
}

export function resolveMembershipRoleForOrganization(
  user: Pick<User, 'is_superadmin'> | null,
  activeOrg: Pick<ActiveOrg, 'id'> | null,
  memberships: Array<Pick<OrgMembership, 'organization' | 'role' | 'status'>>,
): Role | null {
  if (!user) {
    return null;
  }

  if (!activeOrg) {
    return null;
  }

  const membership = memberships.find(
    (item) => item.organization.id === activeOrg.id && Boolean(item.status),
  );
  return membership?.role ?? null;
}

export function shouldRefreshForOrganizationChange(
  previousOrganizationId: number | null | undefined,
  nextOrganizationId: number | null,
): boolean {
  if (typeof previousOrganizationId === 'undefined') {
    return false;
  }

  return previousOrganizationId !== nextOrganizationId;
}

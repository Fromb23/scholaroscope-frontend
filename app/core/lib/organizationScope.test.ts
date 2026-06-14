import { describe, expect, it } from 'vitest';

import {
  resolveMembershipRoleForOrganization,
  resolveScopedOrganizationId,
  shouldRefreshForOrganizationChange,
} from './organizationScope';

describe('organization scope helpers', () => {
  it('prefers an explicit organization id over the active workspace id', () => {
    expect(resolveScopedOrganizationId(42, 7)).toBe(42);
  });

  it('falls back to the active workspace id when no explicit organization id exists', () => {
    expect(resolveScopedOrganizationId(null, 7)).toBe(7);
  });

  it('resolves the role for the active workspace membership', () => {
    expect(
      resolveMembershipRoleForOrganization(
        { is_superadmin: false },
        { id: 9 },
        [
          {
            organization: { id: 4, name: 'Old', slug: 'old', org_type: 'INSTITUTION' },
            role: 'ADMIN',
            status: 'ACTIVE',
          },
          {
            organization: { id: 9, name: 'New', slug: 'new', org_type: 'INSTITUTION' },
            role: 'INSTRUCTOR',
            status: 'ACTIVE',
          },
        ],
      ),
    ).toBe('INSTRUCTOR');
  });

  it('marks route refresh only after a real workspace change', () => {
    expect(shouldRefreshForOrganizationChange(undefined, 7)).toBe(false);
    expect(shouldRefreshForOrganizationChange(7, 7)).toBe(false);
    expect(shouldRefreshForOrganizationChange(7, 11)).toBe(true);
  });
});

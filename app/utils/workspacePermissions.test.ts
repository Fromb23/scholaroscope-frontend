import { describe, expect, it } from 'vitest';

import { canManageUsers } from './permissions';

const freelanceOwnerCapabilities = {
  can_teach: true,
  can_manage_academic_setup: true,
  can_manage_cohorts: true,
  can_manage_subjects: true,
  can_manage_learners: true,
  can_manage_assessments: true,
  can_view_reports: true,
  can_manage_staff: false,
};

const institutionAdminCapabilities = {
  ...freelanceOwnerCapabilities,
  can_teach: false,
  can_manage_staff: true,
};

describe('workspace permission helpers', () => {
  it('does not let freelance owner-admin manage users or staff from raw ADMIN role', () => {
    expect(canManageUsers({ is_superadmin: false }, 'ADMIN', freelanceOwnerCapabilities)).toBe(false);
  });

  it('allows institution admins with staff capability to manage users and staff', () => {
    expect(canManageUsers({ is_superadmin: false }, 'ADMIN', institutionAdminCapabilities)).toBe(true);
  });

  it('does not let instructors manage users or staff', () => {
    expect(canManageUsers({ is_superadmin: false }, 'INSTRUCTOR', {
      ...institutionAdminCapabilities,
      can_manage_staff: false,
    })).toBe(false);
  });

  it('does not treat platform identity as workspace staff authority', () => {
    expect(canManageUsers({ is_superadmin: true }, null)).toBe(false);
  });

  it('keeps the legacy admin fallback when capabilities are absent', () => {
    expect(canManageUsers({ is_superadmin: false }, 'ADMIN')).toBe(true);
    expect(canManageUsers({ is_superadmin: false }, 'INSTRUCTOR')).toBe(false);
  });
});

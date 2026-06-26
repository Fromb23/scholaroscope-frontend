import { describe, expect, it } from 'vitest';

import {
  canRenderInstitutionReportOverview,
  shouldUseInstructorReportSurface,
} from './reportAccessPolicy';
import type { ActiveOrg, User, WorkspaceCapabilities } from '@/app/core/types/auth';

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

const institution = {
  id: 10,
  name: 'Institution',
  slug: 'institution',
  org_type: 'INSTITUTION',
} satisfies ActiveOrg;

const personal = {
  id: 11,
  name: 'Personal',
  slug: 'personal',
  org_type: 'PERSONAL',
} satisfies ActiveOrg;

const institutionCapabilities = {
  can_teach: false,
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
} satisfies WorkspaceCapabilities;

const selfManagedCapabilities = {
  ...institutionCapabilities,
  can_teach: true,
  can_manage_staff: false,
  is_workspace_owner: true,
  workspace_mode: 'FREELANCE_TEACHER',
  workspace_behavior: 'FREELANCE_TEACHER',
} satisfies WorkspaceCapabilities;

describe('report access policy', () => {
  it('does not allow raw admin role into institution reports for self-managed teaching workspaces', () => {
    expect(canRenderInstitutionReportOverview({
      user,
      activeRole: 'ADMIN',
      activeOrg: personal,
      capabilities: selfManagedCapabilities,
    })).toBe(false);
    expect(shouldUseInstructorReportSurface({
      user,
      activeRole: 'ADMIN',
      activeOrg: personal,
      capabilities: selfManagedCapabilities,
    })).toBe(true);
  });

  it('keeps institution admins on institution report surfaces', () => {
    expect(canRenderInstitutionReportOverview({
      user,
      activeRole: 'ADMIN',
      activeOrg: institution,
      capabilities: institutionCapabilities,
    })).toBe(true);
  });

  it('routes instructors to instructor report surfaces', () => {
    expect(shouldUseInstructorReportSurface({
      user,
      activeRole: 'INSTRUCTOR',
      activeOrg: institution,
      capabilities: { ...institutionCapabilities, can_teach: true },
    })).toBe(true);
  });
});

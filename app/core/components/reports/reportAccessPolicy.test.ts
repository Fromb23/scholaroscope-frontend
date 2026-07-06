import { describe, expect, it } from 'vitest';

import {
  canManageInstitutionReportPolicy,
  canRenderInstitutionReportOverview,
  resolveReportSurface,
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
  can_manage_report_policy: true,
  report_policy_mode: 'CLASS_CONFIGURATION',
  report_computation_class_scoped_only: true,
  can_author_report_subject_profile: false,
  report_configuration: {
    report_policy_available: true,
    report_policy_mode: 'CLASS_CONFIGURATION',
    report_computation_available: true,
    report_computation_class_scoped_only: true,
    subject_profile_authoring_allowed: false,
    reporting_governance_routes_allowed: false,
    allowed_policy_scopes: [
      'WORKSPACE_DEFAULT',
      'COHORT',
      'COHORT_SUBJECT',
      'TERM',
    ],
  },
} satisfies WorkspaceCapabilities;

const institutionReportPolicyCapabilities = {
  ...institutionCapabilities,
  can_manage_report_policy: true,
  report_policy_mode: 'INSTITUTION_GOVERNANCE',
  report_computation_class_scoped_only: false,
  can_author_report_subject_profile: true,
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

describe('report access policy', () => {
  it('resolves superadmins to the institution report surface', () => {
    expect(resolveReportSurface({
      user: { ...user, is_superadmin: true },
      activeRole: 'SUPERADMIN',
      activeOrg: institution,
      capabilities: institutionCapabilities,
    })).toBe('institution');
  });

  it('resolves supervision-only admins to the institution report surface', () => {
    expect(resolveReportSurface({
      user,
      activeRole: 'ADMIN',
      activeOrg: institution,
      capabilities: institutionCapabilities,
    })).toBe('institution');
  });

  it('resolves freelance workspace admins by workspace behavior', () => {
    expect(resolveReportSurface({
      user,
      activeRole: 'ADMIN',
      activeOrg: institution,
      capabilities: selfManagedCapabilities,
    })).toBe('freelance');
  });

  it('resolves personal workspace admins to the freelance report surface', () => {
    expect(resolveReportSurface({
      user,
      activeRole: 'ADMIN',
      activeOrg: personal,
      capabilities: {
        ...selfManagedCapabilities,
        workspace_behavior: 'SELF_MANAGED',
      },
    })).toBe('freelance');
  });

  it('resolves instructors to the instructor report surface', () => {
    expect(resolveReportSurface({
      user,
      activeRole: 'INSTRUCTOR',
      activeOrg: institution,
      capabilities: { ...institutionCapabilities, can_teach: true },
    })).toBe('instructor');
  });

  it('resolves unauthenticated users to no report surface', () => {
    expect(resolveReportSurface({
      user: null,
      activeRole: null,
      activeOrg: null,
      capabilities: null,
    })).toBe('none');
  });

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

  it('does not treat class-configuration report capability as institution report governance', () => {
    expect(canRenderInstitutionReportOverview({
      user,
      activeRole: 'ADMIN',
      activeOrg: personal,
      capabilities: selfManagedCapabilities,
    })).toBe(false);
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

  it('does not allow raw admin role to manage institution report policy without policy capability', () => {
    expect(canManageInstitutionReportPolicy({
      user,
      capabilities: institutionCapabilities,
    })).toBe(false);
  });

  it('allows institution report policy management only with governance capability', () => {
    expect(canManageInstitutionReportPolicy({
      user,
      capabilities: institutionReportPolicyCapabilities,
    })).toBe(true);
    expect(canManageInstitutionReportPolicy({
      user,
      capabilities: selfManagedCapabilities,
    })).toBe(false);
  });
});

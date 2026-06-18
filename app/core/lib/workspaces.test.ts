import { describe, expect, it } from 'vitest';

import {
  canCreateTeachingRecord,
  canShowAdminMyTeaching,
  canUseTeachingMode,
  isSupervisionOnlyAdmin,
  normalizeRegisterOrgType,
  ORG_TYPE_OPTIONS,
  WORKSPACE_MODE_COPY,
  workspaceAllowsSelfManagedTeaching,
} from './workspaces';

describe('workspace teaching capabilities', () => {
  it('treats institution admins as supervision-only', () => {
    expect(workspaceAllowsSelfManagedTeaching('INSTITUTION')).toBe(false);
    expect(canUseTeachingMode({ role: 'ADMIN', orgType: 'INSTITUTION' })).toBe(false);
    expect(canShowAdminMyTeaching({ role: 'ADMIN', orgType: 'INSTITUTION' })).toBe(false);
    expect(canCreateTeachingRecord({ role: 'ADMIN', orgType: 'INSTITUTION' })).toBe(false);
    expect(isSupervisionOnlyAdmin({ role: 'ADMIN', orgType: 'INSTITUTION' })).toBe(true);
  });

  it('allows self-managed workspace admins into teaching mode', () => {
    expect(canUseTeachingMode({
      role: 'ADMIN',
      orgType: 'INDEPENDENT_TEACHER',
      isWorkspaceOwner: true,
    })).toBe(true);
    expect(canUseTeachingMode({
      role: 'ADMIN',
      orgType: 'HOMESCHOOL',
      isWorkspaceOwner: true,
    })).toBe(true);
    expect(canUseTeachingMode({
      role: 'ADMIN',
      orgType: 'PERSONAL',
      isWorkspaceOwner: true,
    })).toBe(true);
    expect(canUseTeachingMode({
      role: 'ADMIN',
      orgType: 'PERSONAL',
      isWorkspaceOwner: false,
    })).toBe(false);
  });

  it('prefers backend capability flags over workspace-role guesses', () => {
    expect(canUseTeachingMode({
      role: 'ADMIN',
      orgType: 'INSTITUTION',
      capabilities: {
        can_teach: true,
        can_manage_academic_setup: true,
        can_manage_learners: true,
        can_manage_cohorts: true,
        can_manage_subjects: true,
        can_manage_assessments: true,
        can_view_reports: true,
        can_manage_staff: false,
        is_workspace_owner: true,
        workspace_mode: 'FREELANCE_TEACHER',
        workspace_behavior: 'FREELANCE_TEACHER',
      },
    })).toBe(true);
  });

  it('keeps learner-workspace and tuition-center admins out of teaching mode', () => {
    expect(canUseTeachingMode({ role: 'ADMIN', orgType: 'LEARNER_WORKSPACE' })).toBe(false);
    expect(canUseTeachingMode({ role: 'ADMIN', orgType: 'TUITION_CENTER' })).toBe(false);
  });

  it('always allows instructors and never allows superadmins', () => {
    expect(canUseTeachingMode({ role: 'INSTRUCTOR', orgType: 'INSTITUTION' })).toBe(true);
    expect(canUseTeachingMode({ role: 'SUPERADMIN', orgType: 'HOMESCHOOL', isSuperadmin: true })).toBe(false);
  });

  it('does not expose independent teacher as a distinct registration workspace type', () => {
    expect(Object.keys(WORKSPACE_MODE_COPY)).not.toContain('INDEPENDENT_TEACHER');
    expect(WORKSPACE_MODE_COPY.PERSONAL.label).toBe('Freelance Teacher Workspace');
    expect(WORKSPACE_MODE_COPY.PERSONAL.description).toBe(
      'Set up my teaching workspace for learners, schemes of work, lesson plans, teaching records, and reports.',
    );
  });

  it('submits stale independent teacher registration choices as personal', () => {
    expect(normalizeRegisterOrgType('INDEPENDENT_TEACHER')).toBe('PERSONAL');
    expect(normalizeRegisterOrgType('FREELANCE_TEACHER')).toBe('PERSONAL');
    expect(normalizeRegisterOrgType('PERSONAL')).toBe('PERSONAL');
  });

  it('does not offer independent teacher as a new organization type option', () => {
    expect(ORG_TYPE_OPTIONS.map((option) => option.value)).not.toContain('INDEPENDENT_TEACHER');
  });
});

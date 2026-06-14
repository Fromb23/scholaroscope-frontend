import { describe, expect, it } from 'vitest';

import {
  canCreateTeachingRecord,
  canShowAdminMyTeaching,
  canUseTeachingMode,
  isSupervisionOnlyAdmin,
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
    expect(canUseTeachingMode({ role: 'ADMIN', orgType: 'INDEPENDENT_TEACHER' })).toBe(true);
    expect(canUseTeachingMode({ role: 'ADMIN', orgType: 'HOMESCHOOL' })).toBe(true);
    expect(canUseTeachingMode({ role: 'ADMIN', orgType: 'PERSONAL' })).toBe(true);
  });

  it('keeps learner-workspace and tuition-center admins out of teaching mode', () => {
    expect(canUseTeachingMode({ role: 'ADMIN', orgType: 'LEARNER_WORKSPACE' })).toBe(false);
    expect(canUseTeachingMode({ role: 'ADMIN', orgType: 'TUITION_CENTER' })).toBe(false);
  });

  it('always allows instructors and never allows superadmins', () => {
    expect(canUseTeachingMode({ role: 'INSTRUCTOR', orgType: 'INSTITUTION' })).toBe(true);
    expect(canUseTeachingMode({ role: 'SUPERADMIN', orgType: 'HOMESCHOOL', isSuperadmin: true })).toBe(false);
  });
});

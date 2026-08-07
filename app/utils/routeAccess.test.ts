import { describe, expect, it } from 'vitest';

import {
  getRouteRules,
  getUnauthorizedRouteFallback,
  routeAllowedForContext,
  routeAllowedForRole,
} from './routeAccess';
import type { OperatingContext, WorkspaceCapabilities } from './authorityTypes';

function capabilities(keys: string[] = [], overrides: Partial<WorkspaceCapabilities> = {}): WorkspaceCapabilities {
  return {
    can_teach: false,
    can_manage_staff: false,
    can_manage_academic_setup: false,
    can_manage_assessments: false,
    can_manage_learners: false,
    can_manage_cohorts: false,
    can_manage_subjects: false,
    can_view_reports: false,
    can_manage_plugins: false,
    is_workspace_owner: false,
    authorization: {
      enforced: true,
      permission_keys: keys,
      roles: [],
      admin_slots: null,
      migration_state: null,
    },
    ...overrides,
  } as WorkspaceCapabilities;
}

function canAccess(
  path: string,
  operatingContext: OperatingContext | null,
  caps: WorkspaceCapabilities,
  orgType: string | null = 'INSTITUTION',
) {
  return routeAllowedForContext(path, { operatingContext, capabilities: caps, orgType });
}

function getMatchedRule(path: string) {
  const pathname = new URL(path, 'https://example.test').pathname;
  return getRouteRules().find((rule) => rule.pattern.test(pathname));
}

describe('route access', () => {
  it('uses context and capability for teaching routes', () => {
    const teachingCaps = capabilities(['lessons.view'], { can_teach: true });

    expect(canAccess('/dashboard/instructor', 'MY_TEACHING', teachingCaps)).toBe(true);
    expect(canAccess('/dashboard/instructor', 'WORKSPACE_MANAGEMENT', teachingCaps)).toBe(false);
    expect(routeAllowedForRole('/dashboard/instructor', 'INSTRUCTOR')).toBe(false);
  });

  it('uses permissions for report routes', () => {
    const reportCaps = capabilities(['reports.view']);
    const route = '/reports/learners/9/assessments?assessment=22';

    expect(getMatchedRule(route)?.requiredAnyPermission).toContain('reports.view');
    expect(canAccess(route, 'MY_TEACHING', reportCaps)).toBe(true);
    expect(canAccess(route, 'WORKSPACE_MANAGEMENT', capabilities())).toBe(false);
  });

  it('keeps scoped teaching attendance report checks scoped', () => {
    const reportCaps = capabilities(['reports.view']);
    const scoped = '/reports/attendance?student=74&term=3&cohort=9&cohortSubject=11';

    expect(canAccess(scoped, 'MY_TEACHING', reportCaps)).toBe(true);
    expect(canAccess('/reports/attendance', 'MY_TEACHING', reportCaps)).toBe(false);
    expect(getUnauthorizedRouteFallback('MY_TEACHING', '/reports/attendance')).toBe('/reports/instructor');
  });

  it('keeps management report fallbacks context-based', () => {
    const reportCaps = capabilities(['reports.view']);

    expect(canAccess('/reports/instructors/20', 'WORKSPACE_MANAGEMENT', reportCaps)).toBe(true);
    expect(getUnauthorizedRouteFallback('WORKSPACE_MANAGEMENT', '/reports/instructors/20')).toBe('/dashboard/admin');
  });

  it('does not hard-code revenue routes to legacy roles', () => {
    const matchedRule = getMatchedRule('/revenue');

    expect(matchedRule).toBeDefined();
    expect(matchedRule?.requiredAnyPermission).toContain('revenue.program.view');
    expect(canAccess('/revenue', 'WORKSPACE_MANAGEMENT', capabilities(['revenue.program.view']))).toBe(true);
    expect(canAccess('/revenue', 'WORKSPACE_MANAGEMENT', capabilities(['revenue.program.view']), 'PERSONAL')).toBe(false);
    expect(routeAllowedForRole('/revenue', 'ADMIN')).toBe(false);
  });

  it('allows assessment creation from create permission without manage permission', () => {
    expect(canAccess('/assessments/new', 'WORKSPACE_MANAGEMENT', capabilities(['assessments.create']))).toBe(true);
    expect(canAccess('/assessments/new', 'WORKSPACE_MANAGEMENT', capabilities())).toBe(false);
  });

  it('honors exact assessment edit manage or review permission', () => {
    expect(canAccess('/assessments/42/edit', 'WORKSPACE_MANAGEMENT', capabilities(['assessments.review']))).toBe(true);
    expect(canAccess('/assessments/42/edit', 'WORKSPACE_MANAGEMENT', capabilities(['assessments.create']))).toBe(false);
  });

  it('uses specific academic subject view permission', () => {
    expect(canAccess('/academic/subjects', 'WORKSPACE_MANAGEMENT', capabilities(['academic.subjects.view']))).toBe(true);
    expect(canAccess('/academic/subjects', 'WORKSPACE_MANAGEMENT', capabilities(['academic.cohorts.view']))).toBe(false);
  });

  it('fails closed with missing capabilities or permission keys', () => {
    expect(routeAllowedForContext('/reports', {
      operatingContext: 'WORKSPACE_MANAGEMENT',
      capabilities: null,
      orgType: 'INSTITUTION',
    })).toBe(false);
    expect(canAccess('/reports', 'WORKSPACE_MANAGEMENT', { authorization: { permission_keys: [] } } as WorkspaceCapabilities)).toBe(false);
  });
});

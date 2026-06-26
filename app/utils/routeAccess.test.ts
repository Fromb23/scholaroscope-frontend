import { describe, expect, it } from 'vitest';

import { getRouteRules, getUnauthorizedRouteFallback } from './routeAccess';

function getMatchedRule(path: string) {
  const pathname = new URL(path, 'https://example.test').pathname;
  return getRouteRules().find((rule) => rule.pattern.test(pathname));
}

function canAccess(path: string, role: 'ADMIN' | 'INSTRUCTOR') {
  const matchedRule = getMatchedRule(path);
  return matchedRule ? matchedRule.allowedRoles.includes(role) : true;
}

describe('route access', () => {
  it('allows instructors to open class subject report routes', () => {
    const matchedRule = getMatchedRule('/reports/instructor/cohort-subjects/3/class-report');

    expect(matchedRule).toBeDefined();
    expect(matchedRule?.allowedRoles).toContain('INSTRUCTOR');
    expect(matchedRule?.allowedRoles).toContain('ADMIN');
  });

  it('allows admins to open plural instructor report routes', () => {
    expect(canAccess('/reports/instructors', 'ADMIN')).toBe(true);
    expect(canAccess('/reports/instructors/20', 'ADMIN')).toBe(true);
    expect(
      canAccess(
        '/reports/instructors/20?term=3&returnTo=/admin/instructors/20/progress',
        'ADMIN',
      ),
    ).toBe(true);
  });

  it('allows instructors to open singular instructor self-report routes', () => {
    expect(canAccess('/reports/instructor', 'INSTRUCTOR')).toBe(true);
    expect(canAccess('/reports/instructor/teacher-report', 'INSTRUCTOR')).toBe(true);
  });

  it('allows admins to open instructor report routes so capability gates can resolve self-managed teaching', () => {
    expect(canAccess('/reports/instructor/cohort-subjects/3', 'ADMIN')).toBe(true);
  });

  it('keeps admins on plural instructor report routes', () => {
    expect(getUnauthorizedRouteFallback('ADMIN', '/reports/instructors/20')).toBe('/dashboard/admin');
    expect(canAccess('/reports/instructors/20', 'ADMIN')).toBe(true);
  });

  it('allows admins to reach singular instructor routes for capability-scoped report handling', () => {
    expect(canAccess('/reports/instructor', 'ADMIN')).toBe(true);
  });

  it('redirects instructors away from admin plural instructor report routes', () => {
    expect(canAccess('/reports/instructors', 'INSTRUCTOR')).toBe(false);
    expect(getUnauthorizedRouteFallback('INSTRUCTOR', '/reports/instructors')).toBe('/reports/instructor');
  });
});

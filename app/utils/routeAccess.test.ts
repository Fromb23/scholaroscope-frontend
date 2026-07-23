import { describe, expect, it } from 'vitest';

import { getRouteRules, getUnauthorizedRouteFallback, routeAllowedForRole } from './routeAccess';

function getMatchedRule(path: string) {
  const pathname = new URL(path, 'https://example.test').pathname;
  return getRouteRules().find((rule) => rule.pattern.test(pathname));
}

function canAccess(path: string, role: 'ADMIN' | 'INSTRUCTOR') {
  return routeAllowedForRole(path, role);
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

  it('allows instructors to open learner assessment report routes without falling back', () => {
    const route = '/reports/learners/9/assessments?assessment=22&cohort_subject=6&assessment_type=CAT&term=7&subject=8&cohort=4&returnTo=%2Fassessments%2F22%3Ftab%3Dscores';
    const matchedRule = getMatchedRule(route);

    expect(matchedRule).toBeDefined();
    expect(matchedRule?.allowedRoles).toContain('INSTRUCTOR');
    expect(matchedRule?.allowedRoles).toContain('ADMIN');
    expect(canAccess(route, 'INSTRUCTOR')).toBe(true);

    const resolvedRoute = canAccess(route, 'INSTRUCTOR')
      ? route
      : getUnauthorizedRouteFallback('INSTRUCTOR', route);
    expect(resolvedRoute).toBe(route);
    expect(resolvedRoute).not.toBe('/reports/instructor');
  });

  it('allows instructors to open learner overview and assignment reports without falling back to instructor reports', () => {
    const overviewRoute = '/reports/learners/18/overview?returnTo=%2Flearners%2F18%3Fback%3Dsort%253Dadmission_number%253Aasc%2526page%253D1%2526page_size%253D20%26section%3Dreports';
    const assignmentRoute = '/reports/learners/18/assignments?cohort_subject=26&highlightAssignment=90&returnTo=%2Facademic%2Fcohorts%2F9%2Fassignments%2F90%3Ftab%3Devaluations%26workflow%3Dreview%26unit%3Dstudent%253A18';

    expect(canAccess(overviewRoute, 'INSTRUCTOR')).toBe(true);
    expect(canAccess(assignmentRoute, 'INSTRUCTOR')).toBe(true);
    expect(getMatchedRule(overviewRoute)?.allowedRoles).toContain('INSTRUCTOR');
    expect(getMatchedRule(assignmentRoute)?.allowedRoles).toContain('INSTRUCTOR');

    const resolvedOverview = canAccess(overviewRoute, 'INSTRUCTOR')
      ? overviewRoute
      : getUnauthorizedRouteFallback('INSTRUCTOR', overviewRoute);
    const resolvedAssignment = canAccess(assignmentRoute, 'INSTRUCTOR')
      ? assignmentRoute
      : getUnauthorizedRouteFallback('INSTRUCTOR', assignmentRoute);

    expect(resolvedOverview).not.toBe('/reports/instructor');
    expect(resolvedAssignment).not.toBe('/reports/instructor');
  });

  it('allows scoped instructor learner attendance reports', () => {
    const route = '/reports/attendance?student=74&term=3&cohort=9&cohortSubject=11&returnTo=%2Fsessions%2F22%3Fsection%3Dattendance';

    expect(canAccess(route, 'INSTRUCTOR')).toBe(true);
    expect(canAccess(route, 'ADMIN')).toBe(true);
  });

  it('blocks broad instructor attendance reports', () => {
    expect(canAccess('/reports/attendance', 'INSTRUCTOR')).toBe(false);
    expect(canAccess('/reports/attendance?student=74', 'INSTRUCTOR')).toBe(false);
    expect(getUnauthorizedRouteFallback('INSTRUCTOR', '/reports/attendance')).toBe('/reports/instructor');
    expect(canAccess('/reports/attendance', 'ADMIN')).toBe(true);
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

  it('allows admins to follow Portfolio source records into instructor lesson surfaces', () => {
    expect(canAccess('/sessions/42?returnTo=%2Flearners%2F18%2Fportfolio%3Fevidence%3D44', 'ADMIN')).toBe(true);
    expect(canAccess('/lesson-plans/42?returnTo=%2Flearners%2F18%2Fportfolio%3Fevidence%3D44', 'ADMIN')).toBe(true);
  });

  it('redirects instructors away from admin plural instructor report routes', () => {
    expect(canAccess('/reports/instructors', 'INSTRUCTOR')).toBe(false);
    expect(getUnauthorizedRouteFallback('INSTRUCTOR', '/reports/instructors')).toBe('/reports/instructor');
  });
});

import { describe, expect, it } from 'vitest';

import { getRouteRules, getUnauthorizedRouteFallback } from './routeAccess';

describe('route access', () => {
  it('allows instructors to open class subject report routes', () => {
    const matchedRule = getRouteRules().find((rule) => (
      rule.pattern.test('/reports/instructor/cohort-subjects/3/class-report')
    ));

    expect(matchedRule).toBeDefined();
    expect(matchedRule?.allowedRoles).toContain('INSTRUCTOR');
  });

  it('redirects admins away from instructor report routes to admin reports', () => {
    expect(getUnauthorizedRouteFallback('ADMIN', '/reports/instructor/cohort-subjects/3')).toBe('/reports');
  });
});

import { describe, expect, it } from 'vitest';

import {
  buildAssessmentDetailHref,
  buildAssignmentDetailHref,
  getOperationalDetailBackLabel,
  resolveOperationalDetailBack,
} from './operationalDetailNavigation';
import { parseAppDestination } from '@/app/core/auth/navigation';

describe('operational detail navigation', () => {
  const assessmentOrigin =
    '/reports/instructor/cohort-subjects/3?projection=assessments-results&term=1&q=cat&sort=date&page=2';
  const assignmentOrigin =
    '/reports/instructor/cohort-subjects/3?projection=assignments&term=1&status=missing&q=essay&page=3';

  it('opens existing assessment and assignment ID pages with exact safe return state', () => {
    expect(buildAssessmentDetailHref(27, assessmentOrigin)).toBe(
      `/assessments/27?returnTo=${encodeURIComponent(assessmentOrigin)}`,
    );
    expect(buildAssignmentDetailHref(5, 14, assignmentOrigin)).toBe(
      `/academic/cohorts/5/assignments/14?returnTo=${encodeURIComponent(assignmentOrigin)}`,
    );
  });

  it('resolves explicit origin, hierarchical parent, then structural fallback', () => {
    expect(
      resolveOperationalDetailBack({
        returnTo: assignmentOrigin,
        hierarchicalParent: '/academic/cohorts/5/assignments',
        structuralFallback: '/assignments',
      }),
    ).toBe(assignmentOrigin);
    expect(
      resolveOperationalDetailBack({
        returnTo: 'https://evil.example',
        hierarchicalParent: '/academic/cohorts/5/assignments',
        structuralFallback: '/assignments',
      }),
    ).toBe('/academic/cohorts/5/assignments');
    expect(
      resolveOperationalDetailBack({
        returnTo: '%2F%2Fevil.example',
        hierarchicalParent: 'javascript:alert(1)',
        structuralFallback: '/assignments',
      }),
    ).toBe('/assignments');
  });

  it('uses a projection-aware label on the existing Back action', () => {
    expect(getOperationalDetailBackLabel(assessmentOrigin)).toBe('Back to Assessments & Results');
    expect(getOperationalDetailBackLabel(assignmentOrigin)).toBe('Back to Assignments');
  });

  it('rejects external, encoded-external, malformed, and excessive return chains', () => {
    expect(parseAppDestination('https://evil.example')).toBeNull();
    expect(parseAppDestination('%2F%2Fevil.example')).toBeNull();
    expect(parseAppDestination('/reports?returnTo=%E0%A4%A')).toBeNull();
    const tooDeep =
      '/one?returnTo=' +
      encodeURIComponent(
        '/two?returnTo=' + encodeURIComponent('/three?returnTo=' + encodeURIComponent('/four')),
      );
    expect(parseAppDestination(tooDeep)).toBeNull();
  });
});

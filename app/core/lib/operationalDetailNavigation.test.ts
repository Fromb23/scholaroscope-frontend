import { describe, expect, it } from 'vitest';

import {
  buildAssessmentDetailHref,
  buildAssignmentDetailHref,
  buildSessionDetailHref,
  getOperationalDetailBackLabel,
  resolveOperationalDetailBack,
} from './operationalDetailNavigation';
import { parseAppDestination } from '@/app/core/auth/navigation';

describe('operational detail navigation', () => {
  const assessmentOrigin =
    '/reports/instructor/cohort-subjects/3?projection=assessments-results&term=1&q=cat&sort=date&page=2';
  const assignmentOrigin =
    '/reports/instructor/cohort-subjects/3?projection=assignments&term=1&status=missing&q=essay&page=3';
  const attendanceOrigin =
    '/reports/instructor/cohort-subjects/3?projection=attendance&term=1&q=week&page=2&returnTo=%2Freports%2Finstructor';

  it('opens existing assessment and assignment ID pages with exact safe return state', () => {
    expect(buildAssessmentDetailHref(27, assessmentOrigin)).toBe(
      `/assessments/27?returnTo=${encodeURIComponent(assessmentOrigin)}`,
    );
    expect(buildAssignmentDetailHref(5, 14, assignmentOrigin)).toBe(
      `/academic/cohorts/5/assignments/14?returnTo=${encodeURIComponent(assignmentOrigin)}`,
    );
  });

  it('opens attendance on the existing session route with mode and exact safe origin', () => {
    const href = buildSessionDetailHref(42, {
      section: 'attendance',
      authorityMode: 'supervision',
      returnTo: attendanceOrigin,
    });
    const url = new URL(href, 'https://scholaroscope.local');

    expect(url.pathname).toBe('/sessions/42');
    expect(url.searchParams.get('section')).toBe('attendance');
    expect(url.searchParams.get('authority_mode')).toBe('supervision');
    expect(url.searchParams.get('returnTo')).toBe(attendanceOrigin);
  });

  it('rejects an unsafe session origin and falls direct bookmarks back to Sessions', () => {
    expect(buildSessionDetailHref(42, {
      section: 'attendance',
      authorityMode: 'teaching',
      returnTo: 'https://evil.example/reports',
    })).toBe('/sessions/42?authority_mode=teaching&section=attendance');
    expect(resolveOperationalDetailBack({
      returnTo: 'https://evil.example/reports',
      structuralFallback: '/sessions',
    })).toBe('/sessions');
    expect(getOperationalDetailBackLabel('/sessions')).toBe('Back to Sessions');
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
    expect(getOperationalDetailBackLabel(attendanceOrigin)).toBe('Back to Attendance');
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

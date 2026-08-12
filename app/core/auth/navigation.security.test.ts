import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildLoginPath,
  isSafeNextPath,
  redirectToLogin,
  sanitizeAppDestination,
} from './navigation';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('canonical application destination parser', () => {
  it.each([
    '/dashboard',
    '/reports/123',
    '/assignments?status=open',
    '/path#section',
    '/assignments?q=chapter%202%20%26%20review',
  ])('keeps safe internal destination %s', (destination) => {
    expect(sanitizeAppDestination(destination, '/fallback')).toBe(destination);
    expect(isSafeNextPath(destination)).toBe(true);
  });

  it.each([
    '//attacker.example',
    '///attacker.example',
    '/\\attacker.example',
    '/%5C%5Cattacker.example',
    '/%2F%2Fattacker.example',
    '/%252F%252Fattacker.example',
    'https://attacker.example',
    'http://attacker.example',
    'javascript:alert(1)',
    'data:text/html,<h1>owned</h1>',
    'file:///etc/passwd',
    '/reports\nX-Injected: true',
    '/reports%0aX-Injected%3A%20true',
    '/reports/%E0%A4%A',
    `/${'a'.repeat(4096)}`,
    'https://user:password@attacker.example/',
    'https://scholaroscope.com.attacker.example/',
  ])('rejects unsafe destination %s', (destination) => {
    expect(sanitizeAppDestination(destination, '/fallback')).toBe('/fallback');
    expect(isSafeNextPath(destination)).toBe(false);
  });

  it('sanitizes the login next consumer through the canonical parser', () => {
    expect(buildLoginPath('//attacker.example')).toBe('/login');
    expect(buildLoginPath('/%252F%252Fattacker.example')).toBe('/login');
    expect(buildLoginPath('/reports/123')).toBe('/login?next=%2Freports%2F123');
  });

  it('preserves protected deep-link query state in the login next parameter', () => {
    const loginPath = buildLoginPath('/schemes?cohort=14&cohort_subject=28&source=cohort_subject');
    const parsed = new URL(loginPath, 'https://scholaroscope.test');

    expect(parsed.pathname).toBe('/login');
    expect(parsed.searchParams.get('next')).toBe(
      '/schemes?cohort=14&cohort_subject=28&source=cohort_subject',
    );
  });

  it('uses window.location.assign for canonical login redirects', () => {
    const assign = vi.fn();
    vi.stubGlobal('window', {
      location: {
        origin: 'https://scholaroscope.test',
        pathname: '/schemes',
        search: '?cohort=14&cohort_subject=28&source=cohort_subject',
        hash: '',
        assign,
      },
    });

    redirectToLogin('/schemes?cohort=14&cohort_subject=28&source=cohort_subject');

    expect(assign).toHaveBeenCalledWith(
      '/login?next=%2Fschemes%3Fcohort%3D14%26cohort_subject%3D28%26source%3Dcohort_subject',
    );
  });

  it('allows a bounded report trail but rejects recursively growing return destinations', () => {
    const oneOrigin = '/reports/subjects/8?returnTo=%2Freports%2Fcohorts%2F4%3Fterm%3D2';
    const recursive = '/reports/subjects/8?returnTo=%2Freports%2Fcohorts%2F4%3FreturnTo%3D%252Freports%252Fstudents%253FreturnTo%253D%25252Freports';

    expect(isSafeNextPath(oneOrigin)).toBe(true);
    expect(isSafeNextPath(recursive)).toBe(false);
  });
});

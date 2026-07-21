import { describe, expect, it } from 'vitest';

import {
  buildLoginPath,
  isSafeNextPath,
  sanitizeAppDestination,
} from './navigation';

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
});

import { describe, expect, it } from 'vitest';

import { resolveAppError } from './resolveAppError';

const context = {
  domain: 'auth',
  action: 'login',
  entityLabel: 'account access',
} as const;

function messageFor(data: unknown, status = 400): string {
  return resolveAppError({ response: { status, data } }, context).message;
}

describe('safe error presentation contract', () => {
  it('keeps allowlisted field validation copy', () => {
    const error = resolveAppError(
      { response: { status: 400, data: { email: ['Enter a valid email address.'] } } },
      context,
    );
    expect(error.fieldErrors?.email).toEqual(['Enter a valid email address.']);
  });

  it.each([
    'IntegrityError: duplicate key value violates SQL constraint users_email_key',
    'Traceback (most recent call last): File "/srv/app/views.py", line 22',
    '/srv/scholaroscope/settings/production.py',
    '<strong>Session failed</strong><script>alert(1)</script>',
    'Authorization: Bearer secret-token-value',
    'Cookie: refresh=secret-cookie-value',
    'api_key=super-secret-service-key',
    'Call http://postgres.internal:5432/private for details',
    'This arbitrary backend detail must not become product copy.',
  ])('suppresses untrusted server detail: %s', (detail) => {
    const displayed = messageFor({ detail });
    expect(displayed).not.toContain(detail);
  });

  it('does not render nested arbitrary response values', () => {
    const displayed = messageFor({ payload: { secret: 'nested-secret-value' } });
    expect(displayed).not.toContain('nested-secret-value');
    expect(displayed).not.toContain('[object Object]');
  });

  it('uses stable authorization and network copy', () => {
    const denied = messageFor({ detail: 'custom tenant internals' }, 403);
    const network = resolveAppError(new TypeError('Failed to fetch'), context).message;
    expect(denied).toContain('permission');
    expect(network).toContain('connection');
  });
});

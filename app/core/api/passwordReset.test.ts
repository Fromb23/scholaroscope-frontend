import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  authAPI,
  passwordFieldErrorsFromError,
  resetCodeFromError,
} from '@/app/core/api/auth';

describe('public password reset API', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('validates through the public transport without workspace or auth headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ valid: true, code: 'password_reset_valid' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(authAPI.validateResetToken({ uid: 'uid', token: 'token' })).resolves.toEqual({
      valid: true,
      code: 'password_reset_valid',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/reset-password/uid/token/validate/'),
      expect.objectContaining({ credentials: 'omit', method: 'GET' }),
    );
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('X-Organization-ID');
  });

  it('rejects malformed successful responses as unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ valid: false, code: 'unexpected_code' }), { status: 200 }),
      ),
    );
    await expect(
      authAPI.validateResetToken({ uid: 'uid', token: 'token' }),
    ).rejects.toThrow('validation response was unavailable');
  });

  it('preserves recognized direct and canonical-envelope lifecycle codes only', () => {
    expect(resetCodeFromError({ data: { code: 'password_reset_superseded' } })).toBe(
      'password_reset_superseded',
    );
    expect(
      resetCodeFromError({ response: { data: { error: { code: 'password_reset_expired' } } } }),
    ).toBe('password_reset_expired');
    expect(resetCodeFromError({ data: { code: 'server_broke' } })).toBeNull();
    expect(
      resetCodeFromError({ status: 500, data: { code: 'password_reset_invalid' } }),
    ).toBeNull();
    expect(
      resetCodeFromError({ status: 404, data: { code: 'password_reset_invalid' } }),
    ).toBeNull();
  });

  it('extracts safe password-policy field errors without raw exception content', () => {
    expect(
      passwordFieldErrorsFromError({
        data: { field_errors: { new_password: ['This password is too common.'] } },
      }),
    ).toEqual(['This password is too common.']);
  });

  it('keeps network failures distinct from lifecycle codes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const request = authAPI.validateResetToken({ uid: 'uid', token: 'token' });
    await expect(request).rejects.toBeInstanceOf(TypeError);
    await request.catch((error) => expect(resetCodeFromError(error)).toBeNull());
  });
});

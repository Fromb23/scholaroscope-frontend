import { afterEach, describe, expect, it, vi } from 'vitest';

import { authAPI } from '@/app/core/api/auth';

describe('authAPI.logout', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('aborts the backend revoke request after the configured timeout', async () => {
    vi.useFakeTimers();
    let capturedSignal: AbortSignal | undefined;
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      capturedSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        capturedSignal?.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted.');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    });

    vi.stubGlobal('fetch', fetchMock);
    const logoutPromise = authAPI.logout({ timeoutMs: 25 });
    const logoutExpectation = expect(logoutPromise).rejects.toMatchObject({ name: 'AbortError' });

    await vi.advanceTimersByTimeAsync(25);

    await logoutExpectation;
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/users/logout/'),
      expect.objectContaining({
        credentials: 'include',
        method: 'POST',
        signal: capturedSignal,
      }),
    );
    expect(capturedSignal?.aborted).toBe(true);
  });
});

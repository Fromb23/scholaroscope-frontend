import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { logoutLocalFirst } from '@/app/core/auth/logout';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/app/core/auth/tokenStore';

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

describe('AuthContext local-first logout', () => {
  it('clears local user, token, storage, and query cache before backend logout resolves', async () => {
    const events: string[] = [];
    const revokeControl: { resolve?: () => void } = {};
    setAccessToken('old-access');

    const revokeSession = vi.fn(() => new Promise<void>((resolve) => {
      events.push(`revoke:${getAccessToken() ?? 'null'}`);
      revokeControl.resolve = resolve;
    }));

    await logoutLocalFirst({
      markLogoutStarted: () => events.push('loggingOut:true'),
      clearAuthState: () => {
        clearAccessToken();
        events.push(`clear:${getAccessToken() ?? 'null'}`);
      },
      setLoading: (loading) => events.push(`loading:${loading}`),
      revokeSession,
    });

    expect(events).toEqual(['loggingOut:true', 'clear:null', 'loading:false', 'revoke:null']);
    expect(getAccessToken()).toBeNull();
    expect(revokeSession).toHaveBeenCalledOnce();
    revokeControl.resolve!();

    const source = read('app/context/AuthContext.tsx');
    expect(source).toContain('clearStoredAuthState();');
    expect(source).toContain('queryClient.clear();');
  });

  it('ignores backend logout rejection after local state is cleared', async () => {
    const events: string[] = [];

    await expect(logoutLocalFirst({
      clearAuthState: () => events.push('clear'),
      setLoading: (loading) => events.push(`loading:${loading}`),
      revokeSession: () => Promise.reject(new Error('backend logout failed')),
    })).resolves.toBeUndefined();

    await Promise.resolve();
    expect(events).toEqual(['clear', 'loading:false']);
  });

  it('ignores backend logout abort after local state is cleared', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    const events: string[] = [];

    await expect(logoutLocalFirst({
      clearAuthState: () => events.push('clear'),
      setLoading: (loading) => events.push(`loading:${loading}`),
      revokeSession: () => Promise.reject(abortError),
    })).resolves.toBeUndefined();

    await Promise.resolve();
    expect(events).toEqual(['clear', 'loading:false']);
  });

  it('invalidates boot-time refresh results so logout cannot restore an old session', () => {
    const source = read('app/context/AuthContext.tsx');

    expect(source).toContain('authStateVersionRef');
    expect(source).toContain('bootWasSuperseded');
    expect(source).toContain('logoutLocalFirst');
    expect(source).toContain('loggingOut');
  });

  it('treats a denied boot refresh as unauthenticated local state', () => {
    const source = read('app/context/AuthContext.tsx');

    expect(source).toContain('const response = await authAPI.refresh();');
    expect(source).toContain('clearAuthState();');
    expect(source).toContain('setLoading(false);');
  });
});

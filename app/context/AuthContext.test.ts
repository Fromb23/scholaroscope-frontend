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
    const bootStart = source.indexOf('const boot = useCallback');
    const bootEnd = source.indexOf('}, [applyAuthState, clearAuthState]);', bootStart);
    const bootSource = source.slice(bootStart, bootEnd);

    expect(bootSource).toContain('const response = await authAPI.refresh();');
    expect(bootSource).toContain('clearAuthState();');
    expect(bootSource).toContain('setLoading(false);');
  });

  it('keeps auth state when boot refresh fails because the network is unavailable', () => {
    const source = read('app/context/AuthContext.tsx');
    const bootStart = source.indexOf('const boot = useCallback');
    const bootEnd = source.indexOf('}, [applyAuthState, clearAuthState]);', bootStart);
    const bootSource = source.slice(bootStart, bootEnd);
    const networkCheckIndex = bootSource.indexOf('if (isNetworkError(error)) {');
    const clearIndex = bootSource.indexOf('clearAuthState();', networkCheckIndex);
    const networkBranch = bootSource.slice(networkCheckIndex, clearIndex);

    expect(source).toContain("import { isNetworkError } from '@/app/core/auth/networkDetection';");
    expect(source).toContain('const [offline, setOffline] = useState(false);');
    expect(source).toContain('offline,');
    expect(networkCheckIndex).toBeGreaterThan(-1);
    expect(networkBranch).toContain('setOffline(true);');
    expect(networkBranch).toContain('setLoading(false);');
    expect(networkBranch).toContain('return;');
    expect(networkBranch).not.toContain('clearAuthState();');
  });

  it('retries boot once when the browser comes back online', () => {
    const source = read('app/context/AuthContext.tsx');
    const onlineListenerIndex = source.indexOf("window.addEventListener('online', handleOnline);");
    const onlineCleanupIndex = source.indexOf("window.removeEventListener('online', handleOnline);");
    const handleOnlineIndex = source.indexOf('const handleOnline = () => {', source.indexOf('useEffect(() => {', onlineListenerIndex - 220));
    const setOfflineFalseIndex = source.indexOf('setOffline(false);', handleOnlineIndex);
    const bootIndex = source.indexOf('void boot();', handleOnlineIndex);

    expect(onlineListenerIndex).toBeGreaterThan(-1);
    expect(onlineCleanupIndex).toBeGreaterThan(onlineListenerIndex);
    expect(source.slice(handleOnlineIndex, onlineListenerIndex)).toContain('if (offline) {');
    expect(setOfflineFalseIndex).toBeGreaterThan(handleOnlineIndex);
    expect(bootIndex).toBeGreaterThan(setOfflineFalseIndex);
  });

  it('clears offline state after a successful auth refresh reattempt', () => {
    const source = read('app/context/AuthContext.tsx');
    const applyAuthStateIndex = source.indexOf('const applyAuthState = useCallback');
    const setOfflineFalseIndex = source.indexOf('setOffline(false);', applyAuthStateIndex);
    const setAccessTokenIndex = source.indexOf('setAccessToken(payload.access);', applyAuthStateIndex);

    expect(setOfflineFalseIndex).toBeGreaterThan(applyAuthStateIndex);
    expect(setOfflineFalseIndex).toBeLessThan(setAccessTokenIndex);
  });

  it('keeps server rejection behavior after online reattempts', () => {
    const source = read('app/context/AuthContext.tsx');
    const bootStart = source.indexOf('const boot = useCallback');
    const bootEnd = source.indexOf('}, [applyAuthState, clearAuthState]);', bootStart);
    const bootSource = source.slice(bootStart, bootEnd);
    const networkCheckIndex = bootSource.indexOf('if (isNetworkError(error)) {');
    const clearIndex = bootSource.indexOf('clearAuthState();', networkCheckIndex);
    const loadingFalseIndex = bootSource.indexOf('setLoading(false);', clearIndex);

    expect(clearIndex).toBeGreaterThan(networkCheckIndex);
    expect(loadingFalseIndex).toBeGreaterThan(clearIndex);
  });
});

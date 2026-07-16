import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearExplicitLogout,
  isExplicitLogoutActive,
  markExplicitLogout,
} from './explicitLogout';
import { logoutLocalFirst } from './logout';

describe('explicit logout tombstone', () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    clearExplicitLogout();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('survives a same-tab reload until an intentional login clears it', () => {
    markExplicitLogout();
    expect(isExplicitLogoutActive()).toBe(true);

    clearExplicitLogout();
    expect(isExplicitLogoutActive()).toBe(false);
  });

  it.each(['rejected', 'aborted', 'offline'] as const)(
    'keeps local logout authoritative when revocation is %s',
    async () => {
      const clearAuthState = vi.fn();
      const revokeSession = vi.fn().mockRejectedValue(new Error('network unavailable'));

      await logoutLocalFirst({
        clearAuthState,
        setLoading: vi.fn(),
        revokeSession,
      });

      expect(isExplicitLogoutActive()).toBe(true);
      expect(clearAuthState).toHaveBeenCalledOnce();
    },
  );
});

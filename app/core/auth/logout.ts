import { authAPI } from '@/app/core/api/auth';
import { markExplicitLogout } from '@/app/core/auth/explicitLogout';

export const LOGOUT_REVOKE_TIMEOUT_MS = 2500;

type LocalFirstLogoutOptions = {
  markLogoutStarted?: () => void;
  clearAuthState: () => void;
  setLoading: (loading: boolean) => void;
  revokeSession?: () => Promise<void>;
  reportRevocationFailure?: (reason: 'aborted' | 'failed') => void;
};

function reportRevocationFailure(reason: 'aborted' | 'failed'): void {
  console.warn(`Workspace logout revocation ${reason}; local sign-out remains complete.`);
}

export function logoutLocalFirst({
  markLogoutStarted = () => undefined,
  clearAuthState,
  setLoading,
  revokeSession = () => authAPI.logout({ timeoutMs: LOGOUT_REVOKE_TIMEOUT_MS }),
  reportRevocationFailure: reportFailure = reportRevocationFailure,
}: LocalFirstLogoutOptions): Promise<void> {
  markExplicitLogout();
  markLogoutStarted();
  clearAuthState();
  setLoading(false);
  void revokeSession().catch((error: unknown) => {
    const aborted = Boolean(
      error
      && typeof error === 'object'
      && 'name' in error
      && (error as { name?: string }).name === 'AbortError'
    );
    reportFailure(aborted ? 'aborted' : 'failed');
  });
  return Promise.resolve();
}

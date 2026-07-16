import { authAPI } from '@/app/core/api/auth';
import { markExplicitLogout } from '@/app/core/auth/explicitLogout';

export const LOGOUT_REVOKE_TIMEOUT_MS = 2500;

type LocalFirstLogoutOptions = {
  markLogoutStarted?: () => void;
  clearAuthState: () => void;
  setLoading: (loading: boolean) => void;
  revokeSession?: () => Promise<void>;
};

export function logoutLocalFirst({
  markLogoutStarted = () => undefined,
  clearAuthState,
  setLoading,
  revokeSession = () => authAPI.logout({ timeoutMs: LOGOUT_REVOKE_TIMEOUT_MS }),
}: LocalFirstLogoutOptions): Promise<void> {
  markExplicitLogout();
  markLogoutStarted();
  clearAuthState();
  setLoading(false);
  void revokeSession().catch(() => undefined);
  return Promise.resolve();
}

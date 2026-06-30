import { authAPI } from '@/app/core/api/auth';

export const LOGOUT_REVOKE_TIMEOUT_MS = 2500;

type LocalFirstLogoutOptions = {
  clearAuthState: () => void;
  setLoading: (loading: boolean) => void;
  revokeSession?: () => Promise<void>;
};

export function logoutLocalFirst({
  clearAuthState,
  setLoading,
  revokeSession = () => authAPI.logout({ timeoutMs: LOGOUT_REVOKE_TIMEOUT_MS }),
}: LocalFirstLogoutOptions): Promise<void> {
  clearAuthState();
  setLoading(false);
  void revokeSession().catch(() => undefined);
  return Promise.resolve();
}

'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { authAPI } from '@/app/core/api/auth';
import { registerAuthFailureHandler } from '@/app/core/api/client';
import { clearAccessToken, setAccessToken } from '@/app/core/auth/tokenStore';
import { resolveMembershipRoleForOrganization } from '@/app/core/lib/organizationScope';
import type {
  ActiveOrg,
  AccessNotice,
  LoginResponse,
  OrgMembership,
  RegisterPayload,
  RegisterResponse,
  Role,
  SwitchOrgResponse,
  User,
} from '@/app/core/types/auth';

interface AuthContextType {
  user: User | null;
  activeOrg: ActiveOrg | null;
  memberships: OrgMembership[];
  activeRole: Role | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  switchOrg: (organizationId: number) => Promise<SwitchOrgResponse>;
  restoreWorkspace: (organizationId: number) => Promise<SwitchOrgResponse>;
  register: (payload: RegisterPayload) => Promise<RegisterResponse>;
  acceptInvite: (inviteToken: string, email: string, password: string) => Promise<void>;
  accessNotices: AccessNotice[];
  clearAccessNotices: () => void;
}

type AuthStatePayload = {
  access: string;
  user: User;
  active_org: ActiveOrg | null;
  memberships: OrgMembership[];
  membership_version: number;
  restricted_orgs?: AccessNotice[];
  org_suspended_orgs?: AccessNotice[];
  removed_orgs?: AccessNotice[];
};

function clearLegacyTokenStorage() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem('access_token');
  window.localStorage.removeItem('refresh_token');
}

function clearStoredAuthState() {
  if (typeof window === 'undefined') {
    return;
  }
  [
    'access_token',
    'refresh_token',
    'user',
    'active_org',
    'memberships',
    'suspended_notices',
    'membership_version',
  ].forEach((key) => window.localStorage.removeItem(key));
}

function storeMembershipVersion(version: number) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem('membership_version', String(version));
}

function resolveActiveRole(
  user: User | null,
  activeOrg: ActiveOrg | null,
  memberships: OrgMembership[]
): Role | null {
  return resolveMembershipRoleForOrganization(user, activeOrg, memberships);
}

function buildAccessNotices(...noticeGroups: Array<AccessNotice[] | undefined>): AccessNotice[] {
  const notices = noticeGroups.flatMap((group) => group ?? []);
  const seen = new Set<string>();
  return notices.filter((notice) => {
    const key = `${notice.kind ?? ''}:${notice.organization_id ?? notice.org}:${notice.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function registerResponseActiveOrg(response: RegisterResponse): ActiveOrg | null {
  if (response.active_org) {
    return response.active_org;
  }
  if (!response.organization) {
    return null;
  }
  return {
    id: response.organization.id,
    name: response.organization.name,
    slug: response.organization.slug ?? '',
    org_type: response.organization.type,
  };
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [user, setUser] = useState<User | null>(null);
  const [activeOrg, setActiveOrg] = useState<ActiveOrg | null>(null);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [membershipVersion, setMembershipVersion] = useState<number>(0);
  const [accessNotices, setAccessNotices] = useState<AccessNotice[]>([]);
  const [loading, setLoading] = useState(true);

  const activeRole = useMemo(
    () => resolveActiveRole(user, activeOrg, memberships),
    [user, activeOrg, memberships]
  );

  const clearAuthState = useCallback(() => {
    clearAccessToken();
    clearStoredAuthState();
    setUser(null);
    setActiveOrg(null);
    setMemberships([]);
    setMembershipVersion(0);
    setAccessNotices([]);
    queryClient.clear();
  }, [queryClient]);

  const applyAuthState = useCallback((payload: AuthStatePayload) => {
    setAccessToken(payload.access);
    setUser(payload.user);
    setActiveOrg(payload.active_org);
    setMemberships(payload.memberships ?? []);
    setMembershipVersion(payload.membership_version ?? 0);
    setAccessNotices(
      buildAccessNotices(
        payload.restricted_orgs,
        payload.org_suspended_orgs,
        payload.removed_orgs,
      )
    );
    storeMembershipVersion(payload.membership_version ?? 0);
  }, []);

  const applyMembershipContext = useCallback((payload: {
    active_org: ActiveOrg | null;
    memberships: OrgMembership[];
    membership_version: number;
    restricted_orgs?: AccessNotice[];
    org_suspended_orgs?: AccessNotice[];
    removed_orgs?: AccessNotice[];
  }) => {
    setActiveOrg(payload.active_org);
    setMemberships(payload.memberships ?? []);
    setMembershipVersion(payload.membership_version ?? 0);
    setAccessNotices(
      buildAccessNotices(
        payload.restricted_orgs,
        payload.org_suspended_orgs,
        payload.removed_orgs,
      )
    );
    storeMembershipVersion(payload.membership_version ?? 0);
  }, []);

  const syncContext = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      const context = await authAPI.meContext();
      applyMembershipContext(context);
    } catch {
      // Request interceptor handles refresh/retry and terminal redirect.
    }
  }, [applyMembershipContext, user]);

  useEffect(() => {
    registerAuthFailureHandler(() => {
      clearAuthState();
      setLoading(false);
    });
    return () => registerAuthFailureHandler(null);
  }, [clearAuthState]);

  useEffect(() => {
    let cancelled = false;

    clearLegacyTokenStorage();

    const boot = async () => {
      try {
        const response = await authAPI.refresh();
        if (cancelled) {
          return;
        }
        applyAuthState(response);
      } catch {
        if (cancelled) {
          return;
        }
        clearAuthState();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, [applyAuthState, clearAuthState]);

  useEffect(() => {
    const handleMismatch = () => {
      void syncContext();
    };
    window.addEventListener('membership-version-mismatch', handleMismatch);
    return () => window.removeEventListener('membership-version-mismatch', handleMismatch);
  }, [syncContext]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncContext();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [syncContext]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    applyAuthState(response);
    setLoading(false);
    return response;
  }, [applyAuthState]);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } finally {
      clearAuthState();
      setLoading(false);
    }
  }, [clearAuthState]);

  const switchOrg = useCallback(async (organizationId: number) => {
    const response = await authAPI.switchOrg(organizationId);
    applyAuthState(response);
    queryClient.clear();
    return response;
  }, [applyAuthState, queryClient]);

  const restoreWorkspace = useCallback(async (organizationId: number) => {
    const response = await authAPI.restoreWorkspace(organizationId);
    applyAuthState(response);
    queryClient.clear();
    return response;
  }, [applyAuthState, queryClient]);

  const register = useCallback(async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const response = await authAPI.register(payload);

    if (response.status === 'pending') {
      return response;
    }

    if (!response.access || !response.user) {
      return response;
    }

    applyAuthState({
      access: response.access,
      user: response.user,
      active_org: registerResponseActiveOrg(response),
      memberships: response.memberships ?? [],
      membership_version: response.membership_version ?? membershipVersion,
    });
    setLoading(false);
    return response;
  }, [applyAuthState, membershipVersion]);

  const acceptInvite = useCallback(async (
    inviteToken: string,
    email: string,
    password: string
  ) => {
    await login(email, password);
    await register({ email, password, invite_code: inviteToken });
  }, [login, register]);

  const clearAccessNotices = useCallback(() => {
    setAccessNotices([]);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      activeOrg,
      memberships,
      activeRole,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      switchOrg,
      restoreWorkspace,
      register,
      acceptInvite,
      accessNotices,
      clearAccessNotices,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

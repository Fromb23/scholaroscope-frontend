// app/context/AuthContext.tsx
'use client';

import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { authAPI } from '@/app/core/api/auth';
import type {
  User,
  ActiveOrg,
  OrgMembership,
  RegisterPayload,
  Role,
  SuspendedNotice,
} from '@/app/core/types/auth';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  activeOrg: ActiveOrg | null;
  memberships: OrgMembership[];
  activeRole: Role | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchOrg: (organizationId: number) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  acceptInvite: (inviteToken: string, email: string, password: string) => Promise<void>;
  suspendedNotice: SuspendedNotice | null;
  clearSuspendedNotice: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function persist(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function restore<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(key);
  try {
    return stored ? (JSON.parse(stored) as T) : null;
  } catch {
    return null;
  }
}

function clearStorage() {
  ['access_token', 'refresh_token', 'user', 'active_org', 'memberships', 'suspended_notice'].forEach(
    (k) => localStorage.removeItem(k)
  );
}

/**
 * Resolve the active role:
 * - Superadmin: always 'SUPERADMIN' regardless of org
 * - Regular user: role from the active org's membership
 * - No active org: null
 */
function resolveActiveRole(
  user: User | null,
  activeOrg: ActiveOrg | null,
  memberships: OrgMembership[]
): Role | null {
  if (!user) return null;
  if (user.is_superadmin) return 'SUPERADMIN';
  if (!activeOrg) return null;
  const membership = memberships.find(
    (m) => m.organization.id === activeOrg.id && m.status
  );
  return membership?.role ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(() => restore<User>('user'));
  const [activeOrg, setActiveOrg] = useState<ActiveOrg | null>(() =>
    restore<ActiveOrg>('active_org')
  );
  const [memberships, setMemberships] = useState<OrgMembership[]>(
    () => restore<OrgMembership[]>('memberships') ?? []
  );
  const [suspendedNotice, setSuspendedNotice] = useState<SuspendedNotice | null>(
    () => restore<SuspendedNotice>('suspended_notice')
  );
  const [loading, setLoading] = useState(true);

  // Derived — never stored, always computed
  const activeRole = useMemo(
    () => resolveActiveRole(user, activeOrg, memberships),
    [user, activeOrg, memberships]
  );

  // Bootstrap: validate stored token on mount
  useEffect(() => {
    const access = localStorage.getItem('access_token');
    if (!access) {
      setLoading(false);
      return;
    }

    authAPI
      .getProfile()
      .then((u) => {
        setUser(u);
        persist('user', u);
      })
      .catch(() => {
        clearStorage();
        setUser(null);
        setActiveOrg(null);
        setMemberships([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (email: string, password: string, skipRecovery = false) => {
    const res = await authAPI.login({ email, password });

    localStorage.setItem('access_token', res.access);
    localStorage.setItem('refresh_token', res.refresh);

    // if (res.requires_workspace_recovery && !skipRecovery) {
    //   persist('active_org', null);
    //   persist('memberships', res.memberships ?? []);
    //   const profile = await authAPI.getProfile();
    //   persist('user', profile);
    //   setUser(profile);
    //   setActiveOrg(null);
    //   setMemberships(res.memberships ?? []);
    //   setLoading(false);
    //   const hasOtherOrgs = (res.memberships ?? []).length > 0;
    //   window.location.href = hasOtherOrgs
    //     ? '/dashboard?reason=suspended'
    //     : '/register?mode=new_workspace&reason=suspended';
    //   return;
    // }

    persist('active_org', res.active_org ?? null);
    persist('memberships', res.memberships ?? []);
    const profile = await authAPI.getProfile();
    persist('user', profile);
    setUser(profile);
    setActiveOrg(res.active_org ?? null);
    setMemberships(res.memberships ?? []);
    if (res.suspended_notice) {
      persist('suspended_notice', res.suspended_notice);
      setSuspendedNotice(res.suspended_notice);
    } else {
      localStorage.removeItem('suspended_notice');
      setSuspendedNotice(null);
    }
    setLoading(false);
  }, []);

  const clearSuspendedNotice = useCallback(() => {
    localStorage.removeItem('suspended_notice');
    setSuspendedNotice(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } finally {
      clearStorage();
      setUser(null);
      setActiveOrg(null);
      setMemberships([]);
      setLoading(false);
    }
  }, []);

  const switchOrg = useCallback(async (organizationId: number) => {
    const res = await authAPI.switchOrg(organizationId);

    localStorage.setItem('access_token', res.access);
    localStorage.setItem('refresh_token', res.refresh);
    persist('active_org', res.active_org);
    persist('memberships', res.memberships ?? memberships);

    setActiveOrg(res.active_org);
    setMemberships(res.memberships ?? memberships);
    queryClient.clear();

    const updatedUser = await authAPI.getProfile();
    persist('user', updatedUser);
    setUser(updatedUser);
  }, [memberships, queryClient]);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await authAPI.register(payload);

    localStorage.setItem('access_token', res.access);
    localStorage.setItem('refresh_token', res.refresh);
    persist('user', res.user);

    const newActiveOrg: ActiveOrg = {
      id: res.organization.id,
      name: res.organization.name,
      slug: '',
      org_type: res.organization.type,
    };
    const membership: OrgMembership = {
      organization: newActiveOrg,
      role: 'ADMIN',
      role_display: 'Admin',
      status: 'ACTIVE',
      joined_at: new Date().toISOString(),
    };

    persist('active_org', newActiveOrg);
    persist('memberships', [membership]);

    setUser(res.user);
    setActiveOrg(newActiveOrg);
    setMemberships([membership]);
    setLoading(false);
  }, []);

  const acceptInvite = useCallback(async (inviteToken: string, email: string, password: string) => {
    // Step 1: login to get authenticated
    const loginRes = await authAPI.login({ email, password });
    localStorage.setItem('access_token', loginRes.access);
    localStorage.setItem('refresh_token', loginRes.refresh);

    // Step 2: accept invite — now authenticated
    const res = await authAPI.register({
      email,
      password,
      invite_code: inviteToken,
    });

    const newActiveOrg: ActiveOrg = {
      id: res.organization.id,
      name: res.organization.name,
      slug: res.organization.slug ?? '',
      org_type: res.organization.type,
    };

    persist('active_org', newActiveOrg);
    persist('memberships', res.memberships ?? []);
    persist('user', res.user);

    localStorage.setItem('access_token', res.access);
    localStorage.setItem('refresh_token', res.refresh);

    setUser(res.user);
    setActiveOrg(newActiveOrg);
    setMemberships((res.memberships as OrgMembership[]) ?? []);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        activeOrg,
        memberships,
        activeRole,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        switchOrg,
        register,
        acceptInvite,
        suspendedNotice,
        clearSuspendedNotice,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
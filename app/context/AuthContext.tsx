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
  RegisterResponse,
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
  register: (payload: RegisterPayload) => Promise<RegisterResponse>;
  acceptInvite: (inviteToken: string, email: string, password: string) => Promise<void>;
  suspendedNotices: SuspendedNotice[];
  clearSuspendedNotices: () => void;
}

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
  [
    'access_token', 'refresh_token', 'user',
    'active_org', 'memberships', 'suspended_notices',
  ].forEach(k => localStorage.removeItem(k));
}

function resolveActiveRole(
  user: User | null,
  activeOrg: ActiveOrg | null,
  memberships: OrgMembership[]
): Role | null {
  if (!user) return null;
  if (user.is_superadmin) return 'SUPERADMIN';
  if (!activeOrg) return null;
  const membership = memberships.find(m => m.organization.id === activeOrg.id && m.status);
  return membership?.role ?? null;
}

function buildSuspendedNotices(
  suspendedOrgs: { org: string; role: string }[]
): SuspendedNotice[] {
  return suspendedOrgs.map(o => ({
    org: o.org,
    message: o.role === 'ADMIN'
      ? `'${o.org}' has been suspended. Contact platform support.`
      : `'${o.org}' has been suspended. Contact your organization administrator.`,
  }));
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [user, setUser] = useState<User | null>(() => restore<User>('user'));
  const [activeOrg, setActiveOrg] = useState<ActiveOrg | null>(() => restore<ActiveOrg>('active_org'));
  const [memberships, setMemberships] = useState<OrgMembership[]>(
    () => restore<OrgMembership[]>('memberships') ?? []
  );
  const [membershipVersion, setMembershipVersion] = useState<number>(
    () => Number(typeof window !== 'undefined' ? localStorage.getItem('membership_version') ?? 0 : 0)
  );
  const [suspendedNotices, setSuspendedNotices] = useState<SuspendedNotice[]>(
    () => restore<SuspendedNotice[]>('suspended_notices') ?? []
  );
  const [loading, setLoading] = useState(true);

  const activeRole = useMemo(
    () => resolveActiveRole(user, activeOrg, memberships),
    [user, activeOrg, memberships]
  );

  const syncContext = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      const ctx = await authAPI.meContext();
      const suspendedOrgs = (ctx as unknown as {
        suspended_orgs?: { org: string; role: string }[]
      }).suspended_orgs ?? [];
      const notices = buildSuspendedNotices(suspendedOrgs);
      persist('active_org', ctx.active_org);
      persist('memberships', ctx.memberships);
      persist('suspended_notices', notices);
      localStorage.setItem('membership_version', String(ctx.membership_version));
      setActiveOrg(ctx.active_org);
      setMemberships(ctx.memberships);
      setMembershipVersion(ctx.membership_version);
      setSuspendedNotices(notices);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    const access = localStorage.getItem('access_token');
    if (!access) { setLoading(false); return; }
    authAPI.getProfile()
      .then(u => { setUser(u); persist('user', u); })
      .catch(() => { clearStorage(); setUser(null); setActiveOrg(null); setMemberships([]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleMismatch = () => syncContext();
    window.addEventListener('membership-version-mismatch', handleMismatch);
    return () => window.removeEventListener('membership-version-mismatch', handleMismatch);
  }, [syncContext]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncContext();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [syncContext]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('access_token', res.access);
    localStorage.setItem('refresh_token', res.refresh);
    const profile = await authAPI.getProfile();
    const suspendedOrgs = (res as unknown as {
      suspended_orgs?: { org: string; role: string }[]
    }).suspended_orgs ?? [];
    const notices = buildSuspendedNotices(suspendedOrgs);
    const version = (res as unknown as { membership_version?: number }).membership_version ?? 0;
    persist('user', profile);
    persist('active_org', res.active_org ?? null);
    persist('memberships', res.memberships ?? []);
    persist('suspended_notices', notices);
    localStorage.setItem('membership_version', String(version));
    setUser(profile);
    setActiveOrg(res.active_org ?? null);
    setMemberships(res.memberships ?? []);
    setSuspendedNotices(notices);
    setMembershipVersion(version);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); }
    finally {
      clearStorage();
      setUser(null);
      setActiveOrg(null);
      setMemberships([]);
      setSuspendedNotices([]);
      setLoading(false);
    }
  }, []);

  const switchOrg = useCallback(async (organizationId: number) => {
    const res = await authAPI.switchOrg(organizationId);
    localStorage.setItem('access_token', res.access);
    localStorage.setItem('refresh_token', res.refresh);
    const updatedUser = await authAPI.getProfile();
    persist('user', updatedUser);
    persist('active_org', res.active_org);
    persist('memberships', res.memberships ?? memberships);
    setUser(updatedUser);
    setActiveOrg(res.active_org);
    setMemberships(res.memberships ?? memberships);
    queryClient.clear();
  }, [memberships, queryClient]);

  const register = useCallback(async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const res: RegisterResponse = await authAPI.register(payload);

    if (res.status === 'pending') {
      return res;
    }

    if (!res.access || !res.refresh || !res.organization || !res.user) {
      return res;
    }

    localStorage.setItem('access_token', res.access);
    localStorage.setItem('refresh_token', res.refresh);

    const newActiveOrg: ActiveOrg = {
      id: res.organization.id,
      name: res.organization.name,
      slug: res.organization.slug ?? '',
      org_type: res.organization.type,
    };
    const membership: OrgMembership = {
      organization: newActiveOrg,
      role: 'ADMIN',
      role_display: 'Admin',
      status: 'ACTIVE',
      joined_at: new Date().toISOString(),
    };
    persist('user', res.user);
    persist('active_org', newActiveOrg);
    persist('memberships', [membership]);
    setUser(res.user);
    setActiveOrg(newActiveOrg);
    setMemberships([membership]);
    setLoading(false);
    return res;
  }, []);

  const acceptInvite = useCallback(async (
    inviteToken: string, email: string, password: string
  ) => {
    const loginRes = await authAPI.login({ email, password });
    localStorage.setItem('access_token', loginRes.access);
    localStorage.setItem('refresh_token', loginRes.refresh);

    const res: RegisterResponse = await authAPI.register({ email, password, invite_code: inviteToken });

    if (!res.access || !res.refresh || !res.organization || !res.user) {
      return;
    }

    const newActiveOrg: ActiveOrg = {
      id: res.organization.id,
      name: res.organization.name,
      slug: res.organization.slug ?? '',
      org_type: res.organization.type,
    };
    localStorage.setItem('access_token', res.access);
    localStorage.setItem('refresh_token', res.refresh);
    persist('user', res.user);
    persist('active_org', newActiveOrg);
    persist('memberships', res.memberships ?? []);
    setUser(res.user);
    setActiveOrg(newActiveOrg);
    setMemberships((res.memberships as OrgMembership[]) ?? []);
    setLoading(false);
  }, []);

  const clearSuspendedNotices = useCallback(() => {
    localStorage.removeItem('suspended_notices');
    setSuspendedNotices([]);
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
      register,
      acceptInvite,
      suspendedNotices,
      clearSuspendedNotices,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
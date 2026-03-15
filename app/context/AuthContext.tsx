'use client';

// ============================================================================
// app/context/AuthContext.tsx
// Updated for GAP 1: multi-org membership + workspace switching
//
// New state:
//   activeOrg    → the org the current JWT is scoped to
//   memberships  → all orgs the user has active membership in
//
// New actions:
//   switchOrg(id)  → calls POST /api/users/switch_org/, swaps token,
//                    updates activeOrg — all subsequent API calls scope to new org
//   register(...)  → calls POST /api/users/register/, logs in automatically
// ============================================================================

import {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { authAPI } from '@/app/core/api/auth';
import type {
  User,
  ActiveOrg,
  OrgMembership,
  RegisterPayload,
} from '@/app/core/types/auth';

interface AuthContextType {
  user: User | null;
  activeOrg: ActiveOrg | null;
  memberships: OrgMembership[];
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchOrg: (organizationId: number) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Storage helpers ──────────────────────────────────────────────────────────

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
  ['access_token', 'refresh_token', 'user', 'active_org', 'memberships'].forEach(
    (k) => localStorage.removeItem(k)
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => restore<User>('user'));
  const [activeOrg, setActiveOrg] = useState<ActiveOrg | null>(() =>
    restore<ActiveOrg>('active_org')
  );
  const [memberships, setMemberships] = useState<OrgMembership[]>(
    () => restore<OrgMembership[]>('memberships') ?? []
  );
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return !!localStorage.getItem('access_token');
  });

  // ── Bootstrap: validate stored token on mount ──────────────────────────────
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

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });

    // Store tokens first — getProfile needs them
    localStorage.setItem('access_token', res.access);
    localStorage.setItem('refresh_token', res.refresh);
    persist('active_org', res.active_org ?? null);
    persist('memberships', res.memberships ?? []);

    // Re-fetch profile with the new token so role/org reflects active workspace
    const profile = await authAPI.getProfile();
    persist('user', profile);

    setUser(profile);
    setActiveOrg(res.active_org ?? null);
    setMemberships(res.memberships ?? []);
    setLoading(false);
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
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

  // ── Switch Org ─────────────────────────────────────────────────────────────
  // Issues a new JWT scoped to the target org.
  // Swaps the stored access/refresh tokens so all subsequent API calls
  // automatically scope to the new org.
  const switchOrg = useCallback(async (organizationId: number) => {
    const res = await authAPI.switchOrg(organizationId);

    // Swap tokens — all API calls after this point scope to the new org
    localStorage.setItem('access_token', res.access);
    localStorage.setItem('refresh_token', res.refresh);
    persist('active_org', res.active_org);
    persist('memberships', res.memberships ?? memberships);

    setActiveOrg(res.active_org);
    setMemberships(res.memberships ?? memberships);

    // Re-fetch profile — role may differ per org
    const updatedUser = await authAPI.getProfile();
    persist('user', updatedUser);
    setUser(updatedUser);
  }, [memberships]);

  // ── Register ───────────────────────────────────────────────────────────────
  // Self-service personal workspace signup.
  // Automatically logs the user in after successful registration.
  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await authAPI.register(payload);

    localStorage.setItem('access_token', res.access);
    localStorage.setItem('refresh_token', res.refresh);
    persist('user', res.user);

    // Personal workspace — single org, single membership
    const activeOrg = {
      id: res.organization.id,
      name: res.organization.name,
      slug: '',
      org_type: res.organization.type,
    };
    const membership: OrgMembership = {
      organization: activeOrg,
      role: 'ADMIN',
      is_active: true,
      joined_at: new Date().toISOString(),
    };

    persist('active_org', activeOrg);
    persist('memberships', [membership]);

    setUser(res.user);
    setActiveOrg(activeOrg);
    setMemberships([membership]);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        activeOrg,
        memberships,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        switchOrg,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
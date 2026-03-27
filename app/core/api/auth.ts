// app/core/api/auth.ts
// Updated for GAP 1: multi-org membership + workspace switching + self-service signup

import type {
  User,
  LoginResponse,
  LoginCredentials,
  SwitchOrgResponse,
  OrgMembership,
  RegisterPayload,
  RegisterResponse,
  SuspendedOrg,
  MeContextResponse,
} from '@/app/core/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

function authHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  };
}

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const res = await fetch(`${API_URL}/users/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw Object.assign(new Error(data?.message || 'Login failed'), { data, status: res.status });
    }
    return res.json();
  },


  // ─── Logout ───────────────────────────────────────────────────────────────
  logout: async (): Promise<void> => {
    await fetch(`${API_URL}/users/logout/`, {
      method: 'POST',
      headers: authHeaders(),
    });
  },

  // ─── Profile ──────────────────────────────────────────────────────────────
  getProfile: async (): Promise<User> => {
    const res = await fetch(`${API_URL}/users/profile/`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to get profile');
    return res.json();
  },

  // ─── Memberships ──────────────────────────────────────────────────────────
  // GET /api/users/memberships/
  // Returns all active org memberships for the authenticated user
  getMemberships: async (): Promise<OrgMembership[]> => {
    const res = await fetch(`${API_URL}/users/memberships/`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to get memberships');
    return res.json();
  },

  // ─── Switch Org ───────────────────────────────────────────────────────────
  // POST /api/users/switch_org/
  // Issues a new token pair scoped to the requested org
  switchOrg: async (organizationId: number): Promise<SwitchOrgResponse> => {
    const res = await fetch(`${API_URL}/users/switch_org/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ organization_id: organizationId }),
    });
    if (!res.ok) {
      if (res.status === 403) throw new Error('No membership in this organization');
      throw new Error('Failed to switch organization');
    }
    return res.json();
  },

  // ─── Register ─────────────────────────────────────────────────────────────
  // POST /api/users/register/
  // Self-service personal workspace signup — no auth required
  register: async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const token = getToken();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/users/register/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw Object.assign(new Error('Registration failed'), { data, status: res.status });
    }
    return res.json();
  },
  getSuspendedWorkspaces: async (): Promise<SuspendedOrg[]> => {
    const res = await fetch(`${API_URL}/users/suspended_workspaces/`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch suspended workspaces');
    return res.json();
  },
  restoreWorkspace: async (orgId: number): Promise<SwitchOrgResponse> => {
    const res = await fetch(`${API_URL}/users/restore_workspace/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ org_id: orgId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw Object.assign(new Error('Failed to restore workspace'), { data });
    }
    return res.json();
  },
  meContext: async (): Promise<MeContextResponse> => {
    const res = await fetch(`${API_URL}/users/me_context/`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch context');
    return res.json();
  },
};
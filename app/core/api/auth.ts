// app/core/api/auth.ts

import { apiClient } from './client';
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

// ── Unauthenticated endpoints — native fetch to avoid 401 interceptor loop ──

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

  register: async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const token = localStorage.getItem('access_token');
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

  // ── Authenticated endpoints — apiClient (interceptor handles 401) ─────────

  logout: async (): Promise<void> => {
    await apiClient.post('/users/logout/');
  },

  getProfile: async (): Promise<User> => {
    const res = await apiClient.get<User>('/users/profile/');
    return res.data;
  },

  getMemberships: async (): Promise<OrgMembership[]> => {
    const res = await apiClient.get<OrgMembership[]>('/users/memberships/');
    return res.data;
  },

  switchOrg: async (organizationId: number): Promise<SwitchOrgResponse> => {
    const res = await apiClient.post<SwitchOrgResponse>('/users/switch_org/', { organization_id: organizationId });
    return res.data;
  },

  getSuspendedWorkspaces: async (): Promise<SuspendedOrg[]> => {
    const res = await apiClient.get<SuspendedOrg[]>('/users/suspended_workspaces/');
    return res.data;
  },

  restoreWorkspace: async (orgId: number): Promise<SwitchOrgResponse> => {
    try {
      const res = await apiClient.post<SwitchOrgResponse>('/users/restore_workspace/', { org_id: orgId });
      return res.data;
    } catch (err) {
      const data = (err as { response?: { data?: object } }).response?.data ?? {};
      throw Object.assign(new Error('Failed to restore workspace'), { data });
    }
  },

  meContext: async (): Promise<MeContextResponse> => {
    const res = await apiClient.get<MeContextResponse>('/users/me_context/');
    return res.data;
  },
};
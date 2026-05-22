import { apiClient, refreshClient } from './client';
import { getAccessToken } from '@/app/core/auth/tokenStore';
import type {
  ActiveOrg,
  LoginCredentials,
  LoginResponse,
  MeContextResponse,
  OrgMembership,
  RefreshResponse,
  RegisterPayload,
  RegisterResponse,
  SuspendedOrg,
  SwitchOrgResponse,
  User,
} from '@/app/core/types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api';

type RawActiveOrg = {
  id: number;
  name: string;
  slug: string;
  type?: ActiveOrg['org_type'];
  org_type?: ActiveOrg['org_type'];
} | null;

function normalizeActiveOrg(activeOrg: RawActiveOrg): ActiveOrg | null {
  if (!activeOrg) {
    return null;
  }
  return {
    id: activeOrg.id,
    name: activeOrg.name,
    slug: activeOrg.slug,
    org_type: activeOrg.org_type ?? activeOrg.type ?? 'INSTITUTION',
  };
}

function normalizeMemberships(memberships?: OrgMembership[]): OrgMembership[] {
  return memberships ?? [];
}

function normalizeLoginResponse(payload: LoginResponse): LoginResponse {
  return {
    ...payload,
    active_org: normalizeActiveOrg(payload.active_org as RawActiveOrg),
    memberships: normalizeMemberships(payload.memberships),
  };
}

function normalizeRefreshResponse(payload: RefreshResponse): RefreshResponse {
  return {
    ...payload,
    active_org: normalizeActiveOrg(payload.active_org as RawActiveOrg),
    memberships: normalizeMemberships(payload.memberships),
  };
}

function normalizeSwitchOrgResponse(payload: SwitchOrgResponse): SwitchOrgResponse {
  return {
    ...payload,
    active_org: normalizeActiveOrg(payload.active_org as RawActiveOrg) as ActiveOrg,
    memberships: normalizeMemberships(payload.memberships),
  };
}

function normalizeRegisterResponse(payload: RegisterResponse): RegisterResponse {
  return {
    ...payload,
    active_org: normalizeActiveOrg((payload.active_org ?? null) as RawActiveOrg),
    memberships: normalizeMemberships(payload.memberships),
  };
}

async function parseError(response: Response, fallbackMessage: string) {
  const data = await response.json().catch(() => ({}));
  throw Object.assign(new Error((data as { message?: string }).message || fallbackMessage), {
    data,
    status: response.status,
  });
}

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const response = await fetch(`${API_URL}/users/login/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) {
      await parseError(response, 'Login failed');
    }
    return normalizeLoginResponse(await response.json());
  },

  refresh: async (): Promise<RefreshResponse> => {
    const response = await refreshClient.post<RefreshResponse>('/users/refresh/');
    return normalizeRefreshResponse(response.data);
  },

  register: async (payload: RegisterPayload): Promise<RegisterResponse> => {
    const accessToken = getAccessToken();
    if (accessToken) {
      const response = await apiClient.post<RegisterResponse>('/users/register/', payload);
      return normalizeRegisterResponse(response.data);
    }

    const response = await fetch(`${API_URL}/users/register/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      await parseError(response, 'Registration failed');
    }
    return normalizeRegisterResponse(await response.json());
  },

  logout: async (): Promise<void> => {
    const response = await fetch(`${API_URL}/users/logout/`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      await parseError(response, 'Logout failed');
    }
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/profile/');
    return response.data;
  },

  getMemberships: async (): Promise<OrgMembership[]> => {
    const response = await apiClient.get<OrgMembership[]>('/users/memberships/');
    return response.data;
  },

  switchOrg: async (organizationId: number): Promise<SwitchOrgResponse> => {
    const response = await apiClient.post<SwitchOrgResponse>('/users/switch_org/', {
      organization_id: organizationId,
    });
    return normalizeSwitchOrgResponse(response.data);
  },

  getSuspendedWorkspaces: async (): Promise<SuspendedOrg[]> => {
    const response = await apiClient.get<SuspendedOrg[]>('/users/suspended_workspaces/');
    return response.data;
  },

  restoreWorkspace: async (orgId: number): Promise<SwitchOrgResponse> => {
    try {
      const response = await apiClient.post<SwitchOrgResponse>('/users/restore_workspace/', { org_id: orgId });
      return normalizeSwitchOrgResponse(response.data);
    } catch (error) {
      const data = (error as { response?: { data?: object } }).response?.data ?? {};
      throw Object.assign(new Error('Failed to restore workspace'), { data });
    }
  },

  meContext: async (): Promise<MeContextResponse> => {
    const response = await apiClient.get<MeContextResponse>('/users/me_context/');
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password/', { email });
    return response.data;
  },

  resetPassword: async (data: {
    uid: string;
    token: string;
    new_password: string;
    confirm_password: string;
  }) => {
    const response = await apiClient.post('/auth/reset-password/', data);
    return response.data;
  },

  validateResetToken: async (data: { uid: string; token: string }) => {
    const response = await apiClient.get(`/auth/reset-password/${data.uid}/${data.token}/validate/`);
    return response.data;
  },
};

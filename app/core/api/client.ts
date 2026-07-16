import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { redirectToLogin } from '@/app/core/auth/navigation';
import {
  clearAccessToken,
  getAccessToken,
  getAccessTokenVersion,
  setAccessToken,
} from '@/app/core/auth/tokenStore';
import {
  assertWorkspaceGeneration,
  getWorkspaceGeneration,
  isWorkspaceGenerationSupersededError,
  WorkspaceGenerationSupersededError,
} from '@/app/core/runtime/workspaceGeneration';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
let hasWarnedAboutApiBaseUrl = false;

type AuthFailureHandler = () => void;

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _workspaceGeneration?: number;
};

interface RefreshPayload {
  access: string;
  membership_version?: number;
}

let authFailureHandler: AuthFailureHandler | null = null;
let refreshPromise: Promise<string> | null = null;

class AuthRefreshSupersededError extends Error {
  constructor() {
    super('Auth refresh was superseded by a local auth state change.');
    this.name = 'AuthRefreshSupersededError';
  }
}

function isAuthRefreshSupersededError(error: unknown): error is AuthRefreshSupersededError {
  return error instanceof AuthRefreshSupersededError;
}

function apiBaseUrlIncludesApiPath(baseURL: string): boolean {
  const normalized = baseURL.trim();

  if (!normalized) {
    return false;
  }

  try {
    const parsed = new URL(
      normalized,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    );
    return parsed.pathname.includes('/api');
  } catch {
    return normalized.includes('/api');
  }
}

function warnOnMisconfiguredApiBaseUrl(): void {
  if (typeof window === 'undefined' || hasWarnedAboutApiBaseUrl) {
    return;
  }

  if (apiBaseUrlIncludesApiPath(API_BASE_URL)) {
    return;
  }

  hasWarnedAboutApiBaseUrl = true;
  console.warn(
    '[apiClient] NEXT_PUBLIC_API_URL should point to the backend API and include /api.',
    {
      currentBaseURL: API_BASE_URL,
      expectedExample: 'https://backend.example.com/api',
    }
  );
}

warnOnMisconfiguredApiBaseUrl();

function isAuthEndpoint(url?: string): boolean {
  return !!url && (
    url.includes('/users/login/') ||
    url.includes('/users/logout/') ||
    url.includes('/users/refresh/')
  );
}

function syncMembershipVersion(serverVersion?: string): void {
  if (typeof window === 'undefined' || !serverVersion) {
    return;
  }
  const storedVersion = window.localStorage.getItem('membership_version') ?? '0';
  if (serverVersion !== storedVersion) {
    window.localStorage.setItem('membership_version', serverVersion);
    window.dispatchEvent(new CustomEvent('membership-version-mismatch'));
  }
}

function handleAuthFailure(): void {
  clearAccessToken();
  authFailureHandler?.();
  redirectToLogin();
}

async function performRefreshRequest(): Promise<string> {
  const tokenVersionAtStart = getAccessTokenVersion();
  const workspaceGenerationAtStart = getWorkspaceGeneration();
  const response = await refreshClient.post<RefreshPayload>('/users/refresh/');
  const accessToken = response.data.access;

  if (
    getAccessTokenVersion() !== tokenVersionAtStart
    || getWorkspaceGeneration() !== workspaceGenerationAtStart
  ) {
    throw new AuthRefreshSupersededError();
  }

  setAccessToken(accessToken);

  if (typeof window !== 'undefined') {
    const membershipVersion = response.data.membership_version;
    if (membershipVersion !== undefined) {
      window.localStorage.setItem('membership_version', String(membershipVersion));
    }
  }
  syncMembershipVersion(response.headers['x-membership-version']);
  return accessToken;
}

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performRefreshRequest().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function registerAuthFailureHandler(handler: AuthFailureHandler | null): void {
  authFailureHandler = handler;
}

export const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const workspaceConfig = config as RetryableRequestConfig;
  workspaceConfig._workspaceGeneration ??= getWorkspaceGeneration();
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const generation = (response.config as RetryableRequestConfig)._workspaceGeneration;
    if (generation !== undefined) {
      assertWorkspaceGeneration(generation);
    }
    syncMembershipVersion(response.headers['x-membership-version']);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (
      originalRequest?._workspaceGeneration !== undefined
      && originalRequest._workspaceGeneration !== getWorkspaceGeneration()
    ) {
      return Promise.reject(new WorkspaceGenerationSupersededError());
    }

    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (isAuthEndpoint(originalRequest.url) || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshedAccessToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${refreshedAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      if (
        isAuthRefreshSupersededError(refreshError)
        || isWorkspaceGenerationSupersededError(refreshError)
      ) {
        return Promise.reject(refreshError);
      }
      handleAuthFailure();
      return Promise.reject(refreshError);
    }
  }
);

refreshClient.interceptors.request.use((config) => {
  const workspaceConfig = config as RetryableRequestConfig;
  workspaceConfig._workspaceGeneration ??= getWorkspaceGeneration();
  return workspaceConfig;
});

refreshClient.interceptors.response.use(
  (response) => {
    const generation = (response.config as RetryableRequestConfig)._workspaceGeneration;
    if (generation !== undefined) {
      assertWorkspaceGeneration(generation);
    }
    syncMembershipVersion(response.headers['x-membership-version']);
    return response;
  },
  (error: AxiosError) => {
    const generation = (error.config as RetryableRequestConfig | undefined)
      ?._workspaceGeneration;
    if (generation !== undefined && generation !== getWorkspaceGeneration()) {
      return Promise.reject(new WorkspaceGenerationSupersededError());
    }
    return Promise.reject(error);
  }
);

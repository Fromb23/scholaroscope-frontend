'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';

import { DEFAULT_WORKSPACE_CAPABILITIES, authAPI } from '@/app/core/api/auth';
import {
  beginAuthenticationTransition,
  registerAuthFailureHandler,
} from '@/app/core/api/client';
import { logoutLocalFirst } from '@/app/core/auth/logout';
import {
  LOGOUT_NAVIGATION_DEADLINE_MS,
  replaceWithLoginDocument,
} from '@/app/core/auth/logoutNavigation';
import {
  clearExplicitLogout,
  isExplicitLogoutActive,
} from '@/app/core/auth/explicitLogout';
import { isNetworkError } from '@/app/core/auth/networkDetection';
import { redirectToPlatformConsole } from '@/app/core/auth/platformRedirect';
import {
  clearAccessToken,
  getAccessTokenVersion,
  setAccessToken,
} from '@/app/core/auth/tokenStore';
import { resolveMembershipRoleForOrganization } from '@/app/core/lib/organizationScope';
import {
  advanceWorkspaceGeneration,
  captureWorkspaceAuthority,
  getWorkspaceGeneration,
  isWorkspaceAuthorityCurrent,
  useWorkspaceGeneration,
  type WorkspaceGenerationReason,
} from '@/app/core/runtime/workspaceGeneration';
import type {
  ActiveOrg,
  AccessNotice,
  LoginResponse,
  OrgMembership,
  RegisterPayload,
  RegisterResponse,
  Role,
  OperatingContext,
  SwitchOrgResponse,
  User,
  WorkspaceCapabilities,
} from '@/app/core/types/auth';

interface AuthContextType {
  user: User | null;
  activeOrg: ActiveOrg | null;
  memberships: OrgMembership[];
  capabilities: WorkspaceCapabilities;
  availableOperatingContexts: OperatingContext[];
  activeOperatingContext: OperatingContext | null;
  setActiveOperatingContext: (context: OperatingContext) => void;
  /** @deprecated compatibility metadata only; do not authorize from this. */
  activeRole: Role | null;
  loading: boolean;
  loggingOut: boolean;
  offline: boolean;
  workspaceGeneration: number;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  switchOrg: (organizationId: number) => Promise<SwitchOrgResponse>;
  restoreWorkspace: (organizationId: number) => Promise<SwitchOrgResponse>;
  register: (payload: RegisterPayload) => Promise<RegisterResponse>;
  verifyEmail: (token: string) => Promise<RegisterResponse>;
  acceptInvite: (inviteToken: string, email: string, password: string) => Promise<void>;
  accessNotices: AccessNotice[];
  clearAccessNotices: () => void;
}

type AuthStatePayload = {
  access: string;
  user: User;
  active_org: ActiveOrg | null;
  capabilities: WorkspaceCapabilities;
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
    'workspace_capabilities',
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

const OPERATING_CONTEXT_STORAGE_KEY = 'scholaroscope_operating_context';

function readStoredOperatingContext(): OperatingContext | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(OPERATING_CONTEXT_STORAGE_KEY);
  return (
    value === 'WORKSPACE_MANAGEMENT'
    || value === 'MY_TEACHING'
    || value === 'INSTITUTION_OVERSIGHT'
  ) ? value : null;
}

function writeStoredOperatingContext(context: OperatingContext | null) {
  if (typeof window === 'undefined') return;
  if (context) {
    window.localStorage.setItem(OPERATING_CONTEXT_STORAGE_KEY, context);
  } else {
    window.localStorage.removeItem(OPERATING_CONTEXT_STORAGE_KEY);
  }
}

function isSelfManagedTeachingOwnerProjection(capabilities: WorkspaceCapabilities): boolean {
  return Boolean(
    capabilities.can_teach
    && capabilities.is_workspace_owner
    && (
      capabilities.workspace_behavior === 'FREELANCE_TEACHER'
      || capabilities.workspace_behavior === 'SELF_MANAGED'
    )
  );
}

function deriveOperatingContexts(capabilities: WorkspaceCapabilities): OperatingContext[] {
  const serverContexts = capabilities.authorization?.operating_contexts;
  if (!Array.isArray(serverContexts)) return [];
  return serverContexts.filter(
    (context, index): context is OperatingContext => (
      (
        context === 'WORKSPACE_MANAGEMENT'
        || context === 'MY_TEACHING'
        || context === 'INSTITUTION_OVERSIGHT'
      )
      && serverContexts.indexOf(context) === index
    ),
  );
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
  const workspaceGeneration = useWorkspaceGeneration();
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [activeOrg, setActiveOrg] = useState<ActiveOrg | null>(null);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [capabilities, setCapabilities] = useState<WorkspaceCapabilities>(DEFAULT_WORKSPACE_CAPABILITIES);
  const [membershipVersion, setMembershipVersion] = useState<number>(0);
  const [accessNotices, setAccessNotices] = useState<AccessNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [offline, setOffline] = useState(false);
  const [savedOperatingContext, setSavedOperatingContext] = useState<OperatingContext | null>(() => readStoredOperatingContext());
  const authStateVersionRef = useRef(0);
  const switchOrgInFlightRef = useRef<{
    organizationId: number;
    promise: Promise<SwitchOrgResponse>;
  } | null>(null);
  const logoutPromiseRef = useRef<Promise<void> | null>(null);
  const logoutAttemptRef = useRef(0);
  const logoutNavigationStartedRef = useRef<number | null>(null);
  const logoutFallbackIssuedRef = useRef<number | null>(null);
  const logoutFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggingOutRef = useRef(false);

  const clearLogoutFallback = useCallback(() => {
    if (logoutFallbackTimerRef.current !== null) {
      clearTimeout(logoutFallbackTimerRef.current);
      logoutFallbackTimerRef.current = null;
    }
  }, []);

  const finishLogoutNavigation = useCallback(() => {
    clearLogoutFallback();
    loggingOutRef.current = false;
    logoutPromiseRef.current = null;
    logoutNavigationStartedRef.current = null;
    logoutFallbackIssuedRef.current = null;
    setLoggingOut(false);
  }, [clearLogoutFallback]);

  const cancelLogoutNavigation = useCallback(() => {
    logoutAttemptRef.current += 1;
    finishLogoutNavigation();
  }, [finishLogoutNavigation]);

  const beginIntentionalAuthentication = useCallback(() => {
    cancelLogoutNavigation();
    clearExplicitLogout();
  }, [cancelLogoutNavigation]);

  const activeRole = useMemo(
    () => resolveActiveRole(user, activeOrg, memberships),
    [user, activeOrg, memberships]
  );
  const availableOperatingContexts = useMemo(
    () => (user && activeOrg ? deriveOperatingContexts(capabilities) : []),
    [activeOrg, capabilities, user]
  );
  const activeOperatingContext = useMemo<OperatingContext | null>(() => {
    if (availableOperatingContexts.length === 0) return null;
    if (
      isSelfManagedTeachingOwnerProjection(capabilities)
      && availableOperatingContexts.includes('WORKSPACE_MANAGEMENT')
    ) {
      return 'WORKSPACE_MANAGEMENT';
    }
    if (savedOperatingContext && availableOperatingContexts.includes(savedOperatingContext)) {
      return savedOperatingContext;
    }
    return availableOperatingContexts[0];
  }, [availableOperatingContexts, capabilities, savedOperatingContext]);

  const selectOperatingContext = useCallback((context: OperatingContext) => {
    setSavedOperatingContext(context);
    writeStoredOperatingContext(context);
  }, []);

  const advanceAuthority = useCallback((reason: WorkspaceGenerationReason) => {
    queryClient.clear();
    advanceWorkspaceGeneration(reason);
  }, [queryClient]);

  const clearAuthState = useCallback((
    reason: WorkspaceGenerationReason = 'session-invalidation',
  ) => {
    authStateVersionRef.current += 1;
    clearAccessToken();
    clearStoredAuthState();
    setUser(null);
    setActiveOrg(null);
    setMemberships([]);
    setCapabilities(DEFAULT_WORKSPACE_CAPABILITIES);
    setSavedOperatingContext(null);
    writeStoredOperatingContext(null);
    setMembershipVersion(0);
    setAccessNotices([]);
    advanceAuthority(reason);
  }, [advanceAuthority]);

  const applyAuthState = useCallback((
    payload: AuthStatePayload,
    reason: WorkspaceGenerationReason = 'login',
  ) => {
    if (payload.user?.is_superadmin) {
      clearAuthState();
      redirectToPlatformConsole('/login');
      return;
    }
    authStateVersionRef.current += 1;
    setLoggingOut(false);
    setOffline(false);
    setAccessToken(payload.access);
    setUser(payload.user);
    setActiveOrg(payload.active_org);
    setMemberships(payload.memberships ?? []);
    setCapabilities(payload.capabilities ?? DEFAULT_WORKSPACE_CAPABILITIES);
    setMembershipVersion(payload.membership_version ?? 0);
    setAccessNotices(
      buildAccessNotices(
        payload.restricted_orgs,
        payload.org_suspended_orgs,
        payload.removed_orgs,
      )
    );
    storeMembershipVersion(payload.membership_version ?? 0);
    advanceAuthority(reason);
  }, [advanceAuthority, clearAuthState]);

  const applyMembershipContext = useCallback((payload: {
    active_org: ActiveOrg | null;
    memberships: OrgMembership[];
    capabilities: WorkspaceCapabilities;
    membership_version: number;
    restricted_orgs?: AccessNotice[];
    org_suspended_orgs?: AccessNotice[];
    removed_orgs?: AccessNotice[];
  }) => {
    const authorityChanged = (
      activeOrg?.id !== (payload.active_org?.id ?? null)
      || membershipVersion !== (payload.membership_version ?? 0)
    );
    setActiveOrg(payload.active_org);
    setMemberships(payload.memberships ?? []);
    setCapabilities(payload.capabilities ?? DEFAULT_WORKSPACE_CAPABILITIES);
    setMembershipVersion(payload.membership_version ?? 0);
    setAccessNotices(
      buildAccessNotices(
        payload.restricted_orgs,
        payload.org_suspended_orgs,
        payload.removed_orgs,
      )
    );
    storeMembershipVersion(payload.membership_version ?? 0);
    if (authorityChanged) {
      advanceAuthority('context-replacement');
    }
  }, [activeOrg?.id, advanceAuthority, membershipVersion]);

  const syncContext = useCallback(async () => {
    if (!user || isExplicitLogoutActive()) {
      return;
    }
    const expectedOrganizationId = activeOrg?.id ?? null;
    const authorityAtStart = captureWorkspaceAuthority(expectedOrganizationId);
    const tokenVersionAtStart = getAccessTokenVersion();
    try {
      const context = await authAPI.meContext();
      if (
        tokenVersionAtStart !== getAccessTokenVersion()
        || !isWorkspaceAuthorityCurrent(authorityAtStart, expectedOrganizationId)
        || (context.active_org?.id ?? null) !== expectedOrganizationId
      ) {
        return;
      }
      applyMembershipContext(context);
    } catch {
      // Request interceptor handles refresh/retry and terminal redirect.
    }
  }, [activeOrg?.id, applyMembershipContext, user]);

  useEffect(() => {
    registerAuthFailureHandler(() => {
      clearAuthState();
      setLoading(false);
    });
    return () => registerAuthFailureHandler(null);
  }, [clearAuthState]);

  useEffect(() => {
    if (!loggingOut) {
      clearLogoutFallback();
      return;
    }

    if (pathname === '/login') {
      finishLogoutNavigation();
      return;
    }

    const attempt = logoutAttemptRef.current;
    const issueDocumentFallback = () => {
      if (
        logoutFallbackIssuedRef.current === attempt
        || logoutAttemptRef.current !== attempt
        || !loggingOutRef.current
        || !isExplicitLogoutActive()
      ) {
        return;
      }
      logoutFallbackIssuedRef.current = attempt;
      clearLogoutFallback();
      replaceWithLoginDocument();
    };

    if (logoutNavigationStartedRef.current !== attempt) {
      logoutNavigationStartedRef.current = attempt;
      router.prefetch?.('/login');
      try {
        router.replace('/login');
      } catch {
        issueDocumentFallback();
      }
    }

    if (
      logoutFallbackIssuedRef.current !== attempt
      && logoutFallbackTimerRef.current === null
    ) {
      logoutFallbackTimerRef.current = setTimeout(
        issueDocumentFallback,
        LOGOUT_NAVIGATION_DEADLINE_MS,
      );
    }
  }, [
    clearLogoutFallback,
    finishLogoutNavigation,
    loggingOut,
    pathname,
    router,
  ]);

  useEffect(() => clearLogoutFallback, [clearLogoutFallback]);

  const boot = useCallback(async (isCancelled: () => boolean = () => false) => {
    if (isExplicitLogoutActive()) {
      loggingOutRef.current = true;
      logoutAttemptRef.current += 1;
      setLoggingOut(true);
      clearAuthState('session-invalidation');
      setLoading(false);
      return;
    }
    const bootAuthStateVersion = authStateVersionRef.current;
    const bootWorkspaceGeneration = getWorkspaceGeneration();
    const bootTokenVersion = getAccessTokenVersion();
    const bootWasSuperseded = () => (
      isCancelled()
      || authStateVersionRef.current !== bootAuthStateVersion
      || getWorkspaceGeneration() !== bootWorkspaceGeneration
      || getAccessTokenVersion() !== bootTokenVersion
    );

    setLoading(true);

    try {
      const response = await authAPI.refresh();
      if (bootWasSuperseded()) {
        return;
      }
      applyAuthState(response, 'session-restoration');
      setLoading(false);
    } catch (error) {
      if (bootWasSuperseded()) {
        return;
      }
      if (isNetworkError(error)) {
        setOffline(true);
        setLoading(false);
        return;
      }
      clearAuthState('session-invalidation');
      setLoading(false);
    }
  }, [applyAuthState, clearAuthState]);

  useEffect(() => {
    let cancelled = false;

    clearLegacyTokenStorage();

    void boot(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [boot]);

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

  useEffect(() => {
    const handleOnline = () => {
      if (offline) {
        setOffline(false);
        void boot();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [boot, offline]);

  const login = useCallback(async (email: string, password: string) => {
    beginIntentionalAuthentication();
    const authorityAtStart = captureWorkspaceAuthority(activeOrg?.id ?? null);
    const authStateVersionAtStart = authStateVersionRef.current;
    const response = await authAPI.login({ email, password });
    if (
      isExplicitLogoutActive()
      || authStateVersionRef.current !== authStateVersionAtStart
      || !isWorkspaceAuthorityCurrent(authorityAtStart, activeOrg?.id ?? null)
    ) {
      throw new Error('Login response was superseded by an authentication state change.');
    }
    applyAuthState(response, 'login');
    setLoading(false);
    return response;
  }, [activeOrg?.id, applyAuthState, beginIntentionalAuthentication]);

  const logout = useCallback(() => {
    if (logoutPromiseRef.current) {
      return logoutPromiseRef.current;
    }
    logoutAttemptRef.current += 1;
    const promise = logoutLocalFirst({
      markLogoutStarted: () => {
        loggingOutRef.current = true;
        setLoggingOut(true);
      },
      clearAuthState: () => clearAuthState('logout'),
      setLoading,
    });
    logoutPromiseRef.current = promise;
    return promise;
  }, [clearAuthState]);

  const switchOrg = useCallback(async (organizationId: number) => {
    const existingSwitch = switchOrgInFlightRef.current;
    if (existingSwitch) {
      if (existingSwitch.organizationId === organizationId) {
        return existingSwitch.promise;
      }
      throw new Error('Workspace switching is already in progress.');
    }

    const endTransition = beginAuthenticationTransition();
    const switchPromise = (async () => {
      const response = await authAPI.switchOrg(organizationId);
      applyAuthState(response, 'workspace-switch');
      return response;
    })();
    switchOrgInFlightRef.current = {
      organizationId,
      promise: switchPromise,
    };
    try {
      return await switchPromise;
    } finally {
      if (switchOrgInFlightRef.current?.promise === switchPromise) {
        switchOrgInFlightRef.current = null;
      }
      endTransition();
    }
  }, [applyAuthState]);

  const restoreWorkspace = useCallback(async (organizationId: number) => {
    const response = await authAPI.restoreWorkspace(organizationId);
    applyAuthState(response, 'workspace-restore');
    return response;
  }, [applyAuthState]);

  const register = useCallback(async (payload: RegisterPayload): Promise<RegisterResponse> => {
    beginIntentionalAuthentication();
    const response = await authAPI.register(payload);

    if (response.status === 'pending' || response.status === 'email_verification_required') {
      return response;
    }

    if (!response.access || !response.user) {
      return response;
    }

    applyAuthState({
      access: response.access,
      user: response.user,
      active_org: registerResponseActiveOrg(response),
      capabilities: response.capabilities ?? DEFAULT_WORKSPACE_CAPABILITIES,
      memberships: response.memberships ?? [],
      membership_version: response.membership_version ?? membershipVersion,
    }, 'registration');
    setLoading(false);
    return response;
  }, [applyAuthState, beginIntentionalAuthentication, membershipVersion]);

  const verifyEmail = useCallback(async (token: string): Promise<RegisterResponse> => {
    beginIntentionalAuthentication();
    const response = await authAPI.verifyEmail(token);
    if (response.access && response.user) {
      applyAuthState({
        access: response.access,
        user: response.user,
        active_org: registerResponseActiveOrg(response),
        capabilities: response.capabilities ?? DEFAULT_WORKSPACE_CAPABILITIES,
        memberships: response.memberships ?? [],
        membership_version: response.membership_version ?? membershipVersion,
      }, 'verification');
      setLoading(false);
    }
    return response;
  }, [applyAuthState, beginIntentionalAuthentication, membershipVersion]);

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
      capabilities,
      availableOperatingContexts,
      activeOperatingContext,
      setActiveOperatingContext: selectOperatingContext,
      activeRole,
      loading,
      loggingOut,
      offline,
      workspaceGeneration,
      isAuthenticated: !!user,
      login,
      logout,
      switchOrg,
      restoreWorkspace,
      register,
      verifyEmail,
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

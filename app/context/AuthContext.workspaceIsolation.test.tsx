import { createElement, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from '@/app/context/AuthContext';
import {
  DEFAULT_WORKSPACE_CAPABILITIES,
  authAPI,
} from '@/app/core/api/auth';
import { resetWorkspaceGenerationForTests } from '@/app/core/runtime/workspaceGeneration';
import {
  clearExplicitLogout,
  isExplicitLogoutActive,
  markExplicitLogout,
} from '@/app/core/auth/explicitLogout';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function authState(organizationId: number, canViewReports: boolean) {
  const organization = {
    id: organizationId,
    name: `Workspace ${organizationId}`,
    slug: `workspace-${organizationId}`,
    org_type: 'INSTITUTION' as const,
  };
  return {
    access: `access-${organizationId}`,
    user: {
      id: 1,
      email: 'teacher@example.com',
      full_name: 'Teacher',
      first_name: 'Teacher',
      last_name: '',
      is_superadmin: false,
      is_active: true,
      phone: '',
      date_joined: '2026-01-01T00:00:00Z',
      last_login: '2026-07-16T00:00:00Z',
    },
    active_org: organization,
    capabilities: {
      ...DEFAULT_WORKSPACE_CAPABILITIES,
      can_view_reports: canViewReports,
    },
    memberships: [{
      role: 'INSTRUCTOR' as const,
      role_display: 'Instructor',
      status: 'ACTIVE' as const,
      joined_at: '2026-01-01T00:00:00Z',
      organization,
    }],
    membership_version: organizationId,
    message: 'ok',
    state: 'active',
    restricted_orgs: [],
    org_suspended_orgs: [],
    removed_orgs: [],
  };
}

describe('AuthContext workspace authority races', () => {
  const windowListeners = new Map<string, () => void>();
  const documentListeners = new Map<string, () => void>();
  let renderer: ReactTestRenderer | null = null;

  beforeEach(() => {
    clearExplicitLogout();
    resetWorkspaceGenerationForTests();
    const storage = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
      sessionStorage: {
        getItem: (key: string) => storage.get(`session:${key}`) ?? null,
        setItem: (key: string, value: string) => storage.set(`session:${key}`, value),
        removeItem: (key: string) => storage.delete(`session:${key}`),
      },
      addEventListener: (name: string, listener: () => void) => windowListeners.set(name, listener),
      removeEventListener: (name: string) => windowListeners.delete(name),
      dispatchEvent: () => true,
      location: { origin: 'https://app.example.test' },
    });
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      addEventListener: (name: string, listener: () => void) => documentListeners.set(name, listener),
      removeEventListener: (name: string) => documentListeners.delete(name),
    });
  });

  afterEach(async () => {
    await act(async () => {
      renderer?.unmount();
    });
    renderer = null;
    windowListeners.clear();
    documentListeners.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    resetWorkspaceGenerationForTests();
    clearExplicitLogout();
  });

  it('does not let a late workspace A me_context overwrite workspace B', async () => {
    const boot = deferred<ReturnType<typeof authState>>();
    const oldContext = deferred<ReturnType<typeof authState>>();
    vi.spyOn(authAPI, 'refresh').mockReturnValue(boot.promise);
    vi.spyOn(authAPI, 'meContext').mockReturnValue(oldContext.promise);
    vi.spyOn(authAPI, 'switchOrg').mockResolvedValue(authState(2, true));

    const observeAuth = vi.fn<(value: ReturnType<typeof useAuth>) => void>();
    function Probe({ onAuth }: { onAuth: (value: ReturnType<typeof useAuth>) => void }) {
      const auth = useAuth();
      useEffect(() => onAuth(auth), [auth, onAuth]);
      return createElement('auth-state', {
        organizationId: auth.activeOrg?.id ?? null,
        canViewReports: auth.capabilities.can_view_reports,
        generation: auth.workspaceGeneration,
      });
    }

    await act(async () => {
      renderer = create(
        createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          createElement(AuthProvider, null, createElement(Probe, { onAuth: observeAuth })),
        ),
      );
    });
    await act(async () => {
      boot.resolve(authState(1, false));
      await boot.promise;
    });

    await act(async () => {
      windowListeners.get('membership-version-mismatch')?.();
      await Promise.resolve();
    });
    expect(authAPI.meContext).toHaveBeenCalledOnce();
    const currentAuth = () => observeAuth.mock.calls.at(-1)![0];

    await act(async () => {
      await currentAuth().switchOrg(2);
    });
    const generationAfterSwitch = currentAuth().workspaceGeneration;

    await act(async () => {
      oldContext.resolve(authState(1, false));
      await oldContext.promise;
    });

    const rendered = renderer!.root.find((node) => String(node.type) === 'auth-state');
    expect(rendered.props).toMatchObject({
      organizationId: 2,
      canViewReports: true,
      generation: generationAfterSwitch,
    });
  });

  it('keeps the committed workspace unchanged when switching fails', async () => {
    vi.spyOn(authAPI, 'refresh').mockResolvedValue(authState(1, false));
    vi.spyOn(authAPI, 'switchOrg').mockRejectedValue(new Error('switch denied'));

    const observeAuth = vi.fn<(value: ReturnType<typeof useAuth>) => void>();
    function Probe({ onAuth }: { onAuth: (value: ReturnType<typeof useAuth>) => void }) {
      const auth = useAuth();
      useEffect(() => onAuth(auth), [auth, onAuth]);
      return createElement('auth-state', {
        organizationId: auth.activeOrg?.id ?? null,
        generation: auth.workspaceGeneration,
      });
    }

    await act(async () => {
      renderer = create(
        createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          createElement(AuthProvider, null, createElement(Probe, { onAuth: observeAuth })),
        ),
      );
      await Promise.resolve();
    });
    const currentAuth = () => observeAuth.mock.calls.at(-1)![0];
    const generationBefore = currentAuth().workspaceGeneration;

    await act(async () => {
      await expect(currentAuth().switchOrg(2)).rejects.toThrow('switch denied');
    });

    expect(currentAuth().activeOrg?.id).toBe(1);
    expect(currentAuth().workspaceGeneration).toBe(generationBefore);
  });

  it('does not call boot refresh while an explicit logout tombstone is active', async () => {
    markExplicitLogout();
    const refresh = vi.spyOn(authAPI, 'refresh');

    await act(async () => {
      renderer = create(
        createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          createElement(AuthProvider, null, createElement('auth-child')),
        ),
      );
      await Promise.resolve();
    });

    expect(refresh).not.toHaveBeenCalled();
  });

  it('clears the tombstone for an intentional login and establishes the session', async () => {
    markExplicitLogout();
    vi.spyOn(authAPI, 'refresh');
    vi.spyOn(authAPI, 'login').mockResolvedValue(authState(2, true));
    const observeAuth = vi.fn<(value: ReturnType<typeof useAuth>) => void>();

    function Probe() {
      const auth = useAuth();
      useEffect(() => observeAuth(auth), [auth]);
      return createElement('auth-state', { organizationId: auth.activeOrg?.id ?? null });
    }

    await act(async () => {
      renderer = create(
        createElement(
          QueryClientProvider,
          { client: new QueryClient() },
          createElement(AuthProvider, null, createElement(Probe)),
        ),
      );
      await Promise.resolve();
    });

    await act(async () => {
      await observeAuth.mock.calls.at(-1)![0].login('teacher@example.com', 'password');
    });

    expect(isExplicitLogoutActive()).toBe(false);
    expect(observeAuth.mock.calls.at(-1)![0].activeOrg?.id).toBe(2);
  });
});

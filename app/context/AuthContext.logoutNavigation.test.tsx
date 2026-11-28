import { createElement, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from '@/app/context/AuthContext';
import { DEFAULT_WORKSPACE_CAPABILITIES, authAPI } from '@/app/core/api/auth';
import { AuthGuard } from '@/app/core/guards/AuthGuard';
import { LoginPage } from '@/app/core/components/auth/LoginPage';
import {
  resetWorkspaceGenerationForTests,
  WorkspaceGenerationBoundary,
} from '@/app/core/runtime/workspaceGeneration';
import { clearExplicitLogout } from '@/app/core/auth/explicitLogout';
import { LOGOUT_NAVIGATION_DEADLINE_MS } from '@/app/core/auth/logoutNavigation';

const navigationMocks = vi.hoisted(() => ({
  pathname: '/requests',
  prefetch: vi.fn(),
  replace: vi.fn(),
  replaceDocument: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({
    prefetch: navigationMocks.prefetch,
    push: vi.fn(),
    replace: navigationMocks.replace,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/app/core/auth/logoutNavigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/core/auth/logoutNavigation')>();
  return {
    ...actual,
    replaceWithLoginDocument: navigationMocks.replaceDocument,
  };
});

vi.mock('@/app/components/theme/PublicThemeToggle', () => ({
  PublicThemeToggle: () => createElement('theme-toggle'),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => createElement('img', props),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

type AuthValue = ReturnType<typeof useAuth>;

function authenticatedState() {
  const organization = {
    id: 11,
    name: 'Logout Test School',
    slug: 'logout-test-school',
    org_type: 'INSTITUTION' as const,
  };
  return {
    access: 'access-11',
    user: {
      id: 7,
      email: 'teacher@example.com',
      full_name: 'Test Teacher',
      first_name: 'Test',
      last_name: 'Teacher',
      is_superadmin: false,
      is_active: true,
      phone: '',
      date_joined: '2026-01-01T00:00:00Z',
      last_login: '2026-11-28T00:00:00Z',
    },
    active_org: organization,
    capabilities: {
      ...DEFAULT_WORKSPACE_CAPABILITIES,
      authorization: {
        enforced: true,
        permission_keys: [],
        roles: [],
        operating_contexts: ['MY_TEACHING' as const],
      },
    },
    memberships: [{
      role: 'INSTRUCTOR' as const,
      role_display: 'Instructor',
      status: 'ACTIVE' as const,
      joined_at: '2026-01-01T00:00:00Z',
      organization,
    }],
    membership_version: 1,
    message: 'ok',
    state: 'active',
    restricted_orgs: [],
    org_suspended_orgs: [],
    removed_orgs: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('AuthProvider explicit logout navigation', () => {
  let renderer: ReactTestRenderer | null = null;
  let latestAuth: AuthValue | null = null;
  let queryClient: QueryClient | null = null;
  const boundaryEvents: string[] = [];

  function ProtectedSubtree() {
    useEffect(() => {
      boundaryEvents.push('mount');
      return () => {
        boundaryEvents.push('unmount');
      };
    }, []);
    return createElement('protected-content');
  }

  function RouteProbe() {
    const auth = useAuth();
    useEffect(() => {
      latestAuth = auth;
    }, [auth]);
    if (navigationMocks.pathname === '/login') {
      return createElement(LoginPage);
    }
    return createElement(
      WorkspaceGenerationBoundary,
      null,
      createElement(
        AuthGuard,
        null,
        createElement(ProtectedSubtree),
      ),
    );
  }

  async function mountAuthenticated() {
    vi.spyOn(authAPI, 'refresh').mockResolvedValue(authenticatedState());
    queryClient = new QueryClient();
    const tree = createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(AuthProvider, null, createElement(RouteProbe)),
    );
    await act(async () => {
      renderer = create(tree!);
      await Promise.resolve();
    });
    expect(latestAuth?.user?.id).toBe(7);
    boundaryEvents.length = 0;
  }

  async function commitLoginRoute() {
    navigationMocks.pathname = '/login';
    await act(async () => {
      renderer!.update(createElement(
        QueryClientProvider,
        { client: queryClient! },
        createElement(AuthProvider, null, createElement(RouteProbe)),
      ));
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    navigationMocks.pathname = '/requests';
    navigationMocks.prefetch.mockReset();
    navigationMocks.replace.mockReset();
    navigationMocks.replaceDocument.mockReset();
    boundaryEvents.length = 0;
    latestAuth = null;
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
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      location: {
        origin: 'https://scholaroscope.test',
        pathname: '/requests',
        search: '',
        hash: '',
      },
    });
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(async () => {
    await act(async () => renderer?.unmount());
    renderer = null;
    queryClient = null;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    clearExplicitLogout();
    resetWorkspaceGenerationForTests();
  });

  it('survives the generation remount, deduplicates logout, commits login, and cancels recovery', async () => {
    vi.spyOn(authAPI, 'logout').mockResolvedValue(undefined);
    await mountAuthenticated();

    await act(async () => {
      const first = latestAuth!.logout();
      const second = latestAuth!.logout();
      expect(second).toBe(first);
      await Promise.all([first, second]);
    });

    expect(authAPI.logout).toHaveBeenCalledTimes(1);
    expect(navigationMocks.replace).toHaveBeenCalledTimes(1);
    expect(navigationMocks.replace).toHaveBeenCalledWith('/login');
    expect(navigationMocks.replace.mock.calls.flat()).not.toContain('/login?next=/requests');
    expect(boundaryEvents).toEqual(['unmount']);
    expect(latestAuth!.user).toBeNull();
    expect(latestAuth!.loggingOut).toBe(true);

    await commitLoginRoute();

    expect(renderer!.root.findAllByType('form')).toHaveLength(1);
    expect(latestAuth!.loggingOut).toBe(false);
    await vi.advanceTimersByTimeAsync(LOGOUT_NAVIGATION_DEADLINE_MS * 2);
    expect(navigationMocks.replaceDocument).not.toHaveBeenCalled();
  });

  it.each(['rejected', 'timed-out', 'hanging'] as const)(
    'navigates immediately when background revocation is %s',
    async (outcome) => {
      if (outcome === 'hanging') {
        vi.spyOn(authAPI, 'logout').mockReturnValue(new Promise<void>(() => undefined));
      } else {
        const error = new Error(outcome);
        if (outcome === 'timed-out') error.name = 'AbortError';
        vi.spyOn(authAPI, 'logout').mockRejectedValue(error);
      }
      await mountAuthenticated();

      await act(async () => {
        await latestAuth!.logout();
        await Promise.resolve();
      });

      expect(navigationMocks.replace).toHaveBeenCalledOnce();
      expect(latestAuth!.user).toBeNull();
    },
  );

  it('rejects delayed pre-logout context and lets no guard compete with the root owner', async () => {
    const oldContext = deferred<ReturnType<typeof authenticatedState>>();
    vi.spyOn(authAPI, 'logout').mockResolvedValue(undefined);
    vi.spyOn(authAPI, 'meContext').mockReturnValue(oldContext.promise);
    const listeners = new Map<string, () => void>();
    window.addEventListener = (name: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') listeners.set(name, listener as () => void);
    };
    await mountAuthenticated();

    await act(async () => {
      listeners.get('membership-version-mismatch')?.();
      await Promise.resolve();
    });
    await act(async () => {
      await latestAuth!.logout();
    });
    await act(async () => {
      oldContext.resolve(authenticatedState());
      await oldContext.promise;
    });

    expect(latestAuth!.user).toBeNull();
    expect(navigationMocks.replace).toHaveBeenCalledTimes(1);
    expect(navigationMocks.replace).toHaveBeenCalledWith('/login');
  });

  it('falls back to one full-document replacement after the bounded deadline', async () => {
    vi.spyOn(authAPI, 'logout').mockResolvedValue(undefined);
    await mountAuthenticated();

    await act(async () => {
      await latestAuth!.logout();
    });
    await vi.advanceTimersByTimeAsync(LOGOUT_NAVIGATION_DEADLINE_MS);
    await vi.advanceTimersByTimeAsync(LOGOUT_NAVIGATION_DEADLINE_MS * 3);

    expect(navigationMocks.replace).toHaveBeenCalledOnce();
    expect(navigationMocks.replaceDocument).toHaveBeenCalledOnce();
  });

  it('invalidates the old recovery timer before a later deliberate login', async () => {
    vi.spyOn(authAPI, 'logout').mockResolvedValue(undefined);
    vi.spyOn(authAPI, 'login').mockResolvedValue(authenticatedState());
    await mountAuthenticated();

    await act(async () => {
      await latestAuth!.logout();
    });
    await commitLoginRoute();
    await act(async () => {
      await latestAuth!.login('teacher@example.com', 'password');
    });
    await vi.advanceTimersByTimeAsync(LOGOUT_NAVIGATION_DEADLINE_MS * 2);

    expect(latestAuth!.user?.id).toBe(7);
    expect(latestAuth!.loggingOut).toBe(false);
    expect(navigationMocks.replaceDocument).not.toHaveBeenCalled();
  });
});

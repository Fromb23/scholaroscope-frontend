import { createElement, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Header from '@/app/components/layout/Header';
import { ToastProvider } from '@/app/components/ui/toast/ToastProvider';
import { AuthProvider } from '@/app/context/AuthContext';
import { SidebarProvider } from '@/app/context/SidebarContext';
import { ThemeProvider } from '@/app/context/ThemeContext';
import { DEFAULT_WORKSPACE_CAPABILITIES, authAPI } from '@/app/core/api/auth';
import {
  resetWorkspaceGenerationForTests,
  WorkspaceGenerationBoundary,
} from '@/app/core/runtime/workspaceGeneration';

const routerReplace = vi.hoisted(() => vi.fn());
const routerPush = vi.hoisted(() => vi.fn());
const routerRefresh = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: routerReplace,
    push: routerPush,
    refresh: routerRefresh,
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    createElement('a', { href, ...props }, children)
  ),
}));

vi.mock('@/app/components/layout/GlobalPeopleSearch', () => ({
  GlobalPeopleSearch: () => createElement('global-people-search'),
}));

vi.mock('@/app/components/layout/NotificationBell', () => ({
  NotificationBell: () => createElement('notification-bell'),
}));

vi.mock('@/app/core/api/theme', () => ({
  themeAPI: {
    updateMyThemePreference: vi.fn(() => Promise.resolve({})),
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function authState(organizationId: number) {
  const memberships = [1, 2].map((id) => {
    const organization = {
      id,
      name: `Workspace ${id}`,
      slug: `workspace-${id}`,
      org_type: 'INSTITUTION' as const,
    };
    return {
      role: 'ADMIN' as const,
      role_display: 'Admin',
      status: 'ACTIVE' as const,
      joined_at: '2026-01-01T00:00:00Z',
      organization,
    };
  });
  const activeMembership = memberships.find((membership) => membership.organization.id === organizationId)!;
  return {
    access: `access-${organizationId}`,
    user: {
      id: 1,
      email: 'admin@example.com',
      full_name: 'Admin User',
      first_name: 'Admin',
      last_name: 'User',
      is_superadmin: false,
      is_active: true,
      phone: '',
      date_joined: '2026-01-01T00:00:00Z',
      last_login: '2026-07-16T00:00:00Z',
    },
    active_org: activeMembership.organization,
    capabilities: {
      ...DEFAULT_WORKSPACE_CAPABILITIES,
      can_manage_staff: true,
      authorization: {
        enforced: true,
        permission_keys: ['workspace.members.view'],
        roles: [],
        operating_contexts: ['WORKSPACE_MANAGEMENT' as const],
      },
    },
    memberships,
    membership_version: organizationId,
    message: 'ok',
    state: 'active',
    restricted_orgs: [],
    org_suspended_orgs: [],
    removed_orgs: [],
  };
}

function textContent(node: ReactTestInstance): string {
  return node.children
    .map((child) => (typeof child === 'string' ? child : textContent(child)))
    .join('');
}

function findButtonContaining(renderer: ReactTestRenderer, text: string): ReactTestInstance {
  return renderer.root.findAll(
    (node) => node.type === 'button' && textContent(node).includes(text),
  )[0];
}

describe('Header workspace switch lifecycle', () => {
  const windowListeners = new Map<string, () => void>();
  const documentListeners = new Map<string, () => void>();
  let renderer: ReactTestRenderer | null = null;

  beforeEach(() => {
    resetWorkspaceGenerationForTests();
    routerReplace.mockReset();
    routerPush.mockReset();
    routerRefresh.mockReset();
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
      location: { origin: 'https://app.example.test', replace: vi.fn() },
    });
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      documentElement: {
        dataset: {},
        classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn() },
        style: {},
      },
      body: { classList: { add: vi.fn(), remove: vi.fn() } },
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
  });

  function renderHeader(mountEvents: string[]) {
    function MountedHeader() {
      useEffect(() => {
        mountEvents.push('mount');
        return () => {
          mountEvents.push('unmount');
        };
      }, []);
      return createElement(Header);
    }

    return create(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(
          ThemeProvider,
          null,
          createElement(
            ToastProvider,
            null,
            createElement(
              AuthProvider,
              null,
              createElement(
                SidebarProvider,
                null,
                createElement(
                  WorkspaceGenerationBoundary,
                  null,
                  createElement(MountedHeader),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  it('keeps the workspace selector mounted and visibly pending until the switch resolves', async () => {
    const switchResponse = deferred<ReturnType<typeof authState>>();
    const mountEvents: string[] = [];
    vi.spyOn(authAPI, 'refresh').mockResolvedValue(authState(1));
    vi.spyOn(authAPI, 'switchOrg').mockReturnValue(switchResponse.promise);

    await act(async () => {
      renderer = renderHeader(mountEvents);
      await Promise.resolve();
    });
    expect(mountEvents).toEqual(['mount', 'unmount', 'mount']);
    mountEvents.length = 0;

    await act(async () => {
      findButtonContaining(renderer!, 'Workspace 1').props.onClick();
    });
    const targetButton = findButtonContaining(renderer!, 'Workspace 2');

    await act(async () => {
      targetButton.props.onClick();
      await Promise.resolve();
    });

    expect(mountEvents).toEqual([]);
    expect(findButtonContaining(renderer!, 'Workspace 2').props.disabled).toBe(true);
    expect(routerReplace).not.toHaveBeenCalled();

    await act(async () => {
      switchResponse.resolve(authState(2));
      await switchResponse.promise;
    });

    expect(mountEvents).toEqual(['unmount', 'mount']);
    expect(routerReplace).toHaveBeenCalledWith('/dashboard/admin');
  });

  it('keeps the previous workspace usable and shows normalized copy when switching fails', async () => {
    const switchResponse = deferred<ReturnType<typeof authState>>();
    const mountEvents: string[] = [];
    vi.spyOn(authAPI, 'refresh').mockResolvedValue(authState(1));
    vi.spyOn(authAPI, 'switchOrg').mockReturnValue(switchResponse.promise);

    await act(async () => {
      renderer = renderHeader(mountEvents);
      await Promise.resolve();
    });
    expect(mountEvents).toEqual(['mount', 'unmount', 'mount']);
    mountEvents.length = 0;

    await act(async () => {
      findButtonContaining(renderer!, 'Workspace 1').props.onClick();
    });

    await act(async () => {
      findButtonContaining(renderer!, 'Workspace 2').props.onClick();
      switchResponse.reject({
        response: {
          status: 403,
          data: {
            error: {
              code: 'workspace_access_removed',
              message: 'internal membership state changed',
            },
          },
        },
      });
      await switchResponse.promise.catch(() => undefined);
    });

    expect(mountEvents).toEqual([]);
    expect(findButtonContaining(renderer!, 'Workspace 1')).toBeTruthy();
    expect(routerReplace).not.toHaveBeenCalled();
    expect(textContent(renderer!.root)).toContain('You no longer have access to this workspace.');
  });
});

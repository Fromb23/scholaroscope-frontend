import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ReactNode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: {} as Record<string, unknown>,
  pathname: '/dashboard',
  search: '',
  router: {
    refresh: vi.fn(),
    replace: vi.fn(),
  },
  routeAllowedForContext: vi.fn<(path: unknown, context: unknown) => boolean>(() => true),
  assign: vi.fn(),
  pluginRegistry: {
    isRoutePluginLoading: false,
    error: null,
    pendingRoutePluginIds: [] as string[],
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock('@/app/context/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('@/app/core/hooks/useAcademicSetupStatus', () => ({
  useAcademicSetupStatus: () => ({ data: null, isLoading: false }),
}));

vi.mock('@/app/utils/routeAccess', () => ({
  routeAllowedForContext: (path: unknown, context: unknown) => mocks.routeAllowedForContext(path, context),
}));

vi.mock('@/app/components/layout/Sidebar', () => ({ default: () => null }));
vi.mock('@/app/components/layout/MobileBottomNav', () => ({ default: () => null }));
vi.mock('@/app/components/layout/RouteTransition', () => ({
  RouteTransition: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/app/context/SidebarContext', () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/app/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/app/core/hooks/usePlugins', () => ({
  usePlugins: () => ({ plugins: [], hasPlugin: () => false }),
}));
vi.mock('@/app/core/hooks/useAcademic', () => ({
  useCurricula: () => ({ curricula: [] }),
}));
vi.mock('@/app/core/hooks/useAcademicTodayMode', () => ({
  useAcademicTodayMode: () => ({ data: null }),
}));
vi.mock('@/app/core/hooks/useInstructorCohortAccess', () => ({
  useInstructorCohortAccess: () => ({
    cohortIds: [],
    hasCurriculumAccess: false,
  }),
}));
vi.mock('@/app/core/registry/navBadges', () => ({
  NavBadgeProvider: ({ children }: { children: ReactNode }) => children,
  useNavBadges: () => ({}),
}));
vi.mock('@/app/components/layout/navConfig', () => ({
  resolveNavConfig: () => ({}),
}));
vi.mock('@/app/core/registry/slots', () => ({
  RegistrySlotProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/app/core/components/assistant/AssistantProvider', () => ({
  AssistantProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/app/core/components/assistant/AssistantWidget', () => ({
  AssistantWidget: () => null,
}));
vi.mock('@/app/components/ui/loading', () => ({
  PermissionResolvingState: ({
    message,
    description,
  }: {
    message: string;
    description?: string;
  }) => `${message}${description ? ` ${description}` : ''}`,
}));
vi.mock('@/app/plugins/PluginRegistryProvider', () => ({
  PluginLoadingErrorState: ({ error }: { error: Error }) => `Plugin error: ${error.message}`,
  PluginRegistryProvider: ({ children }: { children: ReactNode }) => children,
  PluginRouteLoadingState: () => 'Plugin route loading',
  usePluginRegistryStatus: () => mocks.pluginRegistry,
}));
vi.mock('@/app/offline/OfflineRetryState', () => ({
  OfflineRetryState: () => 'OfflineRetryState',
}));
vi.mock('@/app/core/runtime/workspaceGeneration', () => ({
  WorkspaceGenerationBoundary: ({ children }: { children: ReactNode }) => children,
}));

import { DashboardClientShell } from './DashboardClientShell';

function read(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function baseAuth(overrides: Record<string, unknown> = {}) {
  return {
    user: null,
    activeOrg: null,
    activeOperatingContext: null,
    availableOperatingContexts: [],
    loading: false,
    loggingOut: false,
    offline: false,
    accessNotices: [],
    clearAccessNotices: vi.fn(),
    capabilities: {
      can_manage_academic_setup: false,
      workspace_behavior: null,
      can_teach: false,
      is_workspace_owner: false,
    },
    ...overrides,
  };
}

function renderShell(): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(createElement(DashboardClientShell, null, 'Protected content'));
  });
  return renderer as ReactTestRenderer;
}

function renderedText(renderer: ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

describe('DashboardClientShell authentication boundary', () => {
  beforeEach(() => {
    mocks.auth = baseAuth();
    mocks.pathname = '/dashboard';
    mocks.search = '';
    mocks.router.refresh.mockClear();
    mocks.router.replace.mockClear();
    mocks.routeAllowedForContext.mockReset();
    mocks.routeAllowedForContext.mockReturnValue(true);
    mocks.assign.mockClear();
    mocks.pluginRegistry = {
      isRoutePluginLoading: false,
      error: null,
      pendingRoutePluginIds: [],
    };
    vi.stubGlobal('document', {
      documentElement: { classList: { add: vi.fn(), remove: vi.fn() } },
      body: { classList: { add: vi.fn(), remove: vi.fn() } },
    });
    vi.stubGlobal('window', {
      location: {
        origin: 'https://scholaroscope.test',
        pathname: mocks.pathname,
        search: mocks.search ? `?${mocks.search}` : '',
        hash: '',
        assign: mocks.assign,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('leaves an online unauthenticated protected deep link through the canonical login redirect', () => {
    mocks.pathname = '/schemes';
    mocks.search = 'cohort=14&cohort_subject=28&source=cohort_subject';
    window.location.pathname = mocks.pathname;
    window.location.search = `?${mocks.search}`;

    renderShell();

    expect(mocks.assign).toHaveBeenCalledTimes(1);
    expect(mocks.router.replace).not.toHaveBeenCalled();
    const destination = new URL(String(mocks.assign.mock.calls[0]?.[0]), window.location.origin);
    expect(destination.pathname).toBe('/login');
    expect(destination.searchParams.get('next')).toBe(
      '/schemes?cohort=14&cohort_subject=28&source=cohort_subject',
    );
  });

  it('keeps the offline retry state instead of forcing login when auth cannot be verified', () => {
    mocks.auth = baseAuth({ offline: true });

    const renderer = renderShell();

    expect(mocks.assign).not.toHaveBeenCalled();
    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(renderedText(renderer)).toContain('OfflineRetryState');
  });

  it('keeps valid sessions without a workspace on the workspace unavailable state', () => {
    mocks.auth = baseAuth({
      user: { id: 7, is_superadmin: false },
      activeOrg: null,
      availableOperatingContexts: [],
    });

    const renderer = renderShell();

    expect(mocks.assign).not.toHaveBeenCalled();
    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(renderedText(renderer)).toContain('Workspace access unavailable');
  });

  it('keeps authenticated route permission failures on the access denied state', () => {
    mocks.auth = baseAuth({
      user: { id: 7, is_superadmin: false },
      activeOrg: { id: 3, name: 'Demo School', org_type: 'SCHOOL' },
      activeOperatingContext: 'WORKSPACE_MANAGEMENT',
      availableOperatingContexts: ['WORKSPACE_MANAGEMENT'],
    });
    mocks.routeAllowedForContext.mockReturnValue(false);

    const renderer = renderShell();

    expect(mocks.assign).not.toHaveBeenCalled();
    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(renderedText(renderer)).toContain('Report access denied');
  });

  it('does not trigger duplicate login redirect logic while logging out', () => {
    mocks.auth = baseAuth({ loggingOut: true });

    const renderer = renderShell();

    expect(mocks.assign).not.toHaveBeenCalled();
    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(renderedText(renderer)).toContain('Signing out...');
  });
});

describe('DashboardClientShell source-level auth boundary contracts', () => {
  it('uses the canonical hard login redirect for the unauthenticated dashboard boundary', () => {
    const source = read('app/(dashboard)/DashboardClientShell.tsx');
    const unauthStart = source.indexOf('if (!user) {');
    const offlineGuardIndex = source.indexOf('if (offline) {', unauthStart);
    const redirectIndex = source.indexOf('redirectToLogin(currentPath)', unauthStart);
    const loginResetIndex = source.indexOf('lastLoginRedirectPathRef.current = null;', redirectIndex);

    expect(source).toContain("import { redirectToLogin } from '@/app/core/auth/navigation';");
    expect(source).not.toContain("import { buildLoginPath } from '@/app/core/auth/navigation';");
    expect(source).not.toContain('router.replace(destination)');
    expect(offlineGuardIndex).toBeGreaterThan(unauthStart);
    expect(offlineGuardIndex).toBeLessThan(redirectIndex);
    expect(redirectIndex).toBeGreaterThan(unauthStart);
    expect(loginResetIndex).toBeGreaterThan(redirectIndex);
  });

  it('preserves logout, workspace, permission, and platform redirect branches as non-login cases', () => {
    const source = read('app/(dashboard)/DashboardClientShell.tsx');
    const logoutEffectGuardIndex = source.indexOf('if (loggingOut) {');
    const organizationRefreshIndex = source.indexOf('router.refresh();');
    const unauthRedirectIndex = source.indexOf('redirectToLogin(currentPath)');
    const logoutRenderIndex = source.indexOf('message="Signing out..."');
    const unauthCopyIndex = source.indexOf("'Redirecting to sign in...'");

    expect(logoutEffectGuardIndex).toBeGreaterThan(-1);
    expect(organizationRefreshIndex).toBeGreaterThan(-1);
    expect(unauthRedirectIndex).toBeGreaterThan(-1);
    expect(logoutEffectGuardIndex).toBeLessThan(organizationRefreshIndex);
    expect(logoutEffectGuardIndex).toBeLessThan(unauthRedirectIndex);
    expect(logoutRenderIndex).toBeGreaterThan(-1);
    expect(unauthCopyIndex).toBeGreaterThan(-1);
    expect(logoutRenderIndex).toBeLessThan(unauthCopyIndex);
    expect(source).toContain('title="Workspace access unavailable"');
    expect(source).toContain('title="Report access denied"');
    expect(source).toContain("redirectToPlatformConsole('/login')");
  });

  it('redirects locked downstream academic setup pages to the backend current setup action', () => {
    const shell = read('app/(dashboard)/DashboardClientShell.tsx');

    expect(shell).toContain('getAcademicSetupStepKeyForPath(pathname)');
    expect(shell).toContain("getAcademicSetupPageState(academicSetupQuery.data, setupStepKey) === 'blocked'");
    expect(shell).toContain('isAcademicSetupOperationalAdminPath(pathname) || blockedSetupPath');
  });
});

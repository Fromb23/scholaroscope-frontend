'use client';

import { Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useAcademicSetupStatus } from '@/app/core/hooks/useAcademicSetupStatus';
import { shouldRefreshForOrganizationChange } from '@/app/core/lib/organizationScope';
import {
  buildAcademicSetupRedirectHref,
  isAcademicSetupAdminPath,
  isAcademicSetupIncomplete,
  isAcademicSetupOperationalAdminPath,
} from '@/app/core/lib/academicSetup';
import {
  getUnauthorizedRouteFallback,
  routeAllowedForRole,
} from '@/app/utils/routeAccess';
import Sidebar from '@/app/components/layout/Sidebar';
import MobileBottomNav from '@/app/components/layout/MobileBottomNav';
import { RouteTransition } from '@/app/components/layout/RouteTransition';
import { SidebarProvider } from '@/app/context/SidebarContext';
import Header from '@/app/components/layout/Header';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { useAcademicTodayMode } from '@/app/core/hooks/useAcademicTodayMode';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { resolveCurriculumForType } from '@/app/core/lib/curriculumLifecycle';
import { getAvailablePolicySurfaces } from '@/app/core/lib/policySurfaces';
import { useNavBadges } from '@/app/core/registry/navBadges';
import { resolveNavConfig, type NavigationConfig } from '@/app/components/layout/navConfig';
import { RegistrySlotProvider } from '@/app/core/registry/slots';
import { NavBadgeProvider } from '@/app/core/registry/navBadges';
import { AssistantProvider } from '@/app/core/components/assistant/AssistantProvider';
import { AssistantWidget } from '@/app/core/components/assistant/AssistantWidget';
import { PermissionResolvingState } from '@/app/components/ui/loading';
import {
  PluginLoadingErrorState,
  PluginRegistryProvider,
  PluginRouteLoadingState,
  usePluginRegistryStatus,
} from '@/app/plugins/PluginRegistryProvider';
import { AlertTriangle } from 'lucide-react';
import type { AccessNotice, Role } from '@/app/core/types/auth';
import type { PluginNavigationContext } from '@/app/core/registry/pluginNavigation';
import { buildLoginPath, getCurrentPath } from '@/app/core/auth/navigation';
import { redirectToPlatformConsole } from '@/app/core/auth/platformRedirect';
import { OfflineRetryState } from '@/app/offline/OfflineRetryState';
import { canUseAnnouncements } from '@/app/core/lib/workspaceGovernance';
import { WorkspaceGenerationBoundary } from '@/app/core/runtime/workspaceGeneration';

const GUIDE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GUIDE === 'true';

function routeAllowedByCapabilities(pathname: string, capabilities: ReturnType<typeof useAuth>['capabilities']): boolean {
  if (/^\/announcements/.test(pathname)) {
    return canUseAnnouncements(capabilities);
  }
  if (/^\/admin\/(instructors|alerts)/.test(pathname)) {
    return capabilities.can_manage_staff;
  }
  if (/^\/learners\/(new|[^/]+\/edit)$/.test(pathname)) {
    return capabilities.can_manage_learners;
  }
  if (/^\/academic\/(curricula|years|terms|subjects|topics|progress)/.test(pathname)) {
    return capabilities.can_manage_academic_setup;
  }
  if (/^\/assessments\/(new|[^/]+\/edit)$/.test(pathname)) {
    return capabilities.can_manage_assessments;
  }
  if (/^\/reports/.test(pathname)) {
    return capabilities.can_view_reports;
  }
  return true;
}

function DashboardContent({
  children,
  notices,
  onDismissNotice,
}: {
  children: ReactNode;
  notices: AccessNotice[];
  onDismissNotice: () => void;
}) {
  const { user, activeOrg, activeRole, capabilities } = useAuth();
  const { plugins, hasPlugin } = usePlugins();
  const { curricula } = useCurricula();
  const academicSetupQuery = useAcademicSetupStatus({
    enabled: capabilities.can_manage_academic_setup && Boolean(activeOrg),
  });
  const academicTodayModeQuery = useAcademicTodayMode({
    enabled: activeRole === 'INSTRUCTOR' && Boolean(activeOrg),
  });
  const instructorAccess = useInstructorCohortAccess();
  const badges = useNavBadges();

  const pluginNavigationContext = useMemo<PluginNavigationContext>(
    () => ({
      role: (activeRole ?? 'ADMIN') as Role,
      user,
      orgType: activeOrg?.org_type ?? null,
      workspaceBehavior: capabilities.workspace_behavior,
      canTeach: capabilities.can_teach,
      isWorkspaceOwner: capabilities.is_workspace_owner,
      hasPlugin,
      hasCurriculumType: (curriculumType: string) => Boolean(resolveCurriculumForType(curricula, curriculumType)),
      badges,
      curricula,
      hasAnyReportPolicySurface:
        getAvailablePolicySurfaces({
          curricula,
          installedPlugins: plugins,
        }).length > 0,
      capabilities,
      instructorAccess: {
        hasCurriculumAccess: instructorAccess.hasCurriculumAccess,
      },
    }),
    [
      activeRole,
      activeOrg?.org_type,
      badges,
      capabilities,
      curricula,
      hasPlugin,
      instructorAccess.hasCurriculumAccess,
      plugins,
      user,
    ],
  );

  const navConfig = useMemo<NavigationConfig>(
    () => resolveNavConfig({
      user,
      activeRole,
      orgType: activeOrg?.org_type,
      pluginNavigationContext,
      academicSetup: academicSetupQuery.data ?? null,
      capabilities,
      academicTodayMode: academicTodayModeQuery.data?.mode ?? null,
      instructorAssignedCohortCount: instructorAccess.cohortIds.length,
    }),
    [
      user,
      activeRole,
      activeOrg?.org_type,
      pluginNavigationContext,
      academicSetupQuery.data,
      capabilities,
      academicTodayModeQuery.data?.mode,
      instructorAccess.cohortIds.length,
    ],
  );

  return (
    <div className="theme-app-bg pwa-safe-area-shell flex h-dvh overflow-hidden">
      <Sidebar navConfig={navConfig} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header />
        {notices.length > 0 && (
          <SuspendedNoticeBanner notices={notices} onDismiss={onDismissNotice} />
        )}
        <main
          id="dashboard-scroll-root"
          className="pwa-safe-area-main min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 lg:p-6"
        >
          <AssistantProvider>
            <div className="pb-16 lg:pb-0">
              <RouteTransition>{children}</RouteTransition>
            </div>
            {GUIDE_ENABLED ? <AssistantWidget /> : null}
          </AssistantProvider>
        </main>
      </div>
      <MobileBottomNav navConfig={navConfig} />
    </div>
  );
}

function DashboardLayoutContent({ children }: { children: ReactNode }) {
  const { user, activeOrg, activeRole, loading, loggingOut, offline, accessNotices, clearAccessNotices, capabilities } = useAuth();
  const pluginRegistry = usePluginRegistryStatus();
  const academicSetupQuery = useAcademicSetupStatus({
    enabled: (
      capabilities.can_manage_academic_setup
      && Boolean(activeOrg)
      && !user?.is_superadmin
    ),
  });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isWorkspaceCreationRoute = pathname === '/workspaces/new';
  const previousOrganizationIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    document.documentElement.classList.add('dashboard-shell-lock');
    document.body.classList.add('dashboard-shell-lock');

    return () => {
      document.documentElement.classList.remove('dashboard-shell-lock');
      document.body.classList.remove('dashboard-shell-lock');
    };
  }, []);

  useEffect(() => {
    if (loggingOut) {
      return;
    }

    const nextOrganizationId = activeOrg?.id ?? null;

    if (shouldRefreshForOrganizationChange(previousOrganizationIdRef.current, nextOrganizationId)) {
      router.refresh();
    }

    previousOrganizationIdRef.current = nextOrganizationId;
  }, [activeOrg?.id, loggingOut, router]);

  useEffect(() => {
    if (loggingOut) {
      return;
    }
    if (loading) return;
    const currentPath = getCurrentPath();
    if (!user) {
      if (offline) {
        return;
      }
      router.replace(buildLoginPath(currentPath));
      return;
    }
    if (user.is_superadmin) {
      redirectToPlatformConsole('/login');
      return;
    }

    if (isWorkspaceCreationRoute) {
      return;
    }

    if (activeRole === null) {
      router.replace(buildLoginPath(currentPath, { reason: 'no_access' }));
      return;
    }

    if (pluginRegistry.isRoutePluginLoading || pluginRegistry.error) {
      return;
    }

    const search = searchParams.toString();
    const routePath = search ? `${pathname}?${search}` : pathname;

    if (!routeAllowedForRole(routePath, activeRole)) {
      router.replace(getUnauthorizedRouteFallback(activeRole, pathname));
      return;
    }

    if (!routeAllowedByCapabilities(pathname, capabilities)) {
      if (activeRole === 'ADMIN' && isAcademicSetupAdminPath(pathname)) {
        return;
      }
      router.replace(getUnauthorizedRouteFallback(activeRole, pathname));
      return;
    }

    if (
      activeRole === 'ADMIN'
      && activeOrg
      && academicSetupQuery.data
      && isAcademicSetupIncomplete(academicSetupQuery.data)
      && isAcademicSetupOperationalAdminPath(pathname)
    ) {
      const nextActionPath = academicSetupQuery.data.next_action.href.split('?')[0];
      if (nextActionPath !== pathname) {
        router.replace(buildAcademicSetupRedirectHref(academicSetupQuery.data, pathname));
      }
    }
  }, [
    academicSetupQuery.data,
    activeOrg,
    activeRole,
    capabilities,
    isWorkspaceCreationRoute,
    loading,
    loggingOut,
    offline,
    pathname,
    pluginRegistry.error,
    pluginRegistry.isRoutePluginLoading,
    router,
    searchParams,
    user,
  ]);

  const showAcademicSetupAccessDenied = (
    !loading
    && Boolean(user)
    && !user?.is_superadmin
    && activeRole === 'ADMIN'
    && isAcademicSetupAdminPath(pathname)
    && !capabilities.can_manage_academic_setup
  );

  if (loggingOut) {
    return (
      <PermissionResolvingState
        fullScreen
        message="Signing out..."
        description="Returning to sign in."
      />
    );
  }

  if (!loading && !user && offline) {
    return <OfflineRetryState />;
  }

  if (
    loading
    || !user
    || (
      activeRole === 'ADMIN'
      && Boolean(activeOrg)
      && isAcademicSetupOperationalAdminPath(pathname)
      && academicSetupQuery.isLoading
    )
  ) {
    const resolvingMessage = loading
      ? 'Restoring your session...'
      : !user
        ? 'Redirecting to sign in...'
        : activeOrg
          ? `Checking setup for ${activeOrg.name}...`
          : 'Checking your access...';

    return <PermissionResolvingState fullScreen message={resolvingMessage} />;
  }

  if (pluginRegistry.error) {
    return <PluginLoadingErrorState error={pluginRegistry.error} />;
  }

  if (pluginRegistry.isRoutePluginLoading) {
    return <PluginRouteLoadingState pluginIds={pluginRegistry.pendingRoutePluginIds} />;
  }

  if (isWorkspaceCreationRoute) {
    return <>{children}</>;
  }

  if (showAcademicSetupAccessDenied) {
    return (
      <SidebarProvider>
        <NavBadgeProvider>
          <RegistrySlotProvider>
            <DashboardContent notices={accessNotices} onDismissNotice={clearAccessNotices}>
              <div className="mx-auto max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-warning)]" />
                  <div className="space-y-2">
                    <h1 className="text-lg font-semibold">Academic setup access required</h1>
                    <p className="text-sm">
                      Your account is signed in, but it is missing permission to manage academic setup.
                      Ask a workspace admin to grant academic setup access before changing curriculum,
                      academic years, terms, subjects, or cohorts.
                    </p>
                  </div>
                </div>
              </div>
            </DashboardContent>
          </RegistrySlotProvider>
        </NavBadgeProvider>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <NavBadgeProvider>
        <RegistrySlotProvider>
          <DashboardContent notices={accessNotices} onDismissNotice={clearAccessNotices}>
            {children}
          </DashboardContent>
        </RegistrySlotProvider>
      </NavBadgeProvider>
    </SidebarProvider>
  );
}

export function DashboardClientShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceGenerationBoundary>
      <PluginRegistryProvider>
        <Suspense
          fallback={
            <PermissionResolvingState
              fullScreen
              message="Loading workspace..."
              description="Preparing your dashboard."
            />
          }
        >
          <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </Suspense>
      </PluginRegistryProvider>
    </WorkspaceGenerationBoundary>
  );
}

function SuspendedNoticeBanner({
  notices,
  onDismiss,
}: {
  notices: AccessNotice[];
  onDismiss: () => void;
}) {
  if (notices.length === 0) return null;
  return (
    <div className="theme-warning-surface border-b px-4 py-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-warning)]" />
        <div className="flex-1 space-y-1">
          {notices.map((notice, i) => (
            <p key={i} className={`text-sm theme-text ${i > 0 ? 'mt-1' : ''}`}>
              {notice.message}
            </p>
          ))}
        </div>
        <button
          onClick={onDismiss}
          className="theme-focus-ring text-sm font-medium text-[color:var(--color-warning)] hover:opacity-80"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

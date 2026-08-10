'use client';

import { Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useAcademicSetupStatus } from '@/app/core/hooks/useAcademicSetupStatus';
import { shouldRefreshForOrganizationChange } from '@/app/core/lib/organizationScope';
import {
  buildAcademicSetupRedirectHref,
  getAcademicSetupPageState,
  getAcademicSetupStepKeyForPath,
  isAcademicSetupAdminPath,
  isAcademicSetupIncomplete,
  isAcademicSetupOperationalAdminPath,
} from '@/app/core/lib/academicSetup';
import {
  routeAllowedForContext,
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
import type { AccessNotice } from '@/app/core/types/auth';
import type { PluginNavigationContext } from '@/app/core/registry/pluginNavigation';
import { buildLoginPath } from '@/app/core/auth/navigation';
import { redirectToPlatformConsole } from '@/app/core/auth/platformRedirect';
import { OfflineRetryState } from '@/app/offline/OfflineRetryState';
import { WorkspaceGenerationBoundary } from '@/app/core/runtime/workspaceGeneration';

const GUIDE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GUIDE === 'true';

function AccessTerminalState({ title, description }: { title: string; description: string }) {
  return (
    <main className="theme-app-bg flex min-h-dvh items-center justify-center p-6">
      <div role="alert" className="theme-card max-w-xl rounded-lg border p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--color-warning)]" />
          <div className="space-y-2">
            <h1 className="text-lg font-semibold theme-text">{title}</h1>
            <p className="text-sm theme-text-muted">{description}</p>
          </div>
        </div>
      </div>
    </main>
  );
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
  const { user, activeOrg, activeOperatingContext, capabilities } = useAuth();
  const { plugins, hasPlugin } = usePlugins();
  const { curricula } = useCurricula();
  const academicSetupQuery = useAcademicSetupStatus({
    enabled: capabilities.can_manage_academic_setup && Boolean(activeOrg),
  });
  const academicTodayModeQuery = useAcademicTodayMode({
    enabled: activeOperatingContext === 'MY_TEACHING' && Boolean(activeOrg),
  });
  const instructorAccess = useInstructorCohortAccess();
  const badges = useNavBadges();

  const pluginNavigationContext = useMemo<PluginNavigationContext>(
    () => ({
      activeOperatingContext,
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
      activeOperatingContext,
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
      activeOperatingContext,
      orgType: activeOrg?.org_type,
      pluginNavigationContext,
      academicSetup: academicSetupQuery.data ?? null,
      capabilities,
      academicTodayMode: academicTodayModeQuery.data?.mode ?? null,
      instructorAssignedCohortCount: instructorAccess.cohortIds.length,
    }),
    [
      user,
      activeOperatingContext,
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
  const { user, activeOrg, activeOperatingContext, availableOperatingContexts, loading, loggingOut, offline, accessNotices, clearAccessNotices, capabilities } = useAuth();
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
  const search = searchParams.toString();
  const currentPath = search ? `${pathname}?${search}` : pathname;
  const isLegacyWorkspaceCreationRedirectRoute = pathname === '/workspaces/new';
  const previousOrganizationIdRef = useRef<number | null | undefined>(undefined);
  const lastRedirectRef = useRef<string | null>(null);

  const workspaceUnavailable = (
    !loading
    && Boolean(user)
    && !user?.is_superadmin
    && !isLegacyWorkspaceCreationRedirectRoute
    && (!activeOrg || availableOperatingContexts.length === 0)
  );
  const routeDenied = (
    !loading
    && Boolean(user)
    && !user?.is_superadmin
    && Boolean(activeOrg)
    && availableOperatingContexts.length > 0
    && !pluginRegistry.isRoutePluginLoading
    && !pluginRegistry.error
    && !routeAllowedForContext(currentPath, {
      operatingContext: activeOperatingContext,
      capabilities,
      orgType: activeOrg?.org_type ?? null,
    })
  );

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
    if (!user) {
      if (offline) {
        return;
      }
      const destination = buildLoginPath(currentPath);
      if (lastRedirectRef.current !== destination) {
        lastRedirectRef.current = destination;
        router.replace(destination);
      }
      return;
    }
    lastRedirectRef.current = null;
    if (user.is_superadmin) {
      redirectToPlatformConsole('/login');
      return;
    }

    if (isLegacyWorkspaceCreationRedirectRoute) {
      return;
    }

    if (!activeOrg || availableOperatingContexts.length === 0) {
      return;
    }

    if (pluginRegistry.isRoutePluginLoading || pluginRegistry.error) {
      return;
    }

    if (routeDenied) {
      return;
    }

    if (
      activeOperatingContext === 'WORKSPACE_MANAGEMENT'
      && activeOrg
      && academicSetupQuery.data
      && isAcademicSetupIncomplete(academicSetupQuery.data)
    ) {
      const nextActionPath = academicSetupQuery.data.next_action.href.split('?')[0];
      const setupStepKey = getAcademicSetupStepKeyForPath(pathname);
      const blockedSetupPath = (
        isAcademicSetupAdminPath(pathname)
        && setupStepKey
        && getAcademicSetupPageState(academicSetupQuery.data, setupStepKey) === 'blocked'
      );
      if (
        nextActionPath !== pathname
        && (isAcademicSetupOperationalAdminPath(pathname) || blockedSetupPath)
      ) {
        router.replace(buildAcademicSetupRedirectHref(academicSetupQuery.data, pathname));
      }
    }
  }, [
    academicSetupQuery.data,
    activeOrg,
    activeOperatingContext,
    availableOperatingContexts.length,
    capabilities,
    currentPath,
    isLegacyWorkspaceCreationRedirectRoute,
    loading,
    loggingOut,
    offline,
    pathname,
    pluginRegistry.error,
    pluginRegistry.isRoutePluginLoading,
    router,
    routeDenied,
    user,
  ]);

  const showAcademicSetupAccessDenied = (
    !loading
    && Boolean(user)
    && !user?.is_superadmin
    && activeOperatingContext === 'WORKSPACE_MANAGEMENT'
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

  if (workspaceUnavailable) {
    return (
      <AccessTerminalState
        title="Workspace access unavailable"
        description="Your session is valid, but no active workspace and operating context could be resolved. Select an available workspace or ask a workspace administrator to restore your access."
      />
    );
  }

  if (
    loading
    || !user
    || (
      activeOperatingContext === 'WORKSPACE_MANAGEMENT'
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

  if (routeDenied) {
    return (
      <AccessTerminalState
        title="Report access denied"
        description="You are signed in, but your effective authority in this workspace does not permit this page. Change operating context or ask a workspace administrator for the required permission."
      />
    );
  }

  if (isLegacyWorkspaceCreationRedirectRoute) {
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

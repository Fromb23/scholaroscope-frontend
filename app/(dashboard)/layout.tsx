'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useAcademicSetupStatus } from '@/app/core/hooks/useAcademicSetupStatus';
import { shouldRefreshForOrganizationChange } from '@/app/core/lib/organizationScope';
import {
  buildAcademicSetupRedirectHref,
  isAcademicSetupIncomplete,
  isAcademicSetupOperationalAdminPath,
} from '@/app/core/lib/academicSetup';
import {
  getUnauthorizedRouteFallback,
  getRouteRules,
  isPlatformSuperadminBlockedPath,
  roleHomeRoute,
} from '@/app/utils/routeAccess';
import Sidebar from '@/app/components/layout/Sidebar';
import { SidebarProvider } from '@/app/context/SidebarContext';
import Header from '@/app/components/layout/Header';
import { RegistrySlotProvider } from '@/app/core/registry/slots';
import { NavBadgeProvider } from '@/app/core/registry/navBadges';
import { AssistantProvider } from '@/app/core/components/assistant/AssistantProvider';
import { AssistantWidget } from '@/app/core/components/assistant/AssistantWidget';
import '@/app/plugins/registerAll';
import { AlertTriangle } from 'lucide-react';
import { AccessNotice } from '../core/types/auth';
import { buildLoginPath, getCurrentPath } from '@/app/core/auth/navigation';

function DashboardContent({
  children,
  notices,
  onDismissNotice,
}: {
  children: React.ReactNode;
  notices: AccessNotice[];
  onDismissNotice: () => void;
}) {
  return (
    <div className="theme-app-bg flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Header />
        {notices.length > 0 && (
          <SuspendedNoticeBanner notices={notices} onDismiss={onDismissNotice} />
        )}
        <main
          id="dashboard-scroll-root"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 lg:p-6"
        >
          <AssistantProvider>
            {children}
            <AssistantWidget />
          </AssistantProvider>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, activeOrg, activeRole, loading, accessNotices, clearAccessNotices } = useAuth();
  const academicSetupQuery = useAcademicSetupStatus({
    enabled: activeRole === 'ADMIN' && Boolean(activeOrg) && !user?.is_superadmin,
  });
  const router = useRouter();
  const pathname = usePathname();
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
    const nextOrganizationId = activeOrg?.id ?? null;

    if (shouldRefreshForOrganizationChange(previousOrganizationIdRef.current, nextOrganizationId)) {
      router.refresh();
    }

    previousOrganizationIdRef.current = nextOrganizationId;
  }, [activeOrg?.id, router]);

  useEffect(() => {
    const currentPath = getCurrentPath();
    if (loading) return;
    if (!user) {
      router.replace(buildLoginPath(currentPath));
      return;
    }
    if (user.is_superadmin) {
      if (!activeOrg && isPlatformSuperadminBlockedPath(pathname)) {
        router.replace(roleHomeRoute.SUPERADMIN);
      }
      return;
    }

    if (activeRole === null) {
      router.replace(buildLoginPath(currentPath, { reason: 'no_access' }));
      return;
    }

    const matchedRule = getRouteRules().find((rule) => rule.pattern.test(pathname));
    if (!matchedRule) return;
    if (!matchedRule.allowedRoles.includes(activeRole)) {
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
      router.replace(buildAcademicSetupRedirectHref(academicSetupQuery.data, pathname));
    }
  }, [
    academicSetupQuery.data,
    activeOrg,
    activeRole,
    loading,
    pathname,
    router,
    user,
  ]);

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
    return (
      <div className="theme-app-bg flex h-dvh items-center justify-center">
        <div className="text-center">
          <div
            className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
            style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          />
          <p className="theme-muted mt-4">Loading...</p>
        </div>
      </div>
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

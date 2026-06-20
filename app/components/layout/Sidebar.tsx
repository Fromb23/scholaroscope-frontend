'use client';

// ============================================================================
// app/core/components/layout/Sidebar.tsx
//
// Renders role-aware navigation. Config lives in navConfig.ts.
// NavItem rendering lives in NavItem.tsx.
// No any. No try/catch around hooks.
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Activity } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useSidebar } from '@/app/context/SidebarContext';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { useAcademicSetupStatus } from '@/app/core/hooks/useAcademicSetupStatus';
import { useInstructorCohortAccess } from '@/app/core/hooks/useInstructorCohortAccess';
import { resolveCurriculumForType } from '@/app/core/lib/curriculumLifecycle';
import { getAvailablePolicySurfaces } from '@/app/core/lib/policySurfaces';
import { useNavBadges } from '@/app/core/registry/navBadges';
import { NavItem } from './NavItem';
import {
  getSuperadminNav,
  getAdminNav,
  getInstructorNav,
  getRoleFooterLabel,
  getRoleColorScheme,
  ROLE_ICONS,
  AppLogoIcon,
  type NavigationConfig,
} from './navConfig';
import type { Role } from '@/app/core/types/auth';
import type { PluginNavigationContext } from '@/app/core/registry/pluginNavigation';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, activeOrg, activeRole, capabilities } = useAuth();
  const { isSidebarOpen, closeSidebar } = useSidebar();

  const { plugins, hasPlugin } = usePlugins();
  const { curricula } = useCurricula();
  const academicSetupQuery = useAcademicSetupStatus({
    enabled: capabilities.can_manage_academic_setup && Boolean(activeOrg),
  });
  const instructorAccess = useInstructorCohortAccess();
  const badges = useNavBadges();

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const pluginNavigationContext = useMemo<PluginNavigationContext>(
    () => ({
      role: (activeRole ?? (user?.is_superadmin ? 'SUPERADMIN' : 'ADMIN')) as Role,
      orgType: activeOrg?.org_type ?? null,
      workspaceBehavior: capabilities.workspace_behavior,
      hasPlugin,
      hasCurriculumType: (curriculumType: string) => Boolean(resolveCurriculumForType(curricula, curriculumType)),
      badges,
      curricula,
      hasAnyReportPolicySurface:
        getAvailablePolicySurfaces({
          curricula,
          installedPlugins: plugins,
        }).length > 0,
      instructorAccess: {
        hasCurriculumAccess: instructorAccess.hasCurriculumAccess,
      },
    }),
    [
      activeRole,
      activeOrg?.org_type,
      badges,
      capabilities.workspace_behavior,
      curricula,
      hasPlugin,
      instructorAccess.hasCurriculumAccess,
      plugins,
      user?.is_superadmin,
    ],
  );

  // ── Build nav config ──────────────────────────────────────────────────

  const navConfig = useMemo<NavigationConfig>(() => {
    if (!user) return { primary: [] };
    if (user.is_superadmin) return getSuperadminNav(pluginNavigationContext);
    if (activeRole === 'ADMIN') {
      return getAdminNav(
        pluginNavigationContext,
        activeOrg?.org_type,
        academicSetupQuery.data ?? null,
        capabilities,
      );
    }
    if (activeRole === 'INSTRUCTOR') {
      return getInstructorNav(pluginNavigationContext);
    }
    return { primary: [] };
  }, [
    user,
    activeOrg?.org_type,
    activeRole,
    pluginNavigationContext,
    academicSetupQuery.data,
    capabilities,
  ]);

  const resolvedRole = (activeRole ?? 'ADMIN') as Role;
  const colors = getRoleColorScheme(resolvedRole, activeOrg?.org_type);
  const RoleIcon = ROLE_ICONS[resolvedRole] ?? ROLE_ICONS.ADMIN;
  const Logo = AppLogoIcon;
  const roleLabel = capabilities.workspace_behavior === 'FREELANCE_TEACHER'
    ? 'Freelance Teacher'
    : (activeRole ?? '—');

  // ── Active path helpers ───────────────────────────────────────────────

  const isActive = (href: string): boolean => {
    const hrefPath = href.split('?')[0];
    const currentPath = pathname.split('?')[0];
    if (currentPath === hrefPath) return true;
    if (hrefPath.startsWith('/dashboard/')) return false;
    return currentPath.startsWith(hrefPath + '/');
  };

  // Auto-expand parent when a child route is active
  useEffect(() => {
    if (!user) return;
    const updates: Record<string, boolean> = {};
    navConfig.primary.forEach((item) => {
      if (item.children?.some((child) => isActive(child.href))) {
        updates[item.name] = true;
      }
    });
    if (Object.keys(updates).length > 0) {
      setExpandedItems((prev) => ({ ...prev, ...updates }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleExpanded = (name: string) =>
    setExpandedItems((prev) => ({ ...prev, [name]: !prev[name] }));

  if (!user) return null;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      <aside
        className={`theme-surface fixed left-0 top-0 z-50 h-screen w-72 transform border-r theme-border transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:z-auto lg:translate-x-0`}
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b theme-border px-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${colors.iconBg} rounded-xl`}>
                <Logo className="h-5 w-5 text-[color:var(--brand-primary-foreground)]" />
              </div>
              <h1 className="text-xl font-bold theme-text">ScholaroScope</h1>
            </div>
          </div>

          {/* Role + org context */}
          <div className={`px-6 py-4 border-b ${colors.header}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 ${colors.iconBg} rounded-lg`}>
                <RoleIcon className="h-4 w-4 text-[color:var(--brand-primary-foreground)]" />
              </div>
              <div>
                <p className="theme-subtle text-xs font-semibold uppercase tracking-wide">
                  {roleLabel}
                </p>
                <p className="text-sm font-bold theme-text">
                  {user.first_name} {user.last_name}
                </p>
              </div>
            </div>
            {!user.is_superadmin && activeOrg && (
              <div className="pl-11">
                <p className="theme-subtle text-xs">Workspace</p>
                <p className="truncate text-sm font-medium theme-text">{activeOrg.name}</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-6">
              <div>
                <h3 className="theme-subtle mb-2 px-4 text-xs font-semibold uppercase tracking-wider">
                  Main Menu
                </h3>
                <ul className="space-y-1">
                  {navConfig.primary.map((item) => (
                    <NavItem
                      key={item.name}
                      item={item}
                      isActive={isActive}
                      isExpanded={!!expandedItems[item.name]}
                      onToggle={toggleExpanded}
                      onNavigate={closeSidebar}
                      colors={colors}
                    />
                  ))}
                </ul>
              </div>

              {navConfig.secondary && navConfig.secondary.length > 0 && (
                <div>
                  <h3 className="theme-subtle mb-2 px-4 text-xs font-semibold uppercase tracking-wider">
                    Quick Access
                  </h3>
                  <ul className="space-y-1">
                    {navConfig.secondary.map((item) => (
                      <NavItem
                        key={item.name}
                        item={item}
                        isActive={isActive}
                        isExpanded={!!expandedItems[item.name]}
                        onToggle={toggleExpanded}
                        onNavigate={closeSidebar}
                        colors={colors}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </nav>

          {/* Footer */}
          <div className="theme-card-muted border-t p-4">
            <div className="theme-subtle flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold theme-muted">ScholaroScope v0.5.4</p>
                <p className="mt-0.5">{getRoleFooterLabel(resolvedRole, activeOrg?.org_type)}</p>
              </div>
              <Activity className="h-4 w-4 text-green-500" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

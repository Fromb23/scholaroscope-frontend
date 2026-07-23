'use client';

// ============================================================================
// app/core/components/layout/Sidebar.tsx
//
// Renders role-aware navigation. Config lives in navConfig.ts.
// NavItem rendering lives in NavItem.tsx.
// No any. No try/catch around hooks.
// ============================================================================

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Activity } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useSidebar } from '@/app/context/SidebarContext';
import { ReleaseBadge } from '@/app/core/release/ReleaseBadge';
import { NavItem } from './NavItem';
import {
  getRoleFooterLabel,
  getRoleColorScheme,
  isNavHrefActive,
  ROLE_ICONS,
  AppLogoIcon,
  type NavigationConfig,
} from './navConfig';
import type { Role } from '@/app/core/types/auth';

interface SidebarProps {
  navConfig: NavigationConfig;
}

export default function Sidebar({ navConfig }: SidebarProps) {
  const pathname = usePathname();
  const { user, activeOrg, activeRole, capabilities } = useAuth();
  const { isSidebarOpen, closeSidebar } = useSidebar();

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const resolvedRole = (activeRole ?? 'ADMIN') as Role;
  const colors = getRoleColorScheme(resolvedRole, activeOrg?.org_type);
  const RoleIcon = ROLE_ICONS[resolvedRole] ?? ROLE_ICONS.ADMIN;
  const Logo = AppLogoIcon;
  const roleLabel = capabilities.workspace_behavior === 'FREELANCE_TEACHER'
    ? 'Freelance Teacher'
    : (activeRole ?? '—');

  // ── Active path helpers ───────────────────────────────────────────────

  const isActive = (href: string): boolean => {
    return isNavHrefActive(pathname, href);
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
        className={`theme-sidebar pwa-safe-area-sidebar fixed left-0 top-0 z-50 h-screen w-72 transform border-r theme-border transition-transform duration-300 ease-in-out ${
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
                {resolvedRole === 'INSTRUCTOR' ? null : (
                  <p className="text-sm font-bold theme-text">
                    {user.first_name} {user.last_name}
                  </p>
                )}
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
                <p className="font-semibold theme-muted">
                  <ReleaseBadge />
                </p>
                <p className="mt-0.5">{getRoleFooterLabel(resolvedRole, activeOrg?.org_type)}</p>
              </div>
              <Activity className="h-4 w-4 text-[color:var(--color-success)]" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

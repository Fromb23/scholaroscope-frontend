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
import { useNavBadges } from '@/app/core/registry/navBadges';
import { NavItem } from './NavItem';
import {
  SUPERADMIN_NAV,
  getAdminNav,
  getInstructorNav,
  ROLE_COLORS,
  ROLE_ICONS,
  ROLE_FOOTER_LABEL,
  AppLogoIcon,
  type NavigationConfig,
} from './navConfig';
import type { Role } from '@/app/core/types/auth';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, activeOrg, activeRole } = useAuth();
  const { isSidebarOpen, closeSidebar } = useSidebar();

  const { hasPlugin } = usePlugins();
  const badges = useNavBadges();
  const unreadCount = badges['announcements'] ?? 0;

  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const hasCBC = hasPlugin('cbc');

  // ── Build nav config ──────────────────────────────────────────────────

  const navConfig = useMemo<NavigationConfig>(() => {
    if (!user) return { primary: [] };
    if (user.is_superadmin) return SUPERADMIN_NAV;
    if (activeRole === 'ADMIN') return getAdminNav(hasCBC, unreadCount);
    if (activeRole === 'INSTRUCTOR') return getInstructorNav(hasCBC, unreadCount);
    return { primary: [] };
  }, [user, activeRole, hasCBC, unreadCount]);

  const resolvedRole = (activeRole ?? 'ADMIN') as Role;
  const colors = ROLE_COLORS[resolvedRole] ?? ROLE_COLORS.ADMIN;
  const RoleIcon = ROLE_ICONS[resolvedRole] ?? ROLE_ICONS.ADMIN;
  const Logo = AppLogoIcon;

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
    navConfig.primary.forEach(item => {
      if (item.children?.some(child => isActive(child.href))) {
        updates[item.name] = true;
      }
    });
    if (Object.keys(updates).length > 0) {
      setExpandedItems(prev => ({ ...prev, ...updates }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleExpanded = (name: string) =>
    setExpandedItems(prev => ({ ...prev, [name]: !prev[name] }));

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

      <aside className={`fixed left-0 top-0 z-50 h-screen w-72 transform bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="flex h-full flex-col">

          {/* Logo */}
          <div className="flex h-16 items-center border-b border-gray-200 px-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${colors.iconBg} rounded-xl`}>
                <Logo className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">ScholaroScope</h1>
            </div>
          </div>

          {/* Role + org context */}
          <div className={`px-6 py-4 border-b ${colors.header}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 ${colors.iconBg} rounded-lg`}>
                <RoleIcon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {activeRole ?? '—'}
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {user.first_name} {user.last_name}
                </p>
              </div>
            </div>
            {!user.is_superadmin && activeOrg && (
              <div className="pl-11">
                <p className="text-xs text-gray-500">Organization</p>
                <p className="text-sm font-medium text-gray-800 truncate">
                  {activeOrg.name}
                </p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-6">
              <div>
                <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Main Menu
                </h3>
                <ul className="space-y-1">
                  {navConfig.primary.map(item => (
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
                  <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Quick Access
                  </h3>
                  <ul className="space-y-1">
                    {navConfig.secondary.map(item => (
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
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div>
                <p className="font-semibold text-gray-700">ScholaroScope v0.5.4</p>
                <p className="mt-0.5">{ROLE_FOOTER_LABEL[resolvedRole]}</p>
              </div>
              <Activity className="h-4 w-4 text-green-500" />
            </div>
          </div>

        </div>
      </aside>
    </>
  );
}
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useSidebar } from '@/app/context/SidebarContext';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import { useUnreadAnnouncements } from '@/app/plugins/announcements/hooks/useAnnouncements';
import { Role } from '@/app/core/types/auth';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, BookOpen, Calendar, CalendarRange,
  ClipboardCheck, FolderKanban, Award, FileBarChart, GraduationCap,
  Building2, Settings, ShieldCheck, Activity, FileText, AlertCircle,
  Inbox, UserCog, TrendingUp, Database, Clock, Target, ChevronDown,
  CalendarDays, Layers, Megaphone,
} from 'lucide-react';

type NavItem = {
  name: string;
  href: string;
  icon: any;
  badge?: number;
  children?: NavItem[];
};

type NavigationConfig = {
  primary: NavItem[];
  secondary?: NavItem[];
};

// ── Nav config builders ───────────────────────────────────────────────────

const superAdminNavigation: NavigationConfig = {
  primary: [
    { name: 'System Overview', href: '/dashboard/superadmin', icon: LayoutDashboard },
    { name: 'Organizations', href: '/superadmin/organizations', icon: Building2 },
    { name: 'Announcements', href: '/announcements', icon: Megaphone },
    { name: 'Global Users', href: '/superadmin/users', icon: UserCog },
    { name: 'Subscriptions', href: '/superadmin/subscriptions', icon: TrendingUp },
    { name: 'System Settings', href: '/superadmin/settings', icon: Settings },
    { name: 'Audit Logs', href: '/superadmin/audit', icon: FileText },
  ],
  secondary: [
    { name: 'Support Tickets', href: '/superadmin/support', icon: Inbox },
    { name: 'System Health', href: '/superadmin/health', icon: Activity },
  ],
};

const getAdminNavigation = (
  hasCBC: boolean,
  hasProjects: boolean,
  unreadAnnouncements: number,
): NavigationConfig => ({
  primary: [
    { name: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
    { name: 'Pending Requests', href: '/requests', icon: Inbox, badge: 0 },
    {
      name: 'Academic Setup', href: '/academic', icon: GraduationCap,
      children: [
        { name: 'Overview', href: '/academic', icon: GraduationCap },
        { name: 'Curricula', href: '/academic/curricula', icon: BookOpen },
        { name: 'Years', href: '/academic/years', icon: Calendar },
        { name: 'Terms', href: '/academic/terms', icon: CalendarDays },
        { name: 'Subjects', href: '/academic/subjects', icon: BookOpen },
        { name: 'Topics', href: '/academic/topics', icon: Layers },
        { name: 'Cohorts', href: '/academic/cohorts', icon: Users },
      ],
    },
    {
      name: 'Academic Teaching', href: '/academic/teaching', icon: GraduationCap,
      children: [
        { name: 'Browse Topics', href: '/academic/topics/browser', icon: BookOpen },
        { name: 'Coverage Progress', href: '/academic/progress', icon: TrendingUp },
      ],
    },
    { name: 'Instructors', href: '/admin/instructors', icon: UserCog },
    { name: 'Learners', href: '/learners', icon: Users },
    { name: 'Schemes of Work', href: '/schemes', icon: CalendarRange },
    { name: 'Sessions', href: '/sessions', icon: Calendar },
    {
      name: 'Assessments', href: '/assessments', icon: ClipboardCheck,
      children: [
        { name: 'All Assessments', href: '/assessments', icon: ClipboardCheck },
        { name: 'Create New', href: '/assessments/new', icon: FileText },
        { name: 'Grade Policies', href: '/reports/grade-policies', icon: Award },
      ],
    },
    ...(hasCBC ? [{
      name: 'CBC Management', href: '/cbc/progress', icon: Award,
      children: [
        { name: 'Progress Tracking', href: '/cbc/progress', icon: TrendingUp },
        { name: 'Authoring', href: '/cbc/authoring', icon: FileText },
        { name: 'Browser', href: '/cbc/browser', icon: BookOpen },
        { name: 'Teaching', href: '/cbc/teaching', icon: Target },
      ],
    }] : []),
    ...(hasProjects ? [{ name: 'Projects', href: '/projects', icon: FolderKanban }] : []),
    {
      name: 'Reports', href: '/reports', icon: FileBarChart,
      children: [
        { name: 'Overview', href: '/reports', icon: FileBarChart },
        { name: 'Students', href: '/reports/students', icon: Users },
        { name: 'Assessments', href: '/reports/assessments', icon: ClipboardCheck },
        { name: 'Attendance', href: '/reports/attendance', icon: Clock },
        { name: 'Cohorts', href: '/reports/cohorts', icon: Users },
        { name: 'Grade Policies', href: '/reports/grade-policies', icon: Award },
      ],
    },
  ],
  secondary: [
    { name: 'Instructor Activity', href: '/admin/instructors', icon: Activity },
    { name: 'System Alerts', href: '/admin/alerts', icon: AlertCircle },
    {
      name: 'Announcements',
      href: '/announcements',
      icon: Megaphone,
      badge: unreadAnnouncements,
    },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ],
});

const getInstructorNavigation = (
  hasCBC: boolean,
  unreadAnnouncements: number,
): NavigationConfig => ({
  primary: [
    { name: 'Dashboard', href: '/dashboard/instructor', icon: LayoutDashboard },
    {
      name: 'My Topics', href: '/academic/topics/browser', icon: Layers,
      children: [
        { name: 'Browse Topics', href: '/academic/topics/browser', icon: BookOpen },
        { name: 'Coverage Progress', href: '/academic/progress', icon: TrendingUp },
      ],
    },
    { name: 'My Requests', href: '/requests', icon: Inbox, badge: 0 },
    { name: "Today's Sessions", href: '/sessions/today', icon: Clock },
    { name: 'My Sessions', href: '/sessions', icon: Calendar },
    { name: 'My Learners', href: '/learners', icon: Users },
    {
      name: 'Assessments', href: '/assessments', icon: ClipboardCheck,
      children: [
        { name: 'All Assessments', href: '/assessments', icon: ClipboardCheck },
        { name: 'Needs Grading', href: '/assessments?status=pending', icon: AlertCircle },
      ],
    },
    { name: 'Schemes of Work', href: '/schemes', icon: CalendarRange },
    ...(hasCBC ? [{
      name: 'CBC Teaching', href: '/cbc/teaching', icon: Award,
      children: [
        { name: 'My Sessions', href: '/cbc/teaching/sessions', icon: Target },
        { name: 'Progress View', href: '/cbc/progress', icon: TrendingUp },
        { name: 'Browse Outcomes', href: '/cbc/browser', icon: BookOpen },
      ],
    }] : []),
  ],
  secondary: [
    { name: 'Learners at Risk', href: '/learners?filter=at-risk', icon: AlertCircle },
    {
      name: 'Announcements',
      href: '/announcements',
      icon: Megaphone,
      badge: unreadAnnouncements,
    },
    { name: 'Submit Request', href: '/requests/new', icon: FileText },
  ],
});

// ── Role colors ───────────────────────────────────────────────────────────

type RoleColorScheme = {
  active: string; hover: string; childActive: string;
  badge: string; header: string; iconBg: string;
};

const roleColors: Record<Role, RoleColorScheme> = {
  SUPERADMIN: {
    active: 'bg-purple-600 text-white', hover: 'hover:bg-purple-50 hover:text-purple-700',
    childActive: 'bg-purple-100 text-purple-700 border-l-4 border-purple-600',
    badge: 'bg-purple-100', header: 'bg-purple-50 border-purple-200', iconBg: 'bg-purple-600',
  },
  ADMIN: {
    active: 'bg-blue-600 text-white', hover: 'hover:bg-blue-50 hover:text-blue-700',
    childActive: 'bg-blue-100 text-blue-700 border-l-4 border-blue-600',
    badge: 'bg-blue-100', header: 'bg-blue-50 border-blue-200', iconBg: 'bg-blue-600',
  },
  INSTRUCTOR: {
    active: 'bg-green-600 text-white', hover: 'hover:bg-green-50 hover:text-green-700',
    childActive: 'bg-green-100 text-green-700 border-l-4 border-green-600',
    badge: 'bg-green-100', header: 'bg-green-50 border-green-200', iconBg: 'bg-green-600',
  },
};

// ── Sidebar ───────────────────────────────────────────────────────────────

export default function Sidebar({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const { hasPlugin } = usePlugins();
  const { count: unreadCount } = useUnreadAnnouncements();

  let contextValues;
  try { contextValues = useSidebar(); } catch { contextValues = null; }
  const isSidebarOpen = contextValues?.isSidebarOpen ?? open;
  const closeSidebarFn = contextValues?.closeSidebar ?? (() => setOpen(false));

  const hasCBC = hasPlugin('cbc');
  const hasProjects = hasPlugin('projects');

  const navigationConfig: NavigationConfig = !user ? { primary: [] } :
    user.role === 'SUPERADMIN' ? superAdminNavigation :
      user.role === 'ADMIN' ? getAdminNavigation(hasCBC, hasProjects, unreadCount) :
        getInstructorNavigation(hasCBC, unreadCount);

  const userRole = (user?.role ?? 'ADMIN') as Role;
  const colors = roleColors[userRole] || roleColors.ADMIN;

  const isActive = (href: string): boolean => {
    const hrefPath = href.split('?')[0];
    const currentPath = pathname.split('?')[0];
    if (currentPath === hrefPath) return true;
    if (hrefPath.startsWith('/dashboard/')) return false;
    return currentPath.startsWith(hrefPath + '/');
  };

  const isParentActive = (item: NavItem): boolean => {
    if (isActive(item.href)) return true;
    return item.children?.some(child => isActive(child.href)) ?? false;
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => ({ ...prev, [itemName]: !prev[itemName] }));
  };

  useEffect(() => {
    if (!user) return;
    navigationConfig.primary.forEach(item => {
      if (item.children?.some(child => isActive(child.href))) {
        setExpandedItems(prev => ({ ...prev, [item.name]: true }));
      }
    });
  }, [pathname]);

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'SUPERADMIN': return ShieldCheck;
      case 'ADMIN': return Building2;
      case 'INSTRUCTOR': return GraduationCap;
      default: return Users;
    }
  };
  const RoleIcon = getRoleIcon();

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const parentActive = isParentActive(item);
    const isSubmenuExpanded = expandedItems[item.name];
    const hasChildren = item.children && item.children.length > 0;

    return (
      <li key={item.name} className="mb-1">
        {hasChildren ? (
          <>
            <button
              onClick={() => toggleExpanded(item.name)}
              className={`w-full flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${parentActive ? colors.active : `text-gray-700 ${colors.hover}`
                }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {item.badge}
                  </span>
                )}
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isSubmenuExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {isSubmenuExpanded && (
              <ul className="mt-2 ml-4 space-y-1">
                {item.children!.map(child => {
                  const ChildIcon = child.icon;
                  const childActive = isActive(child.href);
                  return (
                    <li key={child.name}>
                      <Link href={child.href} onClick={closeSidebarFn}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-lg ${childActive
                          ? colors.childActive
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                          }`}>
                        <ChildIcon className="h-4 w-4 shrink-0" />
                        <span>{child.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <Link href={item.href} onClick={closeSidebarFn}
            className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${parentActive ? colors.active : `text-gray-700 ${colors.hover}`
              }`}>
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.name}</span>
            </div>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        )}
      </li>
    );
  };

  if (!user) return null;

  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm" onClick={closeSidebarFn} />
      )}
      <aside className={`fixed left-0 top-0 z-50 h-screen w-72 transform bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-gray-200 px-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${colors.iconBg} rounded-xl`}>
                <Database className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">ScholaroScope</h1>
            </div>
          </div>

          {/* Role & org context */}
          <div className={`px-6 py-4 border-b ${colors.header}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 ${colors.iconBg} rounded-lg`}>
                <RoleIcon className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{user.role_display}</p>
                <p className="text-sm font-bold text-gray-900">{user.first_name} {user.last_name}</p>
              </div>
            </div>
            {user.role !== 'SUPERADMIN' && (
              <div className="pl-11">
                <p className="text-xs text-gray-500">Organization</p>
                <p className="text-sm font-medium text-gray-800 truncate">{user.organization_name}</p>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="space-y-6">
              <div>
                <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Main Menu</h3>
                <ul className="space-y-1">
                  {navigationConfig.primary.map(item => renderNavItem(item))}
                </ul>
              </div>
              {navigationConfig.secondary && navigationConfig.secondary.length > 0 && (
                <div>
                  <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Access</h3>
                  <ul className="space-y-1">
                    {navigationConfig.secondary.map(item => renderNavItem(item))}
                  </ul>
                </div>
              )}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div>
                <p className="font-semibold text-gray-700">ScholaroScope v2.0.1</p>
                <p className="mt-0.5">
                  {user.role === 'SUPERADMIN' ? 'System Governance' :
                    user.role === 'ADMIN' ? 'Institution Management' : 'Teaching Operations'}
                </p>
              </div>
              <Activity className="h-4 w-4 text-green-500" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
// ============================================================================
// app/core/components/layout/navConfig.ts
//
// Pure config — no React, no hooks, no JSX.
// Nav items, role colors, and role icon lookup.
// ============================================================================

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  ClipboardCheck,
  Award,
  FileBarChart,
  GraduationCap,
  Building2,
  Settings,
  ShieldCheck,
  Activity,
  FileText,
  AlertCircle,
  UserCog,
  Database,
  CalendarDays,
} from 'lucide-react';
import type { OrgType, Role, User, WorkspaceCapabilities } from '@/app/core/types/auth';
import {
  getPluginNavigationItems,
  type NavItem as RegistryNavItem,
  type PluginNavigationContext,
} from '@/app/core/registry/pluginNavigation';
import type { AcademicSetupStatus, AcademicTodayModeValue } from '@/app/core/types/academic';
import {
  getAcademicSetupAvailableNavItems,
  getAcademicSetupCurrentStepDisplayLabel,
} from '@/app/core/lib/academicSetup';
import {
  getWorkspaceManagementLabel,
  isLearnerCenteredWorkspace,
  isPersonalFreelancerWorkspace,
  isSelfManagedWorkspace,
  isSelfManagedTeachingWorkspace,
} from '@/app/core/lib/workspaces';
import { getAdminReportNavigationItems } from '../../core/components/reports/reportHierarchy';
import {
  supportsCustomRoles,
  supportsInternalRequests,
} from '@/app/core/lib/workspaceGovernance';

export type { NavItem } from '@/app/core/registry/pluginNavigation';

// ── Types ─────────────────────────────────────────────────────────────────

export interface NavigationConfig {
  primary: RegistryNavItem[];
  secondary?: RegistryNavItem[];
  mobilePrimary?: RegistryNavItem[];
}

type AdminAcademicSetupNavStatus =
  Pick<AcademicSetupStatus, 'complete' | 'current_step_label' | 'next_action'>
  & Partial<AcademicSetupStatus>;

const MAX_MOBILE_PRIMARY_ITEMS = 4;

export interface ResolveNavConfigInput {
  user: User | null;
  activeRole: Role | null;
  orgType?: OrgType | null;
  pluginNavigationContext: PluginNavigationContext;
  academicSetup?: AdminAcademicSetupNavStatus | null;
  capabilities?: WorkspaceCapabilities | null;
  academicTodayMode?: AcademicTodayModeValue | null;
}

export interface RoleColorScheme {
  active: string;
  hover: string;
  childActive: string;
  badge: string;
  header: string;
  iconBg: string;
}

// ── Role colors ───────────────────────────────────────────────────────────

export const ROLE_COLORS: Record<Role, RoleColorScheme> = {
  ADMIN: {
    active: 'theme-nav-active',
    hover: 'theme-nav-hover',
    childActive: 'theme-nav-child-active',
    badge: 'theme-nav-badge',
    header: 'theme-nav-header',
    iconBg: 'theme-nav-icon-bg',
  },
  INSTRUCTOR: {
    active: 'theme-nav-active',
    hover: 'theme-nav-hover',
    childActive: 'theme-nav-child-active',
    badge: 'theme-nav-badge',
    header: 'theme-nav-header',
    iconBg: 'theme-nav-icon-bg',
  },
};

export const FREELANCER_WORKSPACE_COLORS: RoleColorScheme = {
  active: 'theme-nav-active',
  hover: 'theme-nav-hover',
  childActive: 'theme-nav-child-active',
  badge: 'theme-nav-badge',
  header: 'theme-nav-header',
  iconBg: 'theme-nav-icon-bg',
};

export function getRoleColorScheme(role: Role, orgType?: OrgType | null): RoleColorScheme {
  if (role === 'ADMIN' && isPersonalFreelancerWorkspace(orgType)) {
    return FREELANCER_WORKSPACE_COLORS;
  }
  return ROLE_COLORS[role] ?? ROLE_COLORS.ADMIN;
}

// ── Role icon lookup ──────────────────────────────────────────────────────

export const ROLE_ICONS: Record<Role, LucideIcon> = {
  ADMIN: Building2,
  INSTRUCTOR: GraduationCap,
};

export function isNavHrefActive(pathname: string, href: string): boolean {
  const hrefPath = href.split('?')[0];
  const currentPath = pathname.split('?')[0];
  if (!hrefPath) return false;
  if (currentPath === hrefPath) return true;
  if (hrefPath.startsWith('/dashboard/')) return false;
  return currentPath.startsWith(`${hrefPath}/`);
}

export function resolveMobilePrimaryNav(navConfig: NavigationConfig): RegistryNavItem[] {
  const mobileItems = navConfig.mobilePrimary
    ?? navConfig.primary.filter((item) => typeof item.mobilePriority === 'number');

  return mobileItems
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const priorityDelta = (left.item.mobilePriority ?? Number.MAX_SAFE_INTEGER)
        - (right.item.mobilePriority ?? Number.MAX_SAFE_INTEGER);
      return priorityDelta === 0 ? left.index - right.index : priorityDelta;
    })
    .slice(0, MAX_MOBILE_PRIMARY_ITEMS)
    .map(({ item }) => item);
}

export function resolveNavConfig({
  user,
  activeRole,
  orgType,
  pluginNavigationContext,
  academicSetup = null,
  capabilities = null,
  academicTodayMode = null,
}: ResolveNavConfigInput): NavigationConfig {
  if (!user) return { primary: [] };
  if (user.is_superadmin) return { primary: [] };

  switch (activeRole) {
    case 'ADMIN':
      return getAdminNav(
        pluginNavigationContext,
        orgType,
        academicSetup,
        capabilities,
      );
    case 'INSTRUCTOR':
      return getInstructorNav(pluginNavigationContext, academicTodayMode);
    default:
      return { primary: [] };
  }
}

// ── Nav config builders ───────────────────────────────────────────────────

const ACADEMIC_SETUP_NAV: RegistryNavItem = {
  name: 'Academic Setup',
  href: '/academic',
  icon: GraduationCap,
  children: [
    { name: 'Overview', href: '/academic', icon: GraduationCap },
    { name: 'Curricula', href: '/academic/curricula', icon: BookOpen },
    { name: 'Years', href: '/academic/years', icon: Calendar },
    { name: 'Terms', href: '/academic/terms', icon: CalendarDays },
    { name: 'Subjects', href: '/academic/subjects', icon: BookOpen },
    { name: 'Cohorts', href: '/academic/cohorts', icon: Users },
  ],
};

function selfManagedAcademicSetupNav(): RegistryNavItem {
  return {
    ...ACADEMIC_SETUP_NAV,
    children: [
      { name: 'Curricula', href: '/academic/curricula', icon: BookOpen },
      { name: 'Academic years', href: '/academic/years', icon: Calendar },
      { name: 'Terms', href: '/academic/terms', icon: CalendarDays },
      { name: 'My classes', href: '/academic/cohorts', icon: Users },
    ],
  };
}

export function getAdminNav(
  pluginContext: PluginNavigationContext,
  orgType?: OrgType | null,
  academicSetup?: (Pick<AcademicSetupStatus, 'complete' | 'current_step_label' | 'next_action'> & Partial<AcademicSetupStatus>) | null,
  capabilities?: WorkspaceCapabilities | null,
): NavigationConfig {
  const reportPoliciesChild = pluginContext.hasAnyReportPolicySurface
    ? [{ name: 'Report Policies', href: '/reports/policies', icon: Award }]
    : [];
  const reportNavigationChildren = getAdminReportNavigationItems();
  const selfManagedTeachingWorkspace = isSelfManagedTeachingWorkspace({
    orgType,
    capabilities,
  });
  const workspaceAccessNavItems: RegistryNavItem[] = (
    supportsCustomRoles(capabilities)
    && capabilities?.authorization?.permission_keys.includes('workspace.roles.view')
  )
    ? [{ name: 'Workspace Roles', href: '/workspace-access/roles', icon: ShieldCheck }]
    : [];

  if (academicSetup && !academicSetup.complete) {
    const setupItems = academicSetup.steps?.length
      ? getAcademicSetupAvailableNavItems(academicSetup as AcademicSetupStatus)
      : [
          { label: 'Overview', href: '/academic' },
          {
            label: getAcademicSetupCurrentStepDisplayLabel(academicSetup as AcademicSetupStatus)
              ?? academicSetup.next_action.label,
            href: academicSetup.next_action.href,
          },
        ];
    const setupChildren = setupItems.map((item) => ({
      name: item.label,
      href: item.href,
      icon: item.label.includes('Curricula') || item.label.includes('Subjects') ? BookOpen : CalendarDays,
    }));
    const dashboardLabel = selfManagedTeachingWorkspace
      ? 'My teaching workspace'
      : 'Dashboard';
    const dashboardNavItem: RegistryNavItem = {
      name: dashboardLabel,
      shortName: 'Home',
      href: '/dashboard/admin',
      icon: LayoutDashboard,
      mobilePriority: 2,
    };
    const academicSetupNavItem: RegistryNavItem = {
      name: 'Academic Setup',
      shortName: 'Setup',
      href: '/academic',
      icon: GraduationCap,
      mobilePriority: 1,
      children: setupChildren,
    };

    return {
      primary: [
        dashboardNavItem,
        academicSetupNavItem,
      ],
      secondary: [
        ...workspaceAccessNavItems,
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    };
  }

  if (selfManagedTeachingWorkspace) {
    const teachingWorkspaceNavItem: RegistryNavItem = {
      name: 'My teaching workspace',
      shortName: 'Home',
      href: '/dashboard/admin',
      icon: LayoutDashboard,
      mobilePriority: 1,
    };
    const lessonPreparationsNavItem: RegistryNavItem = {
      name: 'Lesson preparations',
      shortName: 'Prepare',
      href: '/lesson-plans',
      icon: FileText,
      mobilePriority: 2,
    };
    const academicSetupNavItem = selfManagedAcademicSetupNav();

    return {
      primary: [
        teachingWorkspaceNavItem,
        lessonPreparationsNavItem,
        academicSetupNavItem,
      ],
      mobilePrimary: [
        teachingWorkspaceNavItem,
        lessonPreparationsNavItem,
        { name: 'My classes', shortName: 'Classes', href: '/academic/cohorts', icon: Users, mobilePriority: 3 },
        { name: 'Assessments', shortName: 'Assess', href: '/assessments', icon: ClipboardCheck, mobilePriority: 4 },
      ],
      secondary: [
        ...workspaceAccessNavItems,
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    };
  }

  if (isSelfManagedWorkspace(orgType)) {
    return {
      primary: [
        { name: 'Dashboard', shortName: 'Home', href: '/dashboard/admin', icon: LayoutDashboard, mobilePriority: 1 },
        ...getPluginNavigationItems('admin.primary.afterDashboard', pluginContext),
        { name: 'Learners', shortName: 'Learners', href: '/learners', icon: Users, mobilePriority: 2 },
        { name: 'Teaching Sessions', href: '/sessions', icon: Calendar },
        { name: 'Lesson Plans', href: '/lesson-plans', icon: FileText },
        {
          name: 'Assessments',
          shortName: 'Assess',
          href: '/assessments',
          icon: ClipboardCheck,
          mobilePriority: 3,
          children: [
            { name: 'All Assessments', href: '/assessments', icon: ClipboardCheck },
            ...reportPoliciesChild,
          ],
        },
        {
          name: 'Reports',
          shortName: 'Reports',
          href: '/reports',
          icon: FileBarChart,
          mobilePriority: 4,
          children: reportNavigationChildren,
        },
        { name: 'Collaborators', href: '/admin/instructors', icon: UserCog },
      ],
      secondary: [
        ...getPluginNavigationItems('admin.secondary.beforeSettings', pluginContext),
        ...workspaceAccessNavItems,
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    };
  }

  if (orgType === 'TUITION_CENTER') {
    return {
      primary: [
        { name: 'Dashboard', shortName: 'Home', href: '/dashboard/admin', icon: LayoutDashboard, mobilePriority: 1 },
        ...getPluginNavigationItems('admin.primary.afterDashboard', pluginContext),
        { name: 'Staff', href: '/admin/instructors', icon: UserCog },
        { name: 'Learners', shortName: 'Learners', href: '/learners', icon: Users, mobilePriority: 2 },
        { name: 'Lesson Supervision', href: '/sessions', icon: Calendar },
        { name: 'Lesson Plan Review', href: '/admin/lesson-plans', icon: FileText },
        {
          name: 'Assessment Overview',
          shortName: 'Assess',
          href: '/assessments',
          icon: ClipboardCheck,
          mobilePriority: 3,
          children: [
            { name: 'All Assessments', href: '/assessments', icon: ClipboardCheck },
            ...reportPoliciesChild,
          ],
        },
        {
          name: 'Reports',
          shortName: 'Reports',
          href: '/reports',
          icon: FileBarChart,
          mobilePriority: 4,
          children: reportNavigationChildren,
        },
      ],
      secondary: [
        { name: 'Staff Activity', href: '/admin/instructors', icon: Activity },
        ...getPluginNavigationItems('admin.secondary.beforeSettings', pluginContext),
        ...workspaceAccessNavItems,
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    };
  }

  if (isLearnerCenteredWorkspace(orgType)) {
    return {
      primary: [
        { name: 'Dashboard', shortName: 'Home', href: '/dashboard/admin', icon: LayoutDashboard, mobilePriority: 1 },
        ...getPluginNavigationItems('admin.primary.afterDashboard', pluginContext),
        { name: 'Learners', shortName: 'Learners', href: '/learners', icon: Users, mobilePriority: 2 },
        { name: 'Tutors', href: '/admin/instructors', icon: UserCog },
        { name: 'Lesson Supervision', href: '/sessions', icon: Calendar },
        { name: 'Lesson Plan Review', href: '/admin/lesson-plans', icon: FileText },
        {
          name: 'Reports',
          shortName: 'Reports',
          href: '/reports',
          icon: FileBarChart,
          mobilePriority: 3,
          children: reportNavigationChildren,
        },
      ],
      secondary: [
        ...getPluginNavigationItems('admin.secondary.beforeSettings', pluginContext),
        ...workspaceAccessNavItems,
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    };
  }

  return {
    primary: [
      { name: 'Dashboard', shortName: 'Home', href: '/dashboard/admin', icon: LayoutDashboard, mobilePriority: 1 },
      ...getPluginNavigationItems('admin.primary.afterDashboard', pluginContext),
      ACADEMIC_SETUP_NAV,
      { name: 'Staff', href: '/admin/instructors', icon: UserCog },
      { name: 'Learners', shortName: 'Learners', href: '/learners', icon: Users, mobilePriority: 2 },
      { name: 'Lesson Supervision', href: '/sessions', icon: Calendar },
      { name: 'Lesson Plan Review', href: '/admin/lesson-plans', icon: FileText },
      {
        name: 'Assessment Overview',
        shortName: 'Assess',
        href: '/assessments',
        icon: ClipboardCheck,
        mobilePriority: 3,
        children: [
          { name: 'All Assessments', href: '/assessments', icon: ClipboardCheck },
          ...reportPoliciesChild,
        ],
      },
      ...getPluginNavigationItems('admin.primary.afterAssessments', pluginContext),
      {
        name: 'Reports',
        shortName: 'Reports',
        href: '/reports',
        icon: FileBarChart,
        mobilePriority: 4,
        children: reportNavigationChildren,
      },
    ],
    secondary: [
      { name: 'Staff Activity', href: '/admin/instructors', icon: Activity },
      { name: 'System Alerts', href: '/admin/alerts', icon: AlertCircle },
      ...getPluginNavigationItems('admin.secondary.beforeSettings', pluginContext),
      ...workspaceAccessNavItems,
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  };
}

function getInstructorDashboardLabel(todayMode?: AcademicTodayModeValue | null): string {
  if (todayMode === 'MIDTERM_BREAK') {
    return 'Midterm Break';
  }
  if (todayMode === 'MIDTERM_EXAM') {
    return 'Midterm Exams';
  }
  return 'Teaching Today';
}

export function getInstructorNav(
  pluginContext: PluginNavigationContext,
  todayMode?: AcademicTodayModeValue | null,
): NavigationConfig {
  return {
    primary: [
      {
        name: getInstructorDashboardLabel(todayMode),
        shortName: 'Home',
        href: '/dashboard/instructor',
        icon: LayoutDashboard,
        mobilePriority: 1,
      },
      ...getPluginNavigationItems('instructor.primary.afterDashboard', pluginContext),
      { name: 'Lesson Preparation', shortName: 'Prepare', href: '/lesson-plans', icon: FileText, mobilePriority: 2 },
      { name: 'My Lessons', shortName: 'Lessons', href: '/sessions', icon: Calendar, mobilePriority: 3 },
      ...getPluginNavigationItems('instructor.primary.afterMySessions', pluginContext),
      { name: 'My Teaching Load', href: '/academic/cohorts', icon: Users },
      { name: 'My Learners', href: '/learners', icon: Users },
      {
        name: 'Assessments & Grading',
        shortName: 'Assess',
        href: '/assessments',
        icon: ClipboardCheck,
        mobilePriority: 4,
        children: [
          { name: 'All Assessments', href: '/assessments', icon: ClipboardCheck },
          { name: 'Needs Grading', href: '/assessments?status=pending', icon: AlertCircle },
        ],
      },
      ...getPluginNavigationItems('instructor.primary.afterAssessments', pluginContext),
      {
        name: 'My Reports',
        href: '/reports/instructor',
        icon: FileBarChart,
        children: [
          { name: 'Overview', href: '/reports/instructor', icon: LayoutDashboard },
          {
            name: 'Teacher Report',
            href: '/reports/instructor/teacher-report',
            icon: ClipboardCheck,
          },
          {
            name: 'Class Subjects',
            href: '/reports/instructor/cohort-subjects',
            icon: BookOpen,
          },
        ],
      },
    ],
    secondary: [
      { name: 'Attendance Risk', href: '/reports/instructor/attendance-risk', icon: AlertCircle },
      ...getPluginNavigationItems('instructor.secondary.beforeSubmitRequest', pluginContext),
      ...(supportsInternalRequests(pluginContext.capabilities)
        ? [{ name: 'Submit Request', href: '/requests/new', icon: FileText }]
        : []),
    ],
  };
}

// ── Footer label ──────────────────────────────────────────────────────────

export function getRoleFooterLabel(role: Role, orgType?: OrgType | null): string {
  if (role === 'ADMIN') {
    return getWorkspaceManagementLabel(orgType);
  }
  return 'Teaching Operations';
}

// ── App logo icon ─────────────────────────────────────────────────────────

export { Database as AppLogoIcon };

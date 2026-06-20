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
  Inbox,
  MessageCircle,
  UserCog,
  TrendingUp,
  Database,
  CalendarDays,
  Puzzle,
} from 'lucide-react';
import type { OrgType, Role, WorkspaceCapabilities } from '@/app/core/types/auth';
import {
  getPluginNavigationItems,
  type NavItem as RegistryNavItem,
  type PluginNavigationContext,
} from '@/app/core/registry/pluginNavigation';
import type { AcademicSetupStatus } from '@/app/core/types/academic';
import {
  getWorkspaceManagementLabel,
  isLearnerCenteredWorkspace,
  isPersonalFreelancerWorkspace,
  isSelfManagedWorkspace,
} from '@/app/core/lib/workspaces';
import { getAdminReportNavigationItems } from '../../core/components/reports/reportHierarchy';

export type { NavItem } from '@/app/core/registry/pluginNavigation';

// ── Types ─────────────────────────────────────────────────────────────────

export interface NavigationConfig {
  primary: RegistryNavItem[];
  secondary?: RegistryNavItem[];
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
  SUPERADMIN: {
    active: 'theme-nav-active',
    hover: 'theme-nav-hover',
    childActive: 'theme-nav-child-active',
    badge: 'theme-nav-badge',
    header: 'theme-nav-header',
    iconBg: 'theme-nav-icon-bg',
  },
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
  SUPERADMIN: ShieldCheck,
  ADMIN: Building2,
  INSTRUCTOR: GraduationCap,
};

// ── Nav config builders ───────────────────────────────────────────────────

export const SUPERADMIN_NAV: NavigationConfig = {
  primary: [
    { name: 'System Overview', href: '/dashboard/superadmin', icon: LayoutDashboard },
    { name: 'Organizations', href: '/superadmin/organizations', icon: Building2 },
    { name: 'Global Users', href: '/superadmin/users', icon: UserCog },
    { name: 'Plugin Registry', href: '/superadmin/plugins', icon: Puzzle },
    { name: 'Feedback Center', href: '/superadmin/feedback', icon: MessageCircle },
    { name: 'Subscriptions', href: '/superadmin/subscriptions', icon: TrendingUp },
    { name: 'System Settings', href: '/superadmin/settings', icon: Settings },
    { name: 'Audit Logs', href: '/superadmin/audit', icon: FileText },
  ],
  secondary: [
    { name: 'Support Tickets', href: '/superadmin/support', icon: Inbox },
    { name: 'System Health', href: '/superadmin/health', icon: Activity },
  ],
};

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

export function getAdminNav(
  pluginContext: PluginNavigationContext,
  orgType?: OrgType | null,
  academicSetup?: Pick<AcademicSetupStatus, 'complete' | 'current_step_label' | 'next_action'> | null,
  capabilities?: WorkspaceCapabilities | null,
): NavigationConfig {
  const reportPoliciesChild = pluginContext.hasAnyReportPolicySurface
    ? [{ name: 'Report Policies', href: '/reports/policies', icon: Award }]
    : [];
  const reportNavigationChildren = getAdminReportNavigationItems();

  if (
    (capabilities?.workspace_behavior === 'FREELANCE_TEACHER' || isPersonalFreelancerWorkspace(orgType))
    && academicSetup
    && !academicSetup.complete
  ) {
    const currentStepLabel = academicSetup.current_step_label ?? 'Continue setup';

    return {
      primary: [
        { name: 'My teaching workspace', href: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Academic Setup', href: '/academic', icon: GraduationCap },
        { name: currentStepLabel, href: academicSetup.next_action.href, icon: CalendarDays },
      ],
      secondary: [
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    };
  }

  if (capabilities?.workspace_behavior === 'FREELANCE_TEACHER' || isPersonalFreelancerWorkspace(orgType)) {
    return {
      primary: [
        { name: 'My teaching workspace', href: '/dashboard/admin', icon: LayoutDashboard },
        ...getPluginNavigationItems('admin.primary.afterDashboard', pluginContext),
        ACADEMIC_SETUP_NAV,
        { name: 'My learners', href: '/learners', icon: Users },
        { name: 'My teaching record', href: '/sessions', icon: Calendar },
        { name: 'My lesson plans', href: '/lesson-plans', icon: FileText },
        {
          name: 'My assessments',
          href: '/assessments',
          icon: ClipboardCheck,
          children: [
            { name: 'All assessments', href: '/assessments', icon: ClipboardCheck },
            ...reportPoliciesChild,
          ],
        },
        ...getPluginNavigationItems('admin.primary.afterAssessments', pluginContext),
        {
          name: 'My reports',
          href: '/reports',
          icon: FileBarChart,
          children: reportNavigationChildren,
        },
      ],
      secondary: [
        ...getPluginNavigationItems('admin.secondary.beforeSettings', pluginContext),
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    };
  }

  if (academicSetup && !academicSetup.complete) {
    const currentStepLabel = academicSetup.current_step_label ?? 'Continue setup';

    return {
      primary: [
        { name: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
        { name: 'Academic Setup', href: '/academic', icon: GraduationCap },
        { name: currentStepLabel, href: academicSetup.next_action.href, icon: CalendarDays },
      ],
      secondary: [
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    };
  }

  if (isSelfManagedWorkspace(orgType)) {
    return {
      primary: [
        { name: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
        ...getPluginNavigationItems('admin.primary.afterDashboard', pluginContext),
        { name: 'Learners', href: '/learners', icon: Users },
        { name: 'Teaching Sessions', href: '/sessions', icon: Calendar },
        { name: 'Lesson Plans', href: '/lesson-plans', icon: FileText },
        {
          name: 'Assessments',
          href: '/assessments',
          icon: ClipboardCheck,
          children: [
            { name: 'All Assessments', href: '/assessments', icon: ClipboardCheck },
            ...reportPoliciesChild,
          ],
        },
        {
          name: 'Reports',
          href: '/reports',
          icon: FileBarChart,
          children: reportNavigationChildren,
        },
        { name: 'Collaborators', href: '/admin/instructors', icon: UserCog },
      ],
      secondary: [
        ...getPluginNavigationItems('admin.secondary.beforeSettings', pluginContext),
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    };
  }

  if (orgType === 'TUITION_CENTER') {
    return {
      primary: [
        { name: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
        ...getPluginNavigationItems('admin.primary.afterDashboard', pluginContext),
        { name: 'Tutors', href: '/admin/instructors', icon: UserCog },
        { name: 'Learners', href: '/learners', icon: Users },
        { name: 'Lesson Supervision', href: '/sessions', icon: Calendar },
        { name: 'Lesson Plan Review', href: '/lesson-plans', icon: FileText },
        {
          name: 'Assessment Overview',
          href: '/assessments',
          icon: ClipboardCheck,
          children: [
            { name: 'All Assessments', href: '/assessments', icon: ClipboardCheck },
            ...reportPoliciesChild,
          ],
        },
        {
          name: 'Reports',
          href: '/reports',
          icon: FileBarChart,
          children: reportNavigationChildren,
        },
      ],
      secondary: [
        { name: 'Tutor Activity', href: '/admin/instructors', icon: Activity },
        ...getPluginNavigationItems('admin.secondary.beforeSettings', pluginContext),
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    };
  }

  if (isLearnerCenteredWorkspace(orgType)) {
    return {
      primary: [
        { name: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
        ...getPluginNavigationItems('admin.primary.afterDashboard', pluginContext),
        { name: 'Learners', href: '/learners', icon: Users },
        { name: 'Tutors', href: '/admin/instructors', icon: UserCog },
        { name: 'Lesson Supervision', href: '/sessions', icon: Calendar },
        { name: 'Lesson Plan Review', href: '/lesson-plans', icon: FileText },
        {
          name: 'Reports',
          href: '/reports',
          icon: FileBarChart,
          children: reportNavigationChildren,
        },
      ],
      secondary: [
        ...getPluginNavigationItems('admin.secondary.beforeSettings', pluginContext),
        { name: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    };
  }

  return {
    primary: [
      { name: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
      ...getPluginNavigationItems('admin.primary.afterDashboard', pluginContext),
      ACADEMIC_SETUP_NAV,
      { name: 'Instructors', href: '/admin/instructors', icon: UserCog },
      { name: 'Learners', href: '/learners', icon: Users },
      { name: 'Lesson Supervision', href: '/sessions', icon: Calendar },
      { name: 'Lesson Plan Review', href: '/lesson-plans', icon: FileText },
      {
        name: 'Assessment Overview',
        href: '/assessments',
        icon: ClipboardCheck,
        children: [
          { name: 'All Assessments', href: '/assessments', icon: ClipboardCheck },
          ...reportPoliciesChild,
        ],
      },
      ...getPluginNavigationItems('admin.primary.afterAssessments', pluginContext),
      {
        name: 'Reports',
        href: '/reports',
        icon: FileBarChart,
        children: reportNavigationChildren,
      },
    ],
    secondary: [
      { name: 'Instructor Activity', href: '/admin/instructors', icon: Activity },
      { name: 'System Alerts', href: '/admin/alerts', icon: AlertCircle },
      ...getPluginNavigationItems('admin.secondary.beforeSettings', pluginContext),
      { name: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  };
}

export function getInstructorNav(pluginContext: PluginNavigationContext): NavigationConfig {
  return {
    primary: [
      { name: 'Teaching Today', href: '/dashboard/instructor', icon: LayoutDashboard },
      ...getPluginNavigationItems('instructor.primary.afterDashboard', pluginContext),
      { name: 'Lesson Preparation', href: '/lesson-plans', icon: FileText },
      { name: 'My Lessons', href: '/sessions', icon: Calendar },
      ...getPluginNavigationItems('instructor.primary.afterMySessions', pluginContext),
      { name: 'My Teaching Load', href: '/academic/cohorts', icon: Users },
      { name: 'My Learners', href: '/learners', icon: Users },
      {
        name: 'Assessments & Grading',
        href: '/assessments',
        icon: ClipboardCheck,
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
      { name: 'Submit Request', href: '/requests/new', icon: FileText },
    ],
  };
}

export function getSuperadminNav(pluginContext: PluginNavigationContext): NavigationConfig {
  return {
    ...SUPERADMIN_NAV,
    primary: [
      { name: 'System Overview', href: '/dashboard/superadmin', icon: LayoutDashboard },
      { name: 'Organizations', href: '/superadmin/organizations', icon: Building2 },
      ...getPluginNavigationItems('superadmin.primary.afterOrganizations', pluginContext),
      { name: 'Global Users', href: '/superadmin/users', icon: UserCog },
      { name: 'Plugin Registry', href: '/superadmin/plugins', icon: Puzzle },
      { name: 'Feedback Center', href: '/superadmin/feedback', icon: MessageCircle },
      ...getPluginNavigationItems('superadmin.primary.afterPluginRegistry', pluginContext),
      { name: 'Subscriptions', href: '/superadmin/subscriptions', icon: TrendingUp },
      { name: 'System Settings', href: '/superadmin/settings', icon: Settings },
      { name: 'Audit Logs', href: '/superadmin/audit', icon: FileText },
    ],
  };
}

// ── Footer label ──────────────────────────────────────────────────────────

export function getRoleFooterLabel(role: Role, orgType?: OrgType | null): string {
  if (role === 'SUPERADMIN') {
    return 'System Governance';
  }
  if (role === 'ADMIN') {
    return getWorkspaceManagementLabel(orgType);
  }
  return 'Teaching Operations';
}

// ── App logo icon ─────────────────────────────────────────────────────────

export { Database as AppLogoIcon };

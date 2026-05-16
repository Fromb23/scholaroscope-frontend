// ============================================================================
// app/core/components/layout/navConfig.ts
//
// Pure config — no React, no hooks, no JSX.
// Nav items, role colors, and role icon lookup.
// ============================================================================

import type { LucideIcon } from 'lucide-react';
import {
    LayoutDashboard, Users, BookOpen, Calendar,
    ClipboardCheck, Award, FileBarChart, GraduationCap,
    Building2, Settings, ShieldCheck, Activity, FileText, AlertCircle,
    Inbox, UserCog, TrendingUp, Database, Clock,
    CalendarDays,
    Puzzle,
} from 'lucide-react';
import type { Role } from '@/app/core/types/auth';
import {
    getPluginNavigationItems,
    type NavItem as RegistryNavItem,
    type PluginNavigationContext,
} from '@/app/core/registry/pluginNavigation';

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
        active: 'bg-purple-600 text-white',
        hover: 'hover:bg-purple-50 hover:text-purple-700',
        childActive: 'bg-purple-100 text-purple-700 border-l-4 border-purple-600',
        badge: 'bg-purple-100',
        header: 'bg-purple-50 border-purple-200',
        iconBg: 'bg-purple-600',
    },
    ADMIN: {
        active: 'bg-blue-600 text-white',
        hover: 'hover:bg-blue-50 hover:text-blue-700',
        childActive: 'bg-blue-100 text-blue-700 border-l-4 border-blue-600',
        badge: 'bg-blue-100',
        header: 'bg-blue-50 border-blue-200',
        iconBg: 'bg-blue-600',
    },
    INSTRUCTOR: {
        active: 'bg-green-600 text-white',
        hover: 'hover:bg-green-50 hover:text-green-700',
        childActive: 'bg-green-100 text-green-700 border-l-4 border-green-600',
        badge: 'bg-green-100',
        header: 'bg-green-50 border-green-200',
        iconBg: 'bg-green-600',
    },
};

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
        { name: 'Subscriptions', href: '/superadmin/subscriptions', icon: TrendingUp },
        { name: 'System Settings', href: '/superadmin/settings', icon: Settings },
        { name: 'Audit Logs', href: '/superadmin/audit', icon: FileText },
    ],
    secondary: [
        { name: 'Support Tickets', href: '/superadmin/support', icon: Inbox },
        { name: 'System Health', href: '/superadmin/health', icon: Activity },
    ],
};

export function getAdminNav(
    pluginContext: PluginNavigationContext,
): NavigationConfig {
    return {
        primary: [
            { name: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
            ...getPluginNavigationItems('admin.primary.afterDashboard', pluginContext),
            {
                name: 'Academic Setup', href: '/academic', icon: GraduationCap,
                children: [
                    { name: 'Overview', href: '/academic', icon: GraduationCap },
                    { name: 'Curricula', href: '/academic/curricula', icon: BookOpen },
                    { name: 'Years', href: '/academic/years', icon: Calendar },
                    { name: 'Terms', href: '/academic/terms', icon: CalendarDays },
                    { name: 'Subjects', href: '/academic/subjects', icon: BookOpen },
                    { name: 'Cohorts', href: '/academic/cohorts', icon: Users },
                ],
            },
            { name: 'Instructors', href: '/admin/instructors', icon: UserCog },
            { name: 'Learners', href: '/learners', icon: Users },
            { name: 'Sessions', href: '/sessions', icon: Calendar },
            {
                name: 'Assessments', href: '/assessments', icon: ClipboardCheck,
                children: [
                    { name: 'All Assessments', href: '/assessments', icon: ClipboardCheck },
                    { name: 'Create New', href: '/assessments/new', icon: FileText },
                    { name: 'Grade Policies', href: '/reports/grade-policies', icon: Award },
                ],
            },
            ...getPluginNavigationItems('admin.primary.afterAssessments', pluginContext),
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
            ...getPluginNavigationItems('admin.secondary.beforeSettings', pluginContext),
            { name: 'Settings', href: '/admin/settings', icon: Settings },
        ],
    };
}

export function getInstructorNav(
    pluginContext: PluginNavigationContext,
): NavigationConfig {
    return {
        primary: [
            { name: 'Dashboard', href: '/dashboard/instructor', icon: LayoutDashboard },
            ...getPluginNavigationItems('instructor.primary.afterDashboard', pluginContext),
            { name: 'My Classes', href: '/academic/cohorts', icon: Users },
            { name: 'My Lessons', href: '/sessions', icon: Calendar },
            ...getPluginNavigationItems('instructor.primary.afterMySessions', pluginContext),
            { name: 'My Learners', href: '/learners', icon: Users },
            {
                name: 'My Class Reports', href: '/reports/instructor', icon: FileBarChart,
                children: [
                    { name: 'Overview', href: '/reports/instructor', icon: LayoutDashboard },
                    { name: 'My Class Subjects', href: '/reports/instructor/cohort-subjects', icon: BookOpen },
                ],
            },
            {
                name: 'Assessments', href: '/assessments', icon: ClipboardCheck,
                children: [
                    { name: 'All Assessments', href: '/assessments', icon: ClipboardCheck },
                    { name: 'Needs Grading', href: '/assessments?status=pending', icon: AlertCircle },
                ],
            },
            ...getPluginNavigationItems('instructor.primary.afterAssessments', pluginContext),
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
            ...getPluginNavigationItems('superadmin.primary.afterPluginRegistry', pluginContext),
            { name: 'Subscriptions', href: '/superadmin/subscriptions', icon: TrendingUp },
            { name: 'System Settings', href: '/superadmin/settings', icon: Settings },
            { name: 'Audit Logs', href: '/superadmin/audit', icon: FileText },
        ],
    };
}

// ── Footer label ──────────────────────────────────────────────────────────

export const ROLE_FOOTER_LABEL: Record<Role, string> = {
    SUPERADMIN: 'System Governance',
    ADMIN: 'Institution Management',
    INSTRUCTOR: 'Teaching Operations',
};

// ── App logo icon ─────────────────────────────────────────────────────────

export { Database as AppLogoIcon };

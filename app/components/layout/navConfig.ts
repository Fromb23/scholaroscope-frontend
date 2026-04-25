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
    Inbox, UserCog, TrendingUp, Database, Clock, Target,
    CalendarDays, Layers, Megaphone,
    Puzzle,
    ChartBarIcon,
    BookOpenIcon, GraduationCapIcon,
    BarChart3,
} from 'lucide-react';
import type { Role } from '@/app/core/types/auth';
import { Children } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────

export interface NavItem {
    name: string;
    href: string;
    icon: LucideIcon;
    badge?: number;
    children?: NavItem[];
}

export interface NavigationConfig {
    primary: NavItem[];
    secondary?: NavItem[];
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
        { name: 'Announcements', href: '/announcements', icon: Megaphone },
        { name: 'Global Users', href: '/superadmin/users', icon: UserCog },
        { name: 'Plugin Registry', href: '/superadmin/plugins', icon: Puzzle },
        {
            name: 'Curriculum Authoring', href: '/cbc/authoring', icon: BookOpen,
            children: [
                { name: 'Overview', href: '/cbc/authoring', icon: BookOpen },
                { name: 'Strands', href: '/cbc/authoring/strands', icon: Layers },
            ],
        },
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
    hasCBC: boolean,
    unreadAnnouncements: number,
    hasCambridge: boolean,
): NavigationConfig {
    return {
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
                    { name: 'Browser', href: '/cbc/browser', icon: BookOpen },
                    { name: 'Teaching', href: '/cbc/teaching', icon: Target },
                ],
            }] : []),
            ...(hasCambridge ? [{
                name: 'Cambridge Management',
                href: '/cambridge',
                icon: BookOpen,
                children: [
                    { name: 'Dashboard', href: '/cambridge', icon: BookOpen },
                    { name: 'Subjects', href: '/cambridge/subjects', icon: GraduationCap },
                    { name: 'Progress', href: '/cambridge/progress', icon: BarChart3 },
                ],
            }] : []),
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
                name: 'Announcements', href: '/announcements', icon: Megaphone,
                badge: unreadAnnouncements
            },
            { name: 'Settings', href: '/admin/settings', icon: Settings },
        ],
    };
}

export function getInstructorNav(
    hasCBC: boolean,
    unreadAnnouncements: number,
    hasCambridge: boolean,
): NavigationConfig {
    return {
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
            ...(hasCBC ? [{
                name: 'CBC Teaching', href: '/cbc/teaching', icon: Award,
                children: [
                    { name: 'My Sessions', href: '/cbc/teaching/sessions', icon: Target },
                    { name: 'Progress View', href: '/cbc/progress', icon: TrendingUp },
                    { name: 'Browse Outcomes', href: '/cbc/browser', icon: BookOpen },
                ],
            }] : []),
            ...(hasCambridge ? [{
                name: 'Cambridge Management',
                href: '/cambridge',
                icon: BookOpen,
                children: [
                    { name: 'Dashboard', href: '/cambridge', icon: BookOpen },
                    { name: 'Subjects', href: '/cambridge/subjects', icon: GraduationCap },
                    { name: 'Progress', href: '/cambridge/progress', icon: BarChart3 },
                ],
            }] : []),
        ],
        secondary: [
            { name: 'Learners at Risk', href: '/learners?filter=at-risk', icon: AlertCircle },
            {
                name: 'Announcements', href: '/announcements', icon: Megaphone,
                badge: unreadAnnouncements
            },
            { name: 'Submit Request', href: '/requests/new', icon: FileText },
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
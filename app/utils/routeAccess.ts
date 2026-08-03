// app/utils/routeAccess.ts

import type { OperatingContext, Role, WorkspaceCapabilities } from '../core/types/auth';
import {
    getPluginRouteAccessRules,
    type RouteAccessContext,
    type RouteAccessRule,
} from './pluginRouteAccess';

function hasPositiveParam(url: URL, key: string): boolean {
    const value = Number(url.searchParams.get(key));
    return Number.isInteger(value) && value > 0;
}

export function isScopedInstructorAttendanceReport(path: string): boolean {
    const url = new URL(path, 'https://scholaroscope.local');
    const hasLearner = hasPositiveParam(url, 'student');
    const hasClassSubject = (
        hasPositiveParam(url, 'cohortSubject')
        || hasPositiveParam(url, 'cohort_subject')
        || hasPositiveParam(url, 'session')
        || (hasPositiveParam(url, 'cohort') && hasPositiveParam(url, 'subject'))
    );

    return hasLearner && hasClassSubject;
}

const kernelRouteRules: RouteAccessRule[] = [
    { pattern: /^\/dashboard\/admin/, requiredContext: 'WORKSPACE_MANAGEMENT' },
    { pattern: /^\/dashboard\/instructor/, requiredContext: 'MY_TEACHING', requiredCapability: 'can_teach' },
    { pattern: /^\/admin\/settings(?:\/|$)/, requiredAnyPermission: ['workspace.settings.view', 'workspace.settings.manage'] },
    { pattern: /^\/admin/, requiredContext: 'WORKSPACE_MANAGEMENT', requiredAnyPermission: ['workspace.members.view', 'workspace.members.manage'] },
    { pattern: /^\/academic\/curricula/, requiredCapability: 'can_manage_academic_setup' },
    { pattern: /^\/academic\/years/, requiredCapability: 'can_manage_academic_setup' },
    { pattern: /^\/academic\/terms/, requiredCapability: 'can_manage_academic_setup' },
    { pattern: /^\/academic\/subjects/, requiredAnyPermission: ['academic.subjects.view', 'academic.subjects.manage'] },
    { pattern: /^\/academic\/cohorts\/[^/]+\/students$/, requiredCapability: 'can_manage_learners' },
    { pattern: /^\/academic\/topics/, requiredCapability: 'can_manage_academic_setup' },
    { pattern: /^\/academic\/progress/, requiredAnyPermission: ['reports.view'] },
    { pattern: /^\/learners\/new$/, requiredCapability: 'can_manage_learners' },
    { pattern: /^\/learners\/[^/]+\/edit$/, requiredCapability: 'can_manage_learners' },
    { pattern: /^\/assessments\/new$/, requiredAnyPermission: ['assessments.create', 'assessments.manage'] },
    { pattern: /^\/assessments\/[^/]+\/edit$/, requiredAnyPermission: ['assessments.manage', 'assessments.review'] },
    { pattern: /^\/reports\/instructor(?:\/|$)/, requiredCapability: 'can_teach' },
    { pattern: /^\/reports\/learners\/[^/]+\/(subject|assessments|overview|assignments)$/, requiredAnyPermission: ['reports.view'] },
    { pattern: /^\/reports\/instructors(?:\/|$)/, requiredAnyPermission: ['reports.view'] },
    {
        pattern: /^\/reports\/attendance$/,
        requiredAnyPermission: ['reports.view'],
        isAllowed: ({ operatingContext, url }) => (
            operatingContext !== 'MY_TEACHING'
            || isScopedInstructorAttendanceReport(`${url.pathname}${url.search}`)
        ),
    },
    { pattern: /^\/reports\/grade-policies(\/.*)?$/, requiredAnyPermission: ['reports.manage_policy'] },
    { pattern: /^\/reports\/(students|cohorts|subjects|assessments|policies|compute)(\/.*)?$/, requiredAnyPermission: ['reports.view', 'reports.compute', 'reports.manage_policy'] },
    { pattern: /^\/reports/, requiredAnyPermission: ['reports.view'] },
    { pattern: /^\/revenue(?:\/|$)/, requiredAnyPermission: ['revenue.program.view'] },
    { pattern: /^\/academic\/cohorts$/, requiredAnyPermission: ['academic.cohorts.view', 'academic.cohorts.manage'] },
    { pattern: /^\/academic\/cohorts\/\d+$/, requiredAnyPermission: ['academic.cohorts.view', 'academic.cohorts.manage'] },
    { pattern: /^\/academic\/cohort-subjects\/\d+\/learners$/, requiredAnyPermission: ['learners.view', 'learners.manage'] },
    { pattern: /^\/sessions/, requiredAnyPermission: ['lessons.view', 'attendance.view', 'attendance.record', 'attendance.manage'] },
    { pattern: /^\/lesson-plans/, requiredAnyPermission: ['lessons.view', 'lessons.prepare', 'lessons.manage', 'lessons.review'] },
    { pattern: /^\/learners/, requiredAnyPermission: ['learners.view', 'learners.manage'] },
    { pattern: /^\/assessments/, requiredAnyPermission: ['assessments.view', 'assessments.create', 'assessments.manage', 'assessments.review'] },
    { pattern: /^\/profile/ },
];

export const routeRules: RouteAccessRule[] = kernelRouteRules;

export function getRouteRules(): RouteAccessRule[] {
    return [...kernelRouteRules, ...getPluginRouteAccessRules()];
}

function hasPermission(capabilities: WorkspaceCapabilities | null | undefined, key: string): boolean {
    return Boolean(capabilities?.authorization?.permission_keys?.includes(key));
}

function ruleAllows(rule: RouteAccessRule, context: RouteAccessContext): boolean {
    if (rule.requiredContext && context.operatingContext !== rule.requiredContext) {
        return false;
    }
    if (rule.requiredCapability && !context.capabilities?.[rule.requiredCapability]) {
        return false;
    }
    if (rule.requiredPermissions?.some((key) => !hasPermission(context.capabilities, key))) {
        return false;
    }
    if (
        rule.requiredAnyPermission
        && !rule.requiredAnyPermission.some((key) => hasPermission(context.capabilities, key))
    ) {
        return false;
    }
    return rule.isAllowed?.(context) ?? true;
}

export function routeAllowedForContext(
    path: string,
    context: Pick<RouteAccessContext, 'operatingContext' | 'capabilities'>,
): boolean {
    const url = new URL(path, 'https://scholaroscope.local');
    const matchedRule = getRouteRules().find((rule) => rule.pattern.test(url.pathname));
    if (!matchedRule) return true;
    return ruleAllows(matchedRule, {
        ...context,
        pathname: url.pathname,
        url,
    });
}

/** @deprecated Legacy roles never grant route access. */
export function routeAllowedForRole(path: string, role: Role): boolean {
    return false;
}

export function operatingContextHomeRoute(context: OperatingContext | null): string {
    if (context === 'MY_TEACHING') return '/dashboard/instructor';
    if (context === 'WORKSPACE_MANAGEMENT') return '/dashboard/admin';
    return '/dashboard';
}

export const roleHomeRoute = {
    ADMIN: '/dashboard/admin',
    INSTRUCTOR: '/dashboard/instructor',
} as const;

function normalizeFallbackContext(context: OperatingContext | Role | null): OperatingContext | null {
    if (context === 'ADMIN') return 'WORKSPACE_MANAGEMENT';
    if (context === 'INSTRUCTOR') return 'MY_TEACHING';
    return context;
}

export function getUnauthorizedRouteFallback(context: OperatingContext | Role | null, path: string): string {
    context = normalizeFallbackContext(context);
    if (context === 'MY_TEACHING' && path.startsWith('/reports')) {
        return '/reports/instructor';
    }
    return operatingContextHomeRoute(context);
}

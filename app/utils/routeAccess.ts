// app/utils/routeAccess.ts

import type { OperatingContext, Role, WorkspaceCapabilities } from './authorityTypes';
import {
    getPluginRouteAccessRules,
    type RouteAccessContext,
    type RouteAccessRule,
} from './pluginRouteAccess';

function hasPositiveParam(url: URL, key: string): boolean {
    const value = Number(url.searchParams.get(key));
    return Number.isInteger(value) && value > 0;
}

function permissionKeys(capabilities: WorkspaceCapabilities | null | undefined): string[] {
    return capabilities?.authorization?.permission_keys ?? [];
}

function hasCapabilityPermission(
    capabilities: WorkspaceCapabilities | null | undefined,
    key: string,
): boolean {
    return permissionKeys(capabilities).includes(key);
}

function announcementsAvailable(capabilities: WorkspaceCapabilities | null | undefined): boolean {
    const governance = capabilities?.workspace_governance;
    if (governance && !governance.supports_announcements) return false;
    return (
        hasCapabilityPermission(capabilities, 'announcements.view')
        || hasCapabilityPermission(capabilities, 'announcements.manage')
        || Boolean(capabilities?.can_manage_announcements)
    );
}

function revenueApplicable(orgType?: string | null): boolean {
    return !['PERSONAL', 'INDEPENDENT_TEACHER', 'HOMESCHOOL', 'LEARNER_WORKSPACE'].includes(orgType ?? '');
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
    { pattern: /^\/admin\/lesson-plans(?:\/|$)/, requiredContext: 'WORKSPACE_MANAGEMENT', requiredAnyPermission: ['lessons.review', 'lessons.manage'] },
    { pattern: /^\/admin\/alerts(?:\/|$)/, requiredContext: 'WORKSPACE_MANAGEMENT', requiredAnyPermission: ['workspace.audit.view'] },
    { pattern: /^\/admin\/instructors(?:\/|$)/, requiredContext: 'WORKSPACE_MANAGEMENT', requiredAnyPermission: ['workspace.members.view', 'workspace.members.manage'] },
    { pattern: /^\/admin/, requiredContext: 'WORKSPACE_MANAGEMENT', requiredAnyPermission: ['workspace.members.view', 'workspace.members.manage'] },
    { pattern: /^\/workspace-access\/roles(?:\/|$)/, requiredContext: 'WORKSPACE_MANAGEMENT', requiredAnyPermission: ['workspace.roles.view', 'workspace.roles.manage'] },
    { pattern: /^\/academic\/curricula/, requiredAnyPermission: ['academic.curricula.view', 'academic.curricula.manage'] },
    { pattern: /^\/academic\/years/, requiredAnyPermission: ['academic.years.view', 'academic.years.manage'] },
    { pattern: /^\/academic\/terms/, requiredAnyPermission: ['academic.terms.view', 'academic.terms.manage'] },
    { pattern: /^\/academic\/subjects/, requiredAnyPermission: ['academic.subjects.view', 'academic.subjects.manage'] },
    { pattern: /^\/academic\/cohorts\/[^/]+\/students$/, requiredAnyPermission: ['learners.view', 'learners.manage'] },
    { pattern: /^\/academic\/topics/, requiredAnyPermission: ['academic.subjects.view', 'academic.subjects.manage'] },
    { pattern: /^\/academic\/progress/, requiredAnyPermission: ['reports.view'] },
    { pattern: /^\/academic(?:\/)?$/, requiredAnyPermission: ['academic.view', 'academic.curricula.view', 'academic.curricula.manage', 'academic.years.view', 'academic.years.manage', 'academic.terms.view', 'academic.terms.manage', 'academic.subjects.view', 'academic.subjects.manage', 'academic.cohorts.view', 'academic.cohorts.manage'] },
    { pattern: /^\/learners\/new$/, requiredAnyPermission: ['learners.create', 'learners.manage'] },
    { pattern: /^\/learners\/[^/]+\/edit$/, requiredAnyPermission: ['learners.manage'] },
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
    { pattern: /^\/reports\/policies(\/.*)?$/, requiredAnyPermission: ['reports.manage_policy'] },
    {
        pattern: /^\/reports\/compute(\/.*)?$/,
        requiredPermissions: ['reports.compute'],
        isAllowed: ({ capabilities }) => Boolean(
            capabilities?.report_configuration?.report_computation_available
            && !capabilities.report_configuration.report_computation_class_scoped_only
        ),
    },
    { pattern: /^\/reports\/(students|cohorts|subjects|assessments)(\/.*)?$/, requiredAnyPermission: ['reports.view'] },
    { pattern: /^\/reports/, requiredAnyPermission: ['reports.view'] },
    {
        pattern: /^\/revenue(?:\/|$)/,
        requiredAnyPermission: ['revenue.program.view'],
        isAllowed: ({ orgType }) => revenueApplicable(orgType),
    },
    { pattern: /^\/academic\/cohorts$/, requiredAnyPermission: ['academic.cohorts.view', 'academic.cohorts.manage'] },
    { pattern: /^\/academic\/cohorts\/\d+$/, requiredAnyPermission: ['academic.cohorts.view', 'academic.cohorts.manage'] },
    { pattern: /^\/academic\/cohort-subjects\/\d+\/learners$/, requiredAnyPermission: ['learners.view', 'learners.manage'] },
    { pattern: /^\/sessions/, requiredAnyPermission: ['lessons.view', 'attendance.view', 'attendance.record', 'attendance.manage'] },
    { pattern: /^\/lesson-plans/, requiredAnyPermission: ['lessons.view', 'lessons.prepare', 'lessons.manage', 'lessons.review'] },
    { pattern: /^\/announcements/, isAllowed: ({ capabilities }) => announcementsAvailable(capabilities) },
    { pattern: /^\/requests\/new$/, requiredAnyPermission: ['requests.create'] },
    { pattern: /^\/requests/, requiredAnyPermission: ['requests.view', 'requests.create', 'requests.review', 'requests.manage'] },
    { pattern: /^\/learners/, requiredAnyPermission: ['learners.view', 'learners.manage'] },
    { pattern: /^\/assessments/, requiredAnyPermission: ['assessments.view', 'assessments.create', 'assessments.manage', 'assessments.review'] },
    { pattern: /^\/profile/ },
];

export const routeRules: RouteAccessRule[] = kernelRouteRules;

export function getRouteRules(): RouteAccessRule[] {
    return [...kernelRouteRules, ...getPluginRouteAccessRules()];
}

function hasPermission(capabilities: WorkspaceCapabilities | null | undefined, key: string): boolean {
    return hasCapabilityPermission(capabilities, key);
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
    context: Pick<RouteAccessContext, 'operatingContext' | 'capabilities' | 'orgType'>,
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
    void path;
    void role;
    return false;
}

export function operatingContextHomeRoute(context: OperatingContext | null): string {
    if (context === 'MY_TEACHING') return '/dashboard/instructor';
    if (context === 'WORKSPACE_MANAGEMENT') return '/dashboard/admin';
    return '/dashboard';
}

export function getUnauthorizedRouteFallback(context: OperatingContext | null, path: string): string {
    if (context === 'MY_TEACHING' && path.startsWith('/reports')) {
        return '/reports/instructor';
    }
    return operatingContextHomeRoute(context);
}

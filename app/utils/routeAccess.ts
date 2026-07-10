// app/utils/routeAccess.ts

import { getPluginRouteAccessRules, type RouteAccessRole, type RouteAccessRule } from './pluginRouteAccess';

type Role = RouteAccessRole;
type RouteRule = RouteAccessRule;

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

const kernelRouteRules: RouteRule[] = [
    // ADMIN ONLY
    { pattern: /^\/dashboard\/admin/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/admin/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/academic\/curricula/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/academic\/years/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/academic\/terms/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/academic\/subjects/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/academic\/cohorts\/[^/]+\/students$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/academic\/topics$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/academic\/topics\/new/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/academic\/topics\/\d+\/edit/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/academic\/topics\/browser/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/academic\/progress/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/learners\/new$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/learners\/[^/]+\/edit$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/assessments\/new$/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/assessments\/[^/]+\/edit$/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/reports\/instructor(?:\/|$)/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/reports\/learners\/[^/]+\/subject$/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/reports\/learners\/[^/]+\/assessments$/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/reports\/learners\/[^/]+\/overview$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/reports\/instructors(?:\/|$)/, allowedRoles: ['ADMIN'] },
    {
        pattern: /^\/reports\/attendance$/,
        allowedRoles: ['ADMIN', 'INSTRUCTOR'],
        isAllowed: ({ role, url }) => (
            role !== 'INSTRUCTOR'
            || isScopedInstructorAttendanceReport(`${url.pathname}${url.search}`)
        ),
    },
    { pattern: /^\/reports$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/reports\/(students|cohorts|subjects|assessments|policies|compute)(\/.*)?$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/reports\/grade-policies(\/.*)?$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/reports/, allowedRoles: ['ADMIN'] },

    // INSTRUCTOR ONLY
    { pattern: /^\/dashboard\/instructor/, allowedRoles: ['INSTRUCTOR'] },

    // ADMIN + INSTRUCTOR
    { pattern: /^\/academic\/cohorts$/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/academic\/cohorts\/\d+$/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/academic\/cohort-subjects\/\d+\/learners$/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/sessions/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/lesson-plans/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/learners/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/assessments/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/profile/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
];

export const routeRules: RouteRule[] = kernelRouteRules;

export function getRouteRules(): RouteRule[] {
    return [...kernelRouteRules, ...getPluginRouteAccessRules()];
}

export function routeAllowedForRole(path: string, role: Role): boolean {
    const url = new URL(path, 'https://scholaroscope.local');
    const matchedRule = getRouteRules().find((rule) => rule.pattern.test(url.pathname));
    if (!matchedRule) {
        return true;
    }
    if (!matchedRule.allowedRoles.includes(role)) {
        return false;
    }
    return matchedRule.isAllowed?.({ role, pathname: url.pathname, url }) ?? true;
}

export const roleHomeRoute: Record<Role, string> = {
    ADMIN: '/dashboard/admin',
    INSTRUCTOR: '/dashboard/instructor',
};

export function getUnauthorizedRouteFallback(
    role: Role,
    path: string,
): string {
    if (role === 'INSTRUCTOR' && path.startsWith('/reports')) {
        return '/reports/instructor';
    }
    return roleHomeRoute[role];
}

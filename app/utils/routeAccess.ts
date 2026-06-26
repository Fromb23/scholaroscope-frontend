// app/utils/routeAccess.ts

import { getPluginRouteAccessRules, type RouteAccessRole, type RouteAccessRule } from './pluginRouteAccess';

type Role = RouteAccessRole;
type RouteRule = RouteAccessRule;

const kernelRouteRules: RouteRule[] = [
    // SUPERADMIN ONLY
    { pattern: /^\/superadmin/, allowedRoles: ['SUPERADMIN'] },
    { pattern: /^\/dashboard\/superadmin/, allowedRoles: ['SUPERADMIN'] },

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
    { pattern: /^\/assessments\/new$/, allowedRoles: ['SUPERADMIN', 'ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/assessments\/[^/]+\/edit$/, allowedRoles: ['SUPERADMIN', 'ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/reports\/instructor(?:\/|$)/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/reports\/learners\/[^/]+\/subject$/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/reports\/learners\/[^/]+\/overview$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/reports\/instructors(?:\/|$)/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/reports$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/reports\/(students|cohorts|subjects|assessments|attendance|policies|compute)(\/.*)?$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/reports\/grade-policies(\/.*)?$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/reports/, allowedRoles: ['ADMIN'] },

    // INSTRUCTOR ONLY
    { pattern: /^\/dashboard\/instructor/, allowedRoles: ['INSTRUCTOR'] },

    // ADMIN + INSTRUCTOR
    { pattern: /^\/academic\/cohorts$/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/academic\/cohorts\/\d+$/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/academic\/cohort-subjects\/\d+\/learners$/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/sessions/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/lesson-plans/, allowedRoles: ['SUPERADMIN', 'ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/learners/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/assessments/, allowedRoles: ['SUPERADMIN', 'ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/profile/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
];

export const routeRules: RouteRule[] = kernelRouteRules;

export function getRouteRules(): RouteRule[] {
    return [...kernelRouteRules, ...getPluginRouteAccessRules()];
}

const platformContextBlockedPatterns: RegExp[] = [
    /^\/dashboard\/admin/,
    /^\/dashboard\/instructor/,
    /^\/admin/,
    /^\/academic/,
    /^\/learners/,
    /^\/sessions/,
    /^\/lesson-plans/,
    /^\/schemes/,
    /^\/assessments/,
    /^\/reports/,
    /^\/cbc/,
];

export function isPlatformSuperadminBlockedPath(path: string): boolean {
    return platformContextBlockedPatterns.some((pattern) => pattern.test(path));
}

export const roleHomeRoute: Record<Role, string> = {
    SUPERADMIN: '/dashboard/superadmin',
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

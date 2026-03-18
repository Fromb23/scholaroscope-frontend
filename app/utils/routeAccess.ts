// app/utils/routeAccess.ts
import { Role } from '@/app/core/types/auth';

type RouteRule = {
    pattern: RegExp;
    allowedRoles: Role[];
};

export const routeRules: RouteRule[] = [
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
    { pattern: /^\/academic\/cohorts/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/academic\/topics$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/academic\/topics\/new/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/academic\/topics\/\d+\/edit/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/learners\/new$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/learners\/[^/]+\/edit$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/assessments\/new$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/assessments\/[^/]+\/edit$/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/cbc\/authoring/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/reports/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/projects/, allowedRoles: ['ADMIN'] },
    { pattern: /^\/schemes/, allowedRoles: ['ADMIN'] },

    // INSTRUCTOR ONLY
    { pattern: /^\/dashboard\/instructor/, allowedRoles: ['INSTRUCTOR'] },

    // ADMIN + INSTRUCTOR
    { pattern: /^\/academic\/topics\/browser/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/academic\/progress/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/sessions/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/learners/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/assessments/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/cbc\/teaching/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/cbc\/progress/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/cbc\/browser/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/announcements/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/requests/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
    { pattern: /^\/profile/, allowedRoles: ['ADMIN', 'INSTRUCTOR'] },
];

export const roleHomeRoute: Record<Role, string> = {
    SUPERADMIN: '/dashboard/superadmin',
    ADMIN: '/dashboard/admin',
    INSTRUCTOR: '/dashboard/instructor',
};
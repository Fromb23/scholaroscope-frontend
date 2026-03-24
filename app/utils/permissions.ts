// app/utils/permissions.ts
import type { Role, User } from '@/app/core/types/auth';

// ── Core role checks (take activeRole, not activeRole) ─────────────────────────

export const isSuperAdmin = (user: User | null): boolean =>
    !!user?.is_superadmin;

export const isAdmin = (activeRole: Role | null): boolean =>
    activeRole === 'ADMIN';

export const isInstructor = (activeRole: Role | null): boolean =>
    activeRole === 'INSTRUCTOR';

export const isAdminOrAbove = (user: User | null, activeRole: Role | null): boolean =>
    !!user?.is_superadmin || activeRole === 'ADMIN';

export const isAuthenticated = (user: User | null): boolean =>
    !!user;

// ── Route-level permission check ──────────────────────────────────────────────

export const hasRouteAccess = (
    user: User | null,
    activeRole: Role | null,
    allowedRoles: Role[]
): boolean => {
    if (!user) return false;
    if (user.is_superadmin) return true;
    if (!activeRole) return false;
    if (allowedRoles.includes('SUPERADMIN') && !allowedRoles.includes(activeRole)) return false;
    return allowedRoles.includes(activeRole);
};


// ── Feature-level checks ──────────────────────────────────────────────────────

export const canManageUsers = (user: User | null, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canManageCurriculum = (user: User | null, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canManageCohorts = (user: User | null, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canManageAssessments = (user: User | null, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canManagePlugins = (user: User | null, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canCreateSession = (user: User | null, activeRole: Role | null): boolean =>
    activeRole === 'INSTRUCTOR' || isAdminOrAbove(user, activeRole);

export const canMarkAttendance = (user: User | null, activeRole: Role | null): boolean =>
    activeRole === 'INSTRUCTOR' || isAdminOrAbove(user, activeRole);

export const canViewReports = (user: User | null, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canManageRequests = (user: User | null): boolean =>
    !!user;

export const canManageAnnouncements = (user: User | null, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canViewAnnouncements = (user: User | null): boolean =>
    !!user;

export const canBulkUploadStudents = (user: User | null, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canDeleteRecords = (user: User | null, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canAccessSuperAdminPanel = (user: User | null): boolean =>
    !!user?.is_superadmin;

type Capability =
    | 'EDIT_LEARNER'
    | 'CREATE_LEARNER'
    | 'MANAGE_ENROLLMENT';

export const hasCapability = (
    activeRole: Role | null,
    capability: Capability
): boolean => {
    switch (capability) {
        case 'CREATE_LEARNER':
        case 'EDIT_LEARNER':
        case 'MANAGE_ENROLLMENT':
            return activeRole === 'ADMIN';
        default:
            return false;
    }
};
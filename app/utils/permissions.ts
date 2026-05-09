// app/utils/permissions.ts

type Role = 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR';
type User = {
    is_superadmin?: boolean;
} | null;

// ── Core role checks (take activeRole, not activeRole) ─────────────────────────

export const isSuperAdmin = (user: User): boolean =>
    !!user?.is_superadmin;

export const isAdmin = (activeRole: Role | null): boolean =>
    activeRole === 'ADMIN';

export const isInstructor = (activeRole: Role | null): boolean =>
    activeRole === 'INSTRUCTOR';

export const isAdminOrAbove = (user: User, activeRole: Role | null): boolean =>
    !!user?.is_superadmin || activeRole === 'ADMIN';

export const isAuthenticated = (user: User): boolean =>
    !!user;

// ── Route-level permission check ──────────────────────────────────────────────

export const hasRouteAccess = (
    user: User,
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

export const canManageUsers = (user: User, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canManageCurriculum = (user: User, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canManageCohorts = (user: User, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canManageAssessments = (user: User, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canManagePlugins = (user: User, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canCreateSession = (user: User, activeRole: Role | null): boolean =>
    activeRole === 'INSTRUCTOR' || isAdminOrAbove(user, activeRole);

export const canMarkAttendance = (user: User, activeRole: Role | null): boolean =>
    activeRole === 'INSTRUCTOR' || isAdminOrAbove(user, activeRole);

export const canViewReports = (user: User, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canManageRequests = (user: User): boolean =>
    !!user;

export const canManageAnnouncements = (user: User, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canViewAnnouncements = (user: User): boolean =>
    !!user;

export const canBulkUploadStudents = (user: User, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canDeleteRecords = (user: User, activeRole: Role | null): boolean =>
    isAdminOrAbove(user, activeRole);

export const canAccessSuperAdminPanel = (user: User): boolean =>
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

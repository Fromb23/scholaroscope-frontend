// app/utils/permissions.ts

import type { Role, WorkspaceCapabilities } from '../core/types/auth';

type User = {
    is_superadmin?: boolean;
} | null;
type CapabilityProjection = Partial<WorkspaceCapabilities> | null;

// Deprecated compatibility predicates. They are retained for presentation-only
// legacy callers and must not be used as authorization fallbacks.

export const isAdmin = (activeRole: Role | null): boolean =>
    activeRole === 'ADMIN';

export const isInstructor = (activeRole: Role | null): boolean =>
    activeRole === 'INSTRUCTOR';

export const isAdminOrAbove = (user: User, activeRole: Role | null): boolean =>
    !!user && activeRole === 'ADMIN';

export const isAuthenticated = (user: User): boolean =>
    !!user;

// ── Route-level permission check ──────────────────────────────────────────────

export const hasRouteAccess = (
    user: User,
    activeRole: Role | null,
    allowedRoles: Role[]
): boolean => {
    if (!user) return false;
    return false;
};


// ── Feature-level checks ──────────────────────────────────────────────────────

export const canManageUsers = (
    user: User,
    activeRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => {
    if (capabilities) return Boolean(capabilities.can_manage_staff);
    return false;
};

export const canManageStaff = (
    user: User,
    activeRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => Boolean(capabilities?.can_manage_staff);

export const canManageCurriculum = (
    user: User,
    activeRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => Boolean(capabilities?.can_manage_academic_setup);

export const canManageCohorts = (
    user: User,
    activeRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => Boolean(capabilities?.can_manage_cohorts);

export const canManageAssessments = (
    user: User,
    activeRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => Boolean(capabilities?.can_manage_assessments);

export const canManagePlugins = (
    user: User,
    activeRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => Boolean(user && capabilities?.can_manage_plugins);

export const canCreateSession = (
    user: User,
    activeRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => Boolean(capabilities?.can_teach);

export const canMarkAttendance = (
    user: User,
    activeRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => Boolean(capabilities?.can_teach);

export const canViewReports = (
    user: User,
    activeRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => Boolean(capabilities?.can_view_reports);

export const canManageRequests = (user: User): boolean =>
    !!user;

export const canManageAnnouncements = (
    user: User,
    activeRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => Boolean(user && capabilities?.can_manage_announcements);

export const canViewAnnouncements = (user: User): boolean =>
    !!user;

export const canBulkUploadStudents = (
    user: User,
    activeRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => Boolean(capabilities?.can_manage_learners);

export const canDeleteRecords = (user: User, activeRole: Role | null): boolean =>
    false;

type Capability =
    | 'EDIT_LEARNER'
    | 'CREATE_LEARNER'
    | 'MANAGE_ENROLLMENT';

export const hasCapability = (
    activeRole: Role | null,
    capability: Capability,
    capabilities?: CapabilityProjection,
): boolean => {
    switch (capability) {
        case 'CREATE_LEARNER':
        case 'EDIT_LEARNER':
        case 'MANAGE_ENROLLMENT':
            return Boolean(capabilities?.can_manage_learners);
        default:
            return false;
    }
};

export function hasPermission(
    capabilities: CapabilityProjection | undefined,
    permissionKey: string,
): boolean {
    return Boolean(capabilities?.authorization?.permission_keys?.includes(permissionKey));
}

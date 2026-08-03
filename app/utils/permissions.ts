// app/utils/permissions.ts

import type { Role, WorkspaceCapabilities } from './authorityTypes';

type User = {
    is_superadmin?: boolean;
} | null;
type CapabilityProjection = Partial<WorkspaceCapabilities> | null;

// Deprecated compatibility predicates. They are retained for presentation-only
// legacy callers and must not be used as authorization fallbacks.

export const isAdmin = (_legacyRole: Role | null): boolean => {
    void _legacyRole;
    return false;
};

export const isAdminOrAbove = (_user: User, _legacyRole: Role | null): boolean => {
    void _user;
    void _legacyRole;
    return false;
};

export const isAuthenticated = (user: User): boolean =>
    !!user;

// ── Route-level permission check ──────────────────────────────────────────────

export const hasRouteAccess = (
    user: User,
    _legacyRole: Role | null,
    _legacyAllowedRoles: Role[]
): boolean => {
    void _legacyRole;
    void _legacyAllowedRoles;
    if (!user) return false;
    return false;
};


// ── Feature-level checks ──────────────────────────────────────────────────────

export const canManageUsers = (
    user: User,
    _legacyRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => {
    void user;
    void _legacyRole;
    if (capabilities) return Boolean(capabilities.can_manage_staff);
    return false;
};

export const canManageStaff = (
    user: User,
    _legacyRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => {
    void user;
    void _legacyRole;
    return Boolean(capabilities?.can_manage_staff);
};

export const canManageCurriculum = (
    user: User,
    _legacyRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => {
    void user;
    void _legacyRole;
    return Boolean(capabilities?.can_manage_academic_setup);
};

export const canManageCohorts = (
    user: User,
    _legacyRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => {
    void user;
    void _legacyRole;
    return Boolean(capabilities?.can_manage_cohorts);
};

export const canManageAssessments = (
    user: User,
    _legacyRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => {
    void user;
    void _legacyRole;
    return Boolean(capabilities?.can_manage_assessments);
};

export const canManagePlugins = (
    user: User,
    _legacyRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => {
    void _legacyRole;
    return Boolean(user && capabilities?.can_manage_plugins);
};

export const canCreateSession = (
    user: User,
    _legacyRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => {
    void user;
    void _legacyRole;
    return Boolean(capabilities?.can_teach);
};

export const canMarkAttendance = (
    user: User,
    _legacyRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => {
    void user;
    void _legacyRole;
    return Boolean(capabilities?.can_teach);
};

export const canViewReports = (
    user: User,
    _legacyRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => {
    void user;
    void _legacyRole;
    return Boolean(capabilities?.can_view_reports);
};

export const canManageRequests = (user: User): boolean =>
    !!user;

export const canManageAnnouncements = (
    user: User,
    _legacyRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => {
    void _legacyRole;
    return Boolean(user && capabilities?.can_manage_announcements);
};

export const canViewAnnouncements = (user: User): boolean =>
    !!user;

export const canBulkUploadStudents = (
    user: User,
    _legacyRole: Role | null,
    capabilities?: CapabilityProjection,
): boolean => {
    void user;
    void _legacyRole;
    return Boolean(capabilities?.can_manage_learners);
};

export const canDeleteRecords = (_user: User, _legacyRole: Role | null): boolean => {
    void _user;
    void _legacyRole;
    return false;
};

type Capability =
    | 'EDIT_LEARNER'
    | 'CREATE_LEARNER'
    | 'MANAGE_ENROLLMENT';

export const hasCapability = (
    _legacyRole: Role | null,
    capability: Capability,
    capabilities?: CapabilityProjection,
): boolean => {
    void _legacyRole;
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

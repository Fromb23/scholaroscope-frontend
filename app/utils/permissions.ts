// ============================================================================
// app/utils/permissions.ts
//
// Utility functions for role-based permission checks.
// Mirrors the backend authority model:
//   SUPERADMIN  → full platform access
//   ADMIN       → full access within their org
//   INSTRUCTOR  → read + limited write on session-linked objects
// ============================================================================

import type { Role, User } from '@/app/core/types/auth';

// ── Role checks ───────────────────────────────────────────────────────────────

export const isSuperAdmin = (user: User | null): boolean =>
    user?.role === 'SUPERADMIN';

export const isAdmin = (user: User | null): boolean =>
    user?.role === 'ADMIN';

export const isInstructor = (user: User | null): boolean =>
    user?.role === 'INSTRUCTOR';

export const isAdminOrAbove = (user: User | null): boolean =>
    user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

export const isAuthenticated = (user: User | null): boolean =>
    !!user;

// ── Route-level permission check ──────────────────────────────────────────────

/**
 * Returns true if the user's role is in the allowed roles list.
 * Used by DashboardLayout and PermissionGuard.
 */
export const hasRouteAccess = (
    user: User | null,
    allowedRoles: Role[]
): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
};

// ── Feature-level permission checks ──────────────────────────────────────────
// Granular checks used inside components to show/hide UI elements.

export const canManageUsers = (user: User | null): boolean =>
    isAdminOrAbove(user);

export const canManageCurriculum = (user: User | null): boolean =>
    isAdminOrAbove(user);

export const canManageCohorts = (user: User | null): boolean =>
    isAdminOrAbove(user);

export const canManageAssessments = (user: User | null): boolean =>
    isAdminOrAbove(user);

export const canManagePlugins = (user: User | null): boolean =>
    isAdminOrAbove(user);

export const canCreateSession = (user: User | null): boolean =>
    user?.role === 'INSTRUCTOR' || isAdminOrAbove(user);

export const canMarkAttendance = (user: User | null): boolean =>
    user?.role === 'INSTRUCTOR' || isAdminOrAbove(user);

export const canViewReports = (user: User | null): boolean =>
    isAdminOrAbove(user);

export const canManageRequests = (user: User | null): boolean =>
    !!user; // all authenticated roles

export const canManageAnnouncements = (user: User | null): boolean =>
    isAdminOrAbove(user);

export const canViewAnnouncements = (user: User | null): boolean =>
    !!user; // all authenticated roles

export const canBulkUploadStudents = (user: User | null): boolean =>
    isAdminOrAbove(user);

export const canDeleteRecords = (user: User | null): boolean =>
    isAdminOrAbove(user);

export const canAccessSuperAdminPanel = (user: User | null): boolean =>
    isSuperAdmin(user);
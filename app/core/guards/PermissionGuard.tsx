'use client';

// ============================================================================
// app/core/guards/PermissionGuard.tsx
//
// Component-level permission gate.
// Wraps any UI element and only renders it if the current user
// has the required role.
//
// Usage:
//   <PermissionGuard allowedRoles={['ADMIN', 'SUPERADMIN']}>
//     <DeleteButton />
//   </PermissionGuard>
//
//   <PermissionGuard allowedRoles={['ADMIN']} fallback={<p>No access</p>}>
//     <AdminPanel />
//   </PermissionGuard>
//
//   <PermissionGuard check={canManageCurriculum}>
//     <CurriculumEditor />
//   </PermissionGuard>
// ============================================================================

import { ReactNode } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { hasRouteAccess } from '@/app/utils/permissions';
import type { Role, User } from '@/app/core/types/auth';

interface PermissionGuardProps {
    children: ReactNode;

    // Option A: pass allowed roles directly
    allowedRoles?: Role[];

    // Option B: pass a permission function from permissions.ts
    // e.g. check={canManageCurriculum}
    check?: (user: User | null) => boolean;

    // What to render when access is denied — defaults to null (renders nothing)
    fallback?: ReactNode;
}

export function PermissionGuard({
    children,
    allowedRoles,
    check,
    fallback = null,
}: PermissionGuardProps) {
    const { user, loading } = useAuth();

    // While auth is resolving, render nothing — avoids flash of forbidden content
    if (loading) return null;

    // Evaluate access
    const allowed = check
        ? check(user)
        : allowedRoles
            ? hasRouteAccess(user, allowedRoles)
            : true; // no restriction specified — allow

    if (!allowed) return <>{fallback}</>;

    return <>{children}</>;
}
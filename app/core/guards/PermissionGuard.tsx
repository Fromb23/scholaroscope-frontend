// app/core/guards/PermissionGuard.tsx
'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { hasRouteAccess } from '@/app/utils/permissions';
import type { Role, User } from '@/app/core/types/auth';

interface PermissionGuardProps {
    children: ReactNode;
    allowedRoles?: Role[];
    check?: (user: User | null, activeRole: Role | null) => boolean;
    fallback?: ReactNode;
}

export function PermissionGuard({
    children,
    allowedRoles,
    check,
    fallback = null,
}: PermissionGuardProps) {
    const { user, activeRole, loading } = useAuth();

    if (loading) return null;

    const allowed = check
        ? check(user, activeRole)
        : allowedRoles
            ? hasRouteAccess(user, activeRole, allowedRoles)
            : true;

    if (!allowed) return <>{fallback}</>;
    return <>{children}</>;
}
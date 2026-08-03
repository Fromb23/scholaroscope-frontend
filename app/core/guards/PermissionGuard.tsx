// app/core/guards/PermissionGuard.tsx
'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { hasPermission } from '@/app/utils/permissions';
import { PermissionResolvingState } from '@/app/components/ui/loading';
import type { Role, User, WorkspaceCapabilities } from '@/app/core/types/auth';

interface PermissionGuardProps {
    children: ReactNode;
    requiredPermissions?: string[];
    requiredAnyPermission?: string[];
    requiredCapability?: keyof WorkspaceCapabilities;
    check?: (context: {
        user: User | null;
        capabilities: WorkspaceCapabilities;
    }) => boolean;
    /** @deprecated Legacy persona roles never grant access. */
    allowedRoles?: Role[];
    fallback?: ReactNode;
}

export function PermissionGuard({
    children,
    requiredPermissions,
    requiredAnyPermission,
    requiredCapability,
    allowedRoles,
    check,
    fallback = null,
}: PermissionGuardProps) {
    const { user, capabilities, loading } = useAuth();

    if (loading) return <PermissionResolvingState message="Checking your access..." />;

    const allowed = Boolean(user)
        && (check?.({ user, capabilities }) ?? true)
        && (requiredCapability ? Boolean(capabilities[requiredCapability]) : true)
        && (requiredPermissions?.every((key) => hasPermission(capabilities, key)) ?? true)
        && (requiredAnyPermission?.some((key) => hasPermission(capabilities, key)) ?? true)
        && !allowedRoles;

    if (!allowed) return <>{fallback}</>;
    return <>{children}</>;
}

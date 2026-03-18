// app/core/guards/TenantGuard.tsx
'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/app/context/AuthContext';

interface TenantGuardProps {
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * Blocks rendering until the user has a resolved org context.
 * Superadmins bypass — they operate platform-wide without an org.
 * Regular users must have an activeOrg before seeing tenant-scoped UI.
 */
export function TenantGuard({ children, fallback = null }: TenantGuardProps) {
    const { user, activeOrg, loading } = useAuth();

    if (loading) return null;
    if (!user) return null;

    // Superadmin — no org required
    if (user.is_superadmin) return <>{children}</>;

    // Regular user — must have active org
    if (!activeOrg) return <>{fallback}</>;

    return <>{children}</>;
}
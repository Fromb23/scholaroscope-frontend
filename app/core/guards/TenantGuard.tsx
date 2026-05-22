// app/core/guards/TenantGuard.tsx
'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { buildLoginPath, getCurrentPath } from '@/app/core/auth/navigation';

interface TenantGuardProps {
    children: ReactNode;
}

/**
 * Blocks rendering until the user has a resolved org context.
 * Superadmins bypass — they operate platform-wide without an org.
 * Regular users must have an activeOrg before seeing tenant-scoped UI.
 */
export function TenantGuard({ children }: TenantGuardProps) {
    const { user, activeOrg, loading } = useAuth();
    const router = useRouter();

    if (loading) return null;
    if (!user) {
        router.replace(buildLoginPath(getCurrentPath()));
        return null;
    }
    if (user.is_superadmin) return <>{children}</>;

    if (!activeOrg) {
        router.replace('/register?mode=new_workspace&reason=suspended');
        return null;
    }

    return <>{children}</>;
}

// app/core/guards/AuthGuard.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { buildLoginPath, getCurrentPath } from '@/app/core/auth/navigation';

interface AuthGuardProps {
    children: ReactNode;
}

/**
 * First gate in the guard chain.
 * Blocks all unauthenticated access and redirects to login.
 * Must wrap TenantGuard which must wrap PermissionGuard.
 */
export function AuthGuard({ children }: AuthGuardProps) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace(buildLoginPath(getCurrentPath()));
        }
    }, [loading, router, user]);

    if (loading) return null;
    if (!user) return null;

    return <>{children}</>;
}

// app/core/guards/AuthGuard.tsx
'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

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
            router.replace('/login');
        }
    }, [loading, user, router]);

    if (loading) return null;
    if (!user) return null;

    return <>{children}</>;
}
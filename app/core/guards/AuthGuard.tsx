// app/core/guards/AuthGuard.tsx
'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { buildLoginPath, getCurrentPath } from '@/app/core/auth/navigation';
import { PermissionResolvingState } from '@/app/components/ui/loading';

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
    const redirectedToRef = useRef<string | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            const destination = buildLoginPath(getCurrentPath());
            if (redirectedToRef.current !== destination) {
                redirectedToRef.current = destination;
                router.replace(destination);
            }
        } else if (user) {
            redirectedToRef.current = null;
        }
    }, [loading, router, user]);

    if (loading) return <PermissionResolvingState message="Restoring your session..." />;
    if (!user) return <PermissionResolvingState message="Redirecting to sign in..." />;

    return <>{children}</>;
}

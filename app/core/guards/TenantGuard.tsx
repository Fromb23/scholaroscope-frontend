// app/core/guards/TenantGuard.tsx
'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { buildLoginPath, getCurrentPath } from '@/app/core/auth/navigation';
import { redirectToPlatformConsole } from '@/app/core/auth/platformRedirect';
import { PermissionResolvingState } from '@/app/components/ui/loading';

interface TenantGuardProps {
    children: ReactNode;
}

/**
 * Blocks rendering until the user has a resolved workspace context.
 */
export function TenantGuard({ children }: TenantGuardProps) {
    const { user, activeOrg, loading } = useAuth();
    const router = useRouter();
    const redirectedToRef = useRef<string | null>(null);

    useEffect(() => {
        if (loading) return;
        if (!user) {
            const destination = buildLoginPath(getCurrentPath());
            if (redirectedToRef.current !== destination) {
                redirectedToRef.current = destination;
                router.replace(destination);
            }
            return;
        }
        redirectedToRef.current = null;
        if (user.is_superadmin) redirectToPlatformConsole('/login');
    }, [loading, router, user]);

    if (loading) return <PermissionResolvingState message="Restoring your workspace session..." />;
    if (!user) {
        return <PermissionResolvingState message="Redirecting to sign in..." />;
    }
    if (user.is_superadmin) {
        return <PermissionResolvingState message="Opening platform console..." />;
    }

    if (!activeOrg) {
        return (
            <div role="alert" className="theme-card rounded-lg border p-6">
                <h1 className="text-lg font-semibold theme-text">Workspace unavailable</h1>
                <p className="mt-2 text-sm theme-text-muted">
                    Your session is valid, but an active workspace could not be resolved.
                </p>
                <a className="mt-4 inline-flex text-sm font-medium text-blue-700" href="/get-started?reason=suspended">
                    Choose or recover a workspace
                </a>
            </div>
        );
    }

    return <>{children}</>;
}

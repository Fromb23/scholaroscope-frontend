'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { roleHomeRoute } from '@/app/utils/routeAccess';
import { buildLoginPath, getCurrentPath } from '@/app/core/auth/navigation';
import { PermissionResolvingState } from '@/app/components/ui/loading';

export function DashboardResolver() {
    const router = useRouter();
    const { user, activeRole, loading } = useAuth();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.replace(buildLoginPath(getCurrentPath()));
            return;
        }

        // Wait for role to resolve
        if (!user.is_superadmin && activeRole === null) return;

        const destination = user.is_superadmin
            ? roleHomeRoute['SUPERADMIN']
            : activeRole
                ? roleHomeRoute[activeRole]
                : '/dashboard/admin';

        router.replace(destination);
    }, [activeRole, loading, router, user]);

    return <PermissionResolvingState fullScreen message="Preparing your dashboard route..." />;
}

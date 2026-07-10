'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { roleHomeRoute } from '@/app/utils/routeAccess';
import { buildLoginPath, getCurrentPath } from '@/app/core/auth/navigation';
import { redirectToPlatformConsole } from '@/app/core/auth/platformRedirect';
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

        if (user.is_superadmin) {
            redirectToPlatformConsole('/login');
            return;
        }

        if (activeRole === null) return;

        const destination = activeRole
            ? roleHomeRoute[activeRole]
            : '/dashboard/admin';

        router.replace(destination);
    }, [activeRole, loading, router, user]);

    return <PermissionResolvingState fullScreen message="Preparing your dashboard route..." />;
}

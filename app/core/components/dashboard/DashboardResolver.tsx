'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { PermissionResolvingState } from '@/app/components/ui/loading';
import { useAuth } from '@/app/context/AuthContext';
import { buildLoginPath, getCurrentPath } from '@/app/core/auth/navigation';
import { redirectToPlatformConsole } from '@/app/core/auth/platformRedirect';
import { operatingContextHomeRoute } from '@/app/utils/routeAccess';

export function DashboardResolver() {
    const router = useRouter();
    const { user, activeOperatingContext, loading } = useAuth();

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
        router.replace(operatingContextHomeRoute(activeOperatingContext));
    }, [activeOperatingContext, loading, router, user]);

    return <PermissionResolvingState fullScreen message="Preparing your dashboard route..." />;
}

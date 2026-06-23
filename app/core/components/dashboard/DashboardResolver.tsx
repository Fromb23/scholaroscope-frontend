'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { roleHomeRoute } from '@/app/utils/routeAccess';
import { buildLoginPath, getCurrentPath } from '@/app/core/auth/navigation';

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

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
                <p className="mt-4 theme-muted">Redirecting to your dashboard...</p>
            </div>
        </div>
    );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

export default function DashboardResolver() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push('/auth/login');
            return;
        }

        // Redirect to role-specific dashboard
        switch (user.role) {
            case 'SUPERADMIN':
                router.push('/dashboard/superadmin');
                break;
            case 'ADMIN':
                router.push('/dashboard/admin');
                break;
            case 'INSTRUCTOR':
                router.push('/dashboard/instructor');
                break;
            default:
                router.push('/dashboard/admin');
        }
    }, [user, loading, router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
                <p className="mt-4 text-gray-600">Redirecting to your dashboard...</p>
            </div>
        </div>
    );
}
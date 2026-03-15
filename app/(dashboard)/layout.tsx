'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { routeRules, roleHomeRoute } from '@/app/utils/routeAccess';
import Sidebar from '@/app/components/layout/Sidebar';
import Header from '@/app/components/layout/Header';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.replace('/login');
            return;
        }

        const matchedRule = routeRules.find((rule) =>
            rule.pattern.test(pathname)
        );

        const isUnauthorized =
            matchedRule &&
            !matchedRule.allowedRoles.includes(user.role);

        if (isUnauthorized) {
            const home = roleHomeRoute[user.role] ?? '/dashboard/admin';
            router.replace(home);
            return;
        }

    }, [loading, user, user?.role, pathname, router]);

    if (loading || !user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

            <div className="flex flex-1 flex-col overflow-hidden">
                <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
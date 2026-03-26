'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { routeRules, roleHomeRoute } from '@/app/utils/routeAccess';
import Sidebar from '@/app/components/layout/Sidebar';
import { SidebarProvider } from '@/app/context/SidebarContext';
import Header from '@/app/components/layout/Header';
import { AlertTriangle } from 'lucide-react';
import { SuspendedNotice } from '../core/types/auth';

function DashboardContent({ children, notice, onDismissNotice }: {
    children: React.ReactNode;
    notice: SuspendedNotice | null;
    onDismissNotice: () => void;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                {notice && <SuspendedNoticeBanner notice={notice} onDismiss={onDismissNotice} />}
                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, activeRole, loading, suspendedNotice, clearSuspendedNotice } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) return;
        if (!user) { router.replace('/login'); return; }
        if (user.is_superadmin) return;

        if (activeRole === null) {
            router.replace('/login?reason=suspended');
            return;
        }

        const matchedRule = routeRules.find(rule => rule.pattern.test(pathname));
        if (!matchedRule) return;
        if (!matchedRule.allowedRoles.includes(activeRole)) {
            router.replace(roleHomeRoute[activeRole]);
        }
    }, [loading, user, activeRole, pathname, router]);

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
        <SidebarProvider>
            <DashboardContent notice={suspendedNotice} onDismissNotice={clearSuspendedNotice}>
                {children}
            </DashboardContent>
        </SidebarProvider>
    );
}

function SuspendedNoticeBanner({ notice, onDismiss }: { notice: SuspendedNotice; onDismiss: () => void }) {
    return (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
            <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">
                        <strong>{notice.org}</strong> has been suspended.
                    </p>
                    <p className="text-xs text-yellow-700 mt-0.5">{notice.message}</p>
                </div>
                <button
                    onClick={onDismiss}
                    className="text-yellow-500 hover:text-yellow-700 text-sm font-medium"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
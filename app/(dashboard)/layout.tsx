'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { routeRules, roleHomeRoute } from '@/app/utils/routeAccess';
import Sidebar from '@/app/components/layout/Sidebar';
import { SidebarProvider } from '@/app/context/SidebarContext';
import Header from '@/app/components/layout/Header';
import { RegistrySlotProvider } from '@/app/core/registry/slots';
import { NavBadgeProvider } from '@/app/core/registry/navBadges';
import '@/app/plugins/cbc/registry/curriculumModalExtension';
import '@/app/plugins/cbc/registry/providerExtension';
import '@/app/plugins/announcements/registry/navBadgeExtension';
import { AlertTriangle } from 'lucide-react';
import { SuspendedNotice } from '../core/types/auth';

function DashboardContent({ children, notices, onDismissNotice }: {
    children: React.ReactNode;
    notices: SuspendedNotice[];
    onDismissNotice: () => void;
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                {notices.length > 0 && <SuspendedNoticeBanner notices={notices} onDismiss={onDismissNotice} />}
                <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, activeRole, loading, suspendedNotices, clearSuspendedNotices } = useAuth();
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
            <NavBadgeProvider>
                <RegistrySlotProvider>
                    <DashboardContent notices={suspendedNotices} onDismissNotice={clearSuspendedNotices}>
                        {children}
                    </DashboardContent>
                </RegistrySlotProvider>
            </NavBadgeProvider>
        </SidebarProvider>
    );
}

function SuspendedNoticeBanner({ notices, onDismiss }: { notices: SuspendedNotice[]; onDismiss: () => void }) {
    if (notices.length === 0) return null;
    return (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
            <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                    {notices.map((notice, i) => (
                        <p key={i} className={`text-sm text-yellow-800 ${i > 0 ? 'mt-1' : ''}`}>
                            {notice.message}
                        </p>
                    ))}
                </div>
                <button onClick={onDismiss} className="text-yellow-500 hover:text-yellow-700 text-sm font-medium">✕</button>
            </div>
        </div>
    );
}
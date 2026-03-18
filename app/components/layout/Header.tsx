// components/layout/Header.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, User, LogOut, Building2, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { roleHomeRoute } from '@/app/utils/routeAccess';

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
    const { user, activeOrg, activeRole, memberships, logout, switchOrg } = useAuth();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
    const [switching, setSwitching] = useState<number | null>(null);
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    const handleSwitchOrg = async (orgId: number) => {
        if (orgId === activeOrg?.id) {
            setOrgDropdownOpen(false);
            return;
        }
        setSwitching(orgId);
        try {
            await switchOrg(orgId);
            setOrgDropdownOpen(false);
            // activeRole is updated by switchOrg — navigate to the new role's home
            // Use a full reload so all context re-hydrates cleanly
            window.location.href = activeRole
                ? roleHomeRoute[activeRole] ?? '/dashboard'
                : '/dashboard';
        } catch (err) {
            console.error('Failed to switch org:', err);
        } finally {
            setSwitching(null);
        }
    };

    const showSwitcher = memberships.length > 1;

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
            <button
                onClick={onMenuClick}
                className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
            >
                <Menu className="h-6 w-6 text-gray-600" />
            </button>

            <div className="ml-auto flex items-center gap-3">

                {/* Workspace switcher */}
                {showSwitcher && activeOrg && (
                    <div className="relative">
                        <button
                            onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                        >
                            <Building2 className="h-4 w-4 text-gray-500" />
                            <span className="hidden max-w-[140px] truncate font-medium text-gray-700 md:block">
                                {activeOrg.name}
                            </span>
                            <ChevronDown className="h-3 w-3 text-gray-400" />
                        </button>

                        {orgDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setOrgDropdownOpen(false)}
                                />
                                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-2 shadow-xl z-20">
                                    <p className="px-4 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                        Workspaces
                                    </p>
                                    {memberships.map((m) => {
                                        const isActive = m.organization.id === activeOrg.id;
                                        const isLoading = switching === m.organization.id;
                                        return (
                                            <button
                                                key={m.organization.id}
                                                onClick={() => handleSwitchOrg(m.organization.id)}
                                                disabled={!!switching}
                                                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 disabled:opacity-60"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className={`h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-blue-100' : 'bg-gray-100'
                                                        }`}>
                                                        <Building2 className={`h-3 w-3 ${isActive ? 'text-blue-600' : 'text-gray-500'
                                                            }`} />
                                                    </div>
                                                    <div className="min-w-0 text-left">
                                                        <p className={`truncate font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'
                                                            }`}>
                                                            {m.organization.name}
                                                        </p>
                                                        <p className="text-xs text-gray-400 capitalize">
                                                            {m.role.toLowerCase()}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isLoading ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 flex-shrink-0" />
                                                ) : isActive ? (
                                                    <Check className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                                ) : null}
                                            </button>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* User dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100"
                    >
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="hidden text-left md:block">
                            <p className="text-sm font-medium text-gray-700">{user?.full_name}</p>
                            <p className="text-xs text-gray-500">{activeRole ?? '—'}</p>
                        </div>
                    </button>

                    {dropdownOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setDropdownOpen(false)}
                            />
                            <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-xl z-20">
                                <Link
                                    href="/profile"
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    <User className="h-4 w-4" />
                                    View Profile
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Logout
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
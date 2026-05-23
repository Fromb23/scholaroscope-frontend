'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, User, LogOut, Building2, ChevronDown, Check, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { roleHomeRoute } from '@/app/utils/routeAccess';
import { useSidebar } from '@/app/context/SidebarContext';
import { GlobalPeopleSearch } from '@/app/components/layout/GlobalPeopleSearch';
import { NotificationBell } from '@/app/components/layout/NotificationBell';
import { ThemeModeSelector } from '@/app/components/theme/ThemeModeSelector';

export default function Header() {
  const { user, activeOrg, activeRole, memberships, logout, switchOrg } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { toggleSidebar } = useSidebar();
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
      router.replace(activeRole ? (roleHomeRoute[activeRole] ?? '/dashboard') : '/dashboard');
    } catch (err) {
      console.error('Failed to switch org:', err);
    } finally {
      setSwitching(null);
    }
  };

  // Superadmins never see workspace controls
  const showWorkspaceControl = user && !user.is_superadmin;
  const showPeopleSearch = !!user && (user.is_superadmin || activeRole === 'ADMIN');

  return (
    <header className="theme-surface sticky top-0 z-30 flex h-16 items-center justify-between border-b theme-border px-4 lg:px-6">
      <button
        onClick={toggleSidebar}
        className="theme-focus-ring rounded-lg p-2 hover:bg-gray-100 lg:hidden"
      >
        <Menu className="h-6 w-6 theme-muted" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        {/* Workspace control — always visible for non-superadmin */}
        {showWorkspaceControl && (
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="theme-focus-ring theme-card-muted flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
            >
              <Building2 className="h-4 w-4 theme-subtle" />
              <span className="hidden max-w-[140px] truncate font-medium theme-text md:block">
                {activeOrg?.name ?? 'Select Workspace'}
              </span>
              <ChevronDown className="h-3 w-3 theme-subtle" />
            </button>

            {orgDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOrgDropdownOpen(false)} />
                <div className="theme-dropdown absolute right-0 z-20 mt-2 w-56 rounded-lg py-2">
                  <p className="theme-subtle px-4 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide">
                    Workspaces
                  </p>

                  {memberships.map((m) => {
                    const isActive = m.organization.id === activeOrg?.id;
                    const isLoading = switching === m.organization.id;
                    return (
                      <button
                        key={m.organization.id}
                        onClick={() => handleSwitchOrg(m.organization.id)}
                        disabled={!!switching}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 disabled:opacity-60"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}
                          >
                            <Building2
                              className={`h-3 w-3 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
                            />
                          </div>
                          <div className="min-w-0 text-left">
                            <p
                              className={`truncate font-medium ${isActive ? 'text-blue-700' : 'theme-text'}`}
                            >
                              {m.organization.name}
                            </p>
                            <p className="theme-subtle text-xs capitalize">
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

                  <div className="mt-1 border-t border-gray-100 pt-1">
                    <button
                      onClick={() => {
                        setOrgDropdownOpen(false);
                        router.push('/register?mode=new_workspace');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50"
                    >
                      <div className="h-6 w-6 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Plus className="h-3 w-3 text-blue-600" />
                      </div>
                      <span className="font-medium">New Workspace</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {showPeopleSearch && <GlobalPeopleSearch />}

        {/* Notification bell */}
        <NotificationBell />

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="theme-focus-ring flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-100"
          >
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium theme-text">{user?.full_name}</p>
              <p className="theme-subtle text-xs">{activeRole ?? '—'}</p>
            </div>
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="theme-dropdown absolute right-0 z-20 mt-2 w-72 rounded-xl py-2">
                <Link
                  href="/profile"
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm theme-text hover:bg-gray-100"
                >
                  <User className="h-4 w-4" />
                  View Profile
                </Link>
                <div className="border-t border-gray-100 px-4 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide theme-subtle">
                    Appearance
                  </p>
                  <ThemeModeSelector compact showResolvedTheme={false} />
                </div>
                <div className="border-t border-gray-100 pt-2">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

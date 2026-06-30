'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, User, LogOut, Building2, ChevronDown, Check, Loader2, Plus, Settings, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/app/context/ThemeContext';
import { useRouter } from 'next/navigation';
import { resolveMembershipRoleForOrganization } from '@/app/core/lib/organizationScope';
import { roleHomeRoute } from '@/app/utils/routeAccess';
import { useSidebar } from '@/app/context/SidebarContext';
import { GlobalPeopleSearch } from '@/app/components/layout/GlobalPeopleSearch';
import { NotificationBell } from '@/app/components/layout/NotificationBell';
import { themeAPI } from '@/app/core/api/theme';
import { themeModeToAppearanceMode } from '@/app/core/theme/effectiveTheme';

export default function Header() {
  const { user, activeOrg, activeRole, memberships, logout, switchOrg } = useAuth();
  const { themeMode, setThemeMode, isDark } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { toggleSidebar } = useSidebar();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState<number | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setDropdownOpen(false);
    setOrgDropdownOpen(false);

    try {
      await logout();
    } catch {
      // Local auth state must still be cleared and the user must still leave the dashboard.
    } finally {
      router.replace('/login');
    }
  };
  const handleToggleTheme = () => {
    const nextMode = themeMode === 'DARK' ? 'DEFAULT' : 'DARK';
    setThemeMode(nextMode);
    void themeAPI.updateMyThemePreference({
      appearance_mode: themeModeToAppearanceMode(nextMode),
    }).catch(() => undefined);
  };

  const handleSwitchOrg = async (orgId: number) => {
    if (orgId === activeOrg?.id) {
      setOrgDropdownOpen(false);
      return;
    }
    setSwitching(orgId);
    try {
      const response = await switchOrg(orgId);
      const nextRole = resolveMembershipRoleForOrganization(
        response.user,
        response.active_org,
        response.memberships,
      );
      setOrgDropdownOpen(false);
      router.replace(nextRole ? (roleHomeRoute[nextRole] ?? '/dashboard') : '/dashboard');
    } catch (err) {
      console.error('Failed to switch org:', err);
    } finally {
      setSwitching(null);
    }
  };

  // Superadmins never see workspace controls
  const showWorkspaceControl = user && !user.is_superadmin;
  const showPeopleSearch = !!user && (user.is_superadmin || activeRole === 'ADMIN');
  const showSettingsLink = !!user && (user.is_superadmin || activeRole === 'ADMIN');

  return (
    <header className="theme-header sticky top-0 z-30 flex h-16 items-center justify-between border-b theme-border px-4 lg:px-6">
      <button
        onClick={toggleSidebar}
        className="theme-focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-lg theme-hover-surface lg:hidden"
      >
        <Menu className="h-6 w-6 theme-muted" />
      </button>

      <div className="ml-auto flex items-center gap-3">
        {/* Workspace control — always visible for non-superadmin */}
        {showWorkspaceControl && (
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="theme-focus-ring theme-card-muted flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm theme-hover-surface"
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
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm theme-hover-surface disabled:opacity-60"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 ${isActive ? 'theme-brand-icon' : 'theme-surface-muted'}`}
                          >
                            <Building2
                              className={`h-3 w-3 ${isActive ? 'theme-icon-emphasis' : 'theme-icon-muted'}`}
                            />
                          </div>
                          <div className="min-w-0 text-left">
                            <p
                              className={`truncate font-medium ${isActive ? 'theme-link' : 'theme-text'}`}
                            >
                              {m.organization.name}
                            </p>
                            <p className="theme-subtle text-xs capitalize">
                              {m.role.toLowerCase()}
                            </p>
                          </div>
                        </div>
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin theme-icon-emphasis flex-shrink-0" />
                        ) : isActive ? (
                          <Check className="h-3.5 w-3.5 theme-icon-emphasis flex-shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}

                  <div className="mt-1 border-t theme-border pt-1">
                    <button
                      onClick={() => {
                        setOrgDropdownOpen(false);
                        router.push('/register?mode=new_workspace');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm theme-link theme-hover-surface"
                    >
                      <div className="theme-brand-icon h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0">
                        <Plus className="h-3 w-3" />
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
            className="theme-focus-ring flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 theme-hover-surface"
          >
            <div className="theme-brand-icon h-8 w-8 rounded-full flex items-center justify-center">
              <User className="h-4 w-4" />
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
                  className="flex w-full items-center gap-3 px-4 py-2 text-sm theme-text theme-hover-surface"
                >
                  <User className="h-4 w-4" />
                  View Profile
                </Link>
                {showSettingsLink ? (
                  <Link
                    href={user?.is_superadmin ? '/superadmin/settings' : '/admin/settings'}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm theme-text theme-hover-surface"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                ) : null}
                <div className="border-t theme-border pt-2">
                  <button
                    onClick={handleToggleTheme}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2 text-sm theme-text theme-hover-surface"
                  >
                    <span className="flex items-center gap-3">
                      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {isDark ? 'Scholaroscope Light' : 'Scholaroscope Dark'}
                    </span>
                    <span className="text-xs theme-subtle">{isDark ? 'On' : 'Off'}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    aria-busy={isLoggingOut}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[color:var(--color-danger)] theme-hover-danger disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoggingOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {isLoggingOut ? 'Logging out...' : 'Logout'}
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

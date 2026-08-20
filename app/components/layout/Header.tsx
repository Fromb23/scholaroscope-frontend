'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Check,
  ChevronDown,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  Sun,
  User,
} from 'lucide-react';

import { GlobalPeopleSearch } from '@/app/components/layout/GlobalPeopleSearch';
import { NotificationBell } from '@/app/components/layout/NotificationBell';
import { useAuth } from '@/app/context/AuthContext';
import { useSidebar } from '@/app/context/SidebarContext';
import { useTheme } from '@/app/context/ThemeContext';
import { themeAPI } from '@/app/core/api/theme';
import { operatingContextHomeRoute } from '@/app/utils/routeAccess';
import { themeModeToAppearanceMode } from '@/app/core/theme/effectiveTheme';
import type { OperatingContext, SwitchOrgResponse } from '@/app/core/types/auth';

function switchedWorkspaceHomeRoute(response: SwitchOrgResponse): string {
  const contexts = response.capabilities?.authorization?.operating_contexts ?? [];
  const context = (
    contexts.includes('WORKSPACE_MANAGEMENT')
      ? 'WORKSPACE_MANAGEMENT'
      : contexts.includes('MY_TEACHING')
        ? 'MY_TEACHING'
        : null
  ) as OperatingContext | null;
  return operatingContextHomeRoute(context);
}

export default function Header() {
  const {
    user,
    activeOrg,
    activeOperatingContext,
    capabilities,
    memberships,
    logout,
    loggingOut,
    switchOrg,
  } = useAuth();
  const { themeMode, setThemeMode, isDark } = useTheme();
  const { toggleSidebar } = useSidebar();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState<number | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutPending = isLoggingOut || loggingOut;

  const contextLabel = activeOperatingContext === 'MY_TEACHING'
    ? 'My teaching'
    : activeOperatingContext === 'WORKSPACE_MANAGEMENT'
      ? 'Workspace management'
      : 'Workspace';

  const handleLogout = () => {
    if (logoutPending) return;
    setIsLoggingOut(true);
    setDropdownOpen(false);
    setOrgDropdownOpen(false);
    try {
      void logout().catch(() => undefined);
    } finally {
      window.location.replace('/login');
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
      setOrgDropdownOpen(false);
      router.replace(switchedWorkspaceHomeRoute(response));
    } catch (err) {
      console.error('Failed to switch org:', err);
    } finally {
      setSwitching(null);
    }
  };

  const showWorkspaceControl = user && !user.is_superadmin;
  const showPeopleSearch = Boolean(user && capabilities.can_manage_staff);
  const permissionKeys = capabilities.authorization?.permission_keys ?? [];
  const showSettingsLink = Boolean(
    user
    && (permissionKeys.includes('workspace.settings.view') || permissionKeys.includes('workspace.settings.manage'))
  );

  return (
    <header className="theme-header sticky top-0 z-30 flex h-16 items-center justify-between border-b theme-border px-4 lg:px-6">
      <button
        onClick={toggleSidebar}
        className="theme-focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-lg theme-hover-surface lg:hidden"
      >
        <Menu className="h-6 w-6 theme-muted" />
      </button>

      <div className="ml-auto flex items-center gap-3">
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
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className={`h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 ${isActive ? 'theme-brand-icon' : 'theme-surface-muted'}`}
                          >
                            <Building2
                              className={`h-3 w-3 ${isActive ? 'theme-icon-emphasis' : 'theme-icon-muted'}`}
                            />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className={`truncate font-medium ${isActive ? 'theme-link' : 'theme-text'}`}>
                              {m.organization.name}
                            </p>
                            <p className="theme-subtle text-xs">
                              {m.role_display || m.role}
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
                        router.push('/get-started');
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm theme-link theme-hover-surface"
                    >
                      <div className="theme-brand-icon h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0">
                        <Plus className="h-3 w-3" />
                      </div>
                      <span className="font-medium">Create another workspace</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {showPeopleSearch && <GlobalPeopleSearch />}
        <NotificationBell />

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
              <p className="theme-subtle text-xs">{contextLabel}</p>
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
                    href="/admin/settings"
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
                    disabled={logoutPending}
                    aria-busy={logoutPending}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-[color:var(--color-danger)] theme-hover-danger disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {logoutPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {logoutPending ? 'Logging out...' : 'Logout'}
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

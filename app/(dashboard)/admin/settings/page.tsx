'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, Users, Puzzle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { ThemeSettingsCard } from '@/app/components/theme/ThemeSettingsCard';
import { MembersTab, PluginsTab } from '@/app/core/components/settings/SettingsComponents';
import { useAuth } from '@/app/context/AuthContext';

type Tab = 'general' | 'members' | 'plugins';

function GeneralTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold theme-text">General settings</h2>
        <p className="mt-1 text-sm theme-muted">Brand theme and appearance preferences for this workspace.</p>
      </div>
      <ThemeSettingsCard />
    </div>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrg, activeRole, capabilities, loading, user } = useAuth();
  const canManageSettings = Boolean(user?.is_superadmin || activeRole === 'ADMIN');
  const isFreelance = activeOrg?.org_type === 'PERSONAL'
    || capabilities.workspace_behavior === 'FREELANCE_TEACHER';

  const tabParam = searchParams.get('tab') as Tab;
  const availableTabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'general', label: 'General', icon: Settings },
    ...(!isFreelance ? [{ key: 'members' as const, label: 'Members', icon: Users }] : []),
    { key: 'plugins', label: 'Plugins', icon: Puzzle },
  ];
  const validTabs = availableTabs.map((tab) => tab.key);
  const activeTab: Tab = validTabs.includes(tabParam)
    ? tabParam
    : (searchParams.get('plugin') ? 'plugins' : 'general');
  const cameFromCurricula = searchParams.get('from') === 'curricula';

  if (loading) {
    return <div className="p-6 text-sm theme-subtle">Loading settings...</div>;
  }

  if (!canManageSettings) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <Card className="space-y-4 p-6 text-center">
          <h1 className="text-xl font-semibold theme-text">You do not have permission to manage organization settings.</h1>
          <p className="text-sm theme-muted">Organization settings are available to workspace administrators.</p>
          <div className="flex justify-center gap-2">
            <Link href={activeRole === 'INSTRUCTOR' ? '/profile' : '/dashboard'}>
              <Button type="button" variant="secondary">
                Back to {activeRole === 'INSTRUCTOR' ? 'Profile' : 'Dashboard'}
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold theme-text">Settings</h1>
          <p className="theme-muted mt-1 text-sm">
            {isFreelance
              ? 'Manage my teaching workspace configuration'
              : 'Manage your workspace configuration and team'}
          </p>
        </div>

        {activeTab === 'plugins' ? (
          <Link href="/academic/curricula">
            <Button variant={cameFromCurricula ? 'secondary' : 'ghost'} size="sm">
              <ArrowLeft className="h-4 w-4" />
              Back to Curricula
            </Button>
          </Link>
        ) : null}
      </div>

      <div className="theme-card-muted flex min-w-0 gap-1 overflow-x-auto rounded-xl p-1.5">
        {availableTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex min-w-[4.5rem] flex-none items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors sm:min-w-0 sm:flex-1 ${
                activeTab === tab.key
                  ? 'theme-surface theme-text shadow-sm'
                  : 'theme-muted hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'general' ? (
        <GeneralTab />
      ) : (
        <Card className="min-w-0 overflow-hidden p-4 sm:p-6">
          {activeTab === 'members' && !isFreelance && <MembersTab />}
          {activeTab === 'plugins' && <PluginsTab />}
        </Card>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm theme-subtle">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

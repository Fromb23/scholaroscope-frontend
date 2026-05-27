'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Settings, Users, Puzzle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { AppearanceSettingsCard } from '@/app/components/theme/AppearanceSettingsCard';
import { MembersTab, PluginsTab } from '@/app/core/components/settings/SettingsComponents';

type Tab = 'general' | 'members' | 'plugins';

const VALID_TABS: Tab[] = ['general', 'members', 'plugins'];

function GeneralTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold theme-text">General settings</h2>
        <p className="mt-1 text-sm theme-muted">Local browser preferences for this workspace.</p>
      </div>
      <AppearanceSettingsCard />
    </div>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get('tab') as Tab;
  const activeTab: Tab = VALID_TABS.includes(tabParam)
    ? tabParam
    : (searchParams.get('plugin') ? 'plugins' : 'general');
  const cameFromCurricula = searchParams.get('from') === 'curricula';

  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'general', label: 'General', icon: Settings },
    { key: 'members', label: 'Members', icon: Users },
    { key: 'plugins', label: 'Plugins', icon: Puzzle },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold theme-text">Settings</h1>
          <p className="theme-muted mt-1 text-sm">Manage your workspace configuration and team</p>
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

      <div className="theme-card-muted flex gap-1 rounded-xl p-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${
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
        <Card>
          {activeTab === 'members' && <MembersTab />}
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

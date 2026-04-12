'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Settings, Users, Puzzle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { MembersTab, PluginsTab } from '@/app/core/components/settings/SettingsComponents';

type Tab = 'general' | 'members' | 'plugins';

const VALID_TABS: Tab[] = ['general', 'members', 'plugins'];

function GeneralTab() {
    return (
        <div className="py-12 text-center text-gray-400">
            <Settings className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">General settings coming soon.</p>
        </div>
    );
}

function SettingsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const tabParam = searchParams.get('tab') as Tab;
    const activeTab: Tab = VALID_TABS.includes(tabParam) ? tabParam : 'members';

    const setActiveTab = (tab: Tab) => {
        router.replace(`?tab=${tab}`, { scroll: false });
    };

    const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
        { key: 'general', label: 'General', icon: Settings },
        { key: 'members', label: 'Members', icon: Users },
        { key: 'plugins', label: 'Plugins', icon: Puzzle },
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500 mt-1 text-sm">Manage your workspace configuration and team</p>
            </div>

            <div className="flex gap-1 bg-gray-100 rounded-xl p-1.5">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.key
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            <Card>
                {activeTab === 'general' && <GeneralTab />}
                {activeTab === 'members' && <MembersTab />}
                {activeTab === 'plugins' && <PluginsTab />}
            </Card>
        </div>
    );
}

export default function AdminSettingsPage() {
    return (
        <Suspense fallback={<div className="p-6 text-sm text-gray-400">Loading...</div>}>
            <SettingsContent />
        </Suspense>
    );
}
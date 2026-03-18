'use client';

// ============================================================================
// app/(dashboard)/admin/settings/page.tsx
//
// Responsibility: tab state, compose tab components, render.
// No inline component definitions. No data fetching.
// ============================================================================

import { useState } from 'react';
import { Settings, Users, Puzzle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { MembersTab, PluginsTab } from '@/app/core/components/settings/SettingsComponents';

type Tab = 'general' | 'members' | 'plugins';

function GeneralTab() {
    return (
        <div className="py-12 text-center text-gray-400">
            <Settings className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">General settings coming soon.</p>
        </div>
    );
}

export default function AdminSettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>('members');

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
                            {tab.label}
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
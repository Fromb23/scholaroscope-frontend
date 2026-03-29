'use client';

import { useState, useMemo } from 'react';
import { Puzzle, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { usePlatformPlugins, usePluginInstallations } from '@/app/core/hooks/useSuperAdminPlugins';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Card } from '@/app/components/ui/Card';
import {
    PluginStatsBar, PluginTableRow,
    PluginDetailModal, InstallationsModal,
} from '@/app/core/components/superadmin/PluginComponents';
import type { Plugin } from '@/app/core/types/plugins';

export default function PluginsPage() {
    const {
        plugins, loading, error, refetch,
        toggleAvailability, syncManifest,
    } = usePlatformPlugins();

    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [availableFilter, setAvailableFilter] = useState('all');

    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [syncingId, setSyncingId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const [detailPlugin, setDetailPlugin] = useState<Plugin | null>(null);
    const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
    const [installationsOpen, setInstallationsOpen] = useState(false);

    const { installations, loading: installationsLoading } = usePluginInstallations(
        installationsOpen ? selectedPlugin?.id ?? null : null
    );

    const showSuccess = (msg: string) => {
        setActionSuccess(msg);
        setTimeout(() => setActionSuccess(null), 3000);
    };

    const filtered = useMemo(() => plugins.filter(p => {
        const q = search.toLowerCase();
        return (
            (!search || p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)) &&
            (sourceFilter === 'all' || p.source === sourceFilter) &&
            (availableFilter === 'all' ||
                (availableFilter === 'available' && p.is_available) ||
                (availableFilter === 'unavailable' && !p.is_available)
            )
        );
    }), [plugins, search, sourceFilter, availableFilter]);

    const handleToggle = async (plugin: Plugin) => {
        setTogglingId(plugin.id);
        setActionError(null);
        try {
            const res = await toggleAvailability(plugin.id);
            showSuccess(res.message);
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to toggle');
        } finally {
            setTogglingId(null);
        }
    };

    const handleSync = async (plugin: Plugin) => {
        setSyncingId(plugin.id);
        setActionError(null);
        try {
            await syncManifest(plugin.id);
            showSuccess(`${plugin.name} manifest synced`);
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Failed to sync');
        } finally {
            setSyncingId(null);
        }
    };

    const handleViewInstallations = (plugin: Plugin) => {
        setSelectedPlugin(plugin);
        setInstallationsOpen(true);
    };

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorState message={error} onRetry={refetch} />;

    return (
        <div className="space-y-6">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Plugin Registry</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Platform-level plugin catalogue — {plugins.length} plugins registered
                </p>
            </div>

            {/* Stats */}
            <PluginStatsBar plugins={plugins} />

            {/* Feedback */}
            {actionError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {actionError}
                    <button onClick={() => setActionError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
                </div>
            )}
            {actionSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    <CheckCircle className="h-4 w-4 shrink-0" />{actionSuccess}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or key..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <select
                    value={sourceFilter}
                    onChange={e => setSourceFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="all">All Sources</option>
                    <option value="core">Core</option>
                    <option value="third_party">Third Party</option>
                </select>
                <select
                    value={availableFilter}
                    onChange={e => setAvailableFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="all">All Availability</option>
                    <option value="available">Available</option>
                    <option value="unavailable">Disabled</option>
                </select>
            </div>

            {/* Table */}
            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                {['Plugin', 'Source', 'Version', 'Availability', 'Type', 'Manifest', 'Actions'].map(h => (
                                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <Puzzle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm text-gray-500">
                                            {search || sourceFilter !== 'all' || availableFilter !== 'all'
                                                ? 'No plugins match your filters'
                                                : 'No plugins registered yet'
                                            }
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(plugin => (
                                    <PluginTableRow
                                        key={plugin.id}
                                        plugin={plugin}
                                        onToggle={handleToggle}
                                        onSync={handleSync}
                                        onView={setDetailPlugin}
                                        onViewInstallations={handleViewInstallations}
                                        toggling={togglingId === plugin.id}
                                        syncing={syncingId === plugin.id}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {filtered.length > 0 && (
                    <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-500">
                            Showing {filtered.length} of {plugins.length} plugin{plugins.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                )}
            </Card>

            {/* Modals */}
            <PluginDetailModal
                plugin={detailPlugin}
                isOpen={!!detailPlugin}
                onClose={() => setDetailPlugin(null)}
                onToggle={handleToggle}
                onSync={handleSync}
                toggling={togglingId === detailPlugin?.id}
                syncing={syncingId === detailPlugin?.id}
            />

            <InstallationsModal
                plugin={selectedPlugin}
                installations={installations}
                loading={installationsLoading}
                isOpen={installationsOpen}
                onClose={() => { setInstallationsOpen(false); setSelectedPlugin(null); }}
            />

        </div>
    );
}
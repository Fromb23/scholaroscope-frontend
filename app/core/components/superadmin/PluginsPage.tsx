'use client';

import { Puzzle, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { LoadingSpinner } from '@/app/components/ui/LoadingSpinner';
import { ErrorState } from '@/app/components/ui/ErrorState';
import { Card } from '@/app/components/ui/Card';
import {
    PluginStatsBar, PluginTableRow,
    PluginDetailModal, InstallationsModal,
    UninstallConfirmModal,
} from '@/app/core/components/superadmin/PluginComponents';
import { usePluginsPage } from '@/app/core/hooks/superadmin/usePluginsPage';

export function PluginsPage() {
    const {
        plugins,
        loading,
        error,
        refetch,
        search,
        sourceFilter,
        statusFilter,
        actingId,
        syncingId,
        actionError,
        actionSuccess,
        detailPlugin,
        selectedPlugin,
        installationsOpen,
        impactData,
        confirmOpen,
        confirming,
        installations,
        installationsLoading,
        filtered,
        setSearch,
        setSourceFilter,
        setStatusFilter,
        setActionError,
        setDetailPlugin,
        handleSync,
        handleInstallGlobally,
        handleUninstallGlobally,
        handleConfirmUninstall,
        handleViewInstallations,
        closeInstallations,
        closeConfirm,
    } = usePluginsPage();

    if (loading) return <LoadingSpinner message="Loading plugin registry..." />;
    if (error) return <ErrorState message={error} onRetry={refetch} />;

    return (
        <div className="space-y-6">

            <div>
                <h1 className="text-2xl font-bold text-gray-900">Plugin Registry</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Install plugins globally — all org admins see installed plugins and choose to enable them
                </p>
            </div>

            <PluginStatsBar plugins={plugins} />

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
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    <option value="all">All Status</option>
                    <option value="installed">Installed</option>
                    <option value="not_installed">Not Installed</option>
                </select>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                {['Plugin', 'Source', 'Version', 'Status', 'Type', 'Manifest', 'Actions'].map(h => (
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
                                            {search || sourceFilter !== 'all' || statusFilter !== 'all'
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
                                        onView={setDetailPlugin}
                                        onViewInstallations={handleViewInstallations}
                                        onSync={handleSync}
                                        onInstallGlobally={handleInstallGlobally}
                                        onUninstallGlobally={handleUninstallGlobally}
                                        syncing={syncingId === plugin.id}
                                        acting={actingId === plugin.id}
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

            <PluginDetailModal
                plugin={detailPlugin}
                isOpen={!!detailPlugin}
                onClose={() => setDetailPlugin(null)}
                onSync={handleSync}
                onInstallGlobally={handleInstallGlobally}
                onUninstallGlobally={handleUninstallGlobally}
                syncing={syncingId === detailPlugin?.id}
                acting={actingId === detailPlugin?.id}
            />

            <InstallationsModal
                plugin={selectedPlugin}
                installations={installations}
                loading={installationsLoading}
                isOpen={installationsOpen}
                onClose={closeInstallations}
            />

            <UninstallConfirmModal
                impact={impactData}
                isOpen={confirmOpen}
                onClose={closeConfirm}
                onConfirm={handleConfirmUninstall}
                confirming={confirming}
            />

        </div>
    );
}

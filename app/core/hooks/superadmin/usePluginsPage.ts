'use client';

import { useMemo, useState } from 'react';
import { pluginAPI } from '@/app/core/api/plugins';
import { usePlatformPlugins, usePluginInstallations } from '@/app/core/hooks/useSuperAdminPlugins';
import type { Plugin, UninstallImpact } from '@/app/core/types/plugins';

export function usePluginsPage() {
    const {
        plugins,
        loading,
        error,
        refetch,
        syncManifest,
        installGlobally,
        uninstallGlobally,
    } = usePlatformPlugins();

    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const [actingId, setActingId] = useState<number | null>(null);
    const [syncingId, setSyncingId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const [detailPlugin, setDetailPlugin] = useState<Plugin | null>(null);
    const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
    const [installationsOpen, setInstallationsOpen] = useState(false);
    const [impactData, setImpactData] = useState<UninstallImpact | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [pendingPlugin, setPendingPlugin] = useState<Plugin | null>(null);

    const { installations, loading: installationsLoading } = usePluginInstallations(
        installationsOpen ? selectedPlugin?.id ?? null : null
    );

    const filtered = useMemo(() => {
        const query = search.toLowerCase();

        return plugins.filter((plugin) => (
            (!search
                || plugin.name.toLowerCase().includes(query)
                || plugin.key.toLowerCase().includes(query))
            && (sourceFilter === 'all' || plugin.source === sourceFilter)
            && (
                statusFilter === 'all'
                || (statusFilter === 'installed' && plugin.is_available)
                || (statusFilter === 'not_installed' && !plugin.is_available)
            )
        ));
    }, [plugins, search, sourceFilter, statusFilter]);

    const showSuccess = (message: string) => {
        setActionSuccess(message);
        setTimeout(() => setActionSuccess(null), 3000);
    };

    const handleSync = async (plugin: Plugin) => {
        setSyncingId(plugin.id);
        setActionError(null);
        try {
            await syncManifest(plugin.id);
            showSuccess(`${plugin.name} manifest synced`);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Sync failed');
        } finally {
            setSyncingId(null);
        }
    };

    const handleInstallGlobally = async (plugin: Plugin) => {
        setActingId(plugin.id);
        setActionError(null);
        try {
            const response = await installGlobally(plugin.id);
            showSuccess(response.message);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Install failed');
        } finally {
            setActingId(null);
        }
    };

    const handleUninstallGlobally = async (plugin: Plugin) => {
        setActingId(plugin.id);
        setActionError(null);
        try {
            const impact = await pluginAPI.getUninstallImpact(plugin.id);
            setImpactData(impact);
            setPendingPlugin(plugin);
            setConfirmOpen(true);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Failed to fetch impact');
        } finally {
            setActingId(null);
        }
    };

    const handleConfirmUninstall = async () => {
        if (!pendingPlugin) return;

        setConfirming(true);
        try {
            const response = await uninstallGlobally(pendingPlugin.id);
            showSuccess(response.message);
            setConfirmOpen(false);
            setPendingPlugin(null);
            setImpactData(null);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Uninstall failed');
        } finally {
            setConfirming(false);
        }
    };

    const handleViewInstallations = (plugin: Plugin) => {
        setSelectedPlugin(plugin);
        setInstallationsOpen(true);
    };

    const closeInstallations = () => {
        setInstallationsOpen(false);
        setSelectedPlugin(null);
    };

    const closeConfirm = () => {
        setConfirmOpen(false);
        setPendingPlugin(null);
        setImpactData(null);
    };

    return {
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
    };
}

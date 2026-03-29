// ============================================================================
// app/core/hooks/useSuperAdminPlugins.ts
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { pluginAPI } from '@/app/core/api/plugins';
import type { Plugin, InstalledPlugin } from '@/app/core/types/plugins';

export const usePlatformPlugins = () => {
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPlugins = useCallback(async () => {
        try {
            setLoading(true);
            const data = await pluginAPI.getAll();
            setPlugins(data);
            setError(null);
        } catch (err: unknown) {
            const e = err as { message?: string };
            setError(e.message || 'Failed to fetch plugins');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchPlugins(); }, [fetchPlugins]);

    const toggleAvailability = async (id: number) => {
        try {
            const res = await pluginAPI.toggleAvailability(id);
            setPlugins(prev => prev.map(p =>
                p.id === id ? { ...p, is_available: res.is_available } : p
            ));
            return res;
        } catch (err: unknown) {
            const e = err as { response?: { data?: { detail?: string } } };
            throw new Error(e.response?.data?.detail || 'Failed to toggle availability');
        }
    };

    const syncManifest = async (id: number) => {
        try {
            const updated = await pluginAPI.syncManifest(id);
            setPlugins(prev => prev.map(p => p.id === id ? updated : p));
            return updated;
        } catch (err: unknown) {
            const e = err as { response?: { data?: { detail?: string } } };
            throw new Error(e.response?.data?.detail || 'Failed to sync manifest');
        }
    };

    return { plugins, loading, error, refetch: fetchPlugins, toggleAvailability, syncManifest };
};

export const usePluginInstallations = (pluginId: number | null) => {
    const [installations, setInstallations] = useState<InstalledPlugin[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchInstallations = useCallback(async () => {
        if (!pluginId) return;
        try {
            setLoading(true);
            const data = await pluginAPI.getInstallations(pluginId);
            setInstallations(data);
            setError(null);
        } catch (err: unknown) {
            const e = err as { message?: string };
            setError(e.message || 'Failed to fetch installations');
        } finally {
            setLoading(false);
        }
    }, [pluginId]);

    useEffect(() => { fetchInstallations(); }, [fetchInstallations]);

    return { installations, loading, error, refetch: fetchInstallations };
};
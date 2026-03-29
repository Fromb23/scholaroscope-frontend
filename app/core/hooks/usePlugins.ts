// ============================================================================
// app/core/hooks/usePlugins.ts
//
// Fetches org's installed plugins and exposes hasPlugin(key) helper.
// Used by Sidebar to conditionally render plugin nav sections.
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { pluginAPI } from '@/app/core/api/plugins';
import { InstalledPlugin } from '@/app/core/types/plugins';
import { useOrganizationContext } from '@/app/context/OrganizationContext';

interface UsePluginsReturn {
    plugins: InstalledPlugin[];
    loading: boolean;
    error: string | null;
    // True if plugin is installed AND active
    hasPlugin: (key: string) => boolean;
    refetch: () => void;
}

export const usePlugins = (): UsePluginsReturn => {
    const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { organizationId } = useOrganizationContext();

    const fetch = useCallback(async () => {
        setLoading(true);
        try {
            const data = await pluginAPI.getInstalled();
            setPlugins(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch plugins');
        } finally {
            setLoading(false);
        }
    }, [organizationId]);

    useEffect(() => {
        fetch();
    }, [fetch]);

    const hasPlugin = useCallback(
        (key: string): boolean => {
            return plugins.some(p => p.key === key && p.is_active && p.is_available);
        },
        [plugins]
    );

    return { plugins, loading, error, hasPlugin, refetch: fetch };
};
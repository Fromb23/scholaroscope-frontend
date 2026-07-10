'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { pluginAPI } from '@/app/core/api/plugins';
import type { InstalledPlugin } from '@/app/core/types/plugins';
import { useOrganizationContext } from '@/app/context/OrganizationContext';
import { useAuth } from '@/app/context/AuthContext';
import { ApiError, extractErrorMessage } from '@/app/core/types/errors';

interface UsePluginsReturn {
    plugins: InstalledPlugin[];
    loading: boolean;
    error: string | null;
    hasPlugin: (key: string) => boolean;
    refetch: () => Promise<void>;
}

interface UsePluginsOptions {
    enabled?: boolean;
}

export const usePlugins = (options: UsePluginsOptions = {}): UsePluginsReturn => {
    const enabled = options.enabled ?? true;
    const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState<string | null>(null);
    const requestIdRef = useRef(0);
    const { activeOrg } = useAuth();
    const { organizationId } = useOrganizationContext();
    const scopedOrganizationId = organizationId ?? activeOrg?.id ?? null;

    const fetch = useCallback(async () => {
        if (!enabled) {
            setPlugins([]);
            setError(null);
            setLoading(false);
            return;
        }

        const requestId = ++requestIdRef.current;
        setLoading(true);
        try {
            const data = await pluginAPI.getInstalled(scopedOrganizationId ?? undefined);
            if (requestId === requestIdRef.current) {
                setPlugins(data);
                setError(null);
            }
        } catch (err) {
            if (requestId === requestIdRef.current) {
                setError(extractErrorMessage(err as ApiError, 'Failed to fetch plugins'));
            }
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, [enabled, scopedOrganizationId]);

    useEffect(() => { fetch(); }, [fetch]);

    const hasPlugin = useCallback(
        (key: string): boolean => plugins.some(p => p.key === key && (p.state === 'active' || p.is_active)),
        [plugins]
    );

    return { plugins, loading, error, hasPlugin, refetch: fetch };
};

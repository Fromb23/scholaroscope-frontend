'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { pluginAPI } from '@/app/core/api/plugins';
import type { InstalledPlugin } from '@/app/core/types/plugins';
import { useOrganizationContext } from '@/app/context/OrganizationContext';
import { useAuth } from '@/app/context/AuthContext';
import { ApiError, resolveErrorMessage } from '@/app/core/types/errors';

interface UsePluginsReturn {
    plugins: InstalledPlugin[];
    loading: boolean;
    error: string | null;
    hasPlugin: (key: string) => boolean;
    getPluginCapabilityState: (key: string) => PluginCapabilityState;
    refetch: () => Promise<void>;
}

interface UsePluginsOptions {
    enabled?: boolean;
}

export type PluginCapabilityState =
    | { state: 'loading'; message: string }
    | { state: 'available'; message: string; plugin: InstalledPlugin }
    | { state: 'disabled'; message: string; plugin: InstalledPlugin }
    | { state: 'not_installed'; message: string }
    | { state: 'unauthorized'; message: string }
    | { state: 'request_failed'; message: string }
    | { state: 'organization_unresolved'; message: string };

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
        setPlugins([]);
        try {
            const data = await pluginAPI.getInstalled(scopedOrganizationId ?? undefined);
            if (requestId === requestIdRef.current) {
                setPlugins(data);
                setError(null);
            }
        } catch (err) {
            if (requestId === requestIdRef.current) {
                setError(resolveErrorMessage(err as ApiError, 'Failed to fetch plugins'));
            }
        } finally {
            if (requestId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, [enabled, scopedOrganizationId]);

    useEffect(() => { fetch(); }, [fetch]);

    const hasPlugin = useCallback(
        (key: string): boolean => plugins.some(p => (
            p.key === key && (p.effective_enabled ?? (p.state === 'active' || p.is_active))
        )),
        [plugins]
    );

    const getPluginCapabilityState = useCallback((key: string): PluginCapabilityState => {
        if (!enabled) {
            return {
                state: 'organization_unresolved',
                message: 'Organization context is not resolved.',
            };
        }
        if (!scopedOrganizationId) {
            return {
                state: 'organization_unresolved',
                message: 'Choose an organization before loading workspace tools.',
            };
        }
        if (loading) {
            return { state: 'loading', message: 'Loading workspace tools...' };
        }
        if (error) {
            const lower = error.toLowerCase();
            if (lower.includes('permission') || lower.includes('forbidden') || lower.includes('unauthorized')) {
                return { state: 'unauthorized', message: error };
            }
            return { state: 'request_failed', message: error };
        }
        const plugin = plugins.find(p => p.key === key);
        if (!plugin) {
            return {
                state: 'not_installed',
                message: `The ${key.toUpperCase()} tools are not installed for this organization.`,
            };
        }
        const enabledForOrg = plugin.effective_enabled ?? (plugin.state === 'active' || plugin.is_active);
        if (!enabledForOrg) {
            return {
                state: 'disabled',
                message: plugin.management?.blocked_reason
                    ?? `The ${plugin.name || key.toUpperCase()} tools are disabled for this organization.`,
                plugin,
            };
        }
        return {
            state: 'available',
            message: `${plugin.name || key.toUpperCase()} tools are available.`,
            plugin,
        };
    }, [enabled, error, loading, plugins, scopedOrganizationId]);

    return { plugins, loading, error, hasPlugin, getPluginCapabilityState, refetch: fetch };
};

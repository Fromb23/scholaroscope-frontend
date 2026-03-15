// ============================================================================
// app/core/api/plugins.ts
//
// API client for plugin registry and installed plugin management.
// ============================================================================

import { apiClient } from './client';

export interface Plugin {
    id: number;
    key: string;
    name: string;
    description: string;
    version: string;
    is_core: boolean;
    is_available: boolean;
}

export interface InstalledPlugin {
    id: number;
    key: string;
    name: string;
    description: string;
    version: string;
    is_core: boolean;
    is_active: boolean;
    config: Record<string, unknown>;
    installed_at: string;
}

export const pluginAPI = {
    // All available plugins in the platform registry
    getAll: async (): Promise<Plugin[]> => {
        const response = await apiClient.get<Plugin[]>('/plugins/');
        const data = response.data;
        return Array.isArray(data) ? data : (data as any)?.results ?? [];
    },

    // Org's installed plugins — scoped automatically by backend
    getInstalled: async (organizationId?: number): Promise<InstalledPlugin[]> => {
        const params = organizationId ? { organization: organizationId } : {};
        const response = await apiClient.get<InstalledPlugin[]>('/installed-plugins/', { params });
        const data = response.data;
        return Array.isArray(data) ? data : (data as any)?.results ?? [];
    },

    // Superadmin: install a plugin for a specific org
    install: async (pluginKey: string, organizationId: number): Promise<InstalledPlugin> => {
        const response = await apiClient.post<InstalledPlugin>('/installed-plugins/install/', {
            plugin_key: pluginKey,
            organization_id: organizationId,
        });
        return response.data;
    },

    // Superadmin: uninstall a plugin from an org
    uninstall: async (installedPluginId: number): Promise<void> => {
        await apiClient.delete(`/installed-plugins/${installedPluginId}/`);
    },

    // Admin: toggle a plugin on/off
    toggle: async (installedPluginId: number): Promise<InstalledPlugin> => {
        const response = await apiClient.post<InstalledPlugin>(
            `/installed-plugins/${installedPluginId}/toggle/`
        );
        return response.data;
    },
};
// ============================================================================
// app/core/api/plugins.ts
//
// API client for plugin registry and installed plugin management.
// ============================================================================

import { apiClient } from './client';
import { Plugin, InstalledPlugin } from '@/app/core/types/plugins';
import { PaginatedResponse } from '@/app/core/types/api';

export const pluginAPI = {
    getAll: async (): Promise<Plugin[]> => {
        const response = await apiClient.get<Plugin[] | PaginatedResponse<Plugin>>('/plugins/');
        const data = response.data;
        return Array.isArray(data) ? data : data.results;
    },
    getInstalled: async (organizationId?: number): Promise<InstalledPlugin[]> => {
        const params = organizationId ? { organization: organizationId } : {};
        const response = await apiClient.get<InstalledPlugin[] | PaginatedResponse<InstalledPlugin>>('/installed-plugins/', { params });
        const data = response.data;
        return Array.isArray(data) ? data : data.results;
    },

    install: async (pluginKey: string, organizationId: number): Promise<InstalledPlugin> => {
        const response = await apiClient.post<InstalledPlugin>('/installed-plugins/install/', {
            plugin_key: pluginKey,
            organization_id: organizationId,
        });
        return response.data;
    },

    uninstall: async (installedPluginId: number): Promise<void> => {
        await apiClient.delete(`/installed-plugins/${installedPluginId}/`);
    },

    toggle: async (installedPluginId: number): Promise<InstalledPlugin> => {
        const response = await apiClient.post<InstalledPlugin>(
            `/installed-plugins/${installedPluginId}/toggle/`
        );
        return response.data;
    },
};
// ============================================================================
// app/core/api/plugins.ts
// ============================================================================

import { apiClient } from './client';
import type { Plugin, InstalledPlugin } from '@/app/core/types/plugins';

export const pluginAPI = {
    // ── Registry (Platform) ───────────────────────────────────────────────

    getAll: async (): Promise<Plugin[]> => {
        const response = await apiClient.get<Plugin[]>('/plugins/');
        return Array.isArray(response.data)
            ? response.data
            : (response.data as { results: Plugin[] }).results ?? [];
    },

    getById: async (id: number): Promise<Plugin> => {
        const response = await apiClient.get<Plugin>(`/plugins/${id}/`);
        return response.data;
    },

    toggleAvailability: async (id: number): Promise<{ key: string; is_available: boolean; message: string }> => {
        const response = await apiClient.post(`/plugins/${id}/toggle_availability/`);
        return response.data;
    },

    syncManifest: async (id: number): Promise<Plugin> => {
        const response = await apiClient.post<Plugin>(`/plugins/${id}/sync/`);
        return response.data;
    },

    getInstallations: async (id: number, state?: string): Promise<InstalledPlugin[]> => {
        const response = await apiClient.get<InstalledPlugin[]>(
            `/plugins/${id}/installations/`,
            { params: state ? { state } : {} }
        );
        return Array.isArray(response.data)
            ? response.data
            : (response.data as { results: InstalledPlugin[] }).results ?? [];
    },

    // ── Installed plugins (per org) ───────────────────────────────────────

    getInstalled: async (organizationId?: number): Promise<InstalledPlugin[]> => {
        const response = await apiClient.get<InstalledPlugin[]>(
            '/installed-plugins/',
            { params: organizationId ? { organization: organizationId } : {} }
        );
        return Array.isArray(response.data)
            ? response.data
            : (response.data as { results: InstalledPlugin[] }).results ?? [];
    },

    getAllInstallations: async (filters?: { organization?: number; state?: string; plugin?: string }): Promise<InstalledPlugin[]> => {
        const response = await apiClient.get<InstalledPlugin[]>(
            '/installed-plugins/all/',
            { params: filters }
        );
        return Array.isArray(response.data)
            ? response.data
            : (response.data as { results: InstalledPlugin[] }).results ?? [];
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
// ============================================================================
// app/core/api/plugins.ts
// ============================================================================

import { apiClient } from './client';
import { unwrapPaginated } from './unwrap';
import type {
    Plugin, InstalledPlugin, InstalledPluginToggleResponse, CurriculumCatalog, SeedCurriculumPayload,
    SeedCurriculumResult, RegisterSubjectPayload,
    RegisteredSubject, CurriculumCatalogDetail
} from '@/app/core/types/plugins';

export const pluginAPI = {
    // ── Registry ──────────────────────────────────────────────────────────

    getAll: async (): Promise<Plugin[]> => {
        const response = await apiClient.get<Plugin[]>('/plugins/');
        return unwrapPaginated(response.data);
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

    installGlobally: async (id: number): Promise<{ message: string; installed_count: number }> => {
        const response = await apiClient.post(`/plugins/${id}/install_globally/`);
        return response.data;
    },

    uninstallGlobally: async (id: number): Promise<{ message: string; removed_count: number }> => {
        const response = await apiClient.post(`/plugins/${id}/uninstall_globally/`);
        return response.data;
    },

    getInstallations: async (id: number): Promise<InstalledPlugin[]> => {
        const response = await apiClient.get<InstalledPlugin[]>(`/plugins/${id}/installations/`);
        return unwrapPaginated(response.data);
    },

    // ── Installed plugins (org-scoped, used by admins) ────────────────────

    getInstalled: async (organizationId?: number): Promise<InstalledPlugin[]> => {
        const response = await apiClient.get<InstalledPlugin[]>(
            '/installed-plugins/',
            { params: organizationId !== undefined ? { organization: organizationId } : {} }
        );
        return unwrapPaginated(response.data);
    },
    getUninstallImpact: async (id: number): Promise<{
        plugin_name: string;
        plugin_key: string;
        is_core: boolean;
        is_third_party: boolean;
        active_count: number;
        disabled_count: number;
        total_affected: number;
        active_orgs: { id: number; name: string }[];
        disabled_orgs: { id: number; name: string }[];
    }> => {
        const response = await apiClient.get(`/plugins/${id}/uninstall_impact/`);
        return response.data;
    },

    toggle: async (installedPluginId: number): Promise<InstalledPluginToggleResponse> => {
        const response = await apiClient.post<InstalledPluginToggleResponse>(
            `/installed-plugins/${installedPluginId}/toggle/`
        );
        return response.data;
    },
    // Add to pluginAPI in core/api/plugins.ts

    catalog: async (installedPluginId: number): Promise<CurriculumCatalog> => {
        const response = await apiClient.get('/installed-plugins/catalog/', {
            params: { installed_plugin_id: installedPluginId },
        });
        return response.data;
    },
    catalogDetail: async (installedPluginId: number): Promise<CurriculumCatalogDetail> => {
        const response = await apiClient.get('/installed-plugins/catalog_detail/', {
            params: { installed_plugin_id: installedPluginId },
        });
        return response.data;
    },

    seedCurriculum: async (payload: SeedCurriculumPayload): Promise<SeedCurriculumResult> => {
        const response = await apiClient.post('/installed-plugins/seed_curriculum/', payload);
        return response.data;
    },

    registerSubject: async (payload: RegisterSubjectPayload): Promise<RegisteredSubject> => {
        const response = await apiClient.post('/installed-plugins/register_subject/', payload);
        return response.data;
    },

    unregisterTopic: async (topicId: number): Promise<{ topic_removed: string; subtopics_removed: number }> => {
        const response = await apiClient.post('/installed-plugins/unregister_topic/', { topic_id: topicId });
        return response.data;
    },

    unregisterSubtopic: async (subtopicId: number): Promise<{ subtopic_removed: string }> => {
        const response = await apiClient.post('/installed-plugins/unregister_subtopic/', { subtopic_id: subtopicId });
        return response.data;
    },
    unregisterByCode: async (payload: {
        subject_code: string;
        topic_codes?: string[];
        subtopic_codes?: string[];
    }): Promise<{ removed_topics: string[]; removed_subtopics: string[]; errors: string[] }> => {
        const response = await apiClient.post('/installed-plugins/unregister_by_code/', payload);
        return response.data;
    },
};

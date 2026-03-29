// ============================================================================
// app/core/types/plugins.ts
// ============================================================================

export type PluginSource = 'core' | 'third_party';
export type PluginState = 'active' | 'disabled' | 'grace_period' | 'uninstalled';

export interface Plugin {
    id: number;
    key: string;
    name: string;
    description: string;
    version: string;
    is_core: boolean;
    is_available: boolean;
    source: PluginSource;
    config_schema: Record<string, unknown>;
    manifest_url: string | null;
    manifest_synced_at: string | null;
    is_manifest_stale: boolean;
    is_third_party: boolean;
    created_at: string;
    installation_count: number;
}

export interface UninstallImpact {
    plugin_name: string;
    active_count: number;
    disabled_count: number;
    total_affected: number;
    active_orgs: { id: number; name: string }[];
    disabled_orgs: { id: number; name: string }[];
}

export interface InstalledPlugin {
    id: number;
    key: string;
    name: string;
    description: string;
    version: string;
    is_core: boolean;
    is_available: boolean;
    source: PluginSource;
    is_active: boolean;
    state: PluginState;
    config: Record<string, unknown>;
    config_schema: Record<string, unknown>;
    organization: number;
    organization_name: string;
    installed_by: number | null;
    installed_by_email: string | null;
    installed_at: string;
    uninstalled_at: string | null;
    data_retention_until: string | null;
}

export const SOURCE_LABELS: Record<PluginSource, string> = {
    core: 'Core',
    third_party: 'Third Party',
};

export const SOURCE_COLORS: Record<PluginSource, 'purple' | 'info'> = {
    core: 'purple',
    third_party: 'info',
};

export const STATE_COLORS: Record<PluginState, 'success' | 'default' | 'warning' | 'danger'> = {
    active: 'success',
    disabled: 'default',
    grace_period: 'warning',
    uninstalled: 'danger',
};

export const STATE_LABELS: Record<PluginState, string> = {
    active: 'Active',
    disabled: 'Disabled',
    grace_period: 'Grace Period',
    uninstalled: 'Uninstalled',
};
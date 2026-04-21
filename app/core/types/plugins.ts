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
    capabilities?: string[];
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

// Add to core/types/plugins.ts

export interface CurriculumSubjectEntry {
    code: string;
    name: string;
    level?: string;
    description?: string;
}

export interface CurriculumCatalog {
    manifest_url: string;
    count: number;
    subjects: CurriculumSubjectEntry[];
}

export interface SeedCurriculumPayload {
    installed_plugin_id: number;
    selections: SubjectSelection[];
}

export interface SeedCurriculumResult {
    seeded: {
        code: string;
        subject: string;
        level: string;
        subject_created: boolean;
        topics: number;
        subtopics: number;
    }[];
    skipped: { code: string; reason: string }[];
    errors: { code: string; reason: string }[];
}

export interface RegisterSubjectPayload {
    manifest_url: string;
    code: string;
    level?: string;
}

export interface RegisteredSubject {
    subject_id: number;
    code: string;
    name: string;
    level: string;
    created: boolean;
}

export interface CurriculumSubtopicEntry {
    code: string;
    name: string;
    sequence: number;
    registered: boolean;
}

export interface CurriculumTopicEntry {
    code: string;
    name: string;
    sequence: number;
    registered: boolean;
    subtopics: CurriculumSubtopicEntry[];
}

export interface CurriculumSubjectDetail {
    code: string;
    name: string;
    level: string;
    description: string;
    topics: CurriculumTopicEntry[];
    error?: string;
}

export interface CurriculumCatalogDetail {
    count: number;
    subjects: CurriculumSubjectGroup[];
}

export interface SubjectSelection {
    code: string;
    topics?: string[];
    subtopics?: Record<string, string[]>;
}

export interface CurriculumLevelEntry {
    code: string;
    level: string;
    description: string;
    registered: boolean;
    topics: CurriculumTopicEntry[];
    error?: string;
}

export interface CurriculumSubjectGroup {
    name: string;
    levels: CurriculumLevelEntry[];
    all_registered: boolean;
    any_registered: boolean;
}
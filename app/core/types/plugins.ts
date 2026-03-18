export interface PluginBase {
    id: number
    key: string
    name: string
    description: string
    version: string
    is_core: boolean
}

export interface Plugin extends PluginBase {
    is_available: boolean;
}

export interface InstalledPlugin extends PluginBase {
    is_active: boolean;
    config: Record<string, unknown>;
    installed_at: string;
}
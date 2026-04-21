import type { ComponentType } from 'react';

type PluginProvider = ComponentType<{ children: React.ReactNode }>;

const _providers: Record<string, PluginProvider> = {};

export function registerPluginProvider(key: string, provider: PluginProvider): void {
    if (_providers[key]) return; // idempotent
    _providers[key] = provider;
}

export function getPluginProvider(key: string): PluginProvider | null {
    return _providers[key] ?? null;
}

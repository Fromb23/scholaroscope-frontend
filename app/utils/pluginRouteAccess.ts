export type RouteAccessRole = 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR';

export interface RouteAccessRule {
    pattern: RegExp;
    allowedRoles: RouteAccessRole[];
}

interface PluginRouteAccessEntry {
    key: string;
    rules: RouteAccessRule[];
}

const _pluginRouteAccessEntries: PluginRouteAccessEntry[] = [];

export function registerPluginRouteAccess(entry: PluginRouteAccessEntry): void {
    if (_pluginRouteAccessEntries.some((registered) => registered.key === entry.key)) return;
    _pluginRouteAccessEntries.push(entry);
}

export function getPluginRouteAccessRules(): RouteAccessRule[] {
    return _pluginRouteAccessEntries.flatMap((entry) => entry.rules);
}

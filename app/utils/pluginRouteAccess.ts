import type { OperatingContext, WorkspaceCapabilities } from './authorityTypes';

export interface RouteAccessContext {
    operatingContext: OperatingContext | null;
    capabilities: WorkspaceCapabilities | null | undefined;
    pathname: string;
    url: URL;
}

export interface RouteAccessRule {
    pattern: RegExp;
    requiredPermissions?: string[];
    requiredAnyPermission?: string[];
    requiredContext?: OperatingContext;
    requiredCapability?: keyof WorkspaceCapabilities;
    isAllowed?: (context: RouteAccessContext) => boolean;
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

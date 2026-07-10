'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';
import { useCurricula } from '@/app/core/hooks/useAcademic';
import { usePlugins } from '@/app/core/hooks/usePlugins';
import { PermissionResolvingState } from '@/app/components/ui/loading';
import {
  getRequiredPluginIdsForPath,
  pluginManifestById,
  selectPluginManifestEntries,
  type PluginId,
  type PluginLoadContext,
} from './manifest';
import {
  getLoadedPluginIds,
  isPluginLoaded,
  loadPluginsForContext,
  PluginLoadError,
} from './loadPlugin';

type PluginRegistryStatus = {
  loadedPluginIds: PluginId[];
  selectedPluginIds: PluginId[];
  routeRequiredPluginIds: PluginId[];
  pendingRoutePluginIds: PluginId[];
  isRoutePluginLoading: boolean;
  error: PluginLoadError | null;
};

const PluginRegistryContext = createContext<PluginRegistryStatus | null>(null);

function activePluginKeys(plugins: ReturnType<typeof usePlugins>['plugins']): string[] {
  return plugins
    .filter((plugin) => plugin.state === 'active' || plugin.is_active)
    .map((plugin) => plugin.key);
}

export function PluginRegistryProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { activeOrg, activeRole, capabilities, loading: authLoading, user } = useAuth();
  const canLoadPlugins = Boolean(user) && !authLoading && Boolean(activeRole);
  const { plugins } = usePlugins({ enabled: canLoadPlugins });
  const { curricula } = useCurricula({ enabled: canLoadPlugins });
  const [loadedPluginIds, setLoadedPluginIds] = useState<PluginId[]>(() => getLoadedPluginIds());
  const [loadingPluginIds, setLoadingPluginIds] = useState<PluginId[]>([]);
  const [error, setError] = useState<PluginLoadError | null>(null);

  const loadContext = useMemo<PluginLoadContext>(() => {
    const enabledFeatures = activePluginKeys(plugins);
    return {
      activeOrg,
      activeRole,
      capabilities,
      curriculumTypes: curricula
        .filter((curriculum) => curriculum.is_active !== false)
        .map((curriculum) => curriculum.curriculum_type),
      enabledFeatures,
      pathname,
    };
  }, [
    activeOrg,
    activeRole,
    capabilities,
    curricula,
    pathname,
    plugins,
  ]);

  const selectedEntries = useMemo(
    () => (canLoadPlugins ? selectPluginManifestEntries(loadContext) : []),
    [canLoadPlugins, loadContext],
  );
  const selectedPluginIds = useMemo(
    () => selectedEntries.map((entry) => entry.id),
    [selectedEntries],
  );
  const selectedPluginIdsKey = selectedPluginIds.join('|');
  const routeRequiredPluginIds = useMemo(
    () => getRequiredPluginIdsForPath(pathname),
    [pathname],
  );

  useEffect(() => {
    let cancelled = false;
    const entriesToLoad = selectedEntries.filter((entry) => !isPluginLoaded(entry.id));

    setLoadedPluginIds(getLoadedPluginIds());
    setLoadingPluginIds(entriesToLoad.map((entry) => entry.id));
    setError(null);

    if (entriesToLoad.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    void loadPluginsForContext(loadContext, entriesToLoad)
      .then(() => {
        if (cancelled) return;
        setLoadedPluginIds(getLoadedPluginIds());
        setLoadingPluginIds([]);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setLoadedPluginIds(getLoadedPluginIds());
        setLoadingPluginIds([]);
        setError(loadError instanceof PluginLoadError
          ? loadError
          : new PluginLoadError(pluginManifestById[entriesToLoad[0].id], loadError));
      });

    return () => {
      cancelled = true;
    };
  }, [loadContext, selectedEntries, selectedPluginIdsKey]);

  const pendingRoutePluginIds = routeRequiredPluginIds.filter((pluginId) => !loadedPluginIds.includes(pluginId));
  const value = useMemo<PluginRegistryStatus>(() => ({
    loadedPluginIds,
    selectedPluginIds,
    routeRequiredPluginIds,
    pendingRoutePluginIds,
    isRoutePluginLoading: pendingRoutePluginIds.length > 0
      && pendingRoutePluginIds.some((pluginId) => loadingPluginIds.includes(pluginId) || selectedPluginIds.includes(pluginId))
      && !error,
    error,
  }), [
    error,
    loadedPluginIds,
    loadingPluginIds,
    pendingRoutePluginIds,
    routeRequiredPluginIds,
    selectedPluginIds,
  ]);

  return (
    <PluginRegistryContext.Provider value={value}>
      {children}
    </PluginRegistryContext.Provider>
  );
}

export function usePluginRegistryStatus(): PluginRegistryStatus {
  const context = useContext(PluginRegistryContext);
  if (!context) {
    throw new Error('usePluginRegistryStatus must be used inside PluginRegistryProvider');
  }
  return context;
}

export function PluginRouteLoadingState({ pluginIds }: { pluginIds: PluginId[] }) {
  const labels = pluginIds
    .map((pluginId) => pluginManifestById[pluginId]?.label)
    .filter(Boolean)
    .join(', ');

  return (
    <PermissionResolvingState
      fullScreen
      message={labels ? `Loading ${labels} plugin...` : 'Loading plugin...'}
    />
  );
}

export function PluginLoadingErrorState({ error }: { error: PluginLoadError }) {
  return (
    <div className="theme-app-bg flex min-h-dvh items-center justify-center p-6">
      <div className="max-w-lg rounded-lg border border-red-200 bg-red-50 p-6 text-red-950">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="space-y-2">
            <h1 className="text-lg font-semibold">Plugin could not load</h1>
            <p className="text-sm">
              {error.pluginLabel} is required for this workspace or route, but its registry failed to load.
              Try refreshing the page. Access has not been granted while the plugin is unavailable.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

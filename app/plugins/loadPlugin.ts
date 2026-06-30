'use client';

import {
  pluginManifestById,
  selectPluginManifestEntries,
  type PluginId,
  type PluginLoadContext,
  type PluginManifestEntry,
} from './manifest';

const loadedPluginIds = new Set<PluginId>();
const inFlightPluginLoads = new Map<PluginId, Promise<void>>();

export class PluginLoadError extends Error {
  pluginId: PluginId;
  pluginLabel: string;

  constructor(entry: PluginManifestEntry, cause: unknown) {
    super(`Failed to load ${entry.label} plugin.`);
    this.name = 'PluginLoadError';
    this.pluginId = entry.id;
    this.pluginLabel = entry.label;
    this.cause = cause;
  }
}

export function isPluginLoaded(pluginId: PluginId): boolean {
  return loadedPluginIds.has(pluginId);
}

export function getLoadedPluginIds(): PluginId[] {
  return Array.from(loadedPluginIds);
}

export async function loadPlugin(entry: PluginManifestEntry): Promise<void> {
  if (loadedPluginIds.has(entry.id)) {
    return;
  }

  const existingLoad = inFlightPluginLoads.get(entry.id);
  if (existingLoad) {
    return existingLoad;
  }

  const loadPromise = entry.load()
    .then(() => {
      loadedPluginIds.add(entry.id);
    })
    .catch((error: unknown) => {
      throw new PluginLoadError(entry, error);
    })
    .finally(() => {
      inFlightPluginLoads.delete(entry.id);
    });

  inFlightPluginLoads.set(entry.id, loadPromise);
  return loadPromise;
}

export async function loadPluginById(pluginId: PluginId): Promise<void> {
  await loadPlugin(pluginManifestById[pluginId]);
}

export async function loadPluginIds(pluginIdsToLoad: PluginId[]): Promise<void> {
  for (const pluginId of pluginIdsToLoad) {
    await loadPluginById(pluginId);
  }
}

export async function loadPluginsForContext(
  context: PluginLoadContext,
  entries: PluginManifestEntry[] = selectPluginManifestEntries(context),
): Promise<PluginId[]> {
  const loaded: PluginId[] = [];

  for (const entry of entries) {
    await loadPlugin(entry);
    loaded.push(entry.id);
  }

  return loaded;
}

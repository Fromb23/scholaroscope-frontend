import { describe, expect, it, vi } from 'vitest';

import {
  isPluginLoaded,
  loadPlugin,
  PluginLoadError,
} from '@/app/plugins/loadPlugin';
import type {
  PluginId,
  PluginManifestEntry,
} from '@/app/plugins/manifest';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve'];
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function runtimeEntry(
  id: string,
  load: () => Promise<void>,
): PluginManifestEntry {
  return {
    id: id as PluginId,
    label: id,
    routePatterns: [],
    navigationSlots: [],
    shouldLoad: () => true,
    load,
  };
}

describe('runtime plugin boundaries', () => {
  it('keeps a required plugin unavailable until its loader finishes', async () => {
    const gate = deferred<void>();
    const load = vi.fn(() => gate.promise);
    const entry = runtimeEntry('runtime-pending-plugin', load);

    const loading = loadPlugin(entry);

    expect(load).toHaveBeenCalledOnce();
    expect(isPluginLoaded(entry.id)).toBe(false);

    gate.resolve();
    await loading;

    expect(isPluginLoaded(entry.id)).toBe(true);
  });

  it('keeps plugin route access denied when plugin loading fails', async () => {
    const loadFailure = new Error('registry unavailable');
    const entry = runtimeEntry(
      'runtime-failing-plugin',
      () => Promise.reject(loadFailure),
    );

    await expect(loadPlugin(entry)).rejects.toMatchObject({
      name: 'PluginLoadError',
      pluginId: entry.id,
      pluginLabel: entry.label,
      cause: loadFailure,
    } satisfies Partial<PluginLoadError>);
    expect(isPluginLoaded(entry.id)).toBe(false);
  });
});

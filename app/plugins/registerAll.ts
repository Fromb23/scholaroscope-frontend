'use client';

import { loadPluginIds } from './loadPlugin';
import { pluginIds } from './manifest';

export function registerAllPlugins(): Promise<void> {
  return loadPluginIds(pluginIds);
}

void registerAllPlugins();

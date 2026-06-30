#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

const checks = [];

function check(name, passed, detail) {
  checks.push({ name, passed, detail });
}

const dashboardLayout = read('app/(dashboard)/layout.tsx');
const registerAll = read('app/plugins/registerAll.ts');
const manifest = read('app/plugins/manifest.ts');
const loader = read('app/plugins/loadPlugin.ts');
const provider = read('app/plugins/PluginRegistryProvider.tsx');
const cbcRegister = read('app/plugins/cbc/register.ts');
const cambridgeRegister = read('app/plugins/cambridge/register.ts');

check(
  'Dashboard layout must not import registerAll',
  !dashboardLayout.includes("@/app/plugins/registerAll") && !dashboardLayout.includes("plugins/registerAll"),
  'Dashboard boot must go through PluginRegistryProvider so plugin registries are selected from context.',
);

check(
  'Dashboard layout must use the plugin registry provider',
  dashboardLayout.includes('PluginRegistryProvider') && dashboardLayout.includes('usePluginRegistryStatus'),
  'Dashboard layout must load route-required plugin registries before route access and rendering.',
);

check(
  'registerAll must delegate to the selective loader',
  registerAll.includes('loadPluginIds')
    && registerAll.includes('pluginIds')
    && !registerAll.includes('/registry/')
    && !registerAll.includes('@/app/plugins/cbc/registry')
    && !registerAll.includes('@/app/plugins/cambridge/registry'),
  'registerAll may remain as a fallback, but it must not keep static registry imports as the production pattern.',
);

check(
  'Plugin manifest must own lightweight route and nav metadata',
  manifest.includes('routePatterns')
    && manifest.includes('navigationSlots')
    && manifest.includes('shouldLoad')
    && manifest.includes('getRequiredPluginIdsForPath')
    && manifest.includes('selectPluginManifestEntries'),
  'Plugin selection must be driven from a manifest with route/nav availability metadata.',
);

check(
  'Plugin loader must be idempotent',
  loader.includes('loadedPluginIds')
    && loader.includes('inFlightPluginLoads')
    && loader.includes('loadedPluginIds.has')
    && loader.includes('inFlightPluginLoads.get')
    && loader.includes('PluginLoadError'),
  'Loading the same plugin twice must share/skip work and avoid duplicate registry side effects.',
);

check(
  'CBC and Cambridge registries must load through separate dynamic plugin entry points',
  cbcRegister.includes("import('./registry/")
    && cambridgeRegister.includes("import('./registry/")
    && !manifest.includes('@/app/plugins/cbc/registry')
    && !manifest.includes('@/app/plugins/cambridge/registry')
    && manifest.includes("import('./cbc/register')")
    && manifest.includes("import('./cambridge/register')"),
  'Curriculum registries must not be statically imported into a shared dashboard boot module.',
);

check(
  'Route plugin loading must block unsafe route access while chunks are pending',
  provider.includes('pendingRoutePluginIds')
    && provider.includes('isRoutePluginLoading')
    && dashboardLayout.includes('pluginRegistry.isRoutePluginLoading')
    && dashboardLayout.includes('PluginRouteLoadingState')
    && dashboardLayout.includes('PluginLoadingErrorState'),
  'Plugin routes must show loading/error states instead of rendering or authorizing before their registry loads.',
);

const failures = checks.filter((item) => !item.passed);

if (failures.length > 0) {
  console.error('Plugin loading architecture check failed:');
  for (const failure of failures) {
    console.error(`- ${failure.name}: ${failure.detail}`);
  }
  process.exit(1);
}

console.log(`Plugin loading architecture check passed (${checks.length} checks).`);

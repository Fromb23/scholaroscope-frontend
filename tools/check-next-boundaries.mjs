#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appRoot = path.join(root, 'app');
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function hasUseClientDirective(source) {
  return /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*['"]use client['"]\s*;?/.test(source);
}

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue;
    const file = path.join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) {
      entries.push(...walk(file));
    } else if (/\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name)) {
      entries.push(file);
    }
  }
  return entries;
}

function fail(message) {
  failures.push(message);
}

function requireNoUseClient(relativePath, detail) {
  const source = read(relativePath);
  if (hasUseClientDirective(source)) {
    fail(`${relativePath} must remain a server shell: ${detail}`);
  }
}

function importStatements(source) {
  return [...source.matchAll(/import\s+(?!type\b)([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?/g)]
    .map((match) => ({
      clause: match[1],
      specifier: match[2],
    }));
}

function disallowedClientHookImports(relativePath, source) {
  const findings = [];
  for (const statement of importStatements(source)) {
    const { clause, specifier } = statement;
    if (
      specifier === 'next/navigation'
      && /\buse(?:Router|Pathname|SearchParams|Params)\b/.test(clause)
    ) {
      findings.push(`${relativePath} imports ${specifier} client navigation hooks`);
    }
    if (
      specifier === '@/app/context/AuthContext'
      && /\buseAuth\b/.test(clause)
    ) {
      findings.push(`${relativePath} imports useAuth directly`);
    }
    if (
      specifier === '@/app/context/SidebarContext'
      && /\buseSidebar\b/.test(clause)
    ) {
      findings.push(`${relativePath} imports useSidebar directly`);
    }
    if (
      specifier.startsWith('@/app/core/hooks/')
      || /^@\/app\/plugins\/[^/]+\/hooks\//.test(specifier)
    ) {
      findings.push(`${relativePath} imports client hook module ${specifier}`);
    }
  }
  return findings;
}

const dashboardLayoutPath = 'app/(dashboard)/layout.tsx';
const dashboardClientShellPath = 'app/(dashboard)/DashboardClientShell.tsx';
const reportsLoadingPath = 'app/(dashboard)/reports/loading.tsx';

const dashboardLayout = read(dashboardLayoutPath);
const dashboardClientShell = read(dashboardClientShellPath);

requireNoUseClient(
  dashboardLayoutPath,
  'the dashboard layout composes the client auth/plugin shell without becoming the client boundary itself.',
);

if (!dashboardLayout.includes('DashboardClientShell')) {
  fail(`${dashboardLayoutPath} must render DashboardClientShell as the explicit dashboard client island.`);
}

if (!hasUseClientDirective(dashboardClientShell)) {
  fail(`${dashboardClientShellPath} must be the explicit client island for auth, workspace, plugin, sidebar, and header state.`);
}

if (
  !dashboardClientShell.includes('PluginRegistryProvider')
  || !dashboardClientShell.includes('usePluginRegistryStatus')
  || !dashboardClientShell.includes('PluginRouteLoadingState')
) {
  fail(`${dashboardClientShellPath} must keep selective plugin loading and route-required plugin gates in the client shell.`);
}

if (
  dashboardLayout.includes('@/app/plugins/registerAll')
  || dashboardLayout.includes('plugins/registerAll')
  || dashboardClientShell.includes('@/app/plugins/registerAll')
  || dashboardClientShell.includes('plugins/registerAll')
) {
  fail('Dashboard shell must not import registerAll; it must load plugins through PluginRegistryProvider.');
}

const registerAll = read('app/plugins/registerAll.ts');
if (
  !registerAll.includes('loadPluginIds')
  || !registerAll.includes('pluginIds')
  || registerAll.includes('/registry/')
  || registerAll.includes('@/app/plugins/cbc/registry')
  || registerAll.includes('@/app/plugins/cambridge/registry')
) {
  fail('registerAll must remain a compatibility delegate to the selective plugin loader, not an unconditional registry importer.');
}

const selectedReportShells = [
  {
    shellPath: 'app/core/components/reports/ReportsPage.tsx',
    shellName: 'ReportsPage',
    clientPath: 'app/core/components/reports/ReportsPageClient.tsx',
    clientName: 'ReportsPageClient',
  },
  {
    shellPath: 'app/core/components/reports/ReportPoliciesHubPage.tsx',
    shellName: 'ReportPoliciesHubPage',
    clientPath: 'app/core/components/reports/ReportPoliciesHubPageClient.tsx',
    clientName: 'ReportPoliciesHubPageClient',
  },
  {
    shellPath: 'app/core/components/reports/GradePoliciesPage.tsx',
    shellName: 'GradePoliciesPage',
    clientPath: 'app/core/components/reports/GradePoliciesPageClient.tsx',
    clientName: 'GradePoliciesPageClient',
  },
];

for (const { shellPath, shellName, clientPath, clientName } of selectedReportShells) {
  const shellSource = read(shellPath);
  const clientSource = read(clientPath);

  if (hasUseClientDirective(shellSource)) {
    fail(`${shellPath} must remain a server-renderable report shell.`);
  }
  if (/\buse(?:State|Effect|Memo|Callback|Reducer|Ref|Params|SearchParams|Router|Pathname)\s*\(/.test(shellSource)) {
    fail(`${shellPath} must not call React or Next client hooks directly.`);
  }
  for (const hookImport of disallowedClientHookImports(shellPath, shellSource)) {
    fail(`${hookImport}; move report interaction into ${clientPath}.`);
  }
  if (!shellSource.includes(clientName) || !shellSource.includes(`<${clientName} />`)) {
    fail(`${shellPath} must render ${clientName} as its explicit client island.`);
  }
  if (!new RegExp(`export\\s+function\\s+${shellName}\\s*\\(`).test(shellSource)) {
    fail(`${shellPath} must export the ${shellName} server shell.`);
  }
  if (!clientPath.endsWith('Client.tsx')) {
    fail(`${clientPath} must use the explicit *Client.tsx naming pattern.`);
  }
  if (!hasUseClientDirective(clientSource)) {
    fail(`${clientPath} must be the explicit client island for protected report behavior.`);
  }
  if (!new RegExp(`export\\s+function\\s+${clientName}\\s*\\(`).test(clientSource)) {
    fail(`${clientPath} must export ${clientName}.`);
  }
}

const reportRoutePages = walk(path.join(root, 'app/(dashboard)/reports'))
  .filter((file) => path.basename(file) === 'page.tsx')
  .sort();

for (const file of reportRoutePages) {
  const relativePath = rel(file);
  const source = readFileSync(file, 'utf8');
  if (hasUseClientDirective(source)) {
    fail(`${relativePath} is a report route shell and must not use 'use client'; move interaction into a client child component.`);
  }
  if (/\buse(?:State|Effect|Memo|Callback|Reducer|Ref|Params|SearchParams|Router|Pathname)\s*\(/.test(source)) {
    fail(`${relativePath} must stay thin and must not call React or Next client hooks directly.`);
  }
  if (!/export\s+default\s+function\s+Page\s*\(/.test(source)) {
    fail(`${relativePath} must keep the thin page entry pattern.`);
  }
}

if (!existsSync(path.join(root, reportsLoadingPath))) {
  fail(`${reportsLoadingPath} must exist as the scoped route-level loading boundary for report shells.`);
} else {
  const reportsLoading = read(reportsLoadingPath);
  if (hasUseClientDirective(reportsLoading)) {
    fail(`${reportsLoadingPath} must remain server-renderable.`);
  }
  if (!reportsLoading.includes('PageSkeleton') || !reportsLoading.includes('variant="report"')) {
    fail(`${reportsLoadingPath} must render the report skeleton loading boundary.`);
  }
}

const serverHookImports = [];

for (const file of walk(appRoot)) {
  const relativePath = rel(file);
  if (/\.test\.(ts|tsx)$/.test(relativePath)) continue;
  if (/\/hooks\//.test(relativePath)) continue;
  const source = readFileSync(file, 'utf8');
  if (hasUseClientDirective(source)) continue;

  serverHookImports.push(...disallowedClientHookImports(relativePath, source));
}

for (const hookImport of serverHookImports) {
  fail(`${hookImport}; add a client island instead of turning the server shell into client code.`);
}

if (failures.length > 0) {
  console.error('Next boundary check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Next boundary check passed (${reportRoutePages.length} report route shells protected).`);

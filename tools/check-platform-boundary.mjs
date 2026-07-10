#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();

const prohibitedPaths = [
  'app/(dashboard)/superadmin',
  'app/(dashboard)/dashboard/superadmin',
  'app/core/components/superadmin',
  'app/core/components/dashboard/SuperAdminDashboard.tsx',
  'app/plugins/requests/components/SuperAdminSupportPage.tsx',
  'app/plugins/requests/components/SuperAdminFeedbackPage.tsx',
];

const prohibitedPatterns = [
  { label: 'SUPERADMIN_NAV', pattern: /\bSUPERADMIN_NAV\b/ },
  { label: 'getSuperadminNav', pattern: /\bgetSuperadminNav\b/ },
  { label: '/dashboard/superadmin', pattern: /\/dashboard\/superadmin/ },
  { label: '/superadmin route', pattern: /\/superadmin(?:\/|\b)/ },
  { label: 'roleHomeRoute.SUPERADMIN', pattern: /roleHomeRoute(?:\.SUPERADMIN|\[['"]SUPERADMIN['"]\])/ },
  { label: 'platform health hook', pattern: /\b(?:usePlatformHealth|PlatformHealth)\b/ },
  { label: 'global users hook', pattern: /\buseGlobalUsers\b/ },
  { label: 'deleted superadmin component import', pattern: /core\/components\/superadmin/ },
];

const ignoredDirectories = new Set([
  '.git',
  '.next',
  'node_modules',
]);

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;
    const absolute = join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      walk(absolute, files);
      continue;
    }
    if (/\.(?:ts|tsx|js|jsx|mjs|md|json)$/.test(entry)) {
      files.push(absolute);
    }
  }
  return files;
}

const failures = [];

for (const prohibitedPath of prohibitedPaths) {
  if (existsSync(join(root, prohibitedPath))) {
    failures.push(`Prohibited platform path exists: ${prohibitedPath}`);
  }
}

for (const file of walk(join(root, 'app'))) {
  const source = readFileSync(file, 'utf8');
  const displayPath = relative(root, file);
  for (const { label, pattern } of prohibitedPatterns) {
    if (pattern.test(source)) {
      failures.push(`${displayPath}: prohibited platform symbol or route (${label})`);
    }
  }
}

if (failures.length > 0) {
  console.error('Customer platform boundary check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Customer platform boundary check passed.');

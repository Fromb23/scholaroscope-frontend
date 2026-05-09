import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const sourceExtensions = new Set(['.js', '.jsx', '.mjs', '.ts', '.tsx']);
const importPattern = /(?:import|export)\s+(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '.git') continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      entries.push(...walk(path));
    } else if (sourceExtensions.has(path.slice(path.lastIndexOf('.')))) {
      entries.push(path);
    }
  }
  return entries;
}

function importsFor(path) {
  const content = readFileSync(path, 'utf8');
  return [...content.matchAll(importPattern)]
    .map((match) => match[1] ?? match[2])
    .filter(Boolean);
}

function pluginNameFromPath(path) {
  const normalized = relative(root, path).replaceAll('\\', '/');
  const match = normalized.match(/^app\/plugins\/([^/]+)\//);
  return match?.[1] ?? null;
}

const failures = [];

for (const path of walk(join(root, 'app'))) {
  const relativePath = relative(root, path).replaceAll('\\', '/');
  const imports = importsFor(path);
  const sourcePlugin = pluginNameFromPath(path);

  for (const specifier of imports) {
    const pluginImport = specifier.match(/^@\/app\/plugins\/([^/]+)/);

    if (relativePath.startsWith('app/core/') && pluginImport) {
      failures.push(`${relativePath} imports plugin module ${specifier}`);
    }

    if (relativePath.startsWith('app/components/layout/') && pluginImport) {
      failures.push(`${relativePath} imports plugin module ${specifier}`);
    }

    if (relativePath.startsWith('app/utils/') && (specifier.startsWith('@/app/core/') || pluginImport)) {
      failures.push(`${relativePath} imports disallowed module ${specifier}`);
    }

    if (sourcePlugin && pluginImport && pluginImport[1] !== sourcePlugin) {
      failures.push(`${relativePath} imports another plugin module ${specifier}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Boundary check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Boundary check passed.');

#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appRoot = path.join(root, 'app');
const baselinePath = path.join(root, 'tools/plugin-ui-boundary-baseline.json');
const writeBaseline = process.argv.includes('--write-baseline');

const ignoredDirectories = new Set([
  '.git',
  '.next',
  'node_modules',
  'coverage',
  'dist',
  'build',
]);

const allowedPluginInfrastructureImports = new Set([
  '@/app/plugins/PluginRegistryProvider',
  '@/app/plugins/loadPlugin',
  '@/app/plugins/manifest',
  '@/app/plugins/registerAll',
]);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function collectFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) return [];
      return collectFiles(fullPath);
    }
    if (!/\.(tsx?|jsx?|mjs|cjs)$/.test(entry.name)) return [];
    return [fullPath];
  });
}

function isTestFile(relativePath) {
  return /(?:^|[/.])(test|spec)\.[cm]?[jt]sx?$/.test(relativePath);
}

function isPluginOwnedFile(relativePath) {
  return relativePath.startsWith('app/plugins/');
}

function isAllowedPluginInfrastructure(specifier) {
  return allowedPluginInfrastructureImports.has(specifier);
}

function resolvesToPluginPath(filePath, specifier) {
  if (specifier.startsWith('@/app/plugins/')) return true;
  if (!specifier.startsWith('.')) return false;

  const resolved = path.normalize(path.join(path.dirname(filePath), specifier));
  const relative = toPosix(path.relative(root, resolved));
  return relative.startsWith('app/plugins/');
}

function extractImports(source) {
  const imports = [];
  const importRegex = /\b(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = importRegex.exec(source)) !== null) {
    imports.push(match[1] ?? match[2]);
  }
  return imports;
}

function findBoundaryViolations() {
  if (!existsSync(appRoot) || !statSync(appRoot).isDirectory()) {
    return [];
  }

  return collectFiles(appRoot)
    .flatMap((filePath) => {
      const relativePath = toPosix(path.relative(root, filePath));
      if (isPluginOwnedFile(relativePath) || isTestFile(relativePath)) return [];

      const source = readFileSync(filePath, 'utf8');
      return extractImports(source)
        .filter((specifier) => resolvesToPluginPath(filePath, specifier))
        .filter((specifier) => !isAllowedPluginInfrastructure(specifier))
        .map((specifier) => ({
          file: relativePath,
          import: specifier,
        }));
    })
    .sort((left, right) => (
      left.file.localeCompare(right.file) || left.import.localeCompare(right.import)
    ));
}

function loadBaseline() {
  if (!existsSync(baselinePath)) return [];
  return JSON.parse(readFileSync(baselinePath, 'utf8'));
}

function findingKey(finding) {
  return `${finding.file} -> ${finding.import}`;
}

const findings = findBoundaryViolations();

if (writeBaseline) {
  const baseline = findings.map((finding) => ({
    ...finding,
    reason: 'Existing direct plugin UI import. Migrate this route/surface to a declared plugin registry or slot before removing from baseline.',
  }));
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Plugin UI boundary baseline written with ${baseline.length} entries.`);
  process.exit(0);
}

const baseline = loadBaseline();
const baselineKeys = new Set(baseline.map(findingKey));
const findingKeys = new Set(findings.map(findingKey));
const newFindings = findings.filter((finding) => !baselineKeys.has(findingKey(finding)));
const clearedFindings = baseline.filter((finding) => !findingKeys.has(findingKey(finding)));

if (newFindings.length > 0) {
  console.error('Plugin UI boundary check failed:');
  for (const finding of newFindings) {
    console.error(`- ${finding.file} imports ${finding.import}`);
  }
  console.error('Core-owned surfaces must use plugin manifest, navigation, route, slot, provider, route-access, domain-action, or policy-surface registries.');
  process.exit(1);
}

if (clearedFindings.length > 0) {
  console.log('Plugin UI boundary baseline can be reduced:');
  for (const finding of clearedFindings) {
    console.log(`- ${finding.file} no longer imports ${finding.import}`);
  }
}

console.log(`Plugin UI boundary check passed. Active baseline entries: ${baseline.length - clearedFindings.length}.`);

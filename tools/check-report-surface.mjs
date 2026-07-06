#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsRoot = path.join(root, 'app/core/components/reports');
const failures = [];

function rel(file) {
  return path.relative(root, file).replaceAll('\\', '/');
}

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
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

function lineNumber(source, pattern) {
  const lines = source.split('\n');
  const index = lines.findIndex((line) => pattern.test(line));
  return index >= 0 ? index + 1 : 1;
}

function fail(relativePath, source, pattern, message) {
  failures.push(`${relativePath}:${lineNumber(source, pattern)} ${message}`);
}

const reportsPagePath = 'app/core/components/reports/ReportsPage.tsx';
const reportsPage = read(reportsPagePath);
if (
  !/resolveReportSurface/.test(reportsPage)
  || !/from ['"]@\/app\/core\/components\/reports\/reportAccessPolicy['"]/.test(reportsPage)
) {
  failures.push(`${reportsPagePath}:1 ReportsPage must import resolveReportSurface from reportAccessPolicy.`);
}
if (/\brouter\.(replace|push)\s*\(/.test(reportsPage)) {
  fail(
    reportsPagePath,
    reportsPage,
    /\brouter\.(replace|push)\s*\(/,
    'ReportsPage must not navigate to select a report surface.',
  );
}

const gatePath = 'app/core/components/reports/AdminReportAccessGate.tsx';
const gate = read(gatePath);
if (/\brouter\.(replace|push)\s*\(/.test(gate)) {
  fail(
    gatePath,
    gate,
    /\brouter\.(replace|push)\s*\(/,
    'AdminReportAccessGate must not navigate to select a report surface.',
  );
}

for (const file of walk(reportsRoot)) {
  const relativePath = rel(file);
  if (/\.test\.(ts|tsx)$/.test(relativePath)) continue;
  const source = readFileSync(file, 'utf8');
  const importsReportAccessPolicy = /from ['"]@\/app\/core\/components\/reports\/reportAccessPolicy['"]/.test(source)
    || /from ['"]\.\/reportAccessPolicy['"]/.test(source);
  if (!importsReportAccessPolicy) continue;

  if (/\bisAdminLike\b/.test(source)) {
    fail(
      relativePath,
      source,
      /\bisAdminLike\b/,
      'reporting access checks must use reportAccessPolicy predicates, not local isAdminLike checks.',
    );
  }

  if (/\bactiveRole\s*={0,2}=\s*['"]ADMIN['"]/.test(source)) {
    fail(
      relativePath,
      source,
      /\bactiveRole\s*={0,2}=\s*['"]ADMIN['"]/,
      'reporting route decisions must not use inline activeRole ADMIN checks.',
    );
  }
}

if (failures.length > 0) {
  console.error('Report surface check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Report surface check passed.');

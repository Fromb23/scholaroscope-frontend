#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  failures.push(message);
}

const sidebarPath = 'app/components/layout/Sidebar.tsx';
const releaseInfoPath = 'app/core/release/releaseInfo.ts';
const releaseBadgePath = 'app/core/release/ReleaseBadge.tsx';

for (const requiredPath of [sidebarPath, releaseInfoPath, releaseBadgePath]) {
  if (!existsSync(path.join(root, requiredPath))) {
    fail(`${requiredPath} is required for deploy-driven release metadata.`);
  }
}

if (existsSync(path.join(root, sidebarPath))) {
  const sidebar = read(sidebarPath);
  if (/\bv\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\b/.test(sidebar)) {
    fail(`${sidebarPath} must not contain a hardcoded semantic release version.`);
  }
  if (/package\.json/.test(sidebar)) {
    fail(`${sidebarPath} must not import package.json for release metadata.`);
  }
  if (!/<ReleaseBadge\b/.test(sidebar)) {
    fail(`${sidebarPath} must render ReleaseBadge.`);
  }
}

if (existsSync(path.join(root, releaseBadgePath))) {
  const releaseBadge = read(releaseBadgePath);
  if (/api\.github\.com|releases\/latest|github\.com\/.*\/releases/i.test(releaseBadge)) {
    fail(`${releaseBadgePath} must not fetch GitHub latest release from the client.`);
  }
}

if (existsSync(path.join(root, releaseInfoPath))) {
  const releaseInfo = read(releaseInfoPath);
  for (const envName of [
    'NEXT_PUBLIC_APP_VERSION',
    'NEXT_PUBLIC_GIT_SHA',
    'NEXT_PUBLIC_RELEASE_CHANNEL',
    'NEXT_PUBLIC_BUILD_TIME',
  ]) {
    if (!releaseInfo.includes(envName)) {
      fail(`${releaseInfoPath} must read ${envName}.`);
    }
  }
  if (!releaseInfo.includes("'dev'") && !releaseInfo.includes('"dev"')) {
    fail(`${releaseInfoPath} must fall back to dev.`);
  }
}

if (failures.length > 0) {
  console.error('Release version check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Release version check passed.');

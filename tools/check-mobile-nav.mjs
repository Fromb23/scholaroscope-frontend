#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function requireFile(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!existsSync(filePath)) {
    failures.push(`${relativePath} must exist.`);
    return '';
  }
  return read(relativePath);
}

function fail(message) {
  failures.push(message);
}

const mobileNavPath = 'app/components/layout/MobileBottomNav.tsx';
const navConfigPath = 'app/components/layout/navConfig.ts';
const pluginNavigationPath = 'app/core/registry/pluginNavigation.ts';
const routeTransitionPath = 'app/components/layout/RouteTransition.tsx';
const packageJsonPath = 'package.json';

const mobileNav = requireFile(mobileNavPath);
if (mobileNav) {
  if (!/lg:hidden/.test(mobileNav)) {
    fail(`${mobileNavPath} must show/hide the bottom bar with CSS lg:hidden.`);
  }

  for (const forbidden of ['window.innerWidth', 'matchMedia', 'useMediaQuery']) {
    if (mobileNav.includes(forbidden)) {
      fail(`${mobileNavPath} must not use ${forbidden} for mobile layout detection.`);
    }
  }

  if (!/from ['"]\.\/navConfig['"]/.test(mobileNav) && !/from ['"]@\/app\/components\/layout\/navConfig['"]/.test(mobileNav)) {
    fail(`${mobileNavPath} must import navigation helpers/types from navConfig.ts.`);
  }

  if (!/resolveMobilePrimaryNav/.test(mobileNav) || !/resolveMobilePrimaryNav\(\s*navConfig\s*\)/.test(mobileNav)) {
    fail(`${mobileNavPath} must resolve bottom-bar items through resolveMobilePrimaryNav(navConfig).`);
  }

  if (/navConfig\.primary\.slice\s*\(\s*0\s*,\s*4\s*\)/.test(mobileNav) || /\.primary\.slice\s*\(/.test(mobileNav)) {
    fail(`${mobileNavPath} must not slice sidebar primary navigation for mobile priority.`);
  }

  if (!/shortName\s*\?\?\s*item\.name/.test(mobileNav)) {
    fail(`${mobileNavPath} must render item.shortName ?? item.name for bottom-bar labels.`);
  }

  if (/\[\s*\{[\s\S]*?\bname\s*:[\s\S]*?\bhref\s*:/.test(mobileNav)) {
    fail(`${mobileNavPath} must not define a hardcoded array of nav item literals.`);
  }

  if (!/useSidebar/.test(mobileNav) || !/openSidebar/.test(mobileNav)) {
    fail(`${mobileNavPath} More must reuse the existing sidebar drawer through useSidebar().openSidebar().`);
  }

  if (!/env\(safe-area-inset-bottom\)/.test(mobileNav)) {
    fail(`${mobileNavPath} must include env(safe-area-inset-bottom) padding.`);
  }
}

const navConfig = requireFile(navConfigPath);
if (navConfig) {
  if (!/export\s+function\s+resolveMobilePrimaryNav/.test(navConfig)) {
    fail(`${navConfigPath} must export resolveMobilePrimaryNav for behaviorally prioritized mobile navigation.`);
  }

  if (!/mobilePriority/.test(navConfig)) {
    fail(`${navConfigPath} must mark role/lifecycle bottom-bar priorities in the nav config.`);
  }

  if (!/mobilePrimary/.test(navConfig)) {
    fail(`${navConfigPath} must allow explicit mobile primary selections when sidebar structure differs from mobile priority.`);
  }
}

const pluginNavigation = requireFile(pluginNavigationPath);
if (pluginNavigation && !/shortName\?:\s*string/.test(pluginNavigation)) {
  fail(`${pluginNavigationPath} NavItem must expose optional shortName for mobile labels.`);
}

const routeTransition = requireFile(routeTransitionPath);
const globals = requireFile('app/globals.css');
if (routeTransition || globals) {
  if (!/prefers-reduced-motion/.test(routeTransition) && !/prefers-reduced-motion/.test(globals)) {
    fail('RouteTransition or its scoped CSS must reference prefers-reduced-motion.');
  }
}

const packageJson = JSON.parse(requireFile(packageJsonPath) || '{}');
const dependencyBlocks = [
  packageJson.dependencies,
  packageJson.devDependencies,
  packageJson.optionalDependencies,
  packageJson.peerDependencies,
].filter(Boolean);
for (const dependencies of dependencyBlocks) {
  for (const packageName of ['framer-motion', 'react-spring', '@react-spring/web']) {
    if (Object.prototype.hasOwnProperty.call(dependencies, packageName)) {
      fail(`${packageName} must not be added for mobile route transitions.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Mobile navigation shell check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Mobile navigation shell check passed.');

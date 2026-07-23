import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { cwd, exit } from 'node:process';

const appRoot = join(cwd(), 'app');
const routeEntryPattern = /^(page|route)\.(?:js|jsx|ts|tsx)$/;
const routeDescendantCache = new Map();
const dynamicPositionEntries = new Map();

function isIgnoredDirectory(name) {
  return name.startsWith('.') || name.startsWith('_');
}

function isRouteGroup(name) {
  return name.startsWith('(') && name.endsWith(')');
}

function isParallelRoute(name) {
  return name.startsWith('@');
}

function parseDynamicSegment(name) {
  let match = name.match(/^\[\[\.\.\.([^\]]+)\]\]$/);
  if (match) return { kind: 'optional-catch-all', slug: match[1] };

  match = name.match(/^\[\.\.\.([^\]]+)\]$/);
  if (match) return { kind: 'catch-all', slug: match[1] };

  match = name.match(/^\[([^\]]+)\]$/);
  if (match) return { kind: 'dynamic', slug: match[1] };

  return null;
}

function routeSegmentKey(name) {
  if (isRouteGroup(name) || isParallelRoute(name)) return null;
  const dynamic = parseDynamicSegment(name);
  if (!dynamic) return name;
  return `[${dynamic.kind}]`;
}

function hasRouteFileDescendant(directory) {
  const cached = routeDescendantCache.get(directory);
  if (cached !== undefined) return cached;

  const hasRoute = readdirSync(directory, { withFileTypes: true }).some((entry) => {
    if (entry.isFile()) {
      return routeEntryPattern.test(entry.name);
    }

    if (!entry.isDirectory() || isIgnoredDirectory(entry.name)) {
      return false;
    }

    return hasRouteFileDescendant(join(directory, entry.name));
  });

  routeDescendantCache.set(directory, hasRoute);
  return hasRoute;
}

function recordDynamicPosition(publicParentSegments, dynamic, path) {
  const publicParent = publicParentSegments.length > 0
    ? `/${publicParentSegments.join('/')}`
    : '/';
  const key = `${publicParent}|${dynamic.kind}`;
  const existing = dynamicPositionEntries.get(key) ?? {
    publicParent,
    kind: dynamic.kind,
    entries: [],
  };
  existing.entries.push({
    slug: dynamic.slug,
    path: relative(cwd(), path).replaceAll('\\', '/'),
  });
  dynamicPositionEntries.set(key, existing);
}

function walk(directory, publicSegments = []) {
  const childDirectories = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !isIgnoredDirectory(entry.name))
    .map((entry) => ({
      name: entry.name,
      path: join(directory, entry.name),
    }))
    .filter((entry) => hasRouteFileDescendant(entry.path));

  for (const child of childDirectories) {
    const dynamic = parseDynamicSegment(child.name);
    if (dynamic) {
      recordDynamicPosition(publicSegments, dynamic, child.path);
    }
  }

  for (const child of childDirectories) {
    const key = routeSegmentKey(child.name);
    walk(child.path, key ? [...publicSegments, key] : publicSegments);
  }
}

walk(appRoot);

const conflicts = Array.from(dynamicPositionEntries.values())
  .map((position) => ({
    ...position,
    slugs: Array.from(new Set(position.entries.map((entry) => entry.slug))).sort(),
  }))
  .filter((position) => position.slugs.length > 1);

if (conflicts.length > 0) {
  console.error('Dynamic route slug conflicts detected at equivalent route positions:');
  for (const conflict of conflicts) {
    console.error(`- ${conflict.publicParent} (${conflict.kind}): ${conflict.slugs.join(', ')}`);
    for (const entry of conflict.entries) {
      console.error(`  - [${entry.slug}] ${entry.path}`);
    }
  }
  exit(1);
}

console.log('Dynamic route slug check passed.');

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

function requireFile(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!existsSync(filePath)) {
    fail(`${relativePath} must exist.`);
    return '';
  }
  return read(relativePath);
}

function extractFunctionBody(source, functionName) {
  const declaration = `async function ${functionName}`;
  const start = source.indexOf(declaration);
  if (start === -1) {
    return '';
  }

  const bodyStart = source.indexOf('{', start);
  if (bodyStart === -1) {
    return '';
  }

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(bodyStart + 1, index);
      }
    }
  }

  return '';
}

function extractFetchHandlerBody(source) {
  const start = source.indexOf("self.addEventListener('fetch'");
  if (start === -1) {
    return '';
  }

  const arrowStart = source.indexOf('=>', start);
  const bodyStart = source.indexOf('{', arrowStart);
  if (arrowStart === -1 || bodyStart === -1) {
    return '';
  }

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(bodyStart + 1, index);
      }
    }
  }

  return '';
}

const manifest = requireFile('app/manifest.ts');
if (manifest) {
  if (!/MetadataRoute\.Manifest/.test(manifest) || !/export\s+default\s+function\s+manifest/.test(manifest)) {
    fail('app/manifest.ts must export a typed MetadataRoute.Manifest route.');
  }

  if (!/display:\s*['"]standalone['"]/.test(manifest)) {
    fail("app/manifest.ts must set display: 'standalone'.");
  }

  if (!/theme_color:\s*[^,\n]+/.test(manifest)) {
    fail('app/manifest.ts must set theme_color.');
  }

  if (!/sizes:\s*['"]192x192['"]/.test(manifest)) {
    fail('app/manifest.ts must reference a 192x192 icon.');
  }

  if (!/sizes:\s*['"]512x512['"]/.test(manifest)) {
    fail('app/manifest.ts must reference a 512x512 icon.');
  }

  if (!/purpose:\s*['"]maskable['"]/.test(manifest)) {
    fail('app/manifest.ts must reference a maskable icon.');
  }

  const tenantThemePatterns = [
    /EffectiveThemeProvider/,
    /EffectiveThemeContext/,
    /DEFAULT_EFFECTIVE_THEME/,
    /deriveCustomThemeTokens/,
    /useEffectiveTheme/,
    /useTheme\s*\(/,
    /activeOrg/,
    /organizationTheme/i,
    /tenant/i,
  ];
  for (const pattern of tenantThemePatterns) {
    if (pattern.test(manifest)) {
      fail('app/manifest.ts must not import or reference tenant/effective runtime theme state.');
      break;
    }
  }
}

if (existsSync(path.join(root, 'public/manifest.json'))) {
  fail('Do not create public/manifest.json; use the native app/manifest.ts route.');
}

const serviceWorker = requireFile('public/sw.js');
if (serviceWorker) {
  if (!/API_BASE_URL/.test(serviceWorker) || !/API_ORIGIN/.test(serviceWorker)) {
    fail('public/sw.js must derive and check the configured API origin.');
  }

  if (!/url\.pathname\.startsWith\(['"]\/api\/['"]\)/.test(serviceWorker)) {
    fail("public/sw.js must explicitly bypass same-origin '/api/' requests.");
  }

  if (!/function\s+isApiRequest/.test(serviceWorker) || !/isApiRequest\(url\)/.test(serviceWorker)) {
    fail('public/sw.js must route fetch events through an explicit isApiRequest guard.');
  }

  if (!/request\.method\s*!==\s*['"]GET['"]\s*\|\|\s*isApiRequest\(url\)/.test(serviceWorker)) {
    fail('public/sw.js must return before cache handling for API traffic and non-GET requests.');
  }

  const fetchHandlerBody = extractFetchHandlerBody(serviceWorker);
  if (!fetchHandlerBody) {
    fail('public/sw.js must register a fetch event handler.');
  } else {
    const apiBypassIndex = fetchHandlerBody.indexOf("if (request.method !== 'GET' || isApiRequest(url))");
    const navigationIndex = fetchHandlerBody.indexOf("if (request.mode === 'navigate')");
    const staticAssetIndex = fetchHandlerBody.indexOf('if (isCacheableStaticAsset(request, url))');

    if (apiBypassIndex === -1) {
      fail('public/sw.js fetch handler must keep the exact non-GET/API bypass guard.');
    }

    if (
      apiBypassIndex === -1
      || navigationIndex === -1
      || staticAssetIndex === -1
      || apiBypassIndex > navigationIndex
      || apiBypassIndex > staticAssetIndex
    ) {
      fail('public/sw.js fetch handler must run the non-GET/API bypass before navigation or static cache handling.');
    }
  }

  if (/api/i.test(serviceWorker) && /cache\.put\([^)]*api/i.test(serviceWorker)) {
    fail('public/sw.js must never cache API traffic.');
  }

  if (!/const\s+APP_SHELL_URL\s*=\s*['"]\/['"]/.test(serviceWorker)) {
    fail("public/sw.js must define the app shell fallback URL as '/'.");
  }

  const navigationHandlerBody = extractFunctionBody(serviceWorker, 'handleNavigationRequest');
  if (!navigationHandlerBody) {
    fail('public/sw.js must keep navigation request handling in handleNavigationRequest.');
  } else {
    const exactFallbackIndex = navigationHandlerBody.indexOf('cache.match(request)');
    const appShellFallbackIndex = navigationHandlerBody.indexOf('cache.match(APP_SHELL_URL)');
    const offlineFallbackIndex = navigationHandlerBody.indexOf('cache.match(OFFLINE_URL)');
    const textFallbackIndex = navigationHandlerBody.indexOf("new Response('Scholaroscope is offline.'");

    if (appShellFallbackIndex === -1) {
      fail("public/sw.js navigation fallback must try the cached app shell '/' before /offline.");
    }

    if (
      exactFallbackIndex === -1
      || appShellFallbackIndex === -1
      || offlineFallbackIndex === -1
      || textFallbackIndex === -1
      || !(exactFallbackIndex < appShellFallbackIndex && appShellFallbackIndex < offlineFallbackIndex && offlineFallbackIndex < textFallbackIndex)
    ) {
      fail("public/sw.js failed-navigation fallback order must be exact URL, app shell '/', /offline, then text 503.");
    }
  }

  if (!/cacheSuccessfulNavigationDocument\(request,\s*response/.test(serviceWorker) || !/cache\.put\(request,\s*response\.clone\(\)\)/.test(serviceWorker)) {
    fail('public/sw.js must cache successful same-origin navigation documents for offline revisits.');
  }

  if (!/BUILD_VERSION|APP_VERSION|GIT_SHA/.test(serviceWorker)) {
    fail('public/sw.js cache naming must reference a build version variable.');
  }

  if (!/SHELL_CACHE\s*=\s*`[^`]*\$\{[^}]*BUILD_VERSION[^}]*\}[^`]*`/.test(serviceWorker)) {
    fail('public/sw.js shell cache name must include the build version.');
  }

  if (!/caches\.delete/.test(serviceWorker) || !/cacheName\s*!==\s*SHELL_CACHE/.test(serviceWorker)) {
    fail('public/sw.js activate path must delete caches from prior shell versions.');
  }

  if (!/skipWaiting\(/.test(serviceWorker) || !/clients\.claim\(/.test(serviceWorker)) {
    fail('public/sw.js must call skipWaiting and clients.claim during the update lifecycle.');
  }
}

const registrar = requireFile('app/components/pwa/ServiceWorkerRegistrar.tsx');
if (registrar) {
  if (!/NEXT_PUBLIC_GIT_SHA/.test(registrar) || !/NEXT_PUBLIC_APP_VERSION/.test(registrar)) {
    fail('ServiceWorkerRegistrar must bind the service worker URL to NEXT_PUBLIC_GIT_SHA/NEXT_PUBLIC_APP_VERSION.');
  }

  if (!/NEXT_PUBLIC_API_URL/.test(registrar)) {
    fail('ServiceWorkerRegistrar must pass NEXT_PUBLIC_API_URL to the service worker for API bypass.');
  }

  if (!/process\.env\.NODE_ENV\s*!==\s*['"]production['"]/.test(registrar)) {
    fail('ServiceWorkerRegistrar must avoid service worker registration outside production.');
  }
}

const layout = requireFile('app/layout.tsx');
if (layout) {
  if (/maximumScale\s*:/.test(layout)) {
    fail('app/layout.tsx viewport must not set maximumScale.');
  }

  if (/userScalable\s*:\s*false/.test(layout)) {
    fail('app/layout.tsx viewport must not set userScalable: false.');
  }

  if (!/width:\s*['"]device-width['"]/.test(layout) || !/initialScale:\s*1/.test(layout)) {
    fail('app/layout.tsx viewport must keep width and initialScale.');
  }
}

const packageJson = JSON.parse(requireFile('package.json'));
const dependencyBlocks = [
  packageJson.dependencies,
  packageJson.devDependencies,
  packageJson.optionalDependencies,
  packageJson.peerDependencies,
].filter(Boolean);
const forbiddenPwaPackages = ['next-pwa', '@ducanh2912/next-pwa'];
for (const dependencies of dependencyBlocks) {
  for (const packageName of forbiddenPwaPackages) {
    if (Object.prototype.hasOwnProperty.call(dependencies, packageName)) {
      fail(`${packageName} must not be added; use the native manifest route and hand-written service worker.`);
    }
  }
}

if (failures.length > 0) {
  console.error('PWA integrity check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('PWA integrity check passed.');

const SERVICE_WORKER_URL = new URL(self.location.href);
const BUILD_VERSION = SERVICE_WORKER_URL.searchParams.get('v') || 'dev';
const API_BASE_URL = SERVICE_WORKER_URL.searchParams.get('api') || '';
const CACHE_PREFIX = 'scholaroscope-shell-';
const SHELL_CACHE = `${CACHE_PREFIX}${BUILD_VERSION}`;
const OFFLINE_URL = '/offline';
const PRECACHE_URLS = ['/', OFFLINE_URL];
const STATIC_ASSET_EXTENSIONS = /\.(?:avif|css|gif|ico|jpg|jpeg|js|json|png|svg|webp|woff2?)$/i;
const STATIC_DESTINATIONS = new Set(['font', 'image', 'manifest', 'script', 'style']);

function resolveOrigin(value) {
  if (!value) {
    return '';
  }

  try {
    return new URL(value, self.location.origin).origin;
  } catch {
    return '';
  }
}

const API_ORIGIN = resolveOrigin(API_BASE_URL);

function isApiRequest(url) {
  return (
    (API_ORIGIN !== '' && url.origin === API_ORIGIN)
    || (url.origin === self.location.origin && url.pathname.startsWith('/api/'))
  );
}

function isCacheableStaticAsset(request, url) {
  return (
    url.origin === self.location.origin
    && (
      url.pathname.startsWith('/_next/static/')
      || STATIC_DESTINATIONS.has(request.destination)
      || STATIC_ASSET_EXTENSIONS.test(url.pathname)
    )
  );
}

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);

  await Promise.all(
    PRECACHE_URLS.map(async (path) => {
      try {
        const response = await fetch(new Request(path, { cache: 'reload' }));
        if (response.ok) {
          await cache.put(path, response);
        }
      } catch {
        // Install should still complete when the network is unavailable.
      }
    }),
  );
}

async function purgeOldCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== SHELL_CACHE)
      .map((cacheName) => caches.delete(cacheName)),
  );
}

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    const url = new URL(request.url);

    if (response.ok && response.type === 'basic' && url.origin === self.location.origin && url.pathname === '/') {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put('/', response.clone());
    }

    return response;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const offlineResponse = await caches.match(OFFLINE_URL);
    if (offlineResponse) {
      return offlineResponse;
    }

    return new Response('Scholaroscope is offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function handleStaticAssetRequest(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cachedResponse);

  return cachedResponse || networkResponsePromise;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheShell().then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    purgeOldCaches()
      .then(() => self.clients.claim())
      .then(async () => {
        const clients = await self.clients.matchAll({ type: 'window' });
        await Promise.all(
          clients.map((client) => client.postMessage({
            type: 'SCHOLAROSCOPE_SW_ACTIVATED',
            version: BUILD_VERSION,
          })),
        );
      }),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHOLAROSCOPE_SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || isApiRequest(url)) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (isCacheableStaticAsset(request, url)) {
    event.respondWith(handleStaticAssetRequest(request));
  }
});

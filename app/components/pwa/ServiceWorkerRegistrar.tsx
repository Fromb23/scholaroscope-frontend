'use client';

import { useEffect } from 'react';

const BUILD_VERSION = process.env.NEXT_PUBLIC_GIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

function buildServiceWorkerUrl() {
  const params = new URLSearchParams({
    v: BUILD_VERSION,
  });

  if (API_BASE_URL) {
    params.set('api', API_BASE_URL);
  }

  return `/sw.js?${params.toString()}`;
}

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register(buildServiceWorkerUrl()).catch(() => undefined);
  }, []);

  return null;
}

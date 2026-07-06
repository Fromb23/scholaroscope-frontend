'use client';

import { useCallback, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/app/components/ui/toast/useToast';

const BUILD_VERSION = process.env.NEXT_PUBLIC_GIT_SHA || process.env.NEXT_PUBLIC_APP_VERSION || 'dev';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
const UPDATE_TOAST_ID = 'pwa-update-available';

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
  const { dismissToast, showToast } = useToast();
  const updateWorkerRef = useRef<ServiceWorker | null>(null);
  const reloadRequestedRef = useRef(false);

  const refreshForUpdate = useCallback(() => {
    reloadRequestedRef.current = true;
    dismissToast(UPDATE_TOAST_ID);

    const waitingWorker = updateWorkerRef.current;
    if (waitingWorker && waitingWorker.state !== 'activated') {
      waitingWorker.postMessage({ type: 'SCHOLAROSCOPE_SKIP_WAITING' });
      window.setTimeout(() => {
        if (reloadRequestedRef.current) {
          window.location.reload();
        }
      }, 1500);
      return;
    }

    window.location.reload();
  }, [dismissToast]);

  const showUpdateToast = useCallback((worker?: ServiceWorker | null) => {
    if (worker) {
      updateWorkerRef.current = worker;
    }

    showToast({
      id: UPDATE_TOAST_ID,
      title: 'Update available',
      message: 'A new version of Scholaroscope is available.',
      severity: 'info',
      autoDismissMs: false,
      action: {
        label: 'Refresh',
        onClick: refreshForUpdate,
        icon: <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />,
      },
    });
  }, [refreshForUpdate, showToast]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return;
    }

    const hadControllerAtStartup = Boolean(navigator.serviceWorker.controller);

    const handleControllerChange = () => {
      if (reloadRequestedRef.current) {
        reloadRequestedRef.current = false;
        window.location.reload();
        return;
      }

      if (hadControllerAtStartup) {
        showUpdateToast();
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SCHOLAROSCOPE_SW_ACTIVATED' && hadControllerAtStartup) {
        showUpdateToast();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    navigator.serviceWorker.addEventListener('message', handleMessage);

    let registration: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker
      .register(buildServiceWorkerUrl())
      .then((nextRegistration) => {
        registration = nextRegistration;

        if (nextRegistration.waiting && navigator.serviceWorker.controller) {
          showUpdateToast(nextRegistration.waiting);
        }

        const handleUpdateFound = () => {
          const installingWorker = nextRegistration.installing;
          if (!installingWorker) {
            return;
          }

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast(installingWorker);
            }
          });
        };

        nextRegistration.addEventListener('updatefound', handleUpdateFound);
        nextRegistration.update().catch(() => undefined);
      })
      .catch(() => undefined);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      registration?.update().catch(() => undefined);
    };
  }, [showUpdateToast]);

  return null;
}

'use client';

import { ErrorState } from '@/app/components/ui/errors/ErrorState';
import type { ErrorUiModel } from '@/app/components/ui/errors/errorTypes';

const offlineError: ErrorUiModel = {
  kind: 'offline',
  title: 'You are offline',
  message: 'Scholaroscope can open, but live workspace data needs a network connection. Reconnect and try again.',
  retryable: true,
  severity: 'warning',
  channel: 'page',
  actionLabel: 'Retry',
};

export function OfflineRetryState() {
  return (
    <ErrorState
      error={offlineError}
      fullScreen
      className="theme-app-bg px-4"
      onRetry={() => window.location.reload()}
    />
  );
}

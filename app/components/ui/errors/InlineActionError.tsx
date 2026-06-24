'use client';

import type { ErrorUiModel } from './errorTypes';
import { AppErrorBanner } from './AppErrorBanner';

interface InlineActionErrorProps {
  error: ErrorUiModel;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function InlineActionError({ error, onDismiss, onRetry, className }: InlineActionErrorProps) {
  return <AppErrorBanner error={error} onDismiss={onDismiss} onAction={onRetry} compact className={className} />;
}

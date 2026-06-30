'use client';

import type { ErrorUiModel } from './errorTypes';
import { ErrorState } from './ErrorState';

interface NetworkErrorStateProps {
  error: ErrorUiModel;
  onRetry: () => void;
  className?: string;
}

export function NetworkErrorState({ error, onRetry, className }: NetworkErrorStateProps) {
  return (
    <ErrorState
      error={error}
      onRetry={onRetry}
      fullScreen={error.channel === 'page'}
      className={`mx-auto max-w-2xl ${className ?? ''}`}
    />
  );
}

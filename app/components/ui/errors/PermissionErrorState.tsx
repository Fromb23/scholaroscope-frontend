'use client';

import type { ErrorUiModel } from './errorTypes';
import { ErrorState } from './ErrorState';

interface PermissionErrorStateProps {
  error: ErrorUiModel;
  onRetry?: () => void;
  className?: string;
}

export function PermissionErrorState({ error, onRetry, className }: PermissionErrorStateProps) {
  return <ErrorState error={error} onRetry={onRetry} className={className} />;
}

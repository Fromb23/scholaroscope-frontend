'use client';

import type { ErrorUiModel } from './errorTypes';
import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import { Button } from '@/app/components/ui/Button';
import { ValidationErrorSummary } from './ValidationErrorSummary';

interface AppErrorBannerProps {
  error: ErrorUiModel;
  onDismiss?: () => void;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

function variantFor(error: ErrorUiModel): 'error' | 'warning' | 'info' {
  return error.severity === 'info' ? 'info' : error.severity === 'warning' ? 'warning' : 'error';
}

export function AppErrorBanner({ error, onDismiss, onAction, compact = false, className = '' }: AppErrorBannerProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <ErrorBanner
        title={error.title}
        message={error.message}
        variant={variantFor(error)}
        compact={compact}
        onDismiss={onDismiss ?? (() => undefined)}
      />
      {error.fieldErrors ? <ValidationErrorSummary fieldErrors={error.fieldErrors} /> : null}
      {(onAction && (error.retryable || error.actionLabel)) || error.supportCode ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {onAction && (error.retryable || error.actionLabel) ? (
            <Button type="button" variant="secondary" size="sm" onClick={onAction}>
              {error.actionLabel ?? 'Try again'}
            </Button>
          ) : null}
          {error.supportCode ? (
            <span className="theme-subtle">Support code: {error.supportCode}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

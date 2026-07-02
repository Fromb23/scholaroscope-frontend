'use client';

import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { ErrorUiModel } from './errorTypes';
import { Button } from '@/app/components/ui/Button';
import { ValidationErrorSummary } from './ValidationErrorSummary';

interface ErrorStateProps {
  error: ErrorUiModel;
  onRetry?: () => void;
  fullScreen?: boolean;
  className?: string;
}

export function ErrorState({ error, onRetry, fullScreen = false, className = '' }: ErrorStateProps) {
  const Icon = error.severity === 'info' ? Info : error.severity === 'warning' ? AlertTriangle : AlertCircle;
  const role = error.severity === 'info' ? 'status' : 'alert';
  return (
    <div className={`flex items-center justify-center ${fullScreen ? 'h-screen' : 'py-10'} ${className}`}>
      <div className="max-w-lg text-center" role={role} aria-live={role === 'alert' ? 'assertive' : 'polite'}>
        <Icon className="mx-auto h-12 w-12 text-[color:var(--color-danger)]" />
        <h3 className="mt-3 text-base font-semibold theme-text">{error.title}</h3>
        <p className="theme-muted mt-2 text-sm">{error.message}</p>
        {error.fieldErrors ? <ValidationErrorSummary fieldErrors={error.fieldErrors} className="mt-4 text-left" /> : null}
        {onRetry && error.retryable ? (
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={onRetry}>{error.actionLabel ?? 'Try again'}</Button>
          </div>
        ) : null}
        {error.supportCode ? <p className="theme-subtle mt-3 text-xs">Support code: {error.supportCode}</p> : null}
      </div>
    </div>
  );
}

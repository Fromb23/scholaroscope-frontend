'use client';

// ============================================================================
// app/components/ui/ErrorState.tsx
//
// Full-screen centered error state with optional retry action.
// Use for page-level error states.
// ============================================================================

import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
  fullScreen = true,
}: ErrorStateProps) {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? 'h-screen' : 'py-16'}`}>
      <div className="text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-[color:var(--color-danger)]" />
        <h3 className="mt-2 text-sm font-medium theme-text">Error</h3>
        <p className="theme-muted mt-1 max-w-sm text-sm">{message}</p>
        {onRetry && (
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

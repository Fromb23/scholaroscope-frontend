'use client';

// ============================================================================
// app/components/ui/LoadingSpinner.tsx
//
// Full-screen centered loading spinner.
// Use for page-level loading states.
// ============================================================================

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ message, fullScreen = true }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? 'h-screen' : 'py-16'}`}>
      <div className="text-center">
        <div
          className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        />
        {message && <p className="theme-muted mt-4 text-sm">{message}</p>}
      </div>
    </div>
  );
}

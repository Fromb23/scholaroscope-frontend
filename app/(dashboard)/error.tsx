'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <h2 className="text-xl font-semibold theme-text">Something went wrong</h2>
      <p className="theme-muted max-w-md text-sm">
        An unexpected error occurred. Your data is safe — try reloading this section.
      </p>
      <button
        onClick={reset}
        className="theme-button-primary theme-focus-ring rounded-md px-4 py-2 text-sm transition-colors"
      >
        Reload
      </button>
    </div>
  );
}

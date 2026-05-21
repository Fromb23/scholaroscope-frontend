// app/components/ui/ErrorBanner.tsx
'use client';

import { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  autoDismissMs?: number | false;
}

export function ErrorBanner({ message, onDismiss, autoDismissMs = false }: ErrorBannerProps) {
  useEffect(() => {
    if (typeof autoDismissMs !== 'number' || autoDismissMs <= 0) {
      return;
    }

    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, message, onDismiss]);

  return (
    <div className="theme-danger-surface flex items-start gap-3 rounded-xl p-4 text-sm">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--color-danger)]" />
      <span className="flex-1 whitespace-pre-wrap">{message}</span>
      <button
        onClick={onDismiss}
        className="theme-focus-ring shrink-0 text-[color:var(--color-danger)] opacity-70 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

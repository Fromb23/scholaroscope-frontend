'use client';

import { ErrorBanner } from '@/app/components/ui/ErrorBanner';
import type { ToastMessage } from './toastTypes';

interface ToastViewportProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-relevant="additions removals"
      className="pwa-safe-area-toast pointer-events-none fixed inset-x-3 bottom-3 z-[90] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96"
    >
      {toasts.map((toast) => (
        <ErrorBanner
          key={toast.id}
          title={toast.title}
          message={toast.message}
          variant={toast.severity}
          onDismiss={() => onDismiss(toast.id)}
          autoDismissMs={false}
          compact
          action={toast.action}
          className="pointer-events-auto shadow-lg"
        />
      ))}
    </div>
  );
}

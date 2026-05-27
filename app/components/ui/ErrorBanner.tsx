// app/components/ui/ErrorBanner.tsx
'use client';

import { forwardRef, useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  variant?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  autoDismissMs?: number | false;
  className?: string;
  compact?: boolean;
}

const VARIANT_STYLES = {
  error: {
    container: 'theme-danger-surface',
    icon: 'text-[color:var(--color-danger)]',
    Icon: AlertCircle,
  },
  warning: {
    container: 'theme-warning-surface',
    icon: 'text-[color:var(--color-warning)]',
    Icon: AlertTriangle,
  },
  info: {
    container: 'theme-info-surface',
    icon: 'text-[color:var(--color-primary)]',
    Icon: Info,
  },
  success: {
    container: 'theme-success-surface',
    icon: 'text-[color:var(--color-success)]',
    Icon: CheckCircle2,
  },
} as const;

export const ErrorBanner = forwardRef<HTMLDivElement, ErrorBannerProps>(function ErrorBanner({
  message,
  onDismiss,
  variant = 'error',
  title,
  autoDismissMs = false,
  className = '',
  compact = false,
}, ref) {
  useEffect(() => {
    if (typeof autoDismissMs !== 'number' || autoDismissMs <= 0) {
      return;
    }

    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [autoDismissMs, message, onDismiss]);

  const resolvedRole = variant === 'error' || variant === 'warning' ? 'alert' : 'status';
  const styles = VARIANT_STYLES[variant];
  const Icon = styles.Icon;

  return (
    <div
      ref={ref}
      role={resolvedRole}
      aria-live={resolvedRole === 'alert' ? 'assertive' : 'polite'}
      tabIndex={-1}
      className={`${styles.container} flex items-start gap-3 text-sm outline-none ${
        compact ? 'rounded-lg p-3' : 'rounded-xl p-4'
      } ${className}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${styles.icon}`} />
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-semibold theme-text">{title}</p> : null}
        <p className="whitespace-pre-wrap theme-text">{message}</p>
      </div>
      <button
        onClick={onDismiss}
        type="button"
        aria-label="Dismiss message"
        className={`theme-focus-ring shrink-0 opacity-70 hover:opacity-100 ${styles.icon}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
});

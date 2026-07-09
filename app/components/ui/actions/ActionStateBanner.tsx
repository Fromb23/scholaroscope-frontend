'use client';

import { forwardRef, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, Loader, ShieldAlert, X } from 'lucide-react';

export type ActionStateBannerVariant = 'info' | 'warning' | 'error' | 'success' | 'loading' | 'blocked';

interface ActionStateBannerProps {
  variant: ActionStateBannerVariant;
  message: ReactNode;
  title?: string;
  action?: ReactNode;
  compact?: boolean;
  persist?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<ActionStateBannerVariant, string> = {
  info: 'theme-info-surface-strong',
  warning: 'theme-warning-surface',
  error: 'theme-danger-surface',
  success: 'theme-success-surface',
  loading: 'theme-info-surface-strong',
  blocked: 'theme-warning-surface',
};

const iconStyles: Record<ActionStateBannerVariant, string> = {
  info: 'text-[color:var(--color-info)]',
  warning: 'text-[color:var(--color-warning)]',
  error: 'text-[color:var(--color-danger)]',
  success: 'text-[color:var(--color-success)]',
  loading: 'text-[color:var(--color-info)]',
  blocked: 'text-[color:var(--color-warning)]',
};

function StateIcon({ variant }: { variant: ActionStateBannerVariant }) {
  const className = `mt-0.5 h-4 w-4 shrink-0 ${iconStyles[variant]}`;
  if (variant === 'loading') return <Loader className={`${className} animate-spin`} />;
  if (variant === 'success') return <CheckCircle2 className={className} />;
  if (variant === 'error') return <AlertCircle className={className} />;
  if (variant === 'blocked') return <ShieldAlert className={className} />;
  if (variant === 'warning') return <AlertCircle className={className} />;
  return <Info className={className} />;
}

export const ActionStateBanner = forwardRef<HTMLDivElement, ActionStateBannerProps>(function ActionStateBanner({
  variant,
  message,
  title,
  action,
  compact = false,
  persist = true,
  onDismiss,
  className = '',
}, ref) {
  return (
    <div
      ref={ref}
      data-action-state-persist={persist ? 'true' : 'false'}
      className={[
        'rounded-lg text-sm',
        compact ? 'p-3' : 'p-4',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <StateIcon variant={variant} />
        <div className="min-w-0 flex-1">
          {title ? <p className="font-semibold theme-text">{title}</p> : null}
          <div className={`${title ? 'mt-1' : ''} whitespace-pre-wrap break-words theme-text`}>
            {message}
          </div>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="theme-focus-ring shrink-0 rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
            aria-label="Dismiss action message"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
});

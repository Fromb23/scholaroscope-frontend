import type { ReactNode } from 'react';

type LoadingSpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  message?: ReactNode;
  fullScreen?: boolean;
  size?: LoadingSpinnerSize;
  showMessage?: boolean;
}

const sizeClasses: Record<LoadingSpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
};

export function LoadingSpinner({ message, fullScreen = true, size = 'lg', showMessage = true }: LoadingSpinnerProps) {
  const hasVisibleMessage = Boolean(message && showMessage);
  const containerClass = fullScreen
    ? 'h-screen'
    : hasVisibleMessage
      ? 'py-16'
      : 'inline-flex';

  return (
    <div className={`flex items-center justify-center ${containerClass}`}>
      <div className="text-center">
        <div
          className={`mx-auto animate-spin rounded-full border-t-transparent ${sizeClasses[size]}`}
          style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
          aria-hidden={message ? undefined : true}
          aria-label={!hasVisibleMessage && typeof message === 'string' ? message : undefined}
        />
        {hasVisibleMessage ? <p className="theme-muted mt-4 text-sm">{message}</p> : null}
      </div>
    </div>
  );
}

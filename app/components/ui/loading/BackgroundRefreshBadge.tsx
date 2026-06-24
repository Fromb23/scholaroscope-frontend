interface BackgroundRefreshBadgeProps {
  message?: string;
  className?: string;
}

export function BackgroundRefreshBadge({
  message = 'Updating...',
  className = '',
}: BackgroundRefreshBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border theme-border theme-surface px-3 py-1 text-xs font-medium theme-muted ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className="h-3 w-3 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        aria-hidden="true"
      />
      {message}
    </span>
  );
}

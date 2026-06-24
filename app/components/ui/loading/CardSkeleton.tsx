interface CardSkeletonProps {
  lines?: number;
  className?: string;
}

export function CardSkeleton({ lines = 3, className = '' }: CardSkeletonProps) {
  return (
    <div className={`theme-card rounded-lg p-6 ${className}`} aria-hidden="true">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-2/5 rounded bg-[color:var(--color-surface-muted)]" />
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, index) => (
            <div
              key={index}
              className="h-3 rounded bg-[color:var(--color-surface-muted)]"
              style={{ width: `${Math.max(42, 92 - index * 14)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

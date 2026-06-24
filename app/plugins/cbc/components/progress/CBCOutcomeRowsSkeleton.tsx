export function CBCOutcomeRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border theme-border" aria-hidden="true">
      <div className="divide-y theme-border">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid grid-cols-3 gap-4 px-4 py-3">
            <div className="h-3 animate-pulse rounded bg-[color:var(--color-surface-muted)]" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-[color:var(--color-surface-muted)]" />
            <div className="ml-auto h-3 w-12 animate-pulse rounded bg-[color:var(--color-surface-muted)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

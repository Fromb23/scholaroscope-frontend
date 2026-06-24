export function CBCStrandRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-lg border theme-border p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/3 rounded bg-[color:var(--color-surface-muted)]" />
            <div className="h-3 w-full rounded bg-[color:var(--color-surface-muted)]" />
            <div className="h-3 w-2/3 rounded bg-[color:var(--color-surface-muted)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

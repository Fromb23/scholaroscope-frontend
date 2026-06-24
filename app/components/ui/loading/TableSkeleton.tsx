interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({
  rows = 6,
  columns = 4,
  showHeader = true,
  className = '',
}: TableSkeletonProps) {
  return (
    <div className={`theme-table overflow-hidden rounded-lg ${className}`} aria-hidden="true">
      <table className="min-w-full table-fixed">
        {showHeader ? (
          <thead className="theme-table-header">
            <tr>
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <th key={columnIndex} className="px-6 py-3">
                  <div className="h-3 w-3/5 animate-pulse rounded bg-[color:var(--color-surface-muted)]" />
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody className="theme-surface">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b theme-border">
              {Array.from({ length: columns }).map((_, columnIndex) => (
                <td key={columnIndex} className="px-6 py-4">
                  <div
                    className="h-3 animate-pulse rounded bg-[color:var(--color-surface-muted)]"
                    style={{ width: `${columnIndex === 0 ? 74 : 54 + ((rowIndex + columnIndex) % 3) * 12}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

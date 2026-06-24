import { CardSkeleton } from './CardSkeleton';
import { TableSkeleton } from './TableSkeleton';

type PageSkeletonVariant = 'dashboard' | 'report' | 'detail' | 'form' | 'generic';

interface PageSkeletonProps {
  variant?: PageSkeletonVariant;
  className?: string;
}

export function PageSkeleton({ variant = 'generic', className = '' }: PageSkeletonProps) {
  if (variant === 'dashboard') {
    return (
      <div className={`space-y-6 ${className}`} aria-hidden="true">
        <div className="animate-pulse space-y-3">
          <div className="h-7 w-72 rounded bg-[color:var(--color-surface-muted)]" />
          <div className="h-4 w-96 max-w-full rounded bg-[color:var(--color-surface-muted)]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} lines={2} />)}
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <CardSkeleton lines={6} />
          </div>
          <CardSkeleton lines={5} />
        </div>
      </div>
    );
  }

  if (variant === 'report') {
    return (
      <div className={`space-y-6 ${className}`} aria-hidden="true">
        <CardSkeleton lines={3} />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <CardSkeleton key={index} lines={2} />)}
        </div>
        <TableSkeleton rows={5} columns={5} />
      </div>
    );
  }

  if (variant === 'detail' || variant === 'form') {
    return (
      <div className={`grid gap-6 lg:grid-cols-3 ${className}`} aria-hidden="true">
        <div className="lg:col-span-2 space-y-6">
          <CardSkeleton lines={variant === 'form' ? 7 : 4} />
          <CardSkeleton lines={5} />
        </div>
        <CardSkeleton lines={5} />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} aria-hidden="true">
      <CardSkeleton lines={4} />
      <TableSkeleton rows={5} columns={4} />
    </div>
  );
}

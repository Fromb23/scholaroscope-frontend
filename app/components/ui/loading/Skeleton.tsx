import type { HTMLAttributes } from 'react';

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  rounded?: 'sm' | 'md' | 'lg' | 'full';
};

const roundedClass = {
  sm: 'rounded',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export function Skeleton({
  className = '',
  rounded = 'md',
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        'bg-[color:var(--color-surface-muted)] motion-safe:animate-pulse',
        roundedClass[rounded],
        className,
      ].join(' ')}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-3"
          style={{ width: `${Math.max(38, 92 - index * 16)}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="theme-card rounded-lg p-5" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-10 w-10" rounded="full" />
      </div>
    </div>
  );
}

export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr aria-hidden="true" className="border-b theme-border">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-4 py-4">
          <Skeleton className="h-3" style={{ width: index === 0 ? '72%' : '54%' }} />
        </td>
      ))}
    </tr>
  );
}

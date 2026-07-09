'use client';

import { Loader } from 'lucide-react';

interface ActionProgressProps {
  label: string;
  stage?: string | null;
  progressPercent?: number | null;
  completedCount?: number | null;
  totalCount?: number | null;
  fallbackMessage?: string | null;
  status?: string | null;
}

function clampPercent(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}

export function ActionProgress({
  label,
  stage,
  progressPercent,
  completedCount,
  totalCount,
  fallbackMessage,
  status,
}: ActionProgressProps) {
  const percent = clampPercent(progressPercent ?? 0);
  const active = !status || ['QUEUED', 'RUNNING', 'COMPUTING'].includes(status);

  return (
    <div className="rounded-lg border theme-border bg-[color:var(--color-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium theme-text">{label}</p>
          {stage ? <p className="mt-1 text-xs uppercase tracking-wide theme-subtle">{stage}</p> : null}
        </div>
        {status ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-[color:var(--color-surface-muted)] px-2.5 py-0.5 text-xs font-medium theme-muted">
            {active ? <Loader className="mr-1.5 h-3 w-3 animate-spin" /> : null}
            {status}
          </span>
        ) : null}
      </div>

      <div className="mt-4 h-3 overflow-hidden rounded-full bg-[color:var(--color-surface-muted)]">
        <div
          className="h-full rounded-full bg-[color:var(--color-primary)] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-xs theme-subtle">
        <span>{percent}%</span>
        <span>
          {completedCount ?? 0}
          {totalCount ? ` / ${totalCount}` : ''}
        </span>
      </div>

      {fallbackMessage ? (
        <p className="mt-3 text-xs text-[color:var(--color-warning)]">{fallbackMessage}</p>
      ) : null}
    </div>
  );
}

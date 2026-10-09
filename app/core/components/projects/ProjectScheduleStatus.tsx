'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  OctagonAlert,
} from 'lucide-react';
import { Badge } from '@/app/components/ui/Badge';
import type { ProjectSchedule } from '@/app/core/types/projects';

const statusPresentation = {
  SCHEDULED: {
    label: 'Scheduled',
    detail: 'Starts in',
    variant: 'info',
    surface: 'theme-info-surface',
    progress: 'bg-[color:var(--color-info)]',
    Icon: CalendarClock,
  },
  NORMAL: {
    label: 'On schedule',
    detail: 'Remaining',
    variant: 'success',
    surface: 'theme-success-surface',
    progress: 'bg-[color:var(--color-success)]',
    Icon: CheckCircle2,
  },
  ATTENTION: {
    label: 'Deadline approaching',
    detail: 'Remaining',
    variant: 'warning',
    surface: 'theme-warning-surface',
    progress: 'bg-[color:var(--color-warning)]',
    Icon: Clock3,
  },
  URGENT: {
    label: 'Urgent: deadline approaching',
    detail: 'Remaining',
    variant: 'orange',
    surface: 'theme-warning-surface ring-1 ring-[color:var(--color-warning)]',
    progress: 'bg-[color:var(--color-warning)]',
    Icon: AlertTriangle,
  },
  CRITICAL: {
    label: 'Critical deadline warning',
    detail: 'Remaining',
    variant: 'danger',
    surface: 'theme-danger-surface',
    progress: 'bg-[color:var(--color-danger)]',
    Icon: OctagonAlert,
  },
  DUE_TODAY: {
    label: 'Due today',
    detail: 'Remaining today',
    variant: 'danger',
    surface: 'theme-danger-surface ring-2 ring-[color:var(--color-danger)]',
    progress: 'bg-[color:var(--color-danger)]',
    Icon: OctagonAlert,
  },
  OVERDUE: {
    label: 'Deadline passed',
    detail: '',
    variant: 'danger',
    surface:
      'theme-danger-surface ring-2 ring-[color:color-mix(in_srgb,var(--color-danger)_70%,black)]',
    progress: 'bg-[color:var(--color-danger)]',
    Icon: AlertCircle,
  },
  CLOSED: {
    label: 'Project closed',
    detail: '',
    variant: 'default',
    surface: 'theme-surface-muted',
    progress: 'bg-[color:var(--color-text-muted)]',
    Icon: CheckCircle2,
  },
} as const;

function durationLabel(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const days = Math.floor(safe / 86_400);
  const hours = Math.floor((safe % 86_400) / 3_600);
  const minutes = Math.floor((safe % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function projectScheduleAccessibleLabel(schedule: ProjectSchedule, visibleSeconds: number): string {
  const presentation = statusPresentation[schedule.urgency];
  if (schedule.urgency === 'OVERDUE' || schedule.urgency === 'CLOSED') return presentation.label;
  return `${presentation.label}. ${presentation.detail}: ${durationLabel(visibleSeconds)}.`;
}

export function ProjectScheduleStatus({
  schedule,
  compact = false,
}: {
  schedule: ProjectSchedule;
  compact?: boolean;
}) {
  const [visibleSeconds, setVisibleSeconds] = useState(
    schedule.urgency === 'SCHEDULED' ? 0 : schedule.remaining_seconds,
  );
  useEffect(() => {
    setVisibleSeconds(
      schedule.urgency === 'SCHEDULED'
        ? Math.floor((new Date(schedule.starts_at).getTime() - Date.now()) / 1_000)
        : schedule.remaining_seconds,
    );
    const timer = window.setInterval(
      () => setVisibleSeconds((current) => Math.max(0, current - 30)),
      30_000,
    );
    return () => window.clearInterval(timer);
  }, [schedule]);

  const presentation = statusPresentation[schedule.urgency];
  const accessibleLabel = projectScheduleAccessibleLabel(schedule, visibleSeconds);
  const Icon = presentation.Icon;

  return (
    <div
      className={`rounded-lg border theme-border ${presentation.surface} ${compact ? 'p-3' : 'p-4'}`}
      aria-label={accessibleLabel}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={presentation.variant} size="sm">
          <Icon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          {presentation.label}
        </Badge>
        {presentation.detail ? (
          <span className="text-sm font-semibold theme-text">
            {presentation.detail}: {durationLabel(visibleSeconds)}
          </span>
        ) : null}
      </div>
      {schedule.urgency === 'SCHEDULED' ? (
        <p className="mt-2 text-xs theme-muted">
          Starts {new Date(schedule.starts_at).toLocaleString(undefined, { timeZone: schedule.timezone })}
        </p>
      ) : null}
      {!compact ? (
        <>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full theme-surface-elevated"
            role="progressbar"
            aria-label="Elapsed project time"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={schedule.elapsed_percentage}
          >
            <div
              className={`h-full ${presentation.progress}`}
              style={{ width: `${Math.min(100, Math.max(0, schedule.elapsed_percentage))}%` }}
            />
          </div>
          <p className="mt-1 text-xs theme-muted">
            {schedule.elapsed_percentage.toFixed(0)}% of scheduled project time elapsed
          </p>
        </>
      ) : null}
    </div>
  );
}

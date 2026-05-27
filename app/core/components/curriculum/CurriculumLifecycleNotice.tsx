'use client';

import { AlertCircle, AlertTriangle, Clock3, Info, ShieldAlert, Siren } from 'lucide-react';
import { CurriculumLifecycleBadge } from '@/app/core/components/curriculum/CurriculumLifecycleBadge';
import { getCurriculumStatusMessage } from '@/app/core/lib/curriculumLifecycle';
import type { CurriculumOfferingStatus } from '@/app/core/types/academic';

function renderNoticeIcon(status?: CurriculumOfferingStatus | null) {
  switch (status) {
    case 'DISABLE_REQUESTED':
      return <AlertTriangle className="h-5 w-5 shrink-0" />;
    case 'DRAINING':
      return <Clock3 className="h-5 w-5 shrink-0" />;
    case 'FINALIZING':
      return <Siren className="h-5 w-5 shrink-0" />;
    case 'REACTIVATING':
      return <Info className="h-5 w-5 shrink-0" />;
    case 'FAILED':
      return <ShieldAlert className="h-5 w-5 shrink-0" />;
    case 'DISABLED':
      return <AlertCircle className="h-5 w-5 shrink-0" />;
    default:
      return <Info className="h-5 w-5 shrink-0" />;
  }
}

function getNoticeVariant(status?: CurriculumOfferingStatus | null): 'warning' | 'danger' | 'info' | 'success' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'FAILED':
      return 'danger';
    case 'REACTIVATING':
      return 'info';
    case 'DISABLE_REQUESTED':
    case 'DRAINING':
    case 'DISABLED':
      return 'warning';
    case 'FINALIZING':
      return 'info';
    default:
      return 'warning';
  }
}

function getNoticeContainerClasses(variant: 'warning' | 'danger' | 'info' | 'success'): string {
  switch (variant) {
    case 'danger':
      return 'theme-danger-surface';
    case 'info':
      return 'theme-info-surface';
    case 'success':
      return 'theme-success-surface';
    case 'warning':
    default:
      return 'theme-warning-surface';
  }
}

function getNoticeAccentColor(variant: 'warning' | 'danger' | 'info' | 'success'): string {
  switch (variant) {
    case 'danger':
      return 'var(--color-danger)';
    case 'info':
      return 'var(--color-primary)';
    case 'success':
      return 'var(--color-success)';
    case 'warning':
    default:
      return 'var(--color-warning)';
  }
}

function isBlockingLifecycleStatus(status?: CurriculumOfferingStatus | null): boolean {
  switch (status) {
    case 'DISABLE_REQUESTED':
    case 'DRAINING':
    case 'DISABLED':
    case 'FINALIZING':
    case 'FAILED':
      return true;
    default:
      return false;
  }
}

function getNoticeTitle(title?: string, status?: CurriculumOfferingStatus | null): string {
  if (title) {
    return title;
  }

  if (isBlockingLifecycleStatus(status)) {
    return 'Restricted curriculum lifecycle state';
  }

  return 'Curriculum lifecycle status';
}

export function CurriculumLifecycleNotice({
  status,
  title,
  message,
  role = 'ADMIN',
}: {
  status?: CurriculumOfferingStatus | null;
  title?: string;
  message?: string | null;
  role?: 'ADMIN' | 'INSTRUCTOR' | 'SUPERADMIN';
}) {
  const variant = getNoticeVariant(status);
  const accentColor = getNoticeAccentColor(variant);
  const blocking = isBlockingLifecycleStatus(status);

  return (
    <div
      role={blocking ? 'alert' : 'status'}
      aria-live={blocking ? 'assertive' : 'polite'}
      className={`${getNoticeContainerClasses(variant)} relative overflow-hidden rounded-xl border`}
    >
      <div
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />
      <div className="flex items-start gap-4 p-4 pl-5">
        <div
          className="theme-surface-elevated mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
          style={{
            borderColor: `color-mix(in srgb, ${accentColor} 32%, transparent)`,
            color: accentColor,
            backgroundColor: `color-mix(in srgb, ${accentColor} 10%, var(--color-surface))`,
          }}
        >
          {renderNoticeIcon(status)}
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold theme-text">
              {getNoticeTitle(title, status)}
            </p>
            <CurriculumLifecycleBadge status={status} />
          </div>
          <p className="text-sm leading-6 theme-text">
            {message ?? getCurriculumStatusMessage(status, role)}
          </p>
        </div>
      </div>
    </div>
  );
}

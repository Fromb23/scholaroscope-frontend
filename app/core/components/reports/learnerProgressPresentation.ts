import type { LearnerTermProgressResultStatus } from '@/app/core/types/reporting';

export type LearnerProgressBadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

export function labelize(value: string | null | undefined): string {
  return String(value ?? '').replace(/_/g, ' ').replace(/-/g, ' ').trim() || 'Not available';
}

export function sentenceLabel(value: string | null | undefined): string {
  const text = labelize(value).toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Not available';
}

export function statusBadgeVariant(
  status: LearnerTermProgressResultStatus | undefined,
): LearnerProgressBadgeVariant {
  const normalized = String(status ?? '').toUpperCase();
  if (normalized === 'FINAL' || normalized === 'ASSESSED') return 'success';
  if (normalized === 'PROVISIONAL' || normalized === 'READY_FOR_REVIEW') return 'warning';
  if (normalized === 'STALE' || normalized === 'RECALCULATION_REQUIRED') return 'danger';
  if (['NO_EVIDENCE', 'AWAITING_EVIDENCE', 'TAUGHT_NOT_OBSERVED', 'NOT_TAUGHT'].includes(normalized)) return 'info';
  return 'default';
}

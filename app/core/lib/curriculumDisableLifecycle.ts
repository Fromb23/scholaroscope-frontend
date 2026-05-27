import type { CurriculumDisableRequestStatus } from '@/app/core/types/academic';

export const ACTIVE_DISABLE_REQUEST_STATUSES = [
  'PENDING',
  'DRAINING',
  'WAITING_DUE_DATES',
  'FINALIZING',
] as const satisfies readonly CurriculumDisableRequestStatus[];

export const TERMINAL_DISABLE_REQUEST_STATUSES = [
  'COMPLETED',
  'CANCELLED',
  'FAILED',
] as const satisfies readonly CurriculumDisableRequestStatus[];

const ACTIVE_DISABLE_REQUEST_STATUS_SET = new Set<string>(ACTIVE_DISABLE_REQUEST_STATUSES);
const TERMINAL_DISABLE_REQUEST_STATUS_SET = new Set<string>(TERMINAL_DISABLE_REQUEST_STATUSES);

function normalizeStatus(status?: string | null): string {
  return (status ?? '').trim().toUpperCase();
}

export function isActiveDisableRequestStatus(status?: string | null): boolean {
  return ACTIVE_DISABLE_REQUEST_STATUS_SET.has(normalizeStatus(status));
}

export function isTerminalDisableRequestStatus(status?: string | null): boolean {
  return TERMINAL_DISABLE_REQUEST_STATUS_SET.has(normalizeStatus(status));
}

export function getDisableRequestStatusLabel(status?: string | null): string {
  switch (normalizeStatus(status)) {
    case 'PENDING':
      return 'Pending';
    case 'DRAINING':
      return 'Draining';
    case 'WAITING_DUE_DATES':
      return 'Waiting due dates';
    case 'FINALIZING':
      return 'Finalizing';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    case 'FAILED':
      return 'Failed';
    default:
      return 'Unknown';
  }
}

export function canStartNewDisableRequest({
  isEnabled,
  activeDisableRequestStatus,
  latestDisableRequestStatus,
}: {
  isEnabled?: boolean | null;
  activeDisableRequestStatus?: string | null;
  latestDisableRequestStatus?: string | null;
}): boolean {
  if (!isEnabled) {
    return false;
  }

  if (isActiveDisableRequestStatus(activeDisableRequestStatus)) {
    return false;
  }

  if (!latestDisableRequestStatus) {
    return true;
  }

  return isTerminalDisableRequestStatus(latestDisableRequestStatus);
}

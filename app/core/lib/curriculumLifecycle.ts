import type {
  Curriculum,
  CurriculumDisableRequestStatus,
  CurriculumOfferingStatus,
} from '@/app/core/types/academic';
import {
  canStartNewDisableRequest,
  isActiveDisableRequestStatus,
} from '@/app/core/lib/curriculumDisableLifecycle';

export type CurriculumRouteIntent =
  | 'read'
  | 'create'
  | 'edit'
  | 'complete'
  | 'admin-disable'
  | 'admin-reactivate';

export type CurriculumLifecycleRole = 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR';

export interface CurriculumRouteAccessDecision {
  allowed: boolean;
  readOnly: boolean;
  label: string;
  message: string;
}

const CAMBRIDGE_TYPE_PREFIX = /^CAM_/;

const STATUS_PRIORITY: Record<CurriculumOfferingStatus, number> = {
  ACTIVE: 0,
  DISABLE_REQUESTED: 1,
  DRAINING: 2,
  FINALIZING: 3,
  REACTIVATING: 4,
  FAILED: 5,
  DISABLED: 6,
};

function normalizeCurriculumType(curriculumType?: string | null): string {
  const normalized = (curriculumType ?? '').trim().toUpperCase();

  if (normalized === 'CBC') {
    return 'CBE';
  }

  if (normalized === 'CAMBRIDGE' || CAMBRIDGE_TYPE_PREFIX.test(normalized)) {
    return 'CAMBRIDGE';
  }

  return normalized;
}

export function curriculumMatchesType(
  curriculum: Pick<Curriculum, 'curriculum_type'> | null | undefined,
  curriculumType?: string | null,
): boolean {
  if (!curriculum || !curriculumType) {
    return false;
  }

  return normalizeCurriculumType(curriculum.curriculum_type) === normalizeCurriculumType(curriculumType);
}

export function resolveCurriculumForType(
  curricula: Curriculum[],
  curriculumType?: string | null,
): Curriculum | null {
  if (!curriculumType) {
    return null;
  }

  const matching = curricula.filter((curriculum) => curriculumMatchesType(curriculum, curriculumType));
  if (matching.length === 0) {
    return null;
  }

  return [...matching].sort((left, right) => {
    const statusGap = STATUS_PRIORITY[left.offering_status] - STATUS_PRIORITY[right.offering_status];
    if (statusGap !== 0) {
      return statusGap;
    }

    if (left.is_active !== right.is_active) {
      return left.is_active ? -1 : 1;
    }

    return left.id - right.id;
  })[0];
}

export function getCurriculumStatusLabel(status?: CurriculumOfferingStatus | null): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'DISABLE_REQUESTED':
      return 'Disable requested';
    case 'DRAINING':
      return 'Draining';
    case 'FINALIZING':
      return 'Finalizing reports';
    case 'DISABLED':
      return 'Disabled / read-only';
    case 'REACTIVATING':
      return 'Reactivating';
    case 'FAILED':
      return 'Disable failed';
    default:
      return 'Unavailable';
  }
}

export function getCurriculumStatusMessage(
  status?: CurriculumOfferingStatus | null,
  role: CurriculumLifecycleRole = 'ADMIN',
): string {
  switch (status) {
    case 'ACTIVE':
      return 'This curriculum is active.';
    case 'DISABLE_REQUESTED':
      return role === 'INSTRUCTOR'
        ? 'This curriculum is being disabled for this workspace. You can view historical records, but cannot create or modify academic work while shutdown is running.'
        : 'This curriculum disable is in progress. Academic work is read-only until this process is cancelled or completed.';
    case 'DRAINING':
      return role === 'INSTRUCTOR'
        ? 'This curriculum is being phased out. New work is blocked. You may only complete already active work where allowed.'
        : 'This curriculum is being disabled. New work is blocked while existing work is being drained.';
    case 'FINALIZING':
      return role === 'INSTRUCTOR'
        ? 'The system is finalizing this curriculum. Actions are temporarily unavailable.'
        : 'The system is finalizing reports and closing pending work.';
    case 'DISABLED':
      return role === 'INSTRUCTOR'
        ? 'This curriculum is disabled. Your historical records remain available for viewing.'
        : 'This curriculum is disabled. Historical records remain available in read-only form.';
    case 'REACTIVATING':
      return 'This curriculum is being reactivated. Wait until it becomes active again before creating new work.';
    case 'FAILED':
      return role === 'INSTRUCTOR'
        ? 'This curriculum disable workflow failed. Historical records remain visible, but new work is unavailable until an admin resolves it.'
        : 'This curriculum disable workflow failed. Review the failure reason and retry or reactivate as needed.';
    default:
      return 'This curriculum is not available for this route.';
  }
}

export function isCurriculumReadOnly(
  curriculum?: Pick<Curriculum, 'is_active' | 'offering_status'> | null,
): boolean {
  if (!curriculum) {
    return true;
  }

  return (
    curriculum.is_active === false
    || curriculum.offering_status === 'DISABLE_REQUESTED'
    || curriculum.offering_status === 'DRAINING'
    || curriculum.offering_status === 'FINALIZING'
    || curriculum.offering_status === 'DISABLED'
    || curriculum.offering_status === 'REACTIVATING'
    || curriculum.offering_status === 'FAILED'
  );
}

export function canCreateCurriculumWork(
  curriculum?: Pick<Curriculum, 'is_active' | 'offering_status'> | null,
): boolean {
  if (!curriculum) {
    return false;
  }

  return (
    curriculum.is_active !== false
    && curriculum.offering_status === 'ACTIVE'
  );
}

export function canEditCurriculumWork(
  curriculum?: Pick<Curriculum, 'is_active' | 'offering_status'> | null,
): boolean {
  return canCreateCurriculumWork(curriculum);
}

export function canUseCurriculumRoute(
  curriculum: Pick<Curriculum, 'is_active' | 'offering_status'> | null | undefined,
  routeIntent: CurriculumRouteIntent,
  role: CurriculumLifecycleRole = 'ADMIN',
): boolean {
  if (!curriculum) {
    return false;
  }

  switch (routeIntent) {
    case 'read':
      return true;
    case 'create':
      return canCreateCurriculumWork(curriculum);
    case 'edit':
      return canEditCurriculumWork(curriculum);
    case 'complete':
      return (
        curriculum.is_active !== false
        && (
          curriculum.offering_status === 'ACTIVE'
          || curriculum.offering_status === 'DRAINING'
        )
      );
    case 'admin-disable':
      return role !== 'INSTRUCTOR';
    case 'admin-reactivate':
      return role !== 'INSTRUCTOR'
        && (
          curriculum.offering_status === 'DISABLED'
          || curriculum.offering_status === 'FAILED'
          || curriculum.offering_status === 'DRAINING'
          || curriculum.offering_status === 'DISABLE_REQUESTED'
        );
    default:
      return false;
  }
}

export function getCurriculumRouteAccessDecision(
  curriculum: Pick<Curriculum, 'is_active' | 'offering_status'>,
  routeIntent: CurriculumRouteIntent,
  role: CurriculumLifecycleRole = 'ADMIN',
): CurriculumRouteAccessDecision {
  const label = getCurriculumStatusLabel(curriculum.offering_status);
  const message = getCurriculumStatusMessage(curriculum.offering_status, role);
  const readOnly = isCurriculumReadOnly(curriculum);

  return {
    allowed: canUseCurriculumRoute(curriculum, routeIntent, role),
    readOnly,
    label,
    message,
  };
}

export function getCurriculumActionBlockReason(
  curriculum?: Pick<Curriculum, 'is_active' | 'offering_status'> | null,
  routeIntent: Exclude<CurriculumRouteIntent, 'read' | 'admin-disable' | 'admin-reactivate'> = 'create',
  role: CurriculumLifecycleRole = 'ADMIN',
): string | null {
  if (!curriculum) {
    return 'This curriculum is not available for this action.';
  }

  if (canUseCurriculumRoute(curriculum, routeIntent, role)) {
    return null;
  }

  return getCurriculumStatusMessage(curriculum.offering_status, role);
}

const CURRICULUM_PLUGIN_KEY_BY_TYPE: Record<string, string> = {
  CBE: 'cbc',
  CAMBRIDGE: 'cambridge',
};

export function resolveCurriculumPluginKey(
  curriculum?: Pick<Curriculum, 'curriculum_type'> | null,
): string | null {
  if (!curriculum) {
    return null;
  }

  const normalizedType = normalizeCurriculumType(curriculum.curriculum_type);
  return CURRICULUM_PLUGIN_KEY_BY_TYPE[normalizedType] ?? null;
}

export function canManageCurriculumPlugin({
  pluginActive,
  pluginAvailable,
  curriculum,
  activeDisableRequestStatus,
  latestDisableRequestStatus,
}: {
  pluginActive: boolean;
  pluginAvailable: boolean;
  curriculum?: Pick<Curriculum, 'offering_status'> | null;
  activeDisableRequestStatus?: CurriculumDisableRequestStatus | null;
  latestDisableRequestStatus?: CurriculumDisableRequestStatus | null;
}): boolean {
  if (!pluginActive || !pluginAvailable || !curriculum) {
    return false;
  }

  return canStartNewDisableRequest({
    isEnabled: curriculum.offering_status === 'ACTIVE',
    activeDisableRequestStatus,
    latestDisableRequestStatus,
  });
}

export function getCurriculumPluginManagementBlockMessage({
  pluginActive,
  pluginAvailable,
  curriculum,
  activeDisableRequestStatus,
}: {
  pluginActive: boolean;
  pluginAvailable: boolean;
  curriculum?: Pick<Curriculum, 'offering_status'> | null;
  activeDisableRequestStatus?: CurriculumDisableRequestStatus | null;
}): string | null {
  if (!curriculum) {
    return null;
  }

  if (!pluginAvailable) {
    return 'This plugin is unavailable right now.';
  }

  if (!pluginActive) {
    return 'Activate this plugin to resume curriculum management.';
  }

  if (activeDisableRequestStatus === 'WAITING_DUE_DATES') {
    return 'Curriculum management is paused while this curriculum is draining.';
  }

  switch (curriculum.offering_status) {
    case 'DISABLE_REQUESTED':
    case 'DRAINING':
      return 'Curriculum management is paused while this curriculum is draining.';
    case 'FINALIZING':
      return 'The system is finalizing reports and locking this curriculum.';
    case 'DISABLED':
      return 'This curriculum is disabled. Historical records are read-only.';
    case 'FAILED':
      return 'Disable workflow needs review before curriculum management can continue.';
    case 'REACTIVATING':
      return 'Curriculum management will resume after reactivation completes.';
    default:
      return isActiveDisableRequestStatus(activeDisableRequestStatus)
        ? 'Curriculum management is paused while the lifecycle workflow is in progress.'
        : null;
  }
}

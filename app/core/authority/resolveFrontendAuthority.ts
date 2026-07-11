import type { WorkspaceCapabilities } from '@/app/core/types/auth';
import {
  hasProductCapability,
  hasWorkspacePermission,
} from '@/app/core/lib/productCapabilities';

export type FrontendActionMode =
  | 'DIRECT'
  | 'REQUEST_APPROVAL'
  | 'READ_ONLY'
  | 'NOT_APPLICABLE'
  | 'BLOCKED';

export type FrontendAuthoritySource =
  | 'BACKEND_ACTION'
  | 'BACKEND_PERMISSION'
  | 'BACKEND_CAPABILITY'
  | 'FALLBACK_READ_ONLY';

export interface BackendActionAuthority {
  allowed?: boolean;
  action_mode?: FrontendActionMode | string | null;
  actionMode?: FrontendActionMode | string | null;
  visible?: boolean;
  enabled?: boolean;
  reason_code?: string | null;
  reasonCode?: string | null;
  message?: string | null;
}

export interface FrontendLifecycleHint {
  mode?: string | null;
  action_mode?: FrontendActionMode | string | null;
  allows_mutation?: boolean | null;
  reason_code?: string | null;
  message?: string | null;
}

export interface ResolveFrontendAuthorityInput {
  backendAction?: BackendActionAuthority | null;
  capabilities?: WorkspaceCapabilities | null;
  permissionKey?: string;
  productCapabilityKey?: string;
  lifecycle?: FrontendLifecycleHint | null;
  requireBackendAction?: boolean;
}

export interface FrontendAuthorityDecision {
  visible: boolean;
  enabled: boolean;
  actionMode: FrontendActionMode;
  reasonCode: string;
  message: string;
  source: FrontendAuthoritySource;
}

function normalizeActionMode(value: string | null | undefined): FrontendActionMode {
  if (
    value === 'DIRECT'
    || value === 'REQUEST_APPROVAL'
    || value === 'READ_ONLY'
    || value === 'NOT_APPLICABLE'
    || value === 'BLOCKED'
  ) {
    return value;
  }
  return 'BLOCKED';
}

function readBackendActionMode(action: BackendActionAuthority): FrontendActionMode {
  return normalizeActionMode(action.action_mode ?? action.actionMode ?? null);
}

function readReasonCode(action: BackendActionAuthority): string {
  return action.reason_code ?? action.reasonCode ?? 'backend_action';
}

export function resolveFrontendAuthority(
  input: ResolveFrontendAuthorityInput,
): FrontendAuthorityDecision {
  const backendAction = input.backendAction;
  if (backendAction) {
    const actionMode = readBackendActionMode(backendAction);
    const visible = backendAction.visible ?? actionMode !== 'NOT_APPLICABLE';
    const enabled = backendAction.enabled ?? (
      backendAction.allowed === true && actionMode === 'DIRECT'
    );
    return {
      visible,
      enabled,
      actionMode,
      reasonCode: readReasonCode(backendAction),
      message: backendAction.message ?? '',
      source: 'BACKEND_ACTION',
    };
  }

  const lifecycleMode = normalizeActionMode(input.lifecycle?.action_mode ?? null);
  if (
    input.lifecycle
    && (input.lifecycle.allows_mutation === false || lifecycleMode === 'READ_ONLY')
  ) {
    return {
      visible: true,
      enabled: false,
      actionMode: 'READ_ONLY',
      reasonCode: input.lifecycle.reason_code ?? 'lifecycle_action_blocked',
      message: input.lifecycle.message ?? 'This action is read-only in the current academic lifecycle.',
      source: 'BACKEND_CAPABILITY',
    };
  }

  if (input.productCapabilityKey && !hasProductCapability(input.capabilities, input.productCapabilityKey)) {
    return {
      visible: true,
      enabled: false,
      actionMode: 'NOT_APPLICABLE',
      reasonCode: 'product_entitlement_required',
      message: 'This feature is not available for the current workspace.',
      source: 'BACKEND_CAPABILITY',
    };
  }

  if (input.permissionKey) {
    const hasPermission = hasWorkspacePermission(input.capabilities, input.permissionKey);
    return {
      visible: true,
      enabled: hasPermission && input.requireBackendAction !== true,
      actionMode: hasPermission && input.requireBackendAction !== true ? 'DIRECT' : 'BLOCKED',
      reasonCode: hasPermission ? 'permission_present' : 'permission_denied',
      message: hasPermission
        ? ''
        : 'You do not have permission to perform this action in this workspace.',
      source: 'BACKEND_PERMISSION',
    };
  }

  return {
    visible: true,
    enabled: false,
    actionMode: 'READ_ONLY',
    reasonCode: 'fallback_read_only',
    message: 'Backend action metadata is required before enabling this action.',
    source: 'FALLBACK_READ_ONLY',
  };
}

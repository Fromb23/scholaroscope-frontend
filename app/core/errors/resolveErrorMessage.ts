import { getAppError } from './appError';
import { resolveAppError } from './resolveAppError';

/**
 * Compatibility adapter for string-based UI state. New surfaces should retain
 * the complete AppError, but legacy string channels must still use the same
 * structured, allowlisted resolver instead of transport response content.
 */
export function resolveErrorMessage(error: unknown, trustedFallback = 'An error occurred'): string {
  const existing = getAppError(error);
  if (existing) {
    return existing.message;
  }

  const resolved = resolveAppError(error, {
    domain: 'unknown',
    action: 'unknown',
    entityLabel: 'request',
  });
  const firstFieldMessage = Object.values(resolved.fieldErrors ?? {})
    .flat()
    .find(Boolean);
  if (firstFieldMessage) {
    return firstFieldMessage;
  }
  if (
    resolved.serverCode
    || resolved.kind === 'authentication'
    || resolved.kind === 'permission'
    || resolved.kind === 'tenant_scope'
    || resolved.kind === 'workspace_boundary'
  ) {
    return resolved.message;
  }
  return trustedFallback;
}

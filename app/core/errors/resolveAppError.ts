import type { AppError, AppErrorKind, ResolveAppErrorContext } from './appError';
import { actionLabelForKind, defaultMessageForKind, severityForKind, titleForKind } from './errorCopy';
import { extractFieldErrors } from './fieldErrors';
import { sanitizeServerMessage } from './sanitizeServerMessage';

type ErrorData = Record<string, unknown>;

function isRecord(value: unknown): value is ErrorData {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getErrorData(err: unknown): unknown {
  if (!isRecord(err)) return undefined;
  return err.response && isRecord(err.response) && 'data' in err.response
    ? err.response.data
    : err.data;
}

function getStatus(err: unknown): number | undefined {
  if (!isRecord(err)) return undefined;
  const responseStatus = err.response && isRecord(err.response) && typeof err.response.status === 'number'
    ? err.response.status
    : undefined;
  return responseStatus ?? (typeof err.status === 'number' ? err.status : undefined);
}

function getNestedError(data: unknown): ErrorData | undefined {
  if (!isRecord(data)) return undefined;
  return isRecord(data.error) ? data.error : undefined;
}

function readString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function readFirstListString(value: unknown): string | undefined {
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined;
}

function getServerCode(data: unknown): string | undefined {
  const nested = getNestedError(data);
  return readString(
    nested?.code,
    nested?.type,
    isRecord(data) ? data.code : undefined,
    isRecord(data) ? data.type : undefined,
    isRecord(data) ? data.error : undefined,
  );
}

function getSupportCode(data: unknown): string | undefined {
  const nested = getNestedError(data);
  return readString(
    nested?.support_code,
    nested?.supportCode,
    nested?.request_id,
    nested?.trace_id,
    isRecord(data) ? data.support_code : undefined,
    isRecord(data) ? data.supportCode : undefined,
    isRecord(data) ? data.request_id : undefined,
    isRecord(data) ? data.trace_id : undefined,
  );
}

function getServerMessage(data: unknown, err: unknown): string | undefined {
  const nested = getNestedError(data);
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.filter((item): item is string => typeof item === 'string').join('\n');
  if (isRecord(data)) {
    return readString(
      nested?.message,
      nested?.detail,
      data.message,
      data.detail,
      readFirstListString(data.non_field_errors),
    );
  }
  return isRecord(err) ? readString(err.message) : undefined;
}

function codeIncludes(code: string | undefined, ...tokens: string[]): boolean {
  const normalized = code?.toLowerCase() ?? '';
  return tokens.some((token) => normalized.includes(token));
}

function classifyByStatus(status?: number): AppErrorKind | null {
  if (!status) return null;
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'authentication';
  if (status === 403) return 'permission';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status >= 500) return 'server';
  return null;
}

function classifyError(status: number | undefined, serverCode: string | undefined, fieldErrors: Record<string, string[]>): AppErrorKind {
  if (Object.keys(fieldErrors).length > 0) return 'validation';
  if (codeIncludes(serverCode, 'validation', 'invalid')) return 'validation';
  if (codeIncludes(serverCode, 'permission_denied', 'permission', 'forbidden')) return 'permission';
  if (codeIncludes(serverCode, 'not_authenticated', 'authentication', 'token')) return 'authentication';
  if (codeIncludes(serverCode, 'not_found', 'missing')) return 'not_found';
  if (codeIncludes(serverCode, 'conflict', 'duplicate', 'already_exists')) return 'conflict';
  if (codeIncludes(serverCode, 'setup_required', 'setup')) return 'setup_required';
  if (codeIncludes(serverCode, 'lifecycle_locked', 'finalized', 'locked')) return 'lifecycle_locked';
  if (codeIncludes(serverCode, 'tenant_scope', 'workspace_scope', 'wrong_workspace')) return 'tenant_scope';
  if (codeIncludes(serverCode, 'report_not_ready', 'report_stale', 'not_ready')) return 'report_not_ready';
  const byStatus = classifyByStatus(status);
  if (byStatus) return byStatus;
  return status ? 'unknown' : 'network';
}

function isRetryable(kind: AppErrorKind, context: ResolveAppErrorContext): boolean {
  if (kind === 'network' || kind === 'server' || kind === 'report_not_ready') return true;
  if (kind === 'unknown') return context.action === 'load' || context.action === 'export';
  return false;
}

export function resolveAppError(err: unknown, context: ResolveAppErrorContext): AppError {
  const data = getErrorData(err);
  const rawStatus = getStatus(err);
  const fieldErrors = extractFieldErrors(data);
  const serverCode = getServerCode(data);
  const kind = classifyError(rawStatus, serverCode, fieldErrors);
  const serverMessage = sanitizeServerMessage(getServerMessage(data, err), kind);
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const defaultMessage = defaultMessageForKind(kind, context);
  const message = kind === 'validation' && hasFieldErrors
    ? defaultMessage
    : serverMessage ?? defaultMessage;

  return {
    kind,
    title: titleForKind(kind, context),
    message,
    fieldErrors: hasFieldErrors ? fieldErrors : undefined,
    retryable: isRetryable(kind, context),
    severity: severityForKind(kind),
    actionLabel: actionLabelForKind(kind, context),
    supportCode: getSupportCode(data),
    rawStatus,
    serverCode,
  };
}

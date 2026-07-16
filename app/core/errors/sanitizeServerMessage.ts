import type { AppErrorKind } from './appError';

const INTERNAL_PATTERNS = [
  /IntegrityError/i,
  /DoesNotExist/i,
  /Traceback/i,
  /stack trace/i,
  /duplicate key value violates/i,
  /matching query does not exist/i,
  /PermissionDenied at/i,
  /\/api\//i,
  /\bSQL\b/i,
  /undefined is not/i,
  /null is not/i,
  /object Object/i,
  /^Failed to fetch$/i,
  /\b[A-Z][A-Za-z]+(?:Error|Exception|DoesNotExist|Denied)\b/,
  /File "[^"]+", line \d+/i,
  /django\.|rest_framework\.|psycopg|postgres|sqlite/i,
  /<\/?[a-z][^>]*>/i,
  /(?:authorization|cookie|set-cookie|refresh|access)[-_ ]?(?:token)?\s*[:=]/i,
  /(?:password|secret|api[-_ ]?key|csrf|sessionid)\s*[:=]/i,
  /\bBearer\s+[A-Za-z0-9._~+\/-]+/i,
  /(?:https?|file):\/\//i,
  /(?:^|\s)(?:\/[A-Za-z0-9._-]+){2,}(?:\s|$)/,
];

const SAFE_SERVER_MESSAGES = new Set([
  'Invalid email or password.',
  'Email or password is incorrect.',
  'Authentication credentials were not provided.',
  'You do not have permission to perform this action.',
  'Not found.',
  'This field is required.',
  'Enter a valid email address.',
  'A user with this email already exists.',
  'Ensure this field has no more than 255 characters.',
]);

const FALLBACK_BY_KIND: Partial<Record<AppErrorKind, string>> = {
  validation: 'Some details need correction before this can be saved.',
  workspace_boundary: 'This workspace type does not allow that action.',
  server: 'The server could not complete this request. Try again later.',
  unknown: 'The request could not be completed. Try again, or contact support if it continues.',
};

export function isUnsafeServerMessage(message: string): boolean {
  return INTERNAL_PATTERNS.some((pattern) => pattern.test(message));
}

export function sanitizeServerMessage(
  message: unknown,
  kind: AppErrorKind = 'unknown',
  options: { allowlistedValidation?: boolean; requireAllowlisted?: boolean } = {},
): string | null {
  if (typeof message !== 'string') return null;
  const trimmed = message.trim();
  if (!trimmed) return null;

  if (isUnsafeServerMessage(trimmed)) {
    if (options.requireAllowlisted || options.allowlistedValidation) {
      return null;
    }
    return FALLBACK_BY_KIND[kind]
      ?? 'The request could not be completed. Try again, or contact support if it continues.';
  }
  if (SAFE_SERVER_MESSAGES.has(trimmed)) {
    return trimmed;
  }
  if (kind === 'validation' && options.allowlistedValidation) {
    return trimmed;
  }
  return options.requireAllowlisted ? null : trimmed;
}

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
];

const FALLBACK_BY_KIND: Partial<Record<AppErrorKind, string>> = {
  validation: 'Some details need correction before this can be saved.',
  server: 'The server could not complete this request. Try again later.',
  unknown: 'The request could not be completed. Try again, or contact support if it continues.',
};

export function isUnsafeServerMessage(message: string): boolean {
  return INTERNAL_PATTERNS.some((pattern) => pattern.test(message));
}

export function sanitizeServerMessage(message: unknown, kind: AppErrorKind = 'unknown'): string | null {
  if (typeof message !== 'string') return null;
  const trimmed = message.trim();
  if (!trimmed) return null;

  if (isUnsafeServerMessage(trimmed)) {
    return FALLBACK_BY_KIND[kind]
      ?? 'The request could not be completed. Try again, or contact support if it continues.';
  }

  return trimmed;
}

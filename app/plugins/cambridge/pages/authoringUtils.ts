import type { AppError, ResolveAppErrorContext } from '@/app/core/errors';
import { resolveAppError } from '@/app/core/errors';
import type { ApiError } from '@/app/core/types/errors';
import { extractErrorMessage } from '@/app/core/types/errors';


export function resolveCambridgeError(
  error: unknown,
  options: {
    flow: 'catalogue' | 'setup' | 'offering' | 'syllabus' | 'session' | 'dashboard';
    action?: ResolveAppErrorContext['action'];
    role?: ResolveAppErrorContext['role'];
  },
): AppError {
  const resolved = resolveAppError(error, {
    domain: 'cambridge',
    action: options.action ?? 'load',
    entityLabel: `Cambridge ${options.flow}`,
    role: options.role ?? 'ADMIN',
  });
  return {
    ...resolved,
    title: `Cambridge ${options.flow} could not be ${options.action === 'save' ? 'saved' : 'loaded'}.`,
    message: resolved.message || 'Check the Cambridge setup and try again. If it continues, ask an admin to verify catalogue and offering setup.',
  };
}

export function toPositiveNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function mutationErrorMessage(error: unknown, fallback = 'Action failed. Please review input and retry.') {
  return extractErrorMessage(error as ApiError, fallback);
}

export function modeLabel(mode: string): string {
  if (mode === 'FRAMEWORK') return 'Framework';
  if (mode === 'QUALIFICATION') return 'Qualification';
  return mode;
}

export function nextSortOrder<T extends { sort_order: number }>(items: T[]) {
  if (items.length === 0) return 1;
  return Math.max(...items.map((item) => item.sort_order)) + 1;
}

export function generateSubjectCode(title: string) {
  return title
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

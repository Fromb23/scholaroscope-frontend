import type { AppError, ResolveAppErrorContext } from './appError';
import { resolveAppError } from './resolveAppError';

export type DomainErrorOptions = Omit<ResolveAppErrorContext, 'domain'>;

function resolveDomainError(
  error: unknown,
  domain: ResolveAppErrorContext['domain'],
  options: DomainErrorOptions,
): AppError {
  return resolveAppError(error, { ...options, domain });
}

export function resolveAuthError(error: unknown, options: DomainErrorOptions): AppError {
  return resolveDomainError(error, 'auth', options);
}

export function resolveWorkspaceError(error: unknown, options: DomainErrorOptions): AppError {
  return resolveDomainError(error, 'workspace', options);
}

export function resolveTeachingError(error: unknown, options: DomainErrorOptions): AppError {
  return resolveDomainError(error, 'sessions', options);
}

export function resolveLearnerError(error: unknown, options: DomainErrorOptions): AppError {
  return resolveDomainError(error, 'learners', options);
}

export function resolveAssessmentError(error: unknown, options: DomainErrorOptions): AppError {
  return resolveDomainError(error, 'assessments', options);
}

export function resolveAssignmentError(error: unknown, options: DomainErrorOptions): AppError {
  return resolveDomainError(error, 'assignments', options);
}

export function resolveReportError(error: unknown, options: DomainErrorOptions): AppError {
  return resolveDomainError(error, 'reports', options);
}

export function resolveAcademicSetupError(error: unknown, options: DomainErrorOptions): AppError {
  return resolveDomainError(error, 'academic_setup', options);
}

export function resolvePluginError(error: unknown, options: DomainErrorOptions): AppError {
  return resolveDomainError(error, 'plugins', options);
}

export function resolveSuperAdminError(error: unknown, options: DomainErrorOptions): AppError {
  return resolveDomainError(error, 'superadmin', options);
}

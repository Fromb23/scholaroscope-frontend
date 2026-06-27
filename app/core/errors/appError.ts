export type AppErrorKind =
  | 'validation'
  | 'permission'
  | 'authentication'
  | 'not_found'
  | 'conflict'
  | 'network'
  | 'server'
  | 'setup_required'
  | 'lifecycle_locked'
  | 'tenant_scope'
  | 'workspace_boundary'
  | 'report_not_ready'
  | 'unknown';

export type AppErrorSeverity = 'info' | 'warning' | 'error';

export interface AppError {
  kind: AppErrorKind;
  title: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  retryable: boolean;
  severity: AppErrorSeverity;
  actionLabel?: string;
  supportCode?: string;
  rawStatus?: number;
  serverCode?: string;
}

export interface ResolveAppErrorContext {
  role?: 'ADMIN' | 'INSTRUCTOR' | 'SUPERADMIN' | string | null;
  workspaceBehavior?: string | null;
  capabilities?: {
    can_teach?: boolean;
    can_manage_staff?: boolean;
    is_workspace_owner?: boolean;
    workspace_behavior?: string | null;
  };
  domain:
    | 'auth'
    | 'workspace'
    | 'instructors'
    | 'learners'
    | 'sessions'
    | 'lesson_plans'
    | 'schemes'
    | 'assignments'
    | 'assessments'
    | 'reports'
    | 'academic_setup'
    | 'cbc'
    | 'cambridge'
    | 'plugins'
    | 'superadmin'
    | 'unknown';
  action:
    | 'load'
    | 'create'
    | 'update'
    | 'delete'
    | 'submit'
    | 'save'
    | 'publish'
    | 'review'
    | 'compute'
    | 'export'
    | 'switch'
    | 'login'
    | 'verify'
    | 'unknown';
  entityLabel?: string;
  entityName?: string;
}

export class AppErrorException extends Error {
  appError: AppError;

  constructor(appError: AppError) {
    super(appError.message);
    this.name = 'AppErrorException';
    this.appError = appError;
  }
}

export function isAppError(value: unknown): value is AppError {
  return Boolean(
    value
      && typeof value === 'object'
      && 'kind' in value
      && 'title' in value
      && 'message' in value
      && 'retryable' in value,
  );
}

export function isAppErrorException(value: unknown): value is AppErrorException {
  return value instanceof AppErrorException
    || Boolean(value && typeof value === 'object' && 'appError' in value && isAppError((value as { appError?: unknown }).appError));
}

export function getAppError(value: unknown): AppError | null {
  if (isAppError(value)) return value;
  if (isAppErrorException(value)) return value.appError;
  return null;
}

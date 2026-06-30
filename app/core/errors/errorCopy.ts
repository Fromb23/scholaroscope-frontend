import type { AppErrorKind, AppErrorSeverity, ResolveAppErrorContext } from './appError';

const DOMAIN_LABELS: Record<ResolveAppErrorContext['domain'], string> = {
  auth: 'account access',
  workspace: 'workspace',
  instructors: 'instructor account',
  learners: 'learner record',
  sessions: 'lesson record',
  lesson_plans: 'lesson plan',
  schemes: 'scheme of work',
  assignments: 'assignment',
  assessments: 'assessment',
  reports: 'report',
  academic_setup: 'academic setup',
  cbc: 'CBC workflow',
  cambridge: 'Cambridge workflow',
  plugins: 'plugin workflow',
  superadmin: 'platform administration',
  unknown: 'request',
};

const ACTION_VERBS: Record<ResolveAppErrorContext['action'], string> = {
  load: 'load',
  create: 'create',
  update: 'update',
  delete: 'delete',
  submit: 'submit',
  save: 'save',
  publish: 'publish',
  review: 'review',
  compute: 'prepare',
  export: 'export',
  refresh: 'refresh',
  logout: 'sign out of',
  sync: 'sync',
  switch: 'switch',
  login: 'sign in',
  verify: 'verify',
  unknown: 'complete',
};

function isTeacherWorkspaceBehavior(value?: string | null): boolean {
  const normalized = value?.toUpperCase() ?? '';
  return normalized === 'FREELANCE_TEACHER' || normalized === 'SELF_MANAGED';
}

function actorFor(context: ResolveAppErrorContext): string {
  if (isTeacherWorkspaceBehavior(context.workspaceBehavior)) return 'teacher';
  if (isTeacherWorkspaceBehavior(context.capabilities?.workspace_behavior)) return 'teacher';
  if (context.capabilities?.can_teach === true && context.capabilities.can_manage_staff === false) return 'teacher';
  if (context.role === 'INSTRUCTOR') return 'teacher';
  if (context.role === 'ADMIN') return 'admin';
  if (context.role === 'SUPERADMIN') return 'superadmin';
  return 'user';
}

export function domainLabel(context: ResolveAppErrorContext): string {
  return context.entityName || context.entityLabel || DOMAIN_LABELS[context.domain];
}

function failedAction(context: ResolveAppErrorContext): string {
  return `${ACTION_VERBS[context.action]} ${domainLabel(context)}`;
}

export function severityForKind(kind: AppErrorKind): AppErrorSeverity {
  if (kind === 'report_not_ready' || kind === 'setup_required' || kind === 'workspace_boundary') return 'warning';
  if (kind === 'validation') return 'warning';
  return 'error';
}

export function titleForKind(kind: AppErrorKind, context: ResolveAppErrorContext): string {
  const label = domainLabel(context);
  if (context.domain === 'reports' && kind === 'report_not_ready') return 'This report is not ready yet.';
  if (context.domain === 'sessions' && context.action === 'save') return 'We could not save this lesson record.';
  if (context.domain === 'instructors' && context.action === 'create') return 'Instructor account was not created.';
  if (context.domain === 'assignments' && context.action === 'publish') return 'This assignment cannot be published yet.';
  if (context.domain === 'assessments' && kind === 'lifecycle_locked') return 'This assessment is already finalized.';

  switch (kind) {
    case 'validation':
      return `${capitalize(label)} needs correction.`;
    case 'permission':
    case 'tenant_scope':
      return `You do not have access to this ${label}.`;
    case 'workspace_boundary':
      return 'This action is not available in this workspace.';
    case 'authentication':
      return 'Sign-in could not be completed.';
    case 'not_found':
      return `${capitalize(label)} could not be found.`;
    case 'conflict':
      return `${capitalize(label)} could not be changed.`;
    case 'network':
      return `We could not reach the server to ${failedAction(context)}.`;
    case 'server':
      return `We could not ${failedAction(context)}.`;
    case 'setup_required':
      return `${capitalize(label)} setup is not complete.`;
    case 'lifecycle_locked':
      return `${capitalize(label)} is locked.`;
    case 'report_not_ready':
      return `${capitalize(label)} is not ready yet.`;
    default:
      return `We could not ${failedAction(context)}.`;
  }
}

export function defaultMessageForKind(kind: AppErrorKind, context: ResolveAppErrorContext): string {
  const actor = actorFor(context);

  if (context.domain === 'instructors' && context.action === 'create') {
    return 'Check the email address and required fields, then try again. If the account already exists, use the existing instructor record or ask an admin to restore access.';
  }
  if (context.domain === 'sessions' && context.action === 'save') {
    return 'Your lesson record is still open. Try again before leaving this page. If it continues, ask an admin to check the lesson status.';
  }
  if (context.domain === 'reports' && kind === 'report_not_ready') {
    return 'Some summaries are stale or missing. Refresh the report data, then try again.';
  }
  if (context.domain === 'assignments' && context.action === 'publish') {
    return 'Check the assignment dates, recipients, and required instructions. Publishing is not safe until those details are complete.';
  }
  if (context.domain === 'assessments' && kind === 'lifecycle_locked') {
    return 'This assessment has passed the editable stage. Ask an admin to reopen or correct the assessment lifecycle if a change is required.';
  }

  switch (kind) {
    case 'validation':
      return 'Some details need correction before this can be saved. Review the highlighted fields and try again.';
    case 'permission':
      return `This action requires a different permission level. Ask an admin to update access if this ${actor} should be allowed to continue.`;
    case 'authentication':
      return 'Check your credentials and workspace access. If your email is not verified, use the verification link before trying again.';
    case 'not_found':
      return 'The record may have been removed, archived, or moved to another workspace. Refresh the page before trying again.';
    case 'conflict':
      return 'The record is in a state that blocks this change. Refresh the page and check whether another user already updated it.';
    case 'network':
      return 'Check your connection and try again. Retrying is safe because the request did not reach the server reliably.';
    case 'server':
      return 'The server could not complete this request. Try again later, or contact platform support if it continues.';
    case 'setup_required':
      return 'An admin needs to finish the required setup before this workflow can continue.';
    case 'lifecycle_locked':
      return 'This record is locked by its current lifecycle stage. Ask an admin to reopen it if a change is required.';
    case 'tenant_scope':
      return 'This record belongs to another workspace or is outside your current access. Switch workspace or ask an admin to review access.';
    case 'workspace_boundary':
      if (
        isTeacherWorkspaceBehavior(context.workspaceBehavior)
        || isTeacherWorkspaceBehavior(context.capabilities?.workspace_behavior)
        || (context.capabilities?.can_teach === true && context.capabilities.can_manage_staff === false)
      ) {
        return 'Freelance Teacher Workspaces are designed for one teacher. Use an institution workspace if you need staff or member management.';
      }
      return 'This workspace type does not allow that action.';
    case 'report_not_ready':
      return 'The report data is still being prepared or needs refresh. Refresh the report data, then try again.';
    default:
      return 'The request could not be completed. Try again, or contact support if it continues.';
  }
}

export function actionLabelForKind(kind: AppErrorKind, context: ResolveAppErrorContext): string | undefined {
  if (kind === 'network' || kind === 'server' || kind === 'report_not_ready') return 'Try again';
  if (kind === 'authentication' && context.action === 'login') return 'Check sign-in details';
  if (kind === 'validation') return 'Review fields';
  if (kind === 'workspace_boundary') return 'Review workspace type';
  return undefined;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

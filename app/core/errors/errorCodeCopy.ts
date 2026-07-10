import type { AppErrorKind, AppErrorSeverity } from './appError';

export interface ErrorCodeCopyEntry {
  kind: AppErrorKind;
  title: string;
  message: string;
  actionLabel?: string;
  retryable?: boolean;
  severity?: AppErrorSeverity;
}

export const ERROR_CODE_COPY: Record<string, ErrorCodeCopyEntry> = {
  personal_workspace_single_teacher: {
    kind: 'workspace_boundary',
    title: 'This workspace is for one teacher.',
    message:
      'Freelance Teacher Workspaces cannot add staff or members. Use an institution workspace if you need multiple staff accounts.',
    actionLabel: 'Review workspace type',
    retryable: false,
    severity: 'warning',
  },
  class_report_policy_required: {
    kind: 'setup_required',
    title: 'Set report rules before calculating.',
    message:
      'Create report rules for this class or subject before calculating results.',
    actionLabel: 'Set report rules',
    retryable: false,
    severity: 'warning',
  },
  policy_required: {
    kind: 'setup_required',
    title: 'Reports are blocked.',
    message:
      'Reports are blocked because no active organization policy exists for this class subject and term.',
    actionLabel: 'Open term report setup',
    retryable: false,
    severity: 'warning',
  },
  report_policy_scope_not_allowed: {
    kind: 'permission',
    title: 'These report rules cannot be used here.',
    message:
      'The selected report policy is outside the allowed class or subject scope. Choose report rules that match this workspace.',
    actionLabel: 'Review report rules',
    retryable: false,
    severity: 'warning',
  },
  class_subject_required_for_lesson: {
    kind: 'setup_required',
    title: 'Choose a class subject before teaching.',
    message:
      'This lesson workflow needs a class subject. Select the class subject, then try again.',
    actionLabel: 'Review class subject',
    retryable: false,
    severity: 'warning',
  },
  learner_required_for_report: {
    kind: 'validation',
    title: 'Choose a learner before opening the report.',
    message:
      'Select the learner you want to report on, then try again.',
    actionLabel: 'Review learner',
    retryable: false,
    severity: 'warning',
  },
  email_not_verified: {
    kind: 'authentication',
    title: 'Verify your email before signing in.',
    message:
      'Use the verification link sent to your email, then sign in again.',
    actionLabel: 'Resend verification email',
    retryable: false,
    severity: 'warning',
  },
  no_active_workspace: {
    kind: 'setup_required',
    title: 'Choose an active workspace.',
    message:
      'You need an active workspace before continuing. Create, restore, or switch to a workspace.',
    actionLabel: 'Open workspaces',
    retryable: false,
    severity: 'warning',
  },
  workspace_access_suspended: {
    kind: 'permission',
    title: 'Workspace access is suspended.',
    message:
      'Your access to this workspace is currently suspended. Ask the workspace owner or platform support to review access.',
    actionLabel: 'Review workspace access',
    retryable: false,
    severity: 'error',
  },
  subscription_required_for_term: {
    kind: 'setup_required',
    title: 'Subscription renewal required.',
    message:
      'Renew or activate the workspace subscription covering this academic term before creating it.',
    actionLabel: 'Review subscription',
    retryable: false,
    severity: 'warning',
  },
};

export function getErrorCodeCopy(serverCode?: string): ErrorCodeCopyEntry | undefined {
  const normalized = serverCode?.trim().toLowerCase();
  return normalized ? ERROR_CODE_COPY[normalized] : undefined;
}

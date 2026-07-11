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
  customer_registration_account_not_allowed: {
    kind: 'permission',
    title: 'This email cannot be used here.',
    message:
      'Use a customer account email or sign in with an existing customer account.',
    actionLabel: 'Use another email',
    retryable: false,
    severity: 'warning',
  },
  platform_login_required: {
    kind: 'authentication',
    title: 'Use the control plane to sign in.',
    message:
      'Platform administrators sign in through the Scholaroscope control plane.',
    actionLabel: 'Use control plane sign-in',
    retryable: false,
    severity: 'warning',
  },
  account_email_already_exists: {
    kind: 'conflict',
    title: 'An account already exists for this email.',
    message:
      'Sign in with that customer account or use a different email.',
    actionLabel: 'Sign in',
    retryable: false,
    severity: 'warning',
  },
  registration_pending_approval: {
    kind: 'setup_required',
    title: 'Registration is awaiting approval.',
    message:
      'Your workspace request was submitted and is awaiting platform approval.',
    actionLabel: 'Check status later',
    retryable: false,
    severity: 'info',
  },
  quote_expired: {
    kind: 'setup_required',
    title: 'This quote has expired.',
    message:
      'Request a fresh quote from the rate card before continuing.',
    actionLabel: 'Request new quote',
    retryable: false,
    severity: 'warning',
  },
  quote_invalid: {
    kind: 'validation',
    title: 'This quote cannot be used.',
    message:
      'Return to the rate card and request a new quote.',
    actionLabel: 'Request new quote',
    retryable: false,
    severity: 'warning',
  },
  workspace_provisioning_failed: {
    kind: 'server',
    title: 'Workspace could not be created.',
    message:
      'The workspace request could not be completed. Try again later, or contact platform support if it continues.',
    actionLabel: 'Try again',
    retryable: true,
    severity: 'error',
  },
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

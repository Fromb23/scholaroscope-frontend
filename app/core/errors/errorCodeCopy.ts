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
  timetable_integration_not_ready: {
    kind: 'setup_required',
    title: 'Timetable setup is still synchronizing.',
    message: 'Refresh academic data and wait for synchronization to finish before opening timetable management.',
    actionLabel: 'Refresh academic data',
    retryable: true,
    severity: 'warning',
  },
  timetable_identity_mapping_missing: {
    kind: 'setup_required',
    title: 'Timetable access is still being prepared.',
    message: 'Refresh academic data so this workspace and your access can be synchronized.',
    actionLabel: 'Refresh academic data',
    retryable: true,
    severity: 'warning',
  },
  timetable_launch_failed: {
    kind: 'server',
    title: 'Timetable management could not be opened.',
    message: 'Try again. Scholaroscope remains available in this tab.',
    actionLabel: 'Try again',
    retryable: true,
    severity: 'error',
  },
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
  workspace_access_removed: {
    kind: 'permission',
    title: 'Workspace access changed.',
    message: 'You no longer have access to this workspace.',
    retryable: false,
    severity: 'warning',
  },
  workspace_unavailable: {
    kind: 'workspace_boundary',
    title: 'Workspace unavailable.',
    message: 'This workspace is currently unavailable.',
    retryable: false,
    severity: 'warning',
  },
  workspace_switch_unavailable: {
    kind: 'server',
    title: 'Workspace switching is unavailable.',
    message: 'Workspace switching is temporarily unavailable. Please try again.',
    actionLabel: 'Try again',
    retryable: true,
    severity: 'error',
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
  commercial_quote_consumed: {
    kind: 'setup_required',
    title: 'This quote has already been used.',
    message:
      'Return to the rate card and request a new quote before continuing.',
    actionLabel: 'Request new quote',
    retryable: false,
    severity: 'warning',
  },
  commercial_quote_operation_invalid: {
    kind: 'validation',
    title: 'This quote cannot be used for this step.',
    message:
      'Return to the rate card and start this workspace step again.',
    actionLabel: 'Review quote',
    retryable: false,
    severity: 'warning',
  },
  commercial_completion_operation_invalid: {
    kind: 'validation',
    title: 'This workspace step does not match your account state.',
    message:
      'Start the workspace setup again so Scholaroscope can use the correct account path.',
    actionLabel: 'Restart setup',
    retryable: false,
    severity: 'warning',
  },
  personal_workspace_exists: {
    kind: 'workspace_boundary',
    title: 'You already have a freelance workspace.',
    message:
      'You already have a freelance workspace. Open your existing workspace instead.',
    actionLabel: 'Open workspace',
    retryable: false,
    severity: 'warning',
  },
  workspace_name_taken: {
    kind: 'validation',
    title: 'Workspace name is already taken.',
    message:
      'Choose a different workspace name and try again.',
    retryable: false,
    severity: 'warning',
  },
  email_already_exists: {
    kind: 'conflict',
    title: 'An account already exists for this email.',
    message:
      'Sign in with that account or use a different email address.',
    actionLabel: 'Sign in',
    retryable: false,
    severity: 'warning',
  },
  email_delivery_failed: {
    kind: 'server',
    title: 'Verification email could not be sent.',
    message:
      'Your account setup may have completed, but the verification email could not be sent. Use resend verification or try again shortly.',
    actionLabel: 'Resend verification',
    retryable: true,
    severity: 'warning',
  },
  email_verification_dispatch_failed: {
    kind: 'server',
    title: 'Verification email could not be queued.',
    message:
      'Your account and workspace were created, but the verification email could not be queued. Use resend verification or try again shortly.',
    actionLabel: 'Resend verification',
    retryable: true,
    severity: 'warning',
  },
  provisioning_failed: {
    kind: 'server',
    title: 'Workspace could not be created.',
    message:
      'The workspace request could not be completed. Try again later, or contact platform support if it continues.',
    actionLabel: 'Try again',
    retryable: true,
    severity: 'error',
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
  platform_boundary_blocked: {
    kind: 'permission',
    title: 'Use the correct account area.',
    message:
      'Platform administrators cannot perform this customer workspace action here.',
    actionLabel: 'Review account',
    retryable: false,
    severity: 'warning',
  },
  workspace_boundary_blocked: {
    kind: 'workspace_boundary',
    title: 'This workspace cannot perform that action.',
    message:
      'The action requires an active workspace and a target that belongs to it.',
    actionLabel: 'Review workspace',
    retryable: false,
    severity: 'warning',
  },
  workspace_governance_not_applicable: {
    kind: 'workspace_boundary',
    title: 'This workspace does not use that workflow.',
    message:
      'The workspace governance model does not support this action.',
    actionLabel: 'Review workspace type',
    retryable: false,
    severity: 'info',
  },
  product_entitlement_required: {
    kind: 'setup_required',
    title: 'Feature access is not available.',
    message:
      'This workspace does not currently have the required product or plugin entitlement.',
    actionLabel: 'Review subscription',
    retryable: false,
    severity: 'warning',
  },
  curriculum_not_entitled: {
    kind: 'setup_required',
    title: 'Curriculum is not included.',
    message: 'This curriculum is not included in your current plan.',
    actionLabel: 'Review subscription',
    retryable: false,
    severity: 'warning',
  },
  curriculum_not_installed: {
    kind: 'setup_required',
    title: 'Curriculum setup is incomplete.',
    message: 'This curriculum is included but has not been configured for this workspace.',
    actionLabel: 'Retry setup',
    retryable: true,
    severity: 'warning',
  },
  curriculum_not_enabled: {
    kind: 'setup_required',
    title: 'Curriculum is disabled.',
    message: 'This curriculum is currently disabled for this workspace.',
    actionLabel: 'Review curriculum',
    retryable: false,
    severity: 'warning',
  },
  curriculum_not_active: {
    kind: 'setup_required',
    title: 'Curriculum is not active.',
    message: 'This curriculum is not active in the current workspace.',
    actionLabel: 'Choose curriculum',
    retryable: false,
    severity: 'warning',
  },
  curriculum_activation_failed: {
    kind: 'setup_required',
    title: 'Curriculum activation failed.',
    message: 'This curriculum could not be activated for this workspace.',
    actionLabel: 'Try again',
    retryable: true,
    severity: 'warning',
  },
  curriculum_deactivation_blocked: {
    kind: 'conflict',
    title: 'Curriculum deactivation is blocked.',
    message: 'This curriculum has academic records and cannot be deactivated automatically.',
    actionLabel: 'Review dependencies',
    retryable: false,
    severity: 'warning',
  },
  curriculum_setup_required: {
    kind: 'setup_required',
    title: 'Curriculum setup required.',
    message: 'Activate a curriculum before configuring the academic year.',
    actionLabel: 'Choose curriculum',
    retryable: false,
    severity: 'warning',
  },
  curriculum_configuration_incomplete: {
    kind: 'setup_required',
    title: 'Curriculum setup is incomplete.',
    message:
      'CBC could not be prepared for this workspace. Try again or contact support if the problem continues.',
    actionLabel: 'Try again',
    retryable: true,
    severity: 'warning',
  },
  curriculum_unknown: {
    kind: 'validation',
    title: 'Curriculum is not recognized.',
    message: 'This curriculum is not recognized.',
    actionLabel: 'Choose curriculum',
    retryable: false,
    severity: 'warning',
  },
  curriculum_unavailable_for_workspace: {
    kind: 'setup_required',
    title: 'Curriculum is unavailable.',
    message: 'This curriculum is not available for this workspace.',
    actionLabel: 'Choose curriculum',
    retryable: false,
    severity: 'warning',
  },
  lifecycle_action_blocked: {
    kind: 'lifecycle_locked',
    title: 'This period is read-only.',
    message:
      'The academic lifecycle blocks this change in the current period.',
    actionLabel: 'Review academic period',
    retryable: false,
    severity: 'warning',
  },
  membership_inactive: {
    kind: 'permission',
    title: 'Workspace membership is not active.',
    message:
      'An active workspace membership is required before this action can continue.',
    actionLabel: 'Review access',
    retryable: false,
    severity: 'warning',
  },
  permission_denied: {
    kind: 'permission',
    title: 'Permission required.',
    message:
      'You do not have permission to perform this action in this workspace.',
    actionLabel: 'Review permissions',
    retryable: false,
    severity: 'warning',
  },
  scope_denied: {
    kind: 'tenant_scope',
    title: 'This role does not cover that scope.',
    message:
      'Your permission does not apply to the selected class, subject, or class subject.',
    actionLabel: 'Review scope',
    retryable: false,
    severity: 'warning',
  },
  teaching_assignment_required: {
    kind: 'permission',
    title: 'Teaching assignment required.',
    message:
      'This instructional action requires a teaching assignment for the selected class subject.',
    actionLabel: 'Review teaching assignment',
    retryable: false,
    severity: 'warning',
  },
  workspace_role_scope_required: {
    kind: 'validation',
    title: 'Choose a role scope.',
    message:
      'This staff role must be assigned to an explicit workspace, cohort, subject, or class-subject scope.',
    actionLabel: 'Choose scope',
    retryable: false,
    severity: 'warning',
  },
  workspace_role_scope_too_broad: {
    kind: 'permission',
    title: 'Workspace scope needs stronger authority.',
    message:
      'This role cannot be assigned across the whole workspace without role-management authority.',
    actionLabel: 'Choose narrower scope',
    retryable: false,
    severity: 'warning',
  },
  assignment_scope_invalid: {
    kind: 'validation',
    title: 'Scope is invalid.',
    message:
      'Choose a valid scope that belongs to this workspace.',
    actionLabel: 'Review scope',
    retryable: false,
    severity: 'warning',
  },
  broad_workspace_scope_requires_confirmation: {
    kind: 'validation',
    title: 'Confirm workspace-wide scope.',
    message:
      'Workspace-wide role assignment requires explicit confirmation and a reason.',
    actionLabel: 'Confirm scope',
    retryable: false,
    severity: 'warning',
  },
};

export function getErrorCodeCopy(serverCode?: string): ErrorCodeCopyEntry | undefined {
  const normalized = serverCode?.trim().toLowerCase();
  return normalized ? ERROR_CODE_COPY[normalized] : undefined;
}

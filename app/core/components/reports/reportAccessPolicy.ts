import type { ActiveOrg, Role, User, WorkspaceCapabilities } from '@/app/core/types/auth';
import { isSupervisionOnlyAdmin, isTeachingActorView } from '@/app/core/lib/workspaces';

export function canRenderInstitutionReportOverview(params: {
  user?: User | null;
  activeRole?: Role | null;
  activeOrg?: ActiveOrg | null;
  capabilities?: WorkspaceCapabilities | null;
}): boolean {
  const { user, activeRole, activeOrg, capabilities } = params;
  if (!user) {
    return false;
  }
  if (user.is_superadmin) {
    return true;
  }

  return isSupervisionOnlyAdmin({
    role: activeRole,
    orgType: activeOrg?.org_type,
    isSuperadmin: user.is_superadmin,
    capabilities,
  });
}

export function canManageInstitutionReportPolicy(params: {
  user?: User | null;
  capabilities?: WorkspaceCapabilities | null;
}): boolean {
  const { user, capabilities } = params;
  if (!user) {
    return false;
  }
  if (user.is_superadmin) {
    return true;
  }

  const reportConfiguration = capabilities?.report_configuration;
  const reportPolicyAvailable = Boolean(
    reportConfiguration?.report_policy_available
    ?? capabilities?.can_manage_report_policy
  );
  const reportPolicyMode = (
    reportConfiguration?.report_policy_mode
    ?? capabilities?.report_policy_mode
    ?? null
  );

  return Boolean(
    reportPolicyAvailable
    && reportPolicyMode === 'INSTITUTION_GOVERNANCE'
    && reportConfiguration?.reporting_governance_routes_allowed
  );
}

export function shouldUseInstructorReportSurface(params: {
  user?: User | null;
  activeRole?: Role | null;
  activeOrg?: ActiveOrg | null;
  capabilities?: WorkspaceCapabilities | null;
}): boolean {
  return isTeachingActorView(params);
}

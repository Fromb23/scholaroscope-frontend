import type { ActiveOrg, Role, User, WorkspaceCapabilities } from '@/app/core/types/auth';
import {
  isSelfManagedTeachingAdmin,
  isSupervisionOnlyAdmin,
  isTeachingActorView,
} from '@/app/core/lib/workspaces';

export type ReportSurface = 'institution' | 'freelance' | 'instructor' | 'none';

export function resolveReportSurface(params: {
  user?: User | null;
  activeRole?: Role | null;
  activeOrg?: ActiveOrg | null;
  capabilities?: WorkspaceCapabilities | null;
}): ReportSurface {
  if (!params.user) {
    return 'none';
  }

  if (isSelfManagedTeachingAdmin(params)) {
    return 'freelance';
  }

  if (canRenderInstitutionReportOverview(params)) {
    return 'institution';
  }

  if (shouldUseInstructorReportSurface(params)) {
    return 'instructor';
  }

  return 'none';
}

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
  return isSupervisionOnlyAdmin({
    role: activeRole,
    orgType: activeOrg?.org_type,
    isSuperadmin: false,
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

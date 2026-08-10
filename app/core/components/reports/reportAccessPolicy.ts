import type { ActiveOrg, OperatingContext, User, WorkspaceCapabilities } from '@/app/core/types/auth';
import {
  isSelfManagedTeachingAdmin,
  isSupervisionOnlyAdmin,
  isTeachingActorView,
} from '@/app/core/lib/workspaces';

export type ReportSurface = 'institution' | 'freelance' | 'instructor' | 'none';

function hasReportViewAuthority(capabilities?: WorkspaceCapabilities | null): boolean {
  const permissionKeys = capabilities?.authorization?.permission_keys ?? [];
  return permissionKeys.includes('reports.view') || Boolean(capabilities?.can_view_reports);
}

export function resolveReportSurface(params: {
  user?: User | null;
  activeOrg?: ActiveOrg | null;
  capabilities?: WorkspaceCapabilities | null;
  operatingContext?: OperatingContext | null;
}): ReportSurface {
  if (!params.user || params.user.is_superadmin) {
    return 'none';
  }

  if (params.operatingContext === 'MY_TEACHING') {
    return shouldUseInstructorReportSurface(params) ? 'instructor' : 'none';
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
  activeOrg?: ActiveOrg | null;
  capabilities?: WorkspaceCapabilities | null;
  operatingContext?: OperatingContext | null;
}): boolean {
  const { user, activeOrg, capabilities } = params;
  if (!user || user.is_superadmin) {
    return false;
  }
  if (params.operatingContext === 'MY_TEACHING') {
    return false;
  }
  if (params.operatingContext === 'WORKSPACE_MANAGEMENT') {
    return Boolean(
      activeOrg
      && hasReportViewAuthority(capabilities)
      && !isSelfManagedTeachingAdmin(params)
    );
  }
  return isSupervisionOnlyAdmin({
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
  if (!user || user.is_superadmin) {
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

export function canComputeWorkspaceReports(params: {
  user?: User | null;
  capabilities?: WorkspaceCapabilities | null;
}): boolean {
  const { user, capabilities } = params;
  if (!user || user.is_superadmin) return false;
  const permissions = capabilities?.authorization?.permission_keys ?? [];
  const reportConfiguration = capabilities?.report_configuration;
  return Boolean(
    permissions.includes('reports.compute')
    && reportConfiguration?.report_computation_available
    && !reportConfiguration.report_computation_class_scoped_only
  );
}

export function shouldUseInstructorReportSurface(params: {
  user?: User | null;
  activeOrg?: ActiveOrg | null;
  capabilities?: WorkspaceCapabilities | null;
  operatingContext?: OperatingContext | null;
}): boolean {
  if (params.operatingContext === 'WORKSPACE_MANAGEMENT') {
    return false;
  }
  return isTeachingActorView(params);
}

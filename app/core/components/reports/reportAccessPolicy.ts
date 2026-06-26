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

export function shouldUseInstructorReportSurface(params: {
  user?: User | null;
  activeRole?: Role | null;
  activeOrg?: ActiveOrg | null;
  capabilities?: WorkspaceCapabilities | null;
}): boolean {
  return isTeachingActorView(params);
}

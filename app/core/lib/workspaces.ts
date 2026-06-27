import type {
  ActiveOrg,
  OrgType,
  RegisterOrgType,
  Role,
  User,
  WorkspaceCapabilities,
  WorkspaceMode,
} from '@/app/core/types/auth';

export type WorkspaceBadgeVariant = 'blue' | 'purple' | 'green' | 'orange' | 'indigo' | 'maroon';

export const ENABLE_MULTI_WORKSPACE_SIGNUP =
  process.env.NEXT_PUBLIC_ENABLE_MULTI_WORKSPACE_SIGNUP === 'true';

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  INSTITUTION: 'Institution',
  PERSONAL: 'Freelance Teacher Workspace',
  INDEPENDENT_TEACHER: 'Freelance Teacher Workspace (legacy)',
  LEARNER_WORKSPACE: 'Learner Workspace',
  TUITION_CENTER: 'Tuition Center',
  HOMESCHOOL: 'Homeschool',
};

export const ORG_TYPE_BADGE_VARIANTS: Record<OrgType, WorkspaceBadgeVariant> = {
  INSTITUTION: 'blue',
  PERSONAL: 'maroon',
  INDEPENDENT_TEACHER: 'maroon',
  LEARNER_WORKSPACE: 'orange',
  TUITION_CENTER: 'indigo',
  HOMESCHOOL: 'green',
};

export const WORKSPACE_MODE_COPY: Record<
  WorkspaceMode,
  {
    label: string;
    description: string;
    placeholder: string;
  }
> = {
  SCHOOL: {
    label: 'School / Institution',
    description:
      'Set up an institution workspace for administrators, instructors, learners, cohorts, and reports.',
    placeholder: 'e.g. Sunrise Academy',
  },
  HOME_TUITION: {
    label: 'Home Tuition for one learner',
    description:
      'Set up a learner-owned workspace where guardians can invite tutors and preserve one learner\'s academic record.',
    placeholder: 'e.g. Jayden Learning Record',
  },
  TUITION_CENTER: {
    label: 'Private Tuition Center',
    description:
      'Set up a tuition center workspace for tutors, learners, groups, and reports.',
    placeholder: 'e.g. Horizon Tuition Centre',
  },
  HOMESCHOOL: {
    label: 'Homeschool',
    description: 'Set up a homeschool workspace for guardian-led learner tracking.',
    placeholder: 'e.g. Njeri Homeschool',
  },
  PERSONAL: {
    label: 'Freelance Teacher Workspace',
    description:
      'Start as a freelance teacher. Manage your learners, schemes of work, lesson plans, teaching records, assessments, reports, and academic intelligence in your own workspace.',
    placeholder: 'e.g. My Teaching Workspace',
  },
};

export function getWorkspaceManagementLabel(orgType?: OrgType | null): string {
  switch (orgType) {
    case 'INSTITUTION':
      return 'Institution Management';
    case 'PERSONAL':
      return 'Freelance Teacher Workspace';
    case 'INDEPENDENT_TEACHER':
      return 'Freelance Teacher Workspace';
    case 'LEARNER_WORKSPACE':
      return 'Learner Workspace Management';
    case 'TUITION_CENTER':
      return 'Tuition Center Management';
    default:
      return 'Workspace Management';
  }
}

export function isPersonalFreelancerWorkspace(orgType?: OrgType | null): boolean {
  return orgType === 'PERSONAL';
}

export function isSelfManagedWorkspace(orgType?: OrgType | null): boolean {
  return workspaceAllowsSelfManagedTeaching(orgType);
}

export function isLearnerCenteredWorkspace(orgType?: OrgType | null): boolean {
  return orgType === 'LEARNER_WORKSPACE' || orgType === 'HOMESCHOOL';
}

export function workspaceAllowsSelfManagedTeaching(orgType?: OrgType | null): boolean {
  return orgType === 'PERSONAL'
    || orgType === 'INDEPENDENT_TEACHER'
    || orgType === 'HOMESCHOOL';
}

export function isSelfManagedTeachingWorkspace(params: {
  orgType?: OrgType | null;
  capabilities?: WorkspaceCapabilities | null;
}): boolean {
  return params.capabilities?.workspace_behavior === 'FREELANCE_TEACHER'
    || params.capabilities?.workspace_behavior === 'SELF_MANAGED'
    || workspaceAllowsSelfManagedTeaching(params.orgType)
    || isPersonalFreelancerWorkspace(params.orgType);
}

export function isSelfManagedTeachingAdmin(params: {
  activeRole?: Role | null;
  activeOrg?: ActiveOrg | null;
  capabilities?: WorkspaceCapabilities | null;
  user?: User | null;
}): boolean {
  const { activeRole, activeOrg, capabilities, user } = params;
  if (activeRole !== 'ADMIN' || user?.is_superadmin) {
    return false;
  }

  const orgType = activeOrg?.org_type ?? null;
  const isSelfManagedTeaching = isSelfManagedTeachingWorkspace({
    orgType,
    capabilities,
  });
  if (!isSelfManagedTeaching) {
    return false;
  }

  if (!capabilities) {
    return true;
  }

  return Boolean(capabilities.can_teach || capabilities.is_workspace_owner);
}

export function isTeachingActorView(params: {
  activeRole?: Role | null;
  activeOrg?: ActiveOrg | null;
  capabilities?: WorkspaceCapabilities | null;
  user?: User | null;
}): boolean {
  return params.activeRole === 'INSTRUCTOR' || isSelfManagedTeachingAdmin(params);
}

export function normalizeRegisterOrgType(orgType?: RegisterOrgType | OrgType | string): RegisterOrgType {
  if (orgType === 'INDEPENDENT_TEACHER' || orgType === 'FREELANCE_TEACHER') {
    return 'PERSONAL';
  }
  return (orgType ?? 'PERSONAL') as RegisterOrgType;
}

export interface TeachingCapabilityParams {
  role?: Role | null;
  orgType?: OrgType | null;
  isSuperadmin?: boolean;
  isWorkspaceOwner?: boolean;
  capabilities?: WorkspaceCapabilities | null;
}

export function canUseTeachingMode({
  role,
  orgType,
  isSuperadmin,
  isWorkspaceOwner,
  capabilities,
}: TeachingCapabilityParams): boolean {
  if (capabilities) {
    return capabilities.can_teach;
  }

  if (isSuperadmin || role === 'SUPERADMIN') {
    return false;
  }

  if (role === 'INSTRUCTOR') {
    return true;
  }

  if (role === 'ADMIN') {
    return workspaceAllowsSelfManagedTeaching(orgType) && Boolean(isWorkspaceOwner);
  }

  return false;
}

export function canShowAdminMyTeaching(params: TeachingCapabilityParams): boolean {
  return params.role === 'ADMIN' && canUseTeachingMode(params);
}

export function canCreateTeachingRecord(params: TeachingCapabilityParams): boolean {
  return canUseTeachingMode(params);
}

export function isSupervisionOnlyAdmin(params: TeachingCapabilityParams): boolean {
  return params.role === 'ADMIN' && !canUseTeachingMode(params);
}

export function canManageWorkspaceUsers(params: TeachingCapabilityParams): boolean {
  if (params.isSuperadmin) {
    return true;
  }

  if (params.capabilities) {
    return Boolean(params.capabilities.can_manage_staff);
  }

  return params.role === 'ADMIN';
}

export function canShowStaffManagement(params: TeachingCapabilityParams): boolean {
  return canManageWorkspaceUsers(params);
}

export function canShowInstitutionGovernance(params: TeachingCapabilityParams): boolean {
  if (!canManageWorkspaceUsers(params)) {
    return false;
  }

  return !isSelfManagedTeachingWorkspace({
    orgType: params.orgType,
    capabilities: params.capabilities,
  });
}

export function canShowFreelanceTeachingWorkspace(params: TeachingCapabilityParams): boolean {
  return canUseTeachingMode(params) && isSelfManagedTeachingWorkspace({
    orgType: params.orgType,
    capabilities: params.capabilities,
  });
}

export const ORG_TYPE_OPTIONS: Array<{ value: OrgType; label: string }> = [
  { value: 'INSTITUTION', label: ORG_TYPE_LABELS.INSTITUTION },
  { value: 'PERSONAL', label: ORG_TYPE_LABELS.PERSONAL },
  { value: 'LEARNER_WORKSPACE', label: ORG_TYPE_LABELS.LEARNER_WORKSPACE },
  { value: 'TUITION_CENTER', label: ORG_TYPE_LABELS.TUITION_CENTER },
  { value: 'HOMESCHOOL', label: ORG_TYPE_LABELS.HOMESCHOOL },
];

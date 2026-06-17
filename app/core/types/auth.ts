// app/core/types/auth.ts

export type Role = 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR';
export type OrgType =
  | 'INSTITUTION'
  | 'PERSONAL'
  | 'INDEPENDENT_TEACHER'
  | 'LEARNER_WORKSPACE'
  | 'TUITION_CENTER'
  | 'HOMESCHOOL';
export type WorkspaceMode =
  | 'SCHOOL'
  | 'INDEPENDENT_TEACHER'
  | 'HOME_TUITION'
  | 'TUITION_CENTER'
  | 'HOMESCHOOL'
  | 'PERSONAL';
export type RegisterOrgType = WorkspaceMode | 'INSTITUTION' | 'LEARNER_WORKSPACE';
export type MembershipStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

export interface WorkspaceCapabilities {
  can_teach: boolean;
  can_manage_academic_setup: boolean;
  can_manage_learners: boolean;
  can_manage_cohorts: boolean;
  can_manage_subjects: boolean;
  can_manage_assessments: boolean;
  can_view_reports: boolean;
  can_manage_staff: boolean;
  is_workspace_owner: boolean;
  workspace_mode: string | null;
  workspace_behavior: string | null;
}

export interface AccessNotice {
  org: string;
  organization_id?: number;
  role?: string;
  status?: MembershipStatus;
  kind?: 'MEMBERSHIP_RESTRICTED' | 'ORG_SUSPENDED' | 'MEMBERSHIP_REVOKED' | 'ORG_PENDING_APPROVAL';
  message: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_superadmin: boolean;
  is_active: boolean;
  phone: string;
  profile_image?: string;
  date_joined: string;
  last_login: string;
}

export interface OrgMembership {
  organization: {
    id: number;
    name: string;
    slug: string;
    org_type: OrgType;
    status?: string;
  };
  role: Role;
  role_display: string;
  status: MembershipStatus;
  joined_at: string;
}

export interface ActiveOrg {
  id: number;
  name: string;
  slug: string;
  org_type: OrgType;
}

export interface LoginResponse {
  access: string;
  user: User;
  message: string;
  active_org: ActiveOrg | null;
  capabilities: WorkspaceCapabilities;
  memberships: OrgMembership[];
  membership_version: number;
  state?: string;
  restricted_orgs?: AccessNotice[];
  org_suspended_orgs?: AccessNotice[];
  removed_orgs?: AccessNotice[];
  pending_orgs?: AccessNotice[];
  requires_workspace_recovery?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SwitchOrgResponse {
  access: string;
  user: User;
  active_org: ActiveOrg;
  capabilities: WorkspaceCapabilities;
  memberships: OrgMembership[];
  membership_version: number;
  message: string;
}

export interface RefreshResponse {
  access: string;
  user: User;
  active_org: ActiveOrg | null;
  capabilities: WorkspaceCapabilities;
  memberships: OrgMembership[];
  membership_version: number;
  state?: string;
  message?: string;
  restricted_orgs?: AccessNotice[];
  org_suspended_orgs?: AccessNotice[];
  removed_orgs?: AccessNotice[];
}

export interface RegisterPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  workspace_name?: string;
  invite_code?: string;
  org_type?: RegisterOrgType;
}

export interface RegisterResponse {
  status?: 'pending';
  message?: string;
  access?: string;
  user?: User;
  active_org?: ActiveOrg | null;
  capabilities?: WorkspaceCapabilities;
  membership_version?: number;
  state?: string;
  organization?: {
    id: number;
    name: string;
    slug?: string;
    type: OrgType;
  };
  memberships?: OrgMembership[];
}

export interface SuspendedOrg {
  id: number;
  name: string;
  slug: string;
  org_type: OrgType;
}

export interface MeContextResponse {
  membership_version: number;
  state: string;
  active_org: ActiveOrg | null;
  capabilities: WorkspaceCapabilities;
  memberships: OrgMembership[];
  restricted_orgs: AccessNotice[];
  org_suspended_orgs: AccessNotice[];
  removed_orgs: AccessNotice[];
}

// app/core/types/auth.ts

export type Role = 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR';
export type OrgType = 'INSTITUTION' | 'PERSONAL' | 'SCHOOL' | 'BUSINESS';
export type MembershipStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

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
  memberships: OrgMembership[];
  membership_version: number;
  message: string;
}

export interface RefreshResponse {
  access: string;
  user: User;
  active_org: ActiveOrg | null;
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
  org_type?: OrgType;
}

export interface RegisterResponse {
  status?: 'pending';
  message?: string;
  access?: string;
  user?: User;
  active_org?: ActiveOrg | null;
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
  memberships: OrgMembership[];
  restricted_orgs: AccessNotice[];
  org_suspended_orgs: AccessNotice[];
  removed_orgs: AccessNotice[];
}

// app/core/types/auth.ts
import { ReactNode } from 'react';

export type Role = 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR';
export type OrgType = 'INSTITUTION' | 'PERSONAL';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_superadmin: boolean;
  is_active: boolean;
  phone: string;
  profile_image: string;
  date_joined: string;
  last_login: string;
}

export interface OrgMembership {
  organization: {
    id: number;
    name: string;
    slug: string;
    org_type: OrgType;
  };
  role: Role;
  role_display: string;
  is_active: boolean;
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
  refresh: string;
  user: User;
  message: string;
  active_org: ActiveOrg | null;
  memberships: OrgMembership[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SwitchOrgResponse {
  access: string;
  refresh: string;
  user: User;
  active_org: ActiveOrg;
  memberships: OrgMembership[];
}

export interface RegisterPayload {
  first_name?: string;
  last_name?: string;
  email: string;
  password: string;
  workspace_name?: string;
  invite_code?: string;
}

export interface RegisterResponse {
  access: string;
  refresh: string;
  user: User;
  organization: {
    id: number;
    name: string;
    type: OrgType;
  };
}
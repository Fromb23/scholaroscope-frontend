// app/core/types/auth.ts
// Mirrors: apps/users/models.py + apps/users/serializers.py
// Updated for GAP 1: multi-org membership + workspace switching

import { ReactNode } from 'react';

export type Role = 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR';
export type OrgType = 'INSTITUTION' | 'PERSONAL';

export interface User {
  organization_name: ReactNode;
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: Role;
  role_display: string;
  is_active: boolean;
  phone: string;
  date_joined: string;
  last_login: string;
}

// A single org membership — returned by GET /api/users/memberships/
// and embedded in LoginResponse
export interface OrgMembership {
  organization: {
    id: number;
    name: string;
    slug: string;
    org_type: OrgType;
  };
  role: Role;
  is_active: boolean;
  joined_at: string;
}

// The active org embedded in login response and switch_org response
export interface ActiveOrg {
  id: number;
  name: string;
  slug: string;
  org_type: OrgType;
}

// POST /api/users/login/ response — GAP 1 extended
export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
  message: string;
  active_org: ActiveOrg;
  memberships: OrgMembership[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// POST /api/users/switch_org/ response
export interface SwitchOrgResponse {
  access: string;
  refresh: string;
  active_org: ActiveOrg;
  memberships: OrgMembership[];
}

// POST /api/users/register/ request body
export interface RegisterPayload {
  first_name?: string;
  last_name?: string;
  email: string;
  password: string;
  workspace_name?: string;
  invite_code?: string;
}

// POST /api/users/register/ response
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
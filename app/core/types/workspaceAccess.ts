export interface WorkspacePermissionDefinition {
  id: number;
  key: string;
  name: string;
  description: string;
  subsystem: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  is_delegable: boolean;
  supports_scope: boolean;
  allowed_scope_types: string[];
  requires_reason: boolean;
  actor_can_delegate: boolean;
}

export interface WorkspaceRole {
  id: number;
  name: string;
  slug: string;
  description: string;
  role_kind: 'CUSTOM' | 'SYSTEM' | 'TEMPLATE_CLONE' | 'LEGACY_COMPATIBILITY';
  is_workspace_admin: boolean;
  is_system_managed: boolean;
  is_active: boolean;
  version: number;
  permission_keys: string[];
  permission_count: number;
  active_assignment_count: number;
  actions: {
    can_update: boolean;
    can_archive: boolean;
    can_manage_permissions: boolean;
    can_assign: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface WorkspaceRoleTemplate {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  display_order: number;
  permission_keys: string[];
}

export interface WorkspaceRolePayload {
  name: string;
  description?: string;
  permission_keys?: string[];
}

export interface WorkspaceRoleAssignment {
  id: number;
  membership: {
    id: number;
    user_id: number;
    name: string;
    email: string;
    classification: string;
    status: string;
  };
  role: WorkspaceRole;
  status: 'ACTIVE' | 'ENDED' | 'REVOKED';
  starts_at: string;
  ends_at: string | null;
  assigned_reason: string;
  ended_reason: string;
  scopes: Array<{
    scope_type: string;
    scope_object_id: number | null;
  }>;
}

export interface WorkspaceAccessMe {
  enforced: boolean;
  permission_keys: string[];
  roles: Array<{
    id: number | null;
    name: string;
    role_kind?: string;
    is_workspace_admin?: boolean;
    assignment_id?: number;
    scopes?: Array<{
      scope_type: string;
      scope_object_id: number | null;
    }>;
  }>;
  admin_slots: {
    maximum: number | null;
    used: number | null;
    remaining: number | null;
    administrator_membership_ids?: number[];
    migration_state?: string;
    requires_review?: boolean;
  };
  migration_state: string;
}

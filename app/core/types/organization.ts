// ============================================================================
// app/core/types/organization.ts
// Mirrors: apps/users/models.py Organization + OrganizationSerializer
// ============================================================================

export type PlanType = 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
export type OrgType = 'INSTITUTION' | 'PERSONAL';
export type OrgStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'REJECTED';
export type SuspensionReason = 'USER_REQUESTED' | 'POLICY_VIOLATION' | 'PAYMENT_ISSUE' | 'ADMIN_ACTION';

export interface Organization {
    id: number;
    name: string;
    slug: string;
    code: string;
    email: string;
    phone: string;
    address: string;
    logo: string;
    org_type: OrgType;
    is_active: boolean;
    plan_type: PlanType;
    member_count: number;
    created_at: string;
    updated_at: string;
    status: OrgStatus;
    suspension_reason?: SuspensionReason | null;
}

export interface OrganizationCreatePayload {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    logo?: string;
    plan_type?: PlanType;
    org_type?: OrgType;
}

export interface OrganizationUpdatePayload {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    logo?: string;
    plan_type?: PlanType;
    org_type?: OrgType;
    is_active?: boolean;
}
export interface OrgFormData {
    name: string;
    email: string;
    phone: string;
    address: string;
    plan_type: PlanType;
    org_type: OrgType;
}

export interface OrganizationStats {
    total_members: number;
    active_members: number;
    by_role: {
        ADMIN: number;
        INSTRUCTOR: number;
    };
    organization?: {
        id: number;
        name: string;
        code: string;
    };
}

export interface OrgUser {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role: 'ADMIN' | 'INSTRUCTOR';
    role_display: string;
    is_active: boolean;
    phone: string;
    date_joined: string;
    last_login: string | null;
}

export const PLAN_LABELS: Record<PlanType, string> = {
    FREE: 'Free',
    BASIC: 'Basic',
    PREMIUM: 'Premium',
    ENTERPRISE: 'Enterprise',
};

export const PLAN_COLORS: Record<PlanType, 'default' | 'info' | 'purple' | 'orange'> = {
    FREE: 'default',
    BASIC: 'info',
    PREMIUM: 'purple',
    ENTERPRISE: 'orange',
};

export const ORG_STATUS_LABELS: Record<OrgStatus, string> = {
    ACTIVE: 'Active',
    SUSPENDED: 'Suspended',
    PENDING: 'Pending Approval',
    REJECTED: 'Rejected',
};

export const ORG_STATUS_COLORS: Record<OrgStatus, 'success' | 'danger' | 'warning'> = {
    ACTIVE: 'success',
    SUSPENDED: 'danger',
    PENDING: 'warning',
    REJECTED: 'danger',
};

export const SUSPENSION_REASON_LABELS: Record<SuspensionReason, string> = {
    USER_REQUESTED: 'User Requested',
    POLICY_VIOLATION: 'Policy Violation',
    PAYMENT_ISSUE: 'Payment Issue',
    ADMIN_ACTION: 'Admin Action',
};

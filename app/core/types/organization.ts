// ============================================================================
// app/core/types/organization.ts
// Mirrors: apps/users/models.py Organization + OrganizationSerializer
// ============================================================================

export type PlanType = 'FREE' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';
export type OrgType  = 'INSTITUTION' | 'PERSONAL';

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
    is_active?: boolean;
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

// ============================================================================
// app/types/globalUsers.ts
// Mirrors: apps/core/models.py User + UserSerializer + /users/statistics/
// ============================================================================

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR';

export interface GlobalUser {
    user: GlobalUser;
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role: UserRole;
    role_display: string;
    organization: number | null;         // FK id
    organization_name: string | null;
    organization_code: string | null;
    is_active: boolean;
    phone: string;
    date_joined: string;
    last_login: string | null;
}

// POST /api/users/  — UserCreateSerializer
export interface UserCreatePayload {
    email: string;
    first_name: string;
    last_name: string;
    role: 'ADMIN' | 'INSTRUCTOR';        // SUPERADMIN blocked via API
    organization: string;
    phone?: string;
    password: string;
    password2: string;
}

// PATCH /api/users/{id}/  — UserUpdateSerializer
export interface UserUpdatePayload {
    first_name?: string;
    last_name?: string;
    phone?: string;
    is_active?: boolean;
}

// GET /api/users/statistics/
export interface GlobalUserStats {
    total_users: number;
    active_users: number;
    inactive_users: number;
    by_role: Record<string, number>;     // role_display → count
}

export const ROLE_COLORS: Record<UserRole, 'purple' | 'blue' | 'green'> = {
    SUPERADMIN: 'purple',
    ADMIN: 'blue',
    INSTRUCTOR: 'green',
};

export const ROLE_LABELS: Record<UserRole, string> = {
    SUPERADMIN: 'Super Admin',
    ADMIN: 'Admin',
    INSTRUCTOR: 'Instructor',
};
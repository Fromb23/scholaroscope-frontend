// app/core/types/globalUsers.ts
// Mirrors: apps/users/models.py User + UserSerializer + MembershipSerializer

export type MemberRole = 'ADMIN' | 'INSTRUCTOR';
export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR'; // kept for RouteAccess compat

export interface GlobalUser {
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
    last_login: string | null;
    // Legacy fields — only present if backend includes them
    // Will be null/undefined for new model
    role?: 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR';
    role_display?: string;
    organization?: number | null;
    organization_name?: string | null;
    organization_code?: string | null;
}

// Membership embedded in user list responses
export interface UserMembership {
    role: MemberRole;
    role_display: string;
    organization: {
        id: number;
        name: string;
        slug: string;
        org_type: string;
    };
    is_active: boolean;
    joined_at: string;
}

// POST /api/users/ — UserCreateSerializer
// organization is no longer on User — membership is created server-side
// from the active org context in the JWT
export interface UserCreatePayload {
    email: string;
    first_name: string;
    last_name: string;
    role: MemberRole;
    phone?: string;
    password: string;
    password2: string;
}

// PATCH /api/users/{id}/ — UserUpdateSerializer
export interface UserUpdatePayload {
    first_name?: string;
    last_name?: string;
    phone?: string;
}

// GET /api/users/statistics/
export interface GlobalUserStats {
    total_members: number;
    active_members: number;
    by_role: Record<string, number>;
    organization?: {
        id: number;
        name: string;
        code: string;
    };
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

export interface AvailableCohortSubject {
    id: number;
    cohort: number;
    cohort_name: string;
    subject: number;
    subject_name: string;
    subject_code: string;
    is_compulsory: boolean;
    academic_year_name?: string;  // optional — not in serializer yet
}

export interface CohortAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    instructorId: number;
    instructorName: string;
}

export interface CohortAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    instructorId: number;
    instructorName: string;
}

export interface InstructorStats {
    total: number;
    active: number;
    inactive: number;
    assigned_to_cohort: number;
    unassigned: number;
}

export interface CohortAssignment {
    cohort_subject_id: number;
    cohort_id: number;
    cohort_name: string;
    subject_id: number;
    subject_name: string;
    academic_year: string;
    start_date: string;
    role: string;
}
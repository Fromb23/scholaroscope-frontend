// app/core/types/globalUsers.ts
// Mirrors: apps/users/models.py User + user serializers.

export type MemberRole = 'ADMIN' | 'INSTRUCTOR';
export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR';
export type GlobalAccountStatus = 'ACTIVE' | 'GLOBAL_DEACTIVATED';
export type MembershipStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED';

export interface MembershipSummary {
    user_id: number;
    user_name: string;
    organization_id: number;
    organization_name: string;
    role: MemberRole;
    status: MembershipStatus;
}

export interface GlobalUserActionResponse {
    message?: string;
    detail?: string;
    membership_status?: MembershipStatus;
    membership_version?: number;
    membership?: MembershipSummary;
    user?: GlobalUser;
}

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
    global_status?: GlobalAccountStatus;
    membership_status?: MembershipStatus | null;
    state_message?: string | null;
    can_restrict_access?: boolean;
    can_reactivate_access?: boolean;
    can_remove_from_org?: boolean;
    can_readd_to_org?: boolean;
    role?: UserRole;
    role_display?: string;
    organization?: number | null;
    organization_name?: string | null;
    organization_code?: string | null;
    membership_version?: number;
}

export interface UserMembership {
    role: MemberRole;
    role_display: string;
    organization: {
        id: number;
        name: string;
        slug: string;
        org_type: string;
        status: string;
    };
    status: MembershipStatus;
    joined_at: string;
}

export interface UserCreatePayload {
    email: string;
    first_name: string;
    last_name: string;
    role: MemberRole;
    phone?: string;
    password: string;
    password2: string;
}

export interface UserUpdatePayload {
    first_name?: string;
    last_name?: string;
    phone?: string;
}

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

export function resolveGlobalStatus(user: Pick<GlobalUser, 'global_status' | 'is_active'>): GlobalAccountStatus {
    if (user.global_status) {
        return user.global_status;
    }
    return user.is_active ? 'ACTIVE' : 'GLOBAL_DEACTIVATED';
}

export function isGloballyActive(user: Pick<GlobalUser, 'global_status' | 'is_active'>): boolean {
    return resolveGlobalStatus(user) === 'ACTIVE';
}

export function isEffectivelyActiveInCurrentOrg(
    user: Pick<GlobalUser, 'global_status' | 'is_active' | 'membership_status'>
): boolean {
    return isGloballyActive(user) && user.membership_status === 'ACTIVE';
}

export function membershipStatusLabel(status?: MembershipStatus | null): string {
    switch (status) {
        case 'ACTIVE':
            return 'Active';
        case 'SUSPENDED':
            return 'Access Restricted';
        case 'REVOKED':
            return 'Removed';
        default:
            return 'No Membership';
    }
}

export function membershipStatusVariant(
    status?: MembershipStatus | null
): 'success' | 'warning' | 'danger' | 'default' {
    switch (status) {
        case 'ACTIVE':
            return 'success';
        case 'SUSPENDED':
            return 'warning';
        case 'REVOKED':
            return 'danger';
        default:
            return 'default';
    }
}

export function globalStatusLabel(status?: GlobalAccountStatus): string {
    return status === 'GLOBAL_DEACTIVATED' ? 'Platform Restricted' : 'Platform Active';
}

export function globalStatusVariant(
    status?: GlobalAccountStatus
): 'success' | 'danger' {
    return status === 'GLOBAL_DEACTIVATED' ? 'danger' : 'success';
}

export interface AvailableCohort {
    id: number;
    name: string;
    curriculum_name: string;
    curriculum_type: string;
    academic_year: number;
    academic_year_name: string;
    is_current_year: boolean;
}

export interface SourceAwareSubjectReference {
    source?: string | null;
    subject_source?: string | null;
    subject_id?: number | null;
    teaching_link_id?: number | null;
    cbc_cohort_subject_id?: number | null;
    cambridge_cohort_subject_id?: number | null;
    cohort_subject_id?: number | null;
    assigned?: boolean;
    current_instructor_id?: number | null;
    current_instructor_name?: string | null;
    current_instructor_email?: string | null;
    assigned_to_current_instructor?: boolean;
    can_reassign?: boolean;
}

export interface AvailableCohortSubject extends SourceAwareSubjectReference {
    id?: number;
    label?: string | null;
    cohort?: number;
    cohort_id?: number | null;
    cohort_name: string;
    subject?: number;
    subject_name: string;
    subject_code?: string | null;
    subject_offering_status?: string | null;
    is_compulsory?: boolean;
    curriculum_name?: string | null;
    curriculum_type?: string | null;
    academic_year?: string | null;
    academic_year_name?: string | null;
    cohort_level?: string | null;
    subject_level?: string | null;
    is_current_year?: boolean;
    offering_id?: number | null;
    teaching_link_id?: number | null;
}

export interface CohortAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    instructorId: number;
    instructorName: string;
    initialCohortSubjectId?: number | null;
    initialCohortName?: string | null;
    initialSubjectName?: string | null;
    initialSubjectSource?: string | null;
    onAssignmentsChanged?: () => Promise<void> | void;
}

export interface InstructorStats {
    total: number;
    active: number;
    inactive: number;
    assigned_to_cohort: number;
    unassigned: number;
}

export interface CohortAssignmentSubjectLink extends SourceAwareSubjectReference {
    cohort_subject_id: number;
    subject_name: string;
    subject_code?: string | null;
    cohort_id?: number | null;
    cohort_name?: string | null;
    curriculum_name?: string | null;
    academic_year?: string | null;
    offering_id?: number | null;
}

export interface CohortAssignment {
    cohort_id: number;
    cohort_name: string;
    curriculum_name: string;
    curriculum_type: string;
    academic_year: string;
    start_date?: string | null;
    assigned_at?: string | null;
    assigned_by?: string | null;
    assignment_source?: 'cohort' | 'legacy_subject' | 'derived' | string;
    is_cbc?: boolean;
    subjects?: CohortAssignmentSubjectLink[];
}

export interface UserOrgMembership {
    role: MemberRole;
    role_display: string;
    organization: {
        id: number;
        name: string;
        slug: string;
        org_type: string;
        status: string;
    };
    status: MembershipStatus;
    joined_at: string;
}

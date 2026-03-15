// ============================================================================
// app/types/requests.ts
// Mirrors apps/requests/models.py exactly
// ============================================================================

// ── Enums ────────────────────────────────────────────────────────────────────

export type RequestStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CLOSED';
export type RequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

// Instructor → Admin
export type InstructorRequestType =
    | 'ENROLLMENT_CHANGE'
    | 'GRADE_OVERRIDE'
    | 'STUDENT_STATUS_UPDATE'
    | 'SESSION_RESCHEDULE'
    | 'RESOURCE_REQUEST'
    | 'ACCOUNT_DELETION'   // NEW: instructor requests own account erasure
    | 'OTHER';

// Admin → SuperAdmin
export type AdminRequestType =
    | 'PLAN_UPGRADE'
    | 'ORG_SETTINGS_CHANGE'
    | 'USER_LIMIT_INCREASE'
    | 'BUG_REPORT'
    | 'FEATURE_REQUEST'
    | 'SUSPEND_RESTORE_USER'
    | 'ORG_DELETION'       // NEW: admin requests org deletion from superadmin
    | 'OTHER';

export type RequestType = InstructorRequestType | AdminRequestType;

// ── Models ────────────────────────────────────────────────────────────────────

export interface RequestComment {
    id: number;
    author_name: string;
    author_role: string;
    content: string;
    is_internal: boolean;
    created_at: string;
}

export interface Request {
    id: number;
    title: string;
    description: string;
    request_type: RequestType;
    request_type_display: string;
    status: RequestStatus;
    status_display: string;
    priority: RequestPriority;
    priority_display: string;
    submitted_by_name: string;
    submitted_by_email: string;
    submitted_by_role: string;
    reviewed_by_name: string | null;
    organization: number;
    organization_name: string;
    resolution_note: string;
    reviewed_at: string | null;
    reference_data: Record<string, string | number | boolean | object>;
    comment_count: number;
    created_at: string;
    updated_at: string;
}

export interface RequestDetail extends Request {
    comments: RequestComment[];
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface RequestCreatePayload {
    title: string;
    description: string;
    request_type: RequestType;
    priority: RequestPriority;
    reference_data?: Record<string, string | number | boolean | object>;
}

export interface RequestReviewPayload {
    action: 'approve' | 'reject' | 'review';
    resolution_note?: string;
}

export interface AddCommentPayload {
    content: string;
    is_internal: boolean;
}

export interface RequestStats {
    total: number;
    pending: number;
    in_review: number;
    approved: number;
    rejected: number;
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<RequestStatus, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
    PENDING: 'warning',
    IN_REVIEW: 'info',
    APPROVED: 'success',
    REJECTED: 'danger',
    CLOSED: 'default',
};

export const PRIORITY_COLORS: Record<RequestPriority, 'default' | 'info' | 'warning' | 'danger'> = {
    LOW: 'default',
    NORMAL: 'info',
    HIGH: 'warning',
    URGENT: 'danger',
};

export const INSTRUCTOR_REQUEST_OPTIONS: { value: InstructorRequestType; label: string }[] = [
    { value: 'ENROLLMENT_CHANGE', label: 'Enrollment Change' },
    { value: 'GRADE_OVERRIDE', label: 'Grade Override' },
    { value: 'STUDENT_STATUS_UPDATE', label: 'Student Status Update' },
    { value: 'SESSION_RESCHEDULE', label: 'Session Cancellation / Reschedule' },
    { value: 'RESOURCE_REQUEST', label: 'Resource Request' },
    { value: 'ACCOUNT_DELETION', label: 'Account Deletion Request' },  // NEW
    { value: 'OTHER', label: 'Other' },
];

export const ADMIN_REQUEST_OPTIONS: { value: AdminRequestType; label: string }[] = [
    { value: 'PLAN_UPGRADE', label: 'Plan Upgrade / Downgrade' },
    { value: 'ORG_SETTINGS_CHANGE', label: 'Organization Settings Change' },
    { value: 'USER_LIMIT_INCREASE', label: 'User Limit Increase' },
    { value: 'BUG_REPORT', label: 'Bug Report / Technical Issue' },
    { value: 'FEATURE_REQUEST', label: 'Feature Request' },
    { value: 'SUSPEND_RESTORE_USER', label: 'Suspend / Restore User' },
    { value: 'ORG_DELETION', label: 'Organization Deletion Request' },  // NEW
    { value: 'OTHER', label: 'Other' },
];